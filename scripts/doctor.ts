import { connectionStatus, codexInvocation } from "../lib/connection.ts";
import { run } from "../lib/codex.ts";
console.log("Node", process.version);
const command = codexInvocation(["--version"]);
try {
  console.log((await run(command.file, command.args)).stdout.trim());
} catch {
  console.log("Codex non installé : npm ci");
}
const status = await connectionStatus(true);
console.log("Assistant sélectionné :", status.label);
console.log(status.message);
console.log("Offre:", status.plan || "non communiquée");
console.log(
  "Modèles:",
  status.models.map((m) => m.model).join(", ") || "aucun",
);
for (const name of ["ffmpeg", "ffprobe"]) {
  try {
    console.log((await run(name, ["-version"])).stdout.split("\n")[0]);
  } catch {
    console.log(
      name +
        " absent : vidéos indisponibles, photos JPG/PNG toujours utilisables.",
    );
  }
}
