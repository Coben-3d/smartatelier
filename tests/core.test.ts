import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateAnalysis } from "../lib/schema.ts";
import { pixelDistance } from "../lib/media.ts";
process.env.INVENTORY_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), "atelier-test-"),
);
const {
  addItem,
  items,
  adjust,
  newBatch,
  save,
  validateBatch,
  projectAvailability,
  get,
  db,
} = await import("../lib/db.ts");
const frame = {
  id: "frame-1",
  mediaId: "m",
  path: "/tmp/image.jpg",
  timestamp: 2,
  width: 1000,
  height: 800,
};
const component = {
  name: "Résistance",
  reference: "220 Ω",
  category: "Passif",
  quantity: 3,
  confidence: 0.8,
  location: "A1",
  notes: "",
  observations: [
    { frameId: "frame-1", box: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } },
  ],
};
test("refuse les cadres hors image et les sources inconnues", () => {
  assert.throws(() =>
    validateAnalysis(
      {
        summary: "",
        warnings: [],
        components: [
          {
            ...component,
            observations: [
              { frameId: "frame-1", box: { x: 0.9, y: 0.1, w: 0.5, h: 0.3 } },
            ],
          },
        ],
      },
      [frame],
    ),
  );
  assert.throws(() =>
    validateAnalysis(
      { summary: "", warnings: [], components: [component] },
      [],
    ),
  );
});
test("validation obligatoire et idempotence du lot", () => {
  const before = items().length;
  const b = newBatch();
  b.media = [
    {
      id: "m",
      name: "vidéo",
      path: "/tmp/movie.mp4",
      kind: "video",
      frames: [frame],
    },
  ];
  b.status = "review";
  save("batches", b);
  assert.equal(items().length, before);
  const a = {
    summary: "3 résistances uniques",
    warnings: [],
    components: [component],
  };
  validateBatch(b.id, a);
  assert.equal(items().length, before + 1);
  assert.throws(() => validateBatch(b.id, a));
  assert.equal(items().length, before + 1);
});
test("stock jamais négatif et modifications persistées", () => {
  const i = addItem({ ...component, quantity: 1 });
  adjust(i.id, -1);
  adjust(i.id, -1);
  assert.equal(get<typeof i>("items", i.id).quantity, 0);
  assert.throws(() => adjust(i.id, 100));
  assert.equal(
    JSON.parse(
      String(db().prepare("SELECT data FROM items WHERE id=?").get(i.id)?.data),
    ).quantity,
    0,
  );
});
test("ne promet pas le même stock plusieurs fois à un projet", () => {
  const i = addItem({ ...component, quantity: 3 });
  const r = projectAvailability({
    title: "test",
    summary: "",
    warnings: [],
    requirements: [
      { name: "résistances", quantity: 2, itemId: i.id, reason: "" },
      { name: "autres résistances", quantity: 3, itemId: i.id, reason: "" },
      { name: "inconnu", quantity: 1, itemId: "unknown", reason: "" },
    ],
  });
  assert.deepEqual(
    r.map((x) => [x.take, x.missing]),
    [
      [2, 0],
      [1, 2],
      [0, 1],
    ],
  );
});
test("distance visuelle des vues identiques", () => {
  assert.equal(pixelDistance(Buffer.from([10, 50]), Buffer.from([10, 50])), 0);
  assert.equal(pixelDistance(Buffer.from([10, 50]), Buffer.from([20, 70])), 15);
});
