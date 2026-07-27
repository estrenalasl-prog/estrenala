import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function crear() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  // Transaction pooler de Supabase (puerto 6543): prepare:false es obligatorio.
  // Limitamos el pool y cerramos conexiones ociosas para no agotar el pooler.
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  return drizzle(sql, { schema });
}

type DrizzleDB = ReturnType<typeof crear>;
let instancia: DrizzleDB | null = null;

function real(): DrizzleDB {
  if (!instancia) instancia = crear();
  return instancia;
}

// PEREZOSO A PROPÓSITO: ni se exige DATABASE_URL ni se abre conexión hasta la
// primera consulta de verdad. Si esto se resolviera al importar el módulo,
// `next build` reventaría: al «recolectar datos de página» importa cada ruta, y
// el contenedor donde se construye la imagen NO tiene variables de entorno (el
// .env está fuera por .dockerignore, y con razón). Pasó el 2026-07-27 en el
// primer despliegue.
//
// El proxy ata las funciones a la instancia real; si no, `db.select()` perdería
// su `this` por el camino.
export const db = new Proxy({} as DrizzleDB, {
  get(_objetivo, prop) {
    const d = real() as unknown as Record<string | symbol, unknown>;
    const valor = d[prop];
    return typeof valor === "function" ? valor.bind(d) : valor;
  },
});

export type DB = typeof db;
