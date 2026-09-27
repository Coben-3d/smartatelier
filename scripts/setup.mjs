import { createInterface } from "node:readline/promises";
import { spawn } from "node:child_process";
import { connectionStatus } from "../lib/connection.ts";
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error("Installez Node.js 24 LTS (minimum 22.18).");
  process.exit(1);
}
console.log("\nSmartAtelier — préparation locale\n");
const status = await connectionStatus(true);
console.log(status.message);
if (status.connected)
  console.log(
    `Offre : ${status.plan || "non communiquée"} · ${status.models.length} modèle(s) proposé(s).`,
  );
if (!status.connected && status.provider === "codex" && process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    "Ouvrir la connexion ChatGPT maintenant ? [O/n] ",
  );
  rl.close();
  if (answer.trim().toLowerCase() !== "n")
    await new Promise((resolve) => {
      const c = spawn(process.execPath, ["scripts/connect.mjs"], {
        stdio: "inherit",
      });
      c.on("close", resolve);
      c.on("error", resolve);
    });
}
console.log(
  "\nPour démarrer : npm run launch\nL’inventaire manuel fonctionne aussi sans connexion IA.\nPour les vidéos, installez FFmpeg et FFprobe (voir README).",
);

console.log(
  "Autres assistants : npm run connect -- claude ou npm run connect -- gemini. Choisissez ensuite votre assistant dans Connexion & modèles.",
);
