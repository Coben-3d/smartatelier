import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { prepareMedia } from "../lib/media.ts";
import { analyzeFrames } from "../lib/codex.ts";
const input = path.resolve(process.argv[2]);
const root = path.resolve(process.argv[3] || "../../work/probe/result");
mkdirSync(root, { recursive: true });
const media = await prepareMedia(
  input,
  path.basename(input),
  /\.(mp4|mov|webm|m4v)$/i.test(input) ? "video" : "image",
  root,
);
writeFileSync(path.join(root, "media.json"), JSON.stringify(media, null, 2));
console.log(
  "Média préparé",
  media.frames.length,
  "images sur",
  media.sampled || 1,
);
const start = Date.now();
const result = await analyzeFrames(media.frames, root);
writeFileSync(
  path.join(root, "analysis.json"),
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({ seconds: (Date.now() - start) / 1000, ...result }, null, 2),
);
