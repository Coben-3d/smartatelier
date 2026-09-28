import {
  Codex,
  type CodexOptions,
  type ModelReasoningEffort,
  type Thread,
  type ThreadEvent,
  type ThreadOptions,
  type UserInput,
} from "@openai/codex-sdk";
import { subscriptionEnv } from "./connection.ts";

type Request = {
  prompt: string;
  schema: object;
  frames: { path: string }[];
  workingDirectory: string;
  model: string;
  effort?: string;
  webSearch: boolean;
  mcpServers: string[];
  timeoutMs?: number;
};
// Narrow SDK boundary also lets tests exercise failures without consuming quota.
type ClientFactory = (options: CodexOptions) => {
  startThread(options: ThreadOptions): Pick<Thread, "runStreamed">;
};
const efforts = new Set<string>([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
  "persistent",
]);
class AnalysisError extends Error {}
function providerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    /quota|usage.?limit|rate.?limit|429|credits|limit.*reached/i.test(message)
  )
    return new AnalysisError(
      "Limite Codex atteinte. Consultez l’usage de votre compte et attendez sa réinitialisation. Aucun autre fournisseur n’a été appelé.",
    );
  if (/401|unauthorized|authentication|log.?in|sign.?in/i.test(message))
    return new AnalysisError(
      "Connexion ChatGPT expirée ou refusée. Reconnectez Codex dans Connexion & modèles.",
    );
  // CLI stderr can contain local configuration; don't expose it to the browser.
  return new AnalysisError(
    "Codex n’a pas terminé l’analyse. Vérifiez Connexion & modèles ou lancez npm run doctor.",
  );
}

export async function runCodexStructured(
  request: Request,
  createClient: ClientFactory = (options) => new Codex(options),
) {
  if (request.effort && !efforts.has(request.effort))
    throw new AnalysisError(
      "Cet effort de raisonnement n’est pas pris en charge par le SDK installé. Actualisez les modèles ou mettez l’application à jour.",
    );
  const env = Object.fromEntries(
    Object.entries(subscriptionEnv()).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    request.timeoutMs ?? 240000,
  );
  try {
    const client = createClient({
      env,
      ...(process.env.CODEX_BIN
        ? { codexPathOverride: process.env.CODEX_BIN }
        : {}),
      // Use one inline TOML table: SDK/CLI dotted overrides don't preserve dots
      // in server names. A table merges enabled=false into each existing entry.
      configOverrides: [
        `mcp_servers={${request.mcpServers.map((name) => `${JSON.stringify(name)}={enabled=false}`).join(",")}}`,
      ],
      // The official CLI owns authentication. Never supply apiKey/baseUrl or copy auth files.
      config: {
        forced_login_method: "chatgpt",
        model_provider: "openai",
        features: {
          shell_tool: false,
          shell_snapshot: false,
          apps: false,
          plugins: false,
          remote_plugin: false,
          hooks: false,
          multi_agent: false,
          multi_agent_v2: false,
          browser_use: false,
          computer_use: false,
          image_generation: false,
          view_image: false,
          code_mode: false,
          // Needed by hosted web tools on current models; disabled for vision/projects.
          code_mode_host: request.webSearch,
          context_management: false,
          memories: false,
          skill_search: false,
          skill_mcp_dependency_install: false,
          tool_suggest: false,
        },
        notify: [],
        history: { persistence: "none" },
        memories: { generate_memories: false },
        project_doc_max_bytes: 0,
      },
    });
    // A fresh thread for every task: no inventory conversations are shared/resumed.
    const thread = client.startThread({
      workingDirectory: request.workingDirectory,
      skipGitRepoCheck: true,
      model: request.model,
      modelReasoningEffort: request.effort as ModelReasoningEffort | undefined,
      sandboxMode: "read-only",
      approvalPolicy: "never",
      webSearchMode: request.webSearch ? "live" : "disabled",
    });
    const input: UserInput[] = [
      { type: "text", text: request.prompt },
      ...request.frames.map(({ path }): UserInput => ({
        type: "local_image",
        path,
      })),
    ];
    const { events } = await thread.runStreamed(input, {
      outputSchema: request.schema,
      signal: controller.signal,
    });
    let complete = false;
    let response = "";
    let searched = false;
    const evidence: ThreadEvent[] = [];
    for await (const event of events) {
      if (event.type === "error") throw providerError(event.message);
      if (event.type === "turn.failed")
        throw providerError(event.error.message);
      if (event.type === "turn.completed") {
        complete = true;
        evidence.push(event);
      }
      if (
        event.type === "item.started" ||
        event.type === "item.updated" ||
        event.type === "item.completed"
      ) {
        const item = event.item;
        // Defence in depth: tool execution isn't part of inventory analysis.
        if (
          ["command_execution", "file_change", "mcp_tool_call"].includes(
            item.type,
          )
        )
          throw new AnalysisError(
            "Codex a proposé un outil non autorisé pour cette analyse. Traitement annulé.",
          );
        if (item.type === "web_search" && !request.webSearch)
          throw new AnalysisError(
            "Recherche web inattendue : analyse annulée.",
          );
        if (event.type === "item.completed") {
          if (item.type === "agent_message") response = item.text;
          // SDK ErrorItem is a non-fatal diagnostic (e.g. Code Mode disabled).
          // Reject ignored configuration so restrictions cannot silently vanish.
          if (
            item.type === "error" &&
            /unrecognized configuration|configuration setting.*ignored/i.test(
              item.message,
            )
          )
            throw new AnalysisError(
              "Réglage Codex non reconnu. Mettez à jour les dépendances avec npm ci puis réessayez.",
            );
          if (item.type === "web_search") {
            searched = true;
            evidence.push(event);
          }
        }
      }
    }
    if (!complete || !response.trim())
      throw new AnalysisError(
        "Réponse Codex incomplète. Aucun résultat n’a été ajouté au stock.",
      );
    if (request.webSearch && !searched)
      throw new AnalysisError(
        "Aucune recherche web effectuée. Relancez la recherche fabricant.",
      );
    let value: unknown;
    try {
      value = JSON.parse(response);
    } catch {
      throw new AnalysisError(
        "Réponse Codex non conforme au JSON attendu. Relancez l’analyse.",
      );
    }
    return { value, evidence };
  } catch (error) {
    if (controller.signal.aborted)
      throw new AnalysisError(
        "Codex a dépassé le délai de traitement. Réessayez avec moins d’images.",
      );
    if (error instanceof AnalysisError) throw error;
    throw providerError(error);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
