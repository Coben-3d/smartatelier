import { test } from "node:test";
import assert from "node:assert/strict";
import { selectModel, subscriptionEnv, type Model } from "../lib/connection.ts";
const model = (name: string, opts: Partial<Model> = {}): Model => ({
  model: name,
  displayName: name,
  defaultReasoningEffort: "low",
  supportedReasoningEfforts: [{ reasoningEffort: "low" }],
  isDefault: false,
  inputModalities: ["text", "image"],
  ...opts,
});
test("catalogue adapté au compte : aucun nom de modèle ni offre imposés", () => {
  for (const catalog of [
    [model("free-vision", { isDefault: true })],
    [model("plus-vision", { isDefault: true }), model("plus-other")],
    [model("pro-default", { isDefault: true }), model("pro-other")],
  ]) {
    const selected = selectModel(catalog, undefined, true, "high");
    assert.equal(selected.model, catalog[0].model);
    assert.equal(selected.effort, "low");
  }
});
test("refuse modèle absent, modèle texte pour photo et catalogue vide sans substitution", () => {
  assert.throws(() =>
    selectModel(
      [model("text", { isDefault: true, inputModalities: ["text"] })],
      undefined,
      true,
    ),
  );
  assert.throws(() => selectModel([model("visible")], "inaccessible", false));
  assert.throws(() => selectModel([], undefined, true));
  assert.equal(
    selectModel(
      [
        model("text", { isDefault: true, inputModalities: ["text"] }),
        model("vision"),
      ],
      undefined,
      true,
    ).model,
    "vision",
  );
  assert.equal(
    selectModel(
      [model("text", { isDefault: true, inputModalities: ["text"] })],
      undefined,
      false,
    ).model,
    "text",
  );
});
test("l’environnement transmis ne permet pas un fallback API", () => {
  const keys = [
    "OPENAI_API_KEY",
    "OPENAI_BASE_URL",
    "CODEX_API_KEY",
    "ANTHROPIC_API_KEY",
  ];
  const old = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    for (const k of keys) process.env[k] = "test-only";
    const env = subscriptionEnv();
    for (const k of keys) assert.equal(env[k], undefined);
    assert.equal(process.env.OPENAI_API_KEY, "test-only");
  } finally {
    for (const k of keys)
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
  }
});
