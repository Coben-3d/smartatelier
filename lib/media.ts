import sharp from "sharp";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { run } from "./codex.ts";
import type { Media, Frame } from "./schema.ts";
export function pixelDistance(a: Uint8Array, b: Uint8Array) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}
async function fingerprint(file: string) {
  return sharp(file)
    .resize(32, 32, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
}
export async function prepareMedia(
  original: string,
  name: string,
  kind: "image" | "video",
  root: string,
): Promise<Media> {
  const id = randomUUID();
  const dir = path.join(root, "frames", id);
  await mkdir(dir, { recursive: true });
  const media: Media = { id, name, path: original, kind, frames: [] };
  let times: (number | null)[] = [null];
  if (kind === "video") {
    const probe = await run(process.env.FFPROBE_BIN || "ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      original,
    ]);
    const duration = Number(JSON.parse(probe.stdout).format?.duration);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 180)
      throw Error(
        "Vidéo limitée à 3 minutes. Découpez-la en plans courts et lents.",
      );
    media.duration = duration;
    const count = Math.min(24, Math.max(1, Math.ceil(duration / 2)));
    times = Array.from({ length: count }, (_, i) =>
      Math.min(duration - 0.05, ((i + 0.5) * duration) / count),
    );
    media.sampled = count;
  }
  const candidates: { frame: Frame; pixels: Buffer; sharpness: number }[] = [];
  for (const timestamp of times) {
    const frameId = randomUUID(),
      out = path.join(dir, `${frameId}.jpg`);
    if (timestamp !== null) {
      await run(
        process.env.FFMPEG_BIN || "ffmpeg",
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-ss",
          String(Math.max(0, timestamp)),
          "-i",
          original,
          "-frames:v",
          "1",
          "-vf",
          "scale=1600:1600:force_original_aspect_ratio=decrease",
          "-q:v",
          "2",
          "-y",
          out,
        ],
        { timeout: 30000 },
      );
    } else {
      try {
        await sharp(original, { limitInputPixels: 60_000_000 })
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90 })
          .toFile(out);
      } catch {
        await run(process.env.FFMPEG_BIN || "ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-i",
          original,
          "-frames:v",
          "1",
          "-vf",
          "scale=1600:1600:force_original_aspect_ratio=decrease",
          "-y",
          out,
        ]);
      }
    }
    const meta = await sharp(out).metadata();
    const stats = await sharp(out).stats();
    candidates.push({
      frame: {
        id: frameId,
        mediaId: id,
        path: out,
        timestamp,
        width: meta.width!,
        height: meta.height!,
      },
      pixels: await fingerprint(out),
      sharpness: stats.sharpness,
    });
  }
  // Keep the sharpest view of near-identical shots, then choose diverse views.
  const unique: typeof candidates = [];
  for (const c of [...candidates].sort((a, b) => b.sharpness - a.sharpness)) {
    if (!unique.some((u) => pixelDistance(c.pixels, u.pixels) < 5))
      unique.push(c);
  }
  const chosen: typeof candidates = [];
  if (unique.length) chosen.push(unique.shift()!);
  while (unique.length && chosen.length < 8) {
    unique.sort(
      (a, b) =>
        Math.min(...chosen.map((c) => pixelDistance(b.pixels, c.pixels))) -
        Math.min(...chosen.map((c) => pixelDistance(a.pixels, c.pixels))),
    );
    chosen.push(unique.shift()!);
  }
  media.frames = chosen
    .map((c) => c.frame)
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const ids = new Set(media.frames.map((f) => f.id));
  for (const c of candidates)
    if (!ids.has(c.frame.id)) await unlink(c.frame.path);
  return media;
}
