import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { checkRelease } from "./release-check.mjs";
const files = checkRelease();
const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));
if (!/^[a-z0-9-]+$/.test(name) || !/^\d+\.\d+\.\d+$/.test(version))
  throw Error("Nom ou version non valide.");
// Minimal POSIX ustar with fixed metadata: no username, timestamps or OS attributes.
const chunks = [];
for (const file of files) {
  const filename = `${name}-${version}/${file.replaceAll("\\", "/")}`;
  if (Buffer.byteLength(filename) > 100)
    throw Error("Chemin trop long pour cette archive : " + file);
  const content = readFileSync(file),
    header = Buffer.alloc(512);
  const octal = (offset, length, value) =>
    header.write(
      value.toString(8).padStart(length - 1, "0") + "\0",
      offset,
      length,
      "ascii",
    );
  header.write(filename, 0, 100, "utf8");
  octal(100, 8, file.endsWith(".command") ? 0o755 : 0o644);
  octal(108, 8, 0);
  octal(116, 8, 0);
  octal(124, 12, content.length);
  octal(136, 12, 0);
  header.fill(32, 148, 156);
  header.write("0", 156);
  header.write("ustar\0", 257);
  header.write("00", 263);
  const sum = header.reduce((s, v) => s + v, 0);
  header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");
  chunks.push(
    header,
    content,
    Buffer.alloc((512 - (content.length % 512)) % 512),
  );
}
chunks.push(Buffer.alloc(1024));
mkdirSync("dist", { recursive: true });
const archive = path.resolve("dist", `${name}-${version}.tgz`);
writeFileSync(archive, gzipSync(Buffer.concat(chunks), { level: 9 }));
console.log("Archive source créée : " + archive);
