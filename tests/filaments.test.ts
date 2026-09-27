import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  componentSchema,
  emptyFilament,
  profileKey,
  canResearchFilament,
  printProfileSchema,
  validateAnalysis,
  type PrintProfile,
} from "../lib/schema.ts";
process.env.INVENTORY_DATA_DIR = mkdtempSync(
  path.join(tmpdir(), "atelier-filament-test-"),
);
const {
  addItem,
  updateItem,
  get,
  save,
  snapshot,
  newBatch,
  validateBatch,
  items,
} = await import("../lib/db.ts");
const { ensureFilamentProfile } = await import("../lib/filaments.ts");
const c = {
  name: "Bobine rouge",
  reference: "",
  category: "Filaments 3D",
  quantity: 1,
  confidence: 0.8,
  location: "",
  notes: "",
  observations: [],
  filament: {
    ...emptyFilament(),
    brand: "Bambu Lab",
    product: "PLA Basic",
    polymer: "PLA",
    color: "Rouge",
    diameterMm: 1.75,
    netWeightG: 1000,
    remainingWeightG: 420,
  },
};
test("anciens composants compatibles, données de bobine persistées et exportées", () => {
  const { filament, ...old } = c;
  assert.equal(componentSchema.parse(old).filament, undefined);
  const item = addItem(c);
  updateItem(item.id, {
    ...c,
    filament: { ...c.filament, remainingWeightG: 0 },
  });
  assert.equal(
    get<typeof item>("items", item.id).filament?.remainingWeightG,
    0,
  );
  assert.equal(
    snapshot().items.find((i) => i.id === item.id)?.filament?.brand,
    "Bambu Lab",
  );
  assert.throws(() =>
    addItem({ ...c, filament: { ...c.filament, remainingWeightG: -5 } }),
  );
});
test("inconnues acceptées, pas de recherche avant identification, poids sans nouvelle recherche", () => {
  assert.equal(canResearchFilament(emptyFilament()), false);
  assert.equal(canResearchFilament({ ...c.filament, product: "" }), false);
  assert.equal(canResearchFilament(c.filament), true);
  assert.equal(
    profileKey(c.filament),
    profileKey({ ...c.filament, remainingWeightG: 25 }),
  );
  assert.notEqual(
    profileKey(c.filament),
    profileKey({ ...c.filament, polymer: "PETG" }),
  );
  assert.equal(
    ensureFilamentProfile(addItem({ ...c, filament: emptyFilament() })),
    null,
  );
  const job: PrintProfile = {
    id: profileKey(c.filament),
    filament: c.filament,
    status: "processing",
    createdAt: new Date().toISOString(),
    message: "test",
    result: null,
  };
  save("filament_profiles", job);
  assert.equal(ensureFilamentProfile(addItem(c), true)?.status, "processing");
});
test("réglages refusés sans source ou pour une référence ambiguë", () => {
  const p = {
    match: "exact",
    productName: "PLA Basic",
    summary: "",
    settings: [
      {
        parameter: "Buse",
        value: "test",
        conditions: "",
        sourceUrl: "https://example.com/tds",
      },
    ],
    sources: [],
    warnings: [],
  };
  assert.throws(() => printProfileSchema.parse(p));
  assert.throws(() =>
    printProfileSchema.parse({
      ...p,
      match: "uncertain",
      sources: [{ title: "Fiche", url: "https://example.com/tds" }],
    }),
  );
  assert.throws(() =>
    printProfileSchema.parse({
      ...p,
      settings: [],
      sources: [{ title: "Mauvais lien", url: "javascript:alert(1)" }],
    }),
  );
  assert.equal(
    printProfileSchema.parse({ ...p, match: "not_found", settings: [] })
      .settings.length,
    0,
  );
});
test("lot mixte conserve les champs et cadres de plusieurs bobines après validation", () => {
  const b = newBatch();
  const frame = {
    id: "photo",
    mediaId: "media",
    path: "/tmp/photo.jpg",
    timestamp: null,
    width: 1200,
    height: 800,
  };
  b.media = [
    {
      id: "media",
      name: "photo.jpg",
      path: frame.path,
      kind: "image",
      frames: [frame],
    },
  ];
  b.status = "review";
  save("batches", b);
  const analysis = {
    summary: "Deux bobines et un module",
    warnings: [],
    components: [
      {
        ...c,
        observations: [
          { frameId: "photo", box: { x: 0, y: 0, w: 0.3, h: 0.8 } },
        ],
      },
      {
        ...c,
        name: "Bobine bleue inconnue",
        filament: { ...emptyFilament(), color: "Bleu" },
        observations: [
          { frameId: "photo", box: { x: 0.4, y: 0, w: 0.3, h: 0.8 } },
        ],
      },
      {
        ...c,
        name: "Module",
        filament: null,
        observations: [
          { frameId: "photo", box: { x: 0.8, y: 0, w: 0.1, h: 0.1 } },
        ],
      },
    ],
  };
  assert.equal(
    validateAnalysis(analysis, [frame]).components[1].filament?.polymer,
    "",
  );
  const before = items().length;
  validateBatch(b.id, analysis);
  assert.equal(items().length, before + 3);
  assert.equal(
    items().find((i) => i.name === "Bobine bleue inconnue")?.filament
      ?.remainingWeightG,
    null,
  );
});

test("une photo de plusieurs bobines conserve cadres et nuances distinctes", () => {
  const frame = {
    id: "spools",
    mediaId: "photo",
    path: "test.jpg",
    timestamp: null,
    width: 1200,
    height: 800,
  };
  const analysis = validateAnalysis(
    {
      summary: "Trois bobines",
      warnings: [],
      components: ["#d74440", "#367cc2", "#4b9964"].map((colorHex, i) => ({
        ...c,
        category: "Autre",
        observations: [
          { frameId: frame.id, box: { x: i * 0.3, y: 0.1, w: 0.25, h: 0.7 } },
        ],
        filament: {
          ...emptyFilament(),
          color: ["Rouge", "Bleu", "Vert"][i],
          colorHex,
        },
      })),
    },
    [frame],
  );
  assert.equal(
    analysis.components.reduce((n, item) => n + item.quantity, 0),
    3,
  );
  const batch = newBatch();
  const preparedBatch = {
    ...batch,
    status: "review",
    analysis,
    media: [
      {
        id: "photo",
        name: "bobines.jpg",
        path: "test.jpg",
        kind: "image",
        frames: [frame],
      },
    ],
  };
  save("batches", preparedBatch);
  const before = items().length;
  validateBatch(batch.id, analysis);
  const added = items().slice(0, 3);
  assert.equal(items().length, before + 3);
  assert.ok(
    added.every(
      (item) =>
        item.category === "Filaments 3D" &&
        item.quantity === 1 &&
        item.observations.length === 1,
    ),
  );
  assert.deepEqual(
    new Set(added.map((item) => item.filament?.colorHex)),
    new Set(["#d74440", "#367cc2", "#4b9964"]),
  );
  assert.ok(
    added.every(
      (item) =>
        item.filament?.polymer === "" &&
        item.filament?.remainingWeightG === null,
    ),
  );
  assert.throws(() =>
    componentSchema.parse({
      ...c,
      filament: { ...c.filament, colorHex: "red;url(bad)" },
    }),
  );
});
