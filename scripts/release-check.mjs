import { readFileSync } from "node:fs";
import path from "node:path";
import { releaseFiles } from "./release-files.mjs";
export function checkRelease() {
  const files = releaseFiles();
  const problems = [];
  const forbiddenName =
    /(^|[/\\])(data|data-preview|originals|frames|runs|work|node_modules|\.next|\.codex|\.claude|\.gemini)([/\\]|$)|\.(sqlite|db|log)(-|$)|auth\.json|credentials\.json/i;
  const privateHome = new RegExp(
    "(?:" +
      ["/", "Users", "/"].join("") +
      "|" +
      ["/", "home", "/"].join("") +
      ")[a-zA-Z0-9_.-]+/",
  );
  const secret = new RegExp(
    "(?:sk" +
      "-[a-zA-Z0-9_-]{24,}|gh" +
      "[pousr]_[a-zA-Z0-9]{30,}|-----BEGIN " +
      "(?:RSA |EC |OPENSSH )?PRIVATE KEY-----)",
  );
  for (const file of files) {
    if (forbiddenName.test(file)) problems.push(file + ": fichier privé");
    const contents = readFileSync(file, "utf8");
    if (privateHome.test(contents))
      problems.push(file + ": chemin de compte local");
    if (secret.test(contents)) problems.push(file + ": secret potentiel");
    if (
      !/\.(tsx?|mjs|json|md|css|svg|yml|yaml|command|bat)$/.test(file) &&
      !["LICENSE", ".gitignore", ".gitattributes", ".nvmrc"].includes(path.basename(file))
    )
      problems.push(file + ": format non autorisé");
  }
  if (problems.length) throw Error(problems.join("\n"));
  console.log(
    `${files.length} fichiers publics vérifiés. Données, médias et identifiants exclus par liste d’inclusion.`,
  );
  return files;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve("scripts/release-check.mjs")
)
  checkRelease();
