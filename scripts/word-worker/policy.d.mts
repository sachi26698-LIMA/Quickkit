export const limits: Readonly<{
  input: number;
  output: number;
  deadlineMs: number;
}>;
export function exportFilter(options: unknown): string;
export function jobArgs(image: string, name: string, filter: string): string[];
