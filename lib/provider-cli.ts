import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
const packages = {
  claude: { name: "@anthropic-ai/claude-code", fallback: "cli.js" },
  gemini: { name: "@google/gemini-cli", fallback: "dist/index.js" },
} as const;
// Reads the entry point declared by the installed package, since its layout
// changes between releases (e.g. bundled builds no longer ship dist/index.js).
export function packageEntry(dir: string, provider: "claude" | "gemini") {
  let bin: unknown;
  try {
    bin = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).bin;
  } catch {
    return null;
  }
  const declared =
    typeof bin === "string"
      ? bin
      : bin && typeof bin === "object"
        ? (bin as Record<string, unknown>)[provider]
        : undefined;
  for (const relative of [declared, packages[provider].fallback]) {
    if (typeof relative !== "string" || !/\.[cm]?js$/.test(relative)) continue;
    const entry = path.join(dir, relative);
    if (existsSync(entry)) return entry;
  }
  return null;
}
export function providerInvocation(
  provider: "claude" | "gemini",
  args: string[],
) {
  const override =
    process.env[provider === "claude" ? "CLAUDE_BIN" : "GEMINI_BIN"];
  if (override) return { file: override, args };
  const roots = [
    path.join(process.cwd(), "node_modules"),
    ...(process.env.PATH || "")
      .split(path.delimiter)
      .map((p) => path.join(p, "node_modules")),
  ];
  for (const root of roots) {
    const script = packageEntry(
      path.join(root, packages[provider].name),
      provider,
    );
    if (script) return { file: process.execPath, args: [script, ...args] };
  }
  return { file: provider, args };
}
