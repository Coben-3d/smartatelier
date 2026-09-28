import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  ThreadEvent,
  UserInput,
  CodexOptions,
  ThreadOptions,
} from "@openai/codex-sdk";
import { runCodexStructured } from "../lib/codex-sdk.ts";
import { configuredCodexMcpServers } from "../lib/connection.ts";
const request = {
  prompt: "Identifier les images dans l’ordre.",
  schema: {
    type: "object",
    properties: { ok: { type: "boolean" } },
    required: ["ok"],
    additionalProperties: false,
  },
  frames: [
    { path: path.resolve("first image.jpg") },
    { path: path.resolve("second.jpg") },
  ],
  workingDirectory: tmpdir(),
  model: "model-from-account",
  effort: "medium",
  webSearch: false,
  mcpServers: ["personal.server"],
};
const answer: ThreadEvent = {
  type: "item.completed",
  item: { id: "a", type: "agent_message", text: '{"ok":true}' },
};
const done: ThreadEvent = {
  type: "turn.completed",
  usage: {
    input_tokens: 1,
    cached_input_tokens: 0,
    cache_write_input_tokens: 0,
    reasoning_output_tokens: 0,
    output_tokens: 1,
  },
};
const web: ThreadEvent = {
  type: "item.completed",
  item: { id: "w", type: "web_search", query: "manufacturer" },
};
const fake = (events: ThreadEvent[]) => () => ({
  startThread: () => ({
    runStreamed: async () => ({
      events: (async function* () {
        yield* events;
      })(),
    }),
  }),
});

test("SDK reçoit les vues dans l’ordre, le schéma et des restrictions sans clé API", async () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-only-never-use";
  try {
    let sdk: CodexOptions | undefined;
    let thread: ThreadOptions | undefined;
    const result = await runCodexStructured(request, (options) => {
      sdk = options;
      return {
        startThread: (options) => {
          thread = options;
          return {
            runStreamed: async (input, turn) => {
              assert.deepEqual(input, [
                { type: "text", text: request.prompt },
                ...request.frames.map((f): UserInput => ({
                  type: "local_image",
                  path: f.path,
                })),
              ] satisfies UserInput[]);
              assert.deepEqual(turn?.outputSchema, request.schema);
              assert.equal(turn?.signal?.aborted, false);
              return {
                events: (async function* () {
                  yield answer;
                  yield done;
                })(),
              };
            },
          };
        },
      };
    });
    assert.deepEqual(result.value, { ok: true });
    assert.equal(sdk?.apiKey, undefined);
    assert.equal(sdk?.env?.OPENAI_API_KEY, undefined);
    assert.equal(sdk?.config?.forced_login_method, "chatgpt");
    assert.equal(sdk?.config?.model_provider, "openai");
    assert.deepEqual(sdk?.configOverrides, [
      'mcp_servers={"personal.server"={enabled=false}}',
    ]);
    assert.equal(
      (sdk?.config?.features as Record<string, boolean>).hooks,
      false,
    );
    assert.equal(thread?.workingDirectory, request.workingDirectory);
    assert.equal(thread?.sandboxMode, "read-only");
    assert.equal(thread?.approvalPolicy, "never");
    assert.equal(thread?.model, request.model);
    assert.equal(thread?.webSearchMode, "disabled");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previous;
  }
});
test("refuse réponses tronquées, JSON invalide et erreurs de tour ou de flux", async () => {
  for (const events of [
    [answer],
    [done],
    [
      {
        ...answer,
        item: { id: "a", type: "agent_message", text: "pas du JSON" },
      },
      done,
    ],
    [answer, { type: "turn.failed", error: { message: "failed" } }],
    [answer, { type: "error", message: "fatal" }],
  ] as ThreadEvent[][])
    await assert.rejects(runCodexStructured(request, fake(events)));
});
test("recherche fabricant acceptée uniquement avec un événement web terminé", async () => {
  await assert.rejects(
    runCodexStructured({ ...request, webSearch: true }, fake([answer, done])),
    /Aucune recherche web/,
  );
  await assert.rejects(
    runCodexStructured(
      { ...request, webSearch: true },
      fake([{ ...web, type: "item.started" }, answer, done]),
    ),
    /Aucune recherche web/,
  );
  const result = await runCodexStructured(
    { ...request, webSearch: true },
    fake([web, answer, done]),
  );
  assert.deepEqual(result.evidence, [web, done]);
  await assert.rejects(
    runCodexStructured(request, fake([web, answer, done])),
    /inattendue/,
  );
});
test("annule si un outil MCP ou shell est proposé", async () => {
  const item: ThreadEvent = {
    type: "item.started",
    item: {
      id: "m",
      type: "command_execution",
      command: "unexpected",
      aggregated_output: "",
      status: "in_progress",
    },
  };
  await assert.rejects(
    runCodexStructured(request, fake([item, answer, done])),
    /outil non autorisé/,
  );
});
test("quota et session refusée remontent sans exposer les diagnostics sensibles", async () => {
  await assert.rejects(
    runCodexStructured(
      request,
      fake([{ type: "error", message: "429 quota secret-detail" }]),
    ),
    (e) =>
      /Limite Codex/.test(String(e)) && !String(e).includes("secret-detail"),
  );
  await assert.rejects(
    runCodexStructured(
      request,
      fake([
        {
          type: "turn.failed",
          error: { message: "401 unauthorized secret-detail" },
        },
      ]),
    ),
    (e) =>
      /Connexion ChatGPT/.test(String(e)) &&
      !String(e).includes("secret-detail"),
  );
});
test("le délai annule le signal transmis au SDK", async () => {
  await assert.rejects(
    runCodexStructured({ ...request, timeoutMs: 10 }, () => ({
      startThread: () => ({
        runStreamed: async (_input, options) => ({
          events: (async function* () {
            await new Promise<void>((resolve) =>
              options!.signal!.addEventListener("abort", () => resolve(), {
                once: true,
              }),
            );
            throw Error("aborted");
          })(),
        }),
      }),
    })),
    /délai/,
  );
});
test("lit les noms MCP effectifs via le protocole officiel sans restituer les valeurs", async () => {
  const scratch = mkdtempSync(path.join(tmpdir(), "smartatelier-config-test-"));
  const previous = process.env.CODEX_HOME;
  try {
    // Isolated unauthenticated CLI profile, never touch the user's auth/config files.
    process.env.CODEX_HOME = scratch;
    writeFileSync(
      path.join(scratch, "config.toml"),
      '[mcp_servers."personal.server"]\ncommand="must-never-run"\n[mcp_servers."personal.server".env]\nPRIVATE="not-returned"\n',
    );
    assert.deepEqual(await configuredCodexMcpServers(scratch), [
      "personal.server",
    ]);
  } finally {
    if (previous === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previous;
    rmSync(scratch, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
});

test("un diagnostic non fatal n’annule pas un résultat complet, une restriction ignorée bloque", async () => {
  const warning: ThreadEvent = {
    type: "item.completed",
    item: {
      id: "warning",
      type: "error",
      message: "Code Mode is unavailable because code-mode host is disabled.",
    },
  };
  assert.deepEqual(
    (await runCodexStructured(request, fake([warning, answer, done]))).value,
    { ok: true },
  );
  await assert.rejects(
    runCodexStructured(
      request,
      fake([
        {
          ...warning,
          item: {
            id: "warning",
            type: "error",
            message: "Codex is ignoring 1 unrecognized configuration setting.",
          },
        },
        answer,
        done,
      ]),
    ),
    /Réglage Codex non reconnu/,
  );
});

test("moteur web activé uniquement pour le fabricant, restrictions locales conservées", async () => {
  for (const webSearch of [false, true]) {
    await runCodexStructured({ ...request, webSearch }, (options) => {
      const features = options.config!.features as Record<string, boolean>;
      assert.equal(features.code_mode_host, webSearch);
      for (const key of [
        "shell_tool",
        "apps",
        "plugins",
        "hooks",
        "multi_agent",
        "browser_use",
        "computer_use",
        "view_image",
      ])
        assert.equal(features[key], false);
      assert.deepEqual(options.configOverrides, [
        'mcp_servers={"personal.server"={enabled=false}}',
      ]);
      return fake(webSearch ? [web, answer, done] : [answer, done])();
    });
  }
});
