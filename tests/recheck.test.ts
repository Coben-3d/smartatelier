import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { cropRegion, makeCrops } from "../lib/recheck.ts";
import {
  applyIdentification,
  recheckRequestSchema,
  type Component,
  type Identification,
} from "../lib/schema.ts";
const component: Component = {
  name: "Module rouge",
  reference: "",
  category: "Autre",
  quantity: 7,
  location: "Tiroir B",
  notes: "Ma note",
  confidence: 0.5,
  observations: [{ frameId: "f", box: { x: 0, y: 0, w: 0.5, h: 0.5 } }],
};
const result: Identification = {
  name: "Famille M5StickC",
  reference: "",
  category: "Cartes et modules",
  confidence: 0.8,
  certainty: "probable",
  visibleText: ["M5"],
  evidence: ["Écran et bouton visibles"],
  alternatives: [],
  limitations: "Révision non lisible",
  nextPhoto: "Photographier le dos",
};
test("crop avec marge limité à la résolution originale", () => {
  assert.deepEqual(cropRegion({ x: 0, y: 0, w: 1, h: 1 }, 4032, 3024), {
    left: 0,
    top: 0,
    width: 4032,
    height: 3024,
  });
  assert.throws(() => cropRegion({ x: 0.9, y: 0, w: 0.5, h: 1 }, 100, 100));
});
test("seconde identification préserve quantité, emplacement, cadres et notes", () => {
  const updated = applyIdentification(component, result);
  assert.equal(updated.quantity, 7);
  assert.equal(updated.location, "Tiroir B");
  assert.deepEqual(updated.observations, component.observations);
  assert.ok(updated.notes.startsWith("Ma note"));
  assert.equal(updated.reference, "");
  assert.equal(component.name, "Module rouge");
});
test("la source et les cadres sont requis et le chemin du client ignoré", () => {
  assert.throws(() => recheckRequestSchema.parse({ component }));
  assert.throws(() =>
    recheckRequestSchema.parse({ component, batchId: "a", itemId: "b" }),
  );
  const value = recheckRequestSchema.parse({
    component: { ...component, id: "ignored" },
    batchId: "a",
    path: "/etc/passwd",
  });
  assert.equal("path" in value, false);
  assert.equal("id" in value.component, false);
});
test("EXIF orienté avant crop et utilisation de la photo originale", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "atelier-crop-"));
  const original = path.join(root, "original.jpg");
  await sharp({
    create: { width: 200, height: 100, channels: 3, background: "#336633" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toFile(original);
  const preview = path.join(root, "preview.jpg");
  await sharp(original).rotate().resize(20, 40).toFile(preview);
  const crops = await makeCrops(
    { itemId: "x", component, hint: "", observationIndex: 0 },
    {
      f: {
        id: "f",
        mediaId: "m",
        path: preview,
        originalPath: original,
        kind: "image",
        width: 20,
        height: 40,
        timestamp: null,
      },
    },
    root,
  );
  assert.equal(crops.length, 1);
  assert.equal(crops[0].width, 54);
  assert.equal(crops[0].height, 108);
  assert.equal(crops[0].timestamp, null);
});
