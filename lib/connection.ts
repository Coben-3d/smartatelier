import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
export function codexInvocation(args: string[]) {
  if (process.env.CODEX_BIN) return { file: process.env.CODEX_BIN, args };
  const cli = path.join(
    process.cwd(),
    "node_modules/@openai/codex/bin/codex.js",
  );
  return existsSync(cli)
    ? { file: process.execPath, args: [cli, ...args] }
    : { file: "codex", args };
}
export function subscriptionEnv() {
  const env = { ...process.env };
  for (const key of Object.keys(env))
    if (
      /^(OPENAI_|CODEX_API_KEY$|ANTHROPIC_|CLAUDE_CODE_USE_|CLAUDE_CODE_OAUTH_TOKEN$|GEMINI_API_KEY$|GOOGLE_API_KEY$|GOOGLE_GENAI_USE_VERTEXAI$|GOOGLE_APPLICATION_CREDENTIALS$|GEMINI_API_KEY_AUTH_MECHANISM$|GOOGLE_GEMINI_BASE_URL$|GOOGLE_VERTEX_BASE_URL$)/.test(
        key,
      )
    )
      delete env[key];
  return env;
}
export const providerSchema = z.enum(["codex", "claude", "gemini"]);
export type Provider = z.infer<typeof providerSchema>;
const settingsSchema = z.object({
  provider: providerSchema.default("codex"),
  claudeModel: z.enum(["", "sonnet", "opus", "haiku"]).default(""),
  claudeRecheckModel: z.enum(["", "sonnet", "opus", "haiku"]).default(""),
  geminiModel: z.string().max(150).default(""),
  geminiRecheckModel: z.string().max(150).default(""),
  model: z.string().max(150).default(""),
  recheckModel: z.string().max(150).default(""),
});
const settingsPath = () =>
  path.resolve(
    process.env.INVENTORY_DATA_DIR || path.join(process.cwd(), "data"),
    "settings.json",
  );
export function readSettings() {
  const file = settingsPath();
  return existsSync(file)
    ? settingsSchema.parse(JSON.parse(readFileSync(file, "utf8")))
    : settingsSchema.parse({});
}
export function writeSettings(value: unknown) {
  const settings = settingsSchema.parse(value);
  const file = settingsPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2));
  return settings;
}
export type Model = {
  model: string;
  displayName: string;
  defaultReasoningEffort: string;
  supportedReasoningEfforts: { reasoningEffort: string }[];
  inputModalities?: string[];
  isDefault: boolean;
  hidden?: boolean;
};
export function selectModel(
  models: Model[],
  requested: string | undefined,
  image: boolean,
  effort?: string,
) {
  const compatible = models.filter(
    (m) =>
      !m.hidden &&
      (!image || (m.inputModalities || ["text", "image"]).includes("image")),
  );
  const selected = requested
    ? compatible.find((m) => m.model === requested)
    : compatible.find((m) => m.isDefault) || compatible[0];
  if (!selected)
    throw Error(
      requested
        ? "Ce modèle n’est pas proposé pour cette opération. Actualisez Connexion & modèles."
        : "Aucun modèle compatible proposé par ce compte. L’inventaire manuel reste disponible.",
    );
  const choices = selected.supportedReasoningEfforts.map(
    (e) => e.reasoningEffort,
  );
  return {
    model: selected.model,
    effort:
      effort && choices.includes(effort)
        ? effort
        : choices.includes(selected.defaultReasoningEffort)
          ? selected.defaultReasoningEffort
          : choices[0],
  };
}
async function withCodexServer<T>(
  work: (call: (method: string, params: object) => Promise<any>) => Promise<T>,
): Promise<T> {
  const command = codexInvocation([
    "-c",
    "features.context_management=false",
    "app-server",
    "--stdio",
  ]);
  const child = spawn(command.file, command.args, {
    stdio: ["pipe", "pipe", "pipe"],
    env: subscriptionEnv(),
  });
  child.stderr.resume();
  const pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: Error) => void }
  >();
  let id = 0;
  const lines = createInterface({ input: child.stdout });
  const fail = (e: Error) => {
    for (const p of pending.values()) p.reject(e);
    pending.clear();
  };
  child.on("error", () =>
    fail(Error("Codex est introuvable. Lancez npm ci puis npm run connect.")),
  );
  child.on("exit", () =>
    fail(Error("Connexion à Codex interrompue. Lancez npm run doctor.")),
  );
  lines.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      msg.error
        ? p.reject(Error(msg.error.message || "Codex indisponible"))
        : p.resolve(msg.result);
    } catch {
      /* Ignore non-protocol diagnostics. */
    }
  });
  const call = (method: string, params: object) =>
    new Promise<any>((resolve, reject) => {
      const current = ++id;
      pending.set(current, { resolve, reject });
      child.stdin.write(JSON.stringify({ id: current, method, params }) + "\n");
    });
  const timer = setTimeout(() => {
    fail(Error("Codex ne répond pas. Vérifiez votre connexion et relancez."));
    child.kill();
  }, 20000);
  try {
    await call("initialize", {
      clientInfo: {
        name: "smartatelier",
        title: "SmartAtelier",
        version: "0.4.1",
      },
    });
    child.stdin.write(JSON.stringify({ method: "initialized" }) + "\n");
    return await work(call);
  } finally {
    clearTimeout(timer);
    lines.close();
    child.kill();
  }
}
export async function accountCatalog() {
  return withCodexServer(async (call) => {
    const { account } = await call("account/read", { refreshToken: false });
    if (account?.type !== "chatgpt")
      return {
        connected: false,
        plan: null,
        models: [] as Model[],
        message:
          "Connectez Codex avec votre compte ChatGPT. Les clés API ne sont pas utilisées.",
      };
    const models: Model[] = [];
    let cursor: string | null = null;
    do {
      const page = await call("model/list", {
        includeHidden: false,
        limit: 100,
        ...(cursor ? { cursor } : {}),
      });
      models.push(...page.data);
      cursor = page.nextCursor;
    } while (cursor);
    // Never return email, tokens, or account identifiers to the browser.
    return {
      connected: true,
      plan: account.planType || null,
      models: models.map(
        ({
          model,
          displayName,
          defaultReasoningEffort,
          supportedReasoningEfforts,
          inputModalities,
          isDefault,
        }) => ({
          model,
          displayName,
          defaultReasoningEffort,
          supportedReasoningEfforts,
          inputModalities,
          isDefault,
        }),
      ),
      message:
        "Connecté à ChatGPT. Les quotas et autorisations du compte s’appliquent.",
    };
  });
}
// Read effective names only: never persist/return config values or credentials.
// An empty mcp_servers override merges with user config; it does NOT clear it.
export async function configuredCodexMcpServers(
  cwd: string,
): Promise<string[]> {
  return withCodexServer(async (call) => {
    const result = await call("config/read", { cwd, includeLayers: false });
    if (!result?.config || typeof result.config !== "object")
      throw Error("Configuration Codex indisponible : analyse annulée.");
    return Object.keys(result.config.mcp_servers || {});
  });
}

type Catalog = Awaited<ReturnType<typeof accountCatalog>>;
const state = globalThis as unknown as {
  stockCatalog?: { until: number; value: Catalog };
  stockCatalogPending?: Promise<Catalog>;
  stockLogin?: { pending: boolean; message: string };
};
export async function codexStatus(force = false) {
  if (!force && state.stockCatalog && state.stockCatalog.until > Date.now())
    return state.stockCatalog.value;
  if (state.stockCatalogPending) return state.stockCatalogPending;
  state.stockCatalogPending = accountCatalog()
    .then((value) => {
      state.stockCatalog = { until: Date.now() + 60000, value };
      return value;
    })
    .catch(() => ({
      connected: false,
      plan: null,
      models: [] as Model[],
      message: "Codex indisponible. Lancez npm run connect ou npm run doctor.",
    }))
    .finally(() => {
      state.stockCatalogPending = undefined;
    });
  return state.stockCatalogPending;
}
export function loginState() {
  return state.stockLogin || { pending: false, message: "" };
}
export function startLogin() {
  if (state.stockLogin?.pending) return state.stockLogin;
  state.stockLogin = {
    pending: true,
    message:
      "Terminez la connexion dans la fenêtre officielle ouverte par Codex.",
  };
  const command = codexInvocation([
    "-c",
    "features.context_management=false",
    "-c",
    'forced_login_method="chatgpt"',
    "login",
  ]);
  const child = spawn(command.file, command.args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: subscriptionEnv(),
  });
  // Credentials and OAuth URLs stay inside the official CLI/browser flow.
  child.stdout.resume();
  child.stderr.resume();
  const timer = setTimeout(() => {
    child.kill();
  }, 600000);
  const finish = (ok: boolean) => {
    clearTimeout(timer);
    state.stockCatalog = undefined;
    state.stockLogin = {
      pending: false,
      message: ok
        ? "Connexion terminée. Actualisez le statut."
        : "Connexion non terminée. Réessayez dans un terminal avec npm run connect.",
    };
  };
  child.on("error", () => finish(false));
  child.on("close", (code) => finish(code === 0));
  return state.stockLogin;
}

export function activeModels(provider = readSettings().provider) {
  const s = readSettings();
  if (provider === "claude")
    return { model: s.claudeModel, recheckModel: s.claudeRecheckModel };
  if (provider === "gemini")
    return { model: s.geminiModel, recheckModel: s.geminiRecheckModel };
  return { model: s.model, recheckModel: s.recheckModel };
}
export async function connectionStatus(
  force = false,
  provider = readSettings().provider,
) {
  if (provider === "codex")
    return { ...(await codexStatus(force)), provider, label: "ChatGPT" };
  const { otherStatus } = await import("./providers.ts");
  return {
    ...(await otherStatus(provider, force)),
    provider,
    label: provider === "claude" ? "Claude" : "Gemini",
  };
}
