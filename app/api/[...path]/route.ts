import {
  connectionStatus,
  providerSchema,
  activeModels,
  readSettings,
  writeSettings,
  startLogin,
  loginState,
} from "../../../lib/connection.ts";
import { NextRequest, NextResponse } from "next/server";
import { createReadStream, statSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { cropRegion } from "../../../lib/recheck.ts";
import type { Item } from "../../../lib/schema.ts";
import { Readable } from "node:stream";
import {
  dataRoot,
  items,
  batches,
  all,
  frameIndex,
  addItem,
  updateItem,
  deleteItem,
  adjust,
  validateBatch,
  projectAvailability,
  get,
  save,
  snapshot,
  type Project,
} from "../../../lib/db.ts";
import { authStatus } from "../../../lib/codex.ts";
import {
  importFiles,
  createProject,
  retryBatch,
  createRecheck,
} from "../../../lib/jobs.ts";
import { ensureFilamentProfile } from "../../../lib/filaments.ts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function protect(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))
    throw Error("Accès local uniquement");
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== host) throw Error("Origine refusée");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw Error("Origine refusée");
}
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    protect(req);
    const p = (await params).path;
    const method = req.method;
    const body = async () => req.json();
    if (p[0] === "connection") {
      if (method === "GET") {
        const provider = providerSchema.parse(
          req.nextUrl.searchParams.get("provider") || readSettings().provider,
        );
        return NextResponse.json({
          ...(await connectionStatus(
            req.nextUrl.searchParams.has("refresh"),
            provider,
          )),
          settings: {
            ...activeModels(provider),
            provider: readSettings().provider,
          },
          login: loginState(),
        });
      }
      if (method === "POST" && p[1] === "login") {
        const provider = providerSchema.parse(
          (await body()).provider || "codex",
        );
        if (provider !== "codex")
          throw Error(
            "Utilisez la commande de connexion affichée pour cet assistant.",
          );
        return NextResponse.json(startLogin());
      }
      if (method === "POST" && p[1] === "settings") {
        const value = await body();
        const provider = providerSchema.parse(value.provider || "codex");
        const catalog = await connectionStatus(false, provider);
        for (const key of ["model", "recheckModel"])
          if (
            typeof value[key] !== "string" ||
            (value[key] &&
              !catalog.models.some(
                (m) =>
                  m.model === value[key] &&
                  (m.inputModalities || ["text", "image"]).includes("image"),
              ))
          )
            throw Error("Modèle indisponible pour l’analyse d’images.");
        const keys =
          provider === "codex"
            ? ["model", "recheckModel"]
            : provider === "claude"
              ? ["claudeModel", "claudeRecheckModel"]
              : ["geminiModel", "geminiRecheckModel"];
        return NextResponse.json(
          writeSettings({
            ...readSettings(),
            provider,
            [keys[0]]: value.model,
            [keys[1]]: value.recheckModel,
          }),
        );
      }
      throw Error("Action de connexion inconnue");
    }
    if (p[0] === "rechecks") {
      if (method === "POST")
        return NextResponse.json(await createRecheck(await body()));
      if (method === "GET") {
        const job = get<import("../../../lib/schema.ts").Recheck>(
          "rechecks",
          p[1],
        );
        if (p[2] === "crop") {
          const frame = job.crops[Number(p[3])];
          if (!frame) throw Error("Gros plan indisponible");
          return new NextResponse(readFileSync(frame.path), {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "private, max-age=86400",
            },
          });
        }
        return NextResponse.json(job);
      }
    }
    if (method === "GET") {
      if (p[0] === "state") {
        const projects = all<Project>("projects").map((p) => ({
          ...p,
          requirements: p.plan ? projectAvailability(p.plan) : [],
        }));
        return NextResponse.json({
          items: items(),
          batches: batches(),
          frames: frameIndex(),
          projects,
          filamentProfiles: all("filament_profiles"),
        });
      }
      if (p[0] === "status") return NextResponse.json(await authStatus());
      if (p[0] === "export")
        return new NextResponse(JSON.stringify(snapshot(), null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": 'attachment; filename="inventaire.json"',
          },
        });
      if (p[0] === "items" && p[2] === "thumbnail") {
        const item = get<Item>("items", p[1]);
        const frames = frameIndex();
        const observation = item.observations.find((o) => frames[o.frameId]);
        if (!observation) throw Error("Aperçu indisponible");
        const frame = frames[observation.frameId];
        const relative = path.relative(dataRoot, frame.path);
        if (relative.startsWith("..") || path.isAbsolute(relative))
          throw Error("Chemin refusé");
        // Saved frames are already oriented; boxes use these exact coordinates.
        const thumbnail = await sharp(frame.path)
          .extract(cropRegion(observation.box, frame.width, frame.height))
          .resize({
            width: 720,
            height: 480,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 88 })
          .toBuffer();
        return new NextResponse(thumbnail, {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "private, no-cache",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (p[0] === "media") {
        const frames = frameIndex();
        const f = frames[p[1]];
        if (!f) throw Error("Image introuvable");
        const file = p[2] === "original" ? f.originalPath : f.path;
        const relative = path.relative(dataRoot, file);
        if (relative.startsWith("..") || path.isAbsolute(relative))
          throw Error("Chemin refusé");
        const size = statSync(file).size;
        const ext = path.extname(file).toLowerCase();
        const mime =
          (
            {
              ".mp4": "video/mp4",
              ".mov": "video/quicktime",
              ".webm": "video/webm",
              ".m4v": "video/mp4",
              ".png": "image/png",
              ".webp": "image/webp",
              ".heic": "image/heic",
              ".heif": "image/heif",
            } as Record<string, string>
          )[ext] || "image/jpeg";
        const headers: Record<string, string> = {
          "Content-Type": mime,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        };
        const range = req.headers.get("range");
        let start = 0,
          end = size - 1,
          status = 200;
        if (range) {
          const match = /^bytes=(\d+)-(\d*)$/.exec(range);
          if (!match)
            return new NextResponse(null, {
              status: 416,
              headers: { "Content-Range": `bytes */${size}` },
            });
          start = Number(match[1]);
          end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
          if (start > end || start >= size)
            return new NextResponse(null, {
              status: 416,
              headers: { "Content-Range": `bytes */${size}` },
            });
          status = 206;
          headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
        }
        headers["Content-Length"] = String(end - start + 1);
        return new NextResponse(
          Readable.toWeb(
            createReadStream(file, { start, end }),
          ) as ReadableStream,
          { status, headers },
        );
      }
    }
    if (method === "POST" && p[0] === "imports") {
      if (p[2] === "validate") {
        const batch = validateBatch(p[1], await body());
        items().forEach((i) => ensureFilamentProfile(i));
        return NextResponse.json(batch);
      }
      if (p[2] === "retry") return NextResponse.json(retryBatch(p[1]));
      const length = Number(req.headers.get("content-length"));
      if (length > 410 * 1024 * 1024) throw Error("Lot trop volumineux");
      const form = await req.formData();
      return NextResponse.json(
        await importFiles(
          form.getAll("files").filter((x) => x instanceof File) as File[],
        ),
      );
    }
    if (p[0] === "items") {
      if (method === "POST" && p[2] === "quantity") {
        const b = await body();
        return NextResponse.json(adjust(p[1], b.delta));
      }
      if (method === "POST" && p[2] === "filament-profile") {
        const result = ensureFilamentProfile(get<Item>("items", p[1]), true);
        if (!result)
          throw Error(
            "Renseignez marque, gamme, polymère et diamètre puis enregistrez.",
          );
        return NextResponse.json(result);
      }
      if (method === "POST" || method === "PUT") {
        const item =
          method === "POST"
            ? addItem(await body())
            : updateItem(p[1], await body());
        ensureFilamentProfile(item);
        return NextResponse.json(item);
      }
      if (method === "DELETE") {
        deleteItem(p[1]);
        return NextResponse.json({ ok: true });
      }
    }
    if (p[0] === "projects") {
      if (method === "POST")
        return NextResponse.json(createProject((await body()).description));
      if (method === "PATCH") {
        const pjt = get<Project>("projects", p[1]);
        const b = await body();
        if (
          !Array.isArray(b.picked) ||
          !b.picked.every((x: unknown) => typeof x === "string") ||
          b.picked.length > 100
        )
          throw Error("Liste invalide");
        pjt.picked = b.picked;
        save("projects", pjt);
        return NextResponse.json(pjt);
      }
    }
    return NextResponse.json({ error: "Route introuvable" }, { status: 404 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inattendue" },
      { status: 400 },
    );
  }
}
export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
