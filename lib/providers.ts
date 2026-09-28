import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { activeModels, subscriptionEnv, type Model } from "./connection.ts";
import { providerInvocation } from "./provider-cli.ts";
import { run } from "./process.ts";
import { geminiSession } from "./gemini.ts";
import type { Frame } from "./schema.ts";
export const claudeModels: Model[] = ["sonnet", "opus", "haiku"].map(
  (model) => ({
    model,
    displayName: "Claude " + model[0].toUpperCase() + model.slice(1),
    defaultReasoningEffort: "",
    supportedReasoningEfforts: [],
    inputModalities: ["text", "image"],
    isDefault: model === "sonnet",
  }),
);
const empty = (message: string, models: Model[] = []) => ({
  connected: false,
  plan: null as string | null,
  models,
  message,
});
export function claudeAuth(value: any) {
  return value.loggedIn === true && value.authMethod === "claude.ai";
}
function googleLoginConfigured() {
  const root = process.env.GEMINI_CLI_HOME || path.join(homedir(), ".gemini");
  try {
    // Only read settings; the official CLI owns and reads credentials.
    return (
      JSON.parse(readFileSync(path.join(root, "settings.json"), "utf8"))
        ?.security?.auth?.selectedType === "oauth-personal" &&
      existsSync(path.join(root, "oauth_creds.json"))
    );
  } catch {
    return false;
  }
}
type Status = ReturnType<typeof empty>;
const cache = new Map<string, { until: number; value: Status }>();
const pending = new Map<string, Promise<Status>>();
export async function otherStatus(
  provider: "claude" | "gemini",
  force = false,
): Promise<Status> {
  const old = cache.get(provider);
  if (!force && old && old.until > Date.now()) return old.value;
  if (pending.has(provider)) return pending.get(provider)!;
  const promise = inspect(provider).catch((e) =>
    empty(
      e instanceof Error && e.message.startsWith("Google refuse")
        ? e.message
        : `${provider === "claude" ? "Claude Code" : "Gemini CLI"} indisponible. Suivez la connexion ci-dessous.`,
      provider === "claude" ? claudeModels : [],
    ),
  );
  pending.set(provider, promise);
  try {
    const value = await promise;
    cache.set(provider, { until: Date.now() + 60000, value });
    return value;
  } finally {
    pending.delete(provider);
  }
}
async function inspect(provider: "claude" | "gemini"): Promise<Status> {
  if (provider === "claude") {
    const cmd = providerInvocation(provider, ["auth", "status"]);
    const { stdout } = await run(cmd.file, cmd.args, {
      env: subscriptionEnv(),
      timeout: 15000,
      allowedExitCodes: [0, 1],
    });
    const account = JSON.parse(stdout);
    return claudeAuth(account)
      ? {
          connected: true,
          plan: account.subscriptionType || null,
          models: claudeModels,
          message:
            "Compte Claude détecté. La validité de la session, l’accès au modèle et le quota sont vérifiés lors de l’analyse.",
        }
      : empty(
          "Connectez Claude Code avec un compte Claude disposant de l’accès au CLI.",
          claudeModels,
        );
  }
  if (!googleLoginConfigured())
    return empty(
      "Ouvrez Gemini CLI puis choisissez Login with Google. L’accès gratuit ou payant dépend de votre compte Google.",
    );
  const dir = mkdtempSync(path.join(tmpdir(), "smartatelier-gemini-"));
  const session = geminiSession(dir);
  const timeout = setTimeout(() => session.close(), 25000);
  try {
    const info = await session.open();
    return {
      connected: true,
      plan: null,
      message:
        "Compte Google connecté. Les modèles proposés sont lus auprès de Gemini CLI ; leurs quotas restent ceux de Google.",
      models: (info.models?.availableModels || []).map((m: any) => ({
        model: m.modelId,
        displayName: m.name,
        defaultReasoningEffort: "",
        supportedReasoningEfforts: [],
        inputModalities: ["text", "image"],
        isDefault: m.modelId === info.models.currentModelId,
      })),
    };
  } finally {
    clearTimeout(timeout);
    await session.close();
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
}
export function parseJsonAnswer(text: string) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(clean);
  } catch {
    throw Error(
      "Réponse JSON invalide. Aucun article n’a été ajouté. Réessayez ou utilisez l’ajout manuel.",
    );
  }
}
export function claudeRequest(
  prompt: string,
  schema: object,
  images: string[],
  model: string,
  webSearch: boolean,
) {
  const args = [
    "--print",
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
    "--json-schema",
    JSON.stringify(schema),
    "--no-session-persistence",
    "--disable-slash-commands",
    "--no-chrome",
    "--setting-sources",
    "",
    "--settings",
    JSON.stringify({ disableAllHooks: true }),
    "--strict-mcp-config",
    "--mcp-config",
    JSON.stringify({ mcpServers: {} }),
    "--permission-mode",
    "dontAsk",
    "--tools",
    webSearch ? "WebSearch,WebFetch" : "",
  ];
  if (webSearch) args.push("--allowedTools", "WebSearch,WebFetch");
  if (model) args.push("--model", model);
  return {
    args,
    input:
      JSON.stringify({
        type: "user",
        message: {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...images.map((data) => ({
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data },
            })),
          ],
        },
      }) + "\n",
  };
}
export function parseClaudeResult(stdout: string, webSearch: boolean) {
  const events = stdout
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
  const result = events.findLast((e) => e.type === "result");
  if (
    result?.is_error &&
    /401|OAuth access token|authenticate|authentication/i.test(
      String(result.result),
    )
  )
    throw Error(
      "Session Claude expirée ou invalide. Reconnectez-vous avec npm run connect -- claude, puis actualisez la connexion.",
    );
  if (
    result?.is_error &&
    /rate.limit|usage.limit|quota|429/i.test(String(result.result))
  )
    throw Error(
      "Quota Claude atteint. Consultez Claude Code et réessayez après son renouvellement.",
    );
  if (!result || result.is_error || !result.structured_output)
    throw Error(
      "Claude n’a pas fourni de résultat structuré valide. Vérifiez l’accès au modèle et le quota dans Claude Code.",
    );
  if (webSearch) {
    const searchIds = new Set(
      events.flatMap((e) =>
        (e.message?.content || [])
          .filter((c: any) => c.type === "tool_use" && c.name === "WebSearch")
          .map((c: any) => c.id),
      ),
    );
    const completed = events.some((e) =>
      (e.message?.content || []).some(
        (c: any) =>
          c.type === "tool_result" &&
          searchIds.has(c.tool_use_id) &&
          !c.is_error,
      ),
    );
    if (!completed)
      throw Error(
        "Aucune recherche web confirmée. Relancez la recherche fabricant.",
      );
  }
  return result.structured_output;
}
export async function otherStructured(
  provider: "claude" | "gemini",
  prompt: string,
  schema: object,
  frames: Frame[],
  root: string,
  options: { model?: string; webSearch?: boolean },
) {
  const status = await otherStatus(provider);
  if (!status.connected) throw Error(status.message);
  const model = options.model || activeModels(provider).model;
  if (model && !status.models.some((m) => m.model === model))
    throw Error("Modèle indisponible. Actualisez Connexion & modèles.");
  const dir = path.join(root, "runs", randomUUID());
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "settings.json"),
    JSON.stringify({
      provider,
      model: model || "auto",
      webSearch: Boolean(options.webSearch),
      createdAt: new Date().toISOString(),
    }),
  );
  writeFileSync(path.join(dir, "prompt.txt"), prompt);
  writeFileSync(path.join(dir, "schema.json"), JSON.stringify(schema));
  const images = frames.map((f) => readFileSync(f.path).toString("base64"));
  let result: unknown;
  if (provider === "claude") {
    const request = claudeRequest(
      prompt,
      schema,
      images,
      model,
      Boolean(options.webSearch),
    );
    const cmd = providerInvocation(provider, request.args);
    let stdout: string;
    try {
      ({ stdout } = await run(cmd.file, cmd.args, {
        cwd: dir,
        input: request.input,
        env: subscriptionEnv(),
        timeout: 240000,
        allowedExitCodes: [0, 1],
      }));
    } catch {
      throw Error(
        "Claude a refusé la demande. Vérifiez connexion, modèle et quota dans Claude Code. Aucun autre service n’a été appelé.",
      );
    }
    result = parseClaudeResult(stdout, Boolean(options.webSearch));
  } else {
    const session = geminiSession(dir, Boolean(options.webSearch));
    try {
      const info = await session.open();
      if (model)
        await session.call("session/set_model", {
          sessionId: info.sessionId,
          modelId: model,
        });
      const done = await session.call("session/prompt", {
        sessionId: info.sessionId,
        prompt: [
          {
            type: "text",
            text: `${prompt}\nRéponds UNIQUEMENT par un objet JSON conforme à ce schéma, sans Markdown : ${JSON.stringify(schema)}`,
          },
          ...images.map((data) => ({
            type: "image",
            mimeType: "image/jpeg",
            data,
          })),
        ],
      });
      if (done.stopReason !== "end_turn")
        throw Error("Analyse Gemini interrompue ; aucun résultat intégré.");
      const output = session.result();
      if (options.webSearch && !output.searched)
        throw Error(
          "Aucune recherche web confirmée. Relancez la recherche fabricant.",
        );
      result = parseJsonAnswer(output.answer);
    } finally {
      await session.close();
    }
  }
  // Domain callers validate all schemas and frame references before saving proposals.
  writeFileSync(path.join(dir, "result.json"), JSON.stringify(result));
  return result;
}
