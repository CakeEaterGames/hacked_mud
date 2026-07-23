import { toResultAsync, type ExecError } from "@backend/utils/neverthrow";
import { exec } from "child_process";
import { err, ok, ResultAsync } from "neverthrow";

export type ModuleInfo = {
  start: bigint;
  end: bigint;
  size: bigint;
  path: string;
};

export function getProcMaps(pid: number): ResultAsync<ModuleInfo[], ExecError> {
  return toResultAsync(_getProcMaps(pid));
}

async function _getProcMaps(pid: number): Promise<ResultAsync<ModuleInfo[], ExecError>> {
  const cmd = `cat /proc/${pid}/maps`;
  let stdout;
  try {
    stdout = (await execWithTimeout(cmd, 1000)).stdout;
  } catch (e) {
    return err({
      type: "EXEC_ERROR",
      cause: e as Error,
      cmd,
    } satisfies ExecError);
  }

  const lines = stdout.trim().split("\n");

  const modules = lines.map(line => {
    const [range, , , , , path] = line.split(/\s+/);
    const [start, end] = range!.split("-").map(addr => BigInt("0x" + addr));
    return { start: start!, end: end!, path: path || "", size: end! - start! };
  });

  return ok(modules);
}

async function execWithTimeout(command: string, timeoutMs = 5000) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });

    const timeout = setTimeout(() => {
      child.kill("SIGKILL"); // Force kill
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Clean up timeout if process completes
    child.on("exit", () => clearTimeout(timeout));
  });
}
