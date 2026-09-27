import { readdirSync, lstatSync } from "node:fs";
import path from "node:path";
export const releaseRoots = [
  "project.config.json",
  "AGENTS.md",
  "app",
  "lib",
  "scripts",
  "tests",
  "docs",
  ".github",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "next-env.d.ts",
  ".gitignore",
  ".gitattributes",
  ".nvmrc",
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CHANGELOG.md",
  "Lancer.command",
  "Lancer.bat",
];
export function releaseFiles(root = process.cwd()) {
  const files = [];
  function visit(name) {
    const full = path.join(root, name),
      st = lstatSync(full);
    if (st.isSymbolicLink())
      throw Error("Lien symbolique interdit dans la distribution : " + name);
    if (st.isDirectory())
      for (const child of readdirSync(full)) visit(path.join(name, child));
    else files.push(name);
  }
  releaseRoots.forEach(visit);
  return files.sort();
}
