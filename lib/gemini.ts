import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { subscriptionEnv } from "./connection.ts";
import { providerInvocation } from "./provider-cli.ts";

// ACP carries images directly; no @file expansion of untrusted inventory text.
export function geminiSettings(webSearch = false) {
  return {
    security: {
      auth: { selectedType: "oauth-personal", enforcedType: "oauth-personal" },
    },
    tools: { core: webSearch ? ["google_web_search", "web_fetch"] : [] },
    admin: {
      mcp: { enabled: false },
      extensions: { enabled: false },
      skills: { enabled: false },
    },
    hooksConfig: { enabled: false },
    skills: { enabled: false },
    context: {
      fileName: "STOCKATELIER-NO-CONTEXT.md",
      loadMemoryFromIncludeDirectories: false,
    },
    general: { maxSessionTurns: 12 },
    advanced: { ignoreLocalEnv: true },
    telemetry: { enabled: false },
  };
}
export function geminiSession(
  dir: string,
  webSearch = false,
  command = providerInvocation("gemini", ["--acp", "--extensions", "none"]),
) {
  mkdirSync(path.join(dir, ".gemini"), { recursive: true });
  writeFileSync(
    path.join(dir, ".gemini/settings.json"),
    JSON.stringify(geminiSettings(webSearch)),
  );
  const child = spawn(command.file, command.args, {
    cwd: dir,
    env: {
      ...subscriptionEnv(),
      GEMINI_CLI_NO_RELAUNCH: "1",
      NO_BROWSER: "true",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let diagnostic = "";
  child.stderr.on("data", (data) => {
    diagnostic = (diagnostic + data).slice(-12000);
  });
  child.stdin.on("error", () => {});
  // Resolves once the process is really gone: Windows keeps its folder locked until then.
  const exited = new Promise<void>((resolve) => {
    const done = () => resolve();
    child.once("close", done);
    child.once("error", done);
    setTimeout(done, 5000).unref();
  });
  const pending = new Map<
    number,
    { resolve: (v: any) => void; reject: (e: Error) => void }
  >();
  let id = 0,
    answer = "",
    searched = false;
  const lines = createInterface({ input: child.stdout });
  const failure = () =>
    /UNSUPPORTED_CLIENT|client is no longer supported|IneligibleTierError/.test(
      diagnostic,
    )
      ? Error(
          "Google refuse ce client Gemini CLI pour ce compte. Vérifiez les clients et offres actuellement pris en charge par Google. Aucun appel API payant n’a été effectué.",
        )
      : Error(
          "Gemini indisponible. Vérifiez la connexion Google dans Gemini CLI, puis réessayez.",
        );
  const fail = () => {
    for (const p of pending.values()) p.reject(failure());
    pending.clear();
  };
  const timer = setTimeout(() => {
    fail();
    child.kill("SIGKILL");
  }, 240000);
  child.on("error", fail);
  child.on("exit", fail);
  lines.on("line", (line) => {
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.method === "session/update") {
      const u = msg.params?.update;
      if (
        u?.sessionUpdate === "agent_message_chunk" &&
        u.content?.type === "text"
      ) {
        answer += u.content.text;
        if (answer.length > 2000000) {
          fail();
          child.kill();
        }
      }
      if (
        u?.sessionUpdate === "tool_call_update" &&
        u.status === "completed" &&
        u.kind === "search"
      )
        searched = true;
    } else if (msg.method && msg.id !== undefined) {
      // No file, terminal or tool permission is granted by this client.
      const response =
        msg.method === "session/request_permission"
          ? { result: { outcome: { outcome: "cancelled" } } }
          : { error: { code: -32601, message: "Unsupported operation" } };
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id: msg.id, ...response }) + "\n",
      );
    } else {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      if (msg.error) {
        if (
          /UNSUPPORTED_CLIENT|client is no longer supported|IneligibleTierError/.test(
            String(msg.error.message),
          )
        )
          diagnostic += " UNSUPPORTED_CLIENT";
        p.reject(failure());
      } else p.resolve(msg.result);
    }
  });
  const call = (method: string, params: object) =>
    new Promise<any>((resolve, reject) => {
      const current = ++id;
      pending.set(current, { resolve, reject });
      child.stdin.write(
        JSON.stringify({ jsonrpc: "2.0", id: current, method, params }) + "\n",
      );
    });
  return {
    call,
    result: () => ({ answer, searched }),
    close: () => {
      clearTimeout(timer);
      lines.close();
      child.kill();
      fail();
      return exited;
    },
    async open() {
      const info = await call("initialize", {
        protocolVersion: 1,
        clientCapabilities: {},
        clientInfo: { name: "smartatelier", version: "0.3.0" },
      });
      if (!info.agentCapabilities?.promptCapabilities?.image)
        throw Error(
          "Cette version de Gemini CLI ne prend pas en charge les images via ACP.",
        );
      return call("session/new", { cwd: dir, mcpServers: [] });
    },
  };
}
