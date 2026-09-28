import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  claudeAuth,
  claudeRequest,
  parseClaudeResult,
  parseJsonAnswer,
} from "../lib/providers.ts";
import { geminiSession } from "../lib/gemini.ts";
import { packageEntry } from "../lib/provider-cli.ts";
import {
  readSettings,
  writeSettings,
  activeModels,
} from "../lib/connection.ts";
test("Claude refuse les connexions API même authentifiées", () => {
  assert.equal(claudeAuth({ loggedIn: true, authMethod: "claude.ai" }), true);
  assert.equal(claudeAuth({ loggedIn: true, authMethod: "api_key" }), false);
  assert.equal(claudeAuth({ loggedIn: false, authMethod: "claude.ai" }), false);
});
test("Claude reçoit les images dans l’ordre et aucun outil local", () => {
  const request = claudeRequest(
    "Analyse",
    { type: "object" },
    ["first", "second"],
    "sonnet",
    false,
  );
  const content = JSON.parse(request.input).message.content;
  assert.deepEqual(
    content.slice(1).map((p: any) => p.source.data),
    ["first", "second"],
  );
  assert.equal(request.args[request.args.indexOf("--tools") + 1], "");
  assert.ok(request.args.includes("--strict-mcp-config"));
  assert.ok(!request.args.includes("--dangerously-skip-permissions"));
});
test("JSON strict et recherches web réellement terminées", () => {
  assert.deepEqual(parseJsonAnswer('```json\n{"ok":true}\n```'), { ok: true });
  assert.throws(() => parseJsonAnswer('Voici {"ok":true}'));
  const result = JSON.stringify({
    type: "result",
    structured_output: { ok: true },
  });
  assert.deepEqual(parseClaudeResult(result, false), { ok: true });
  assert.throws(() => parseClaudeResult(result, true));
  assert.throws(() =>
    parseClaudeResult(
      JSON.stringify({ type: "result", is_error: true, structured_output: {} }),
      false,
    ),
  );
  const search = JSON.stringify({
    message: { content: [{ type: "tool_use", name: "WebSearch", id: "s" }] },
  });
  assert.throws(() => parseClaudeResult(search + "\n" + result, true));
  const done = JSON.stringify({
    message: { content: [{ type: "tool_result", tool_use_id: "s" }] },
  });
  assert.deepEqual(parseClaudeResult([search, done, result].join("\n"), true), {
    ok: true,
  });
});
test("les modèles de chaque fournisseur restent séparés, anciens réglages compatibles", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "stock-settings-"));
  const old = process.env.INVENTORY_DATA_DIR;
  process.env.INVENTORY_DATA_DIR = dir;
  try {
    writeSettings({ model: "legacy", recheckModel: "legacy-review" });
    assert.equal(readSettings().provider, "codex");
    writeSettings({
      ...readSettings(),
      provider: "claude",
      claudeModel: "sonnet",
    });
    assert.equal(activeModels().model, "sonnet");
    assert.equal(activeModels("codex").model, "legacy");
    assert.equal(activeModels("gemini").model, "");
    assert.throws(() => writeSettings({ provider: "unapproved" }));
  } finally {
    if (old === undefined) delete process.env.INVENTORY_DATA_DIR;
    else process.env.INVENTORY_DATA_DIR = old;
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
});
test("Gemini ACP : transmission image, assemblage JSON, refus des permissions et absence de clé API", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "stock-acp-"));
  const old = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "must-not-leak";
  const session = geminiSession(dir, false, {
    file: process.execPath,
    args: [path.resolve("tests/fixtures/gemini-acp.mjs")],
  });
  try {
    const s = await session.open();
    const result = await session.call("session/prompt", {
      sessionId: s.sessionId,
      prompt: [{ type: "image", data: "image-data", mimeType: "image/jpeg" }],
    });
    assert.equal(result.stopReason, "end_turn");
    assert.deepEqual(parseJsonAnswer(session.result().answer), {
      image: "image-data",
      mimeType: "image/jpeg",
      permission: "cancelled",
      key: null,
    });
    assert.equal(session.result().searched, false);
    const settings = JSON.parse(
      readFileSync(path.join(dir, ".gemini/settings.json"), "utf8"),
    );
    assert.deepEqual(settings.tools.core, []);
    assert.equal(settings.security.auth.enforcedType, "oauth-personal");
    assert.equal(settings.admin.mcp.enabled, false);
  } finally {
    await session.close();
    if (old === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = old;
    rmSync(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    });
  }
});

test("session Claude expirée : erreur exploitable, sans exposer la réponse brute", () => {
  assert.throws(
    () =>
      parseClaudeResult(
        JSON.stringify({
          type: "result",
          is_error: true,
          result: "401 OAuth access token is invalid",
        }),
        false,
      ),
    /Session Claude expirée/,
  );
});

test("point d’entrée des CLI lu dans package.json, ancien chemin en secours", () => {
  const root = mkdtempSync(path.join(tmpdir(), "stock-cli-"));
  const write = (file: string, content = "") => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  };
  try {
    write("bundled/package.json", '{"bin":{"gemini":"bundle/gemini.js"}}');
    write("bundled/bundle/gemini.js");
    assert.equal(
      packageEntry(path.join(root, "bundled"), "gemini"),
      path.join(root, "bundled/bundle/gemini.js"),
    );
    write("legacy/package.json", "{}");
    write("legacy/dist/index.js");
    assert.equal(
      packageEntry(path.join(root, "legacy"), "gemini"),
      path.join(root, "legacy/dist/index.js"),
    );
    write("native/package.json", '{"bin":{"claude":"bin/claude.exe"}}');
    write("native/bin/claude.exe");
    assert.equal(packageEntry(path.join(root, "native"), "claude"), null);
    assert.equal(packageEntry(path.join(root, "absent"), "gemini"), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
