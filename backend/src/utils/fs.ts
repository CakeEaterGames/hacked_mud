import * as path from "path";
import { mkdir } from "fs/promises";

export const mkdirRecursiveAsync = async (dirPath: string): Promise<void> => {
  const normalizedPath = path.resolve(dirPath);
  try {
    await mkdir(normalizedPath, { recursive: true });
  } catch (err) {
    const e = err as { code: string };
    if (e.code !== "EEXIST") throw e;
  }
};
