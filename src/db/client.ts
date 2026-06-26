import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Falta DATABASE_URL en .env.local");

// Transaction pooler de Supabase (puerto 6543): prepare:false es obligatorio.
// Limitamos el pool y cerramos conexiones ociosas para no agotar el pooler.
const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
export const db = drizzle(sql, { schema });
export type DB = typeof db;
