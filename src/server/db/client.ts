import "server-only";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../env";
import * as legacy from "./legacy";
import * as tables from "./tables";

export const dbSchema = { ...tables, ...legacy };
export type Db = MySql2Database<typeof dbSchema>;

type Holder = { pool?: mysql.Pool; db?: Db };
// Survives dev HMR so we do not leak a pool per reload.
const globalHolder = globalThis as unknown as { __saidelhiDb?: Holder };
const holder: Holder = (globalHolder.__saidelhiDb ??= {});

export function createPool(url: string): mysql.Pool {
  return mysql.createPool({
    uri: url,
    connectionLimit: 10,
    timezone: "Z",
    charset: "utf8mb4",
    supportBigNumbers: true,
    decimalNumbers: true,
  });
}

export function getPool(): mysql.Pool {
  if (!holder.pool) {
    const url = env().DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    holder.pool = createPool(url);
  }
  return holder.pool;
}

export function createDb(pool: mysql.Pool): Db {
  return drizzle({ client: pool, schema: dbSchema, mode: "default" });
}

export function getDb(): Db {
  holder.db ??= createDb(getPool());
  return holder.db;
}

export async function pingDb(): Promise<boolean> {
  try {
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  await holder.pool?.end();
  holder.pool = undefined;
  holder.db = undefined;
}
