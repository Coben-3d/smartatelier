import { spawn } from "node:child_process";
import path from "node:path";
console.log(
  "Aperçu SmartAtelier : http://127.0.0.1:3212 — données séparées dans data-preview/.",
);
const child = spawn(
  process.execPath,
  [
    path.resolve("node_modules/next/dist/bin/next"),
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3212",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      INVENTORY_DATA_DIR: path.resolve("data-preview"),
      NEXT_PUBLIC_STOCKATELIER_PREVIEW: "1",
    },
  },
);
child.on("error", () => {
  console.error("Installez les dépendances avec npm ci.");
  process.exitCode = 1;
});
child.on("close", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
