import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en .env.local");

// prepare:false recomendado con el pooler de Supabase.
const sql = postgres(url, { prepare: false });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
