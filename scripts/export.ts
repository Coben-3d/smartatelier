import { writeFileSync } from "node:fs";
import path from "node:path";
import { snapshot, dataRoot } from "../lib/db.ts";
const out = path.resolve(
  process.argv[2] || path.join(dataRoot, "inventory-export.json"),
);
writeFileSync(out, JSON.stringify(snapshot(), null, 2));
console.log(out);
