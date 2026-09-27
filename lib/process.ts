import { spawn } from "node:child_process";
import path from "node:path";
export function run(
  binary: string,
  args: string[],
  options: {
    cwd?: string;
    input?: string;
    timeout?: number;
    env?: NodeJS.ProcessEnv;
    allowedExitCodes?: number[];
  } = {},
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(binary, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(Error("Délai dépassé. Réessayez avec moins de médias."));
    }, options.timeout || 180000);
    child.stdout.on("data", (d) => {
      stdout = (stdout + d).slice(-2000000);
    });
    child.stderr.on("data", (d) => {
      stderr = (stderr + d).slice(-6000);
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      (options.allowedExitCodes || [0]).includes(code ?? -1)
        ? resolve({ stdout, stderr })
        : reject(
            Error(
              `Échec ${path.basename(binary)} (${code}). ${stderr.slice(-1600)}`,
            ),
          );
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input || "");
  });
}
