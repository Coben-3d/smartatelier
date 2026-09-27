import { existsSync } from "node:fs";
import path from "node:path";
export function providerInvocation(
  provider: "claude" | "gemini",
  args: string[],
) {
  const override =
    process.env[provider === "claude" ? "CLAUDE_BIN" : "GEMINI_BIN"];
  if (override) return { file: override, args };
  const entry =
    provider === "claude"
      ? "@anthropic-ai/claude-code/cli.js"
      : "@google/gemini-cli/dist/index.js";
  const roots = [
    path.join(process.cwd(), "node_modules"),
    ...(process.env.PATH || "")
      .split(path.delimiter)
      .map((p) => path.join(p, "node_modules")),
  ];
  for (const root of roots) {
    const script = path.join(root, entry);
    if (existsSync(script))
      return { file: process.execPath, args: [script, ...args] };
  }
  return { file: provider, args };
}
