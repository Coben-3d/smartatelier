import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataRoot, newBatch, save, get, items, type Project } from "./db.ts";
import { prepareMedia } from "./media.ts";
import { analyzeFrames, planProject } from "./codex.ts";
const state = globalThis as unknown as { atelierQueue?: Promise<unknown> };
export function queue(fn: () => Promise<void>) {
  state.atelierQueue = (state.atelierQueue || Promise.resolve())
    .then(fn)
    .catch(() => {});
}
export async function importFiles(files: File[]) {
  if (!files.length || files.length > 8)
    throw Error("Choisissez de 1 à 8 fichiers.");
  if (
    files.some((f) => f.size > 250 * 1024 * 1024) ||
    files.reduce((s, f) => s + f.size, 0) > 400 * 1024 * 1024
  )
    throw Error("Limite : 250 Mo par fichier, 400 Mo par lot.");
  for (const f of files)
    if (!/\.(jpe?g|png|webp|heic|heif|mp4|mov|webm|m4v)$/i.test(f.name))
      throw Error("Formats acceptés : JPG, PNG, WebP, HEIC, MP4, MOV, WebM.");
  const b = newBatch();
  const dir = path.join(dataRoot, "originals", b.id);
  await mkdir(dir, { recursive: true });
  const originals: { path: string; name: string; kind: "image" | "video" }[] =
    [];
  try {
    for (const f of files) {
      const file = path.join(
        dir,
        randomUUID() + path.extname(f.name).toLowerCase(),
      );
      await writeFile(file, Buffer.from(await f.arrayBuffer()));
      originals.push({
        path: file,
        name: f.name,
        kind: /\.(mp4|mov|webm|m4v)$/i.test(f.name)
          ? ("video" as const)
          : ("image" as const),
      });
    }
  } catch (e) {
    b.status = "error";
    b.message = String(e);
    save("batches", b);
    throw e;
  }
  queue(async () => {
    try {
      b.status = "processing";
      save("batches", b);
      for (const o of originals) {
        b.message = `Extraction : ${o.name}`;
        save("batches", b);
        b.media.push(await prepareMedia(o.path, o.name, o.kind, dataRoot));
        save("batches", b);
      }
      const frames = b.media.flatMap((m) => m.frames);
      if (frames.length > 24)
        throw Error(
          "Ce lot dépasse 24 vues utiles. Importez moins de vidéos à la fois.",
        );
      b.message = `Votre assistant analyse ${frames.length} image(s)…`;
      save("batches", b);
      b.analysis = await analyzeFrames(frames, dataRoot);
      b.status = "review";
      b.message = "Vérifiez les identifications, quantités et cadres.";
    } catch (e) {
      b.status = "error";
      b.message = e instanceof Error ? e.message : String(e);
    }
    save("batches", b);
  });
  return b;
}
export function retryBatch(id: string) {
  const b = get<ReturnType<typeof newBatch>>("batches", id);
  if (b.status !== "error" || !b.media.length)
    throw Error("Réimportez les médias pour recommencer leur extraction.");
  b.status = "queued";
  b.message = "Analyse en attente…";
  save("batches", b);
  queue(async () => {
    try {
      b.status = "processing";
      save("batches", b);
      b.analysis = await analyzeFrames(
        b.media.flatMap((m) => m.frames),
        dataRoot,
      );
      b.status = "review";
      b.message = "À vérifier";
    } catch (e) {
      b.status = "error";
      b.message = String(e);
    }
    save("batches", b);
  });
  return b;
}
export function createProject(description: string) {
  if (!description.trim() || description.length > 6000)
    throw Error("Décrivez votre projet en 1 à 6 000 caractères.");
  const p: Project = {
    id: randomUUID(),
    description,
    status: "queued",
    message: "Consultation de votre inventaire…",
    createdAt: new Date().toISOString(),
    plan: null,
    picked: [],
  };
  save("projects", p);
  queue(async () => {
    try {
      p.status = "processing";
      save("projects", p);
      p.plan = await planProject(
        description,
        items().map(({ observations, ...i }) => i),
        dataRoot,
      );
      p.status = "ready";
      p.message = "Liste préparée";
    } catch (e) {
      p.status = "error";
      p.message = String(e);
    }
    save("projects", p);
  });
  return p;
}

export async function createRecheck(value: unknown) {
  const { recheckRequestSchema } = await import("./schema.ts");
  const { frameIndex } = await import("./db.ts");
  const { makeCrops, identifyCrops, recheckModel } =
    await import("./recheck.ts");
  const request = recheckRequestSchema.parse(value);
  const allowed = request.batchId
    ? get<ReturnType<typeof newBatch>>(
        "batches",
        request.batchId,
      ).media.flatMap((m) => m.frames.map((f) => f.id))
    : get<import("./schema.ts").Item>(
        "items",
        request.itemId!,
      ).observations.map((o) => o.frameId);
  if (
    !request.component.observations.length ||
    !request.component.observations[request.observationIndex]
  )
    throw Error("Dessinez ou sélectionnez un cadre sur le module.");
  if (request.component.observations.some((o) => !allowed.includes(o.frameId)))
    throw Error("Cette image n’appartient pas au composant ou au lot.");
  const job: import("./schema.ts").Recheck = {
    id: randomUUID(),
    status: "queued",
    message: "Revérification en attente…",
    createdAt: new Date().toISOString(),
    request,
    model: recheckModel(),
    result: null,
    crops: [],
  };
  save("rechecks", job);
  queue(async () => {
    try {
      job.status = "processing";
      job.message = "Préparation des gros plans depuis les originaux…";
      save("rechecks", job);
      job.crops = await makeCrops(request, frameIndex(), dataRoot);
      job.message = "Lecture des marquages et comparaison des variantes…";
      save("rechecks", job);
      job.result = await identifyCrops(job.crops, request, dataRoot);
      job.status = "ready";
      job.message = "Proposition prête à comparer";
    } catch (e) {
      job.status = "error";
      job.message = e instanceof Error ? e.message : String(e);
    }
    save("rechecks", job);
  });
  return job;
}
