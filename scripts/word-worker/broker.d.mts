import type { Server } from "node:http";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
export function createBroker(config: {
  token: string;
  image: string;
  docker?: string;
  dockerHost?: string;
  deadlineMs?: number;
  run?: (
    file: string,
    args: string[],
    options: {
      env: Record<string, string>;
      timeout: number;
      maxBuffer: number;
    },
  ) => Promise<{ stdout: string }>;
  launch?: (
    file: string,
    args: string[],
    options: { env: Record<string, string>; stdio: string[] },
  ) => ChildProcessWithoutNullStreams;
}): Server;
