/**
 * Shell command utilities
 */

import { spawn, SpawnOptions } from "child_process";

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a shell command with proper error handling
 */
export function execCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode || 0,
      });
    });
  });
}

/**
 * Execute a command with timeout support
 */
export function execCommandWithTimeout(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
  timeoutMs: number = 5 * 60 * 1000 // 5 minutes default
): Promise<ShellResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.killed === false) {
          child.kill("SIGKILL");
        }
      }, 5000);
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (exitCode) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`));
      } else {
        resolve({
          stdout,
          stderr,
          exitCode: exitCode || 0,
        });
      }
    });
  });
}
