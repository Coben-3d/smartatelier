import { spawn } from "node:child_process";
import path from "node:path";
const next = path.resolve("node_modules/next/dist/bin/next");
// Rebuild on each launch so an update never silently runs an older app.
const build = spawn(process.execPath, [next, "build"], { stdio: "inherit" });
build.on("error", () => {
  console.error("Lancez npm ci avant le premier démarrage.");
  process.exitCode = 1;
});
build.on("close", (code) => {
  if (code !== 0) {
    process.exitCode = code ?? 1;
    return;
  }
  const server = spawn(
    process.execPath,
    [next, "start", "--hostname", "127.0.0.1", "--port", "3210"],
    { stdio: "inherit" },
  );
  server.on("error", () => {
    process.exitCode = 1;
  });
  server.on("close", (code) => {
    process.exitCode = code ?? 1;
  });
});
