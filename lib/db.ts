import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  componentSchema,
  validateAnalysis,
  type Component,
  type Item,
  type Media,
  type Analysis,
  type Plan,
} from "./schema.ts";
export const dataRoot = path.resolve(
  /* turbopackIgnore: true */ process.env.INVENTORY_DATA_DIR ||
    path.join(process.cwd(), "data"),
);
type Batch = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  media: Media[];
  analysis: Analysis | null;
};
export type Project = {
  id: string;
  description: string;
  status: string;
  message: string;
  createdAt: string;
  plan: Plan | null;
  picked: string[];
};
const state = globalThis as unknown as { atelierDB?: DatabaseSync };
export function db() {
  if (state.atelierDB) return state.atelierDB;
  mkdirSync(dataRoot, { recursive: true });
  const d = new DatabaseSync(path.join(dataRoot, "inventory.sqlite"));
  d.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS batches(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rechecks(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS filament_profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL);`);
  state.atelierDB = d;
  for (const table of [
    "batches",
    "projects",
    "rechecks",
    "filament_profiles",
  ]) {
    for (const v of all<Batch | Project>(table)) {
      if (["queued", "processing"].includes(v.status)) {
        v.status = "error";
        v.message = "Traitement interrompu au redémarrage. Relancez l’analyse.";
        save(table, v);
      }
    }
  }
  return d;
}
export function all<T>(table: string): T[] {
  if (
    !["items", "batches", "projects", "rechecks", "filament_profiles"].includes(
      table,
    )
  )
    throw Error("Table inconnue");
  return db()
    .prepare(`SELECT data FROM ${table} ORDER BY rowid DESC`)
    .all()
    .map((r) => JSON.parse(String(r.data)));
}
export function get<T>(table: string, id: string): T {
  const v = all<T & { id: string }>(table).find((x) => x.id === id);
  if (!v) throw Error("Élément introuvable");
  return v;
}
export function save(table: string, value: { id: string }) {
  if (
    !["items", "batches", "projects", "rechecks", "filament_profiles"].includes(
      table,
    )
  )
    throw Error("Table inconnue");
  db()
    .prepare(
      `INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`,
    )
    .run(value.id, JSON.stringify(value));
  return value;
}
export function items() {
  return all<Item>("items");
}
export function batches() {
  return all<Batch>("batches");
}
export function addItem(value: unknown) {
  const c = componentSchema.parse(value);
  if (c.filament) c.category = "Filaments 3D";
  const item = { ...c, id: randomUUID(), createdAt: new Date().toISOString() };
  save("items", item);
  return item;
}
export function updateItem(id: string, value: unknown) {
  const old = get<Item>("items", id);
  const next = { ...old, ...componentSchema.parse(value) };
  if (next.filament) next.category = "Filaments 3D";
  save("items", next);
  return next;
}
export function deleteItem(id: string) {
  db().prepare("DELETE FROM items WHERE id=?").run(id);
}
export function adjust(id: string, delta: number) {
  if (delta !== 1 && delta !== -1) throw Error("Variation incorrecte");
  const item = get<Item>("items", id);
  item.quantity = Math.max(0, Math.min(100000, item.quantity + delta));
  save("items", item);
  return item;
}
export function newBatch() {
  const b: Batch = {
    id: randomUUID(),
    status: "queued",
    message: "Préparation des médias…",
    createdAt: new Date().toISOString(),
    media: [],
    analysis: null,
  };
  save("batches", b);
  return b;
}
export function validateBatch(id: string, value: unknown) {
  const b = get<Batch>("batches", id);
  if (b.status !== "review")
    throw Error("Ce lot est déjà validé ou n’est pas prêt.");
  const analysis = validateAnalysis(
    value,
    b.media.flatMap((m) => m.frames),
  );
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    for (const c of analysis.components) if (c.quantity > 0) addItem(c);
    b.analysis = analysis;
    b.status = "validated";
    b.message = "Ajouté à l’inventaire";
    save("batches", b);
    d.exec("COMMIT");
    return b;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
export function frameIndex() {
  return Object.fromEntries(
    batches().flatMap((b) =>
      b.media.flatMap((m) =>
        m.frames.map((f) => [
          f.id,
          { ...f, mediaName: m.name, originalPath: m.path, kind: m.kind },
        ]),
      ),
    ),
  );
}
export function projectAvailability(plan: Plan) {
  const stock = new Map(items().map((i) => [i.id, i]));
  const used = new Map<string, number>();
  return plan.requirements.map((r, index) => {
    const item = r.itemId ? stock.get(r.itemId) : undefined;
    const available = item
      ? Math.max(0, item.quantity - (used.get(item.id) || 0))
      : 0;
    const take = Math.min(r.quantity, available);
    if (item) used.set(item.id, (used.get(item.id) || 0) + take);
    return {
      ...r,
      index,
      item: item || null,
      available,
      take,
      missing: r.quantity - take,
    };
  });
}
export function snapshot() {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    items: items(),
    batches: batches(),
    projects: all<Project>("projects"),
    rechecks: all("rechecks"),
    filamentProfiles: all("filament_profiles"),
  };
}
