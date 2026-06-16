import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny JSON-file persistence shared by the monitoring/rollup/audit features.
 * Same zero-config contract as store.ts — swap for Postgres on serverless.
 */
const DATA_DIR = path.join(process.cwd(), ".data");

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(file: string, data: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
