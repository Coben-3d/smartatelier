import { spawn } from "node:child_process";
import {
  codexInvocation,
  subscriptionEnv,
  providerSchema,
} from "../lib/connection.ts";
import { providerInvocation } from "../lib/provider-cli.ts";
const provider = providerSchema.parse(
  process.argv.find((a) => ["codex", "claude", "gemini"].includes(a)) ||
    "codex",
);
const command =
  provider === "codex"
    ? codexInvocation([
        "-c",
        "features.context_management=false",
        "-c",
        'forced_login_method="chatgpt"',
        "login",
        ...(process.argv.includes("--device") ? ["--device-auth"] : []),
      ])
    : providerInvocation(
        provider,
        provider === "claude" ? ["auth", "login"] : [],
      );
console.log(
  provider === "gemini"
    ? "Dans Gemini CLI, choisissez Login with Google. Terminez la connexion puis /quit. N’utilisez pas de clé API."
    : `Connexion officielle ${provider === "claude" ? "Claude" : "ChatGPT"}. Terminez la connexion dans le navigateur.`,
);
const child = spawn(command.file, command.args, {
  stdio: "inherit",
  env: subscriptionEnv(),
});
child.on("error", () => {
  console.error(
    provider === "codex"
      ? "Codex introuvable : npm ci"
      : `CLI introuvable. Installez-le : npm install -g ${provider === "claude" ? "@anthropic-ai/claude-code" : "@google/gemini-cli"}`,
  );
  process.exitCode = 1;
});
child.on("close", (code) => {
  process.exitCode = code ?? 1;
});
