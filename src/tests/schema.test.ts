import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import * as schema from "@/src/db/schema";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

describe("schema", () => {
  it("define las 6 tablas con sus nombres", () => {
    expect(getTableConfig(schema.organizations).name).toBe("organizations");
    expect(getTableConfig(schema.users).name).toBe("users");
    expect(getTableConfig(schema.memberships).name).toBe("memberships");
    expect(getTableConfig(schema.projects).name).toBe("projects");
    expect(getTableConfig(schema.snapshots).name).toBe("snapshots");
    expect(getTableConfig(schema.assets).name).toBe("assets");
  });

  it("projects tiene columna entry_path y current_snapshot_id", () => {
    const cols = getTableConfig(schema.projects).columns.map((c) => c.name);
    expect(cols).toContain("entry_path");
    expect(cols).toContain("current_snapshot_id");
  });

  /**
   * Toda columna del esquema tiene que existir en el SQL que crea la base.
   *
   * Es el fallo más feo de esta casa: se añade una columna al esquema, TypeScript
   * la acepta, los tests pasan (usan dobles en memoria, no una base de datos de
   * verdad), el build va bien... y en producción salta
   * «column users.idioma does not exist» en la primera consulta. No hay nada
   * antes de producción que lo vea.
   *
   * Se lee el SQL y se saca qué columnas crea CADA TABLA, no solo qué nombres
   * aparecen sueltos por ahí. La primera versión de este test buscaba el nombre
   * en todo el fichero y daba por buena `users.idioma` porque `blog_settings`
   * ya tenía una columna que se llama igual. Pasaba sin la migración.
   */
  it("cada columna del esquema aparece en la migración DE SU TABLA", () => {
    const dir = resolve(process.cwd(), "drizzle");
    const sql = [
      ...readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => join(dir, f)),
      ...readdirSync(join(dir, "manual")).filter((f) => f.endsWith(".sql")).map((f) => join(dir, "manual", f)),
    ].map((f) => readFileSync(f, "utf-8")).join("\n");
    expect(sql.length, "no se ha leído ningún .sql").toBeGreaterThan(500);

    const limpio = (s: string) => s.replace(/"/g, "").trim().toLowerCase();
    const porTabla = new Map<string, Set<string>>();
    const meter = (tabla: string, col: string) => {
      const t = limpio(tabla);
      if (!porTabla.has(t)) porTabla.set(t, new Set());
      porTabla.get(t)!.add(limpio(col));
    };

    // CREATE TABLE x ( … );  → la primera palabra de cada línea del cuerpo.
    for (const m of sql.matchAll(/create table(?:\s+if not exists)?\s+("?[\w.]+"?)\s*\(([\s\S]*?)\n\s*\);/gi)) {
      for (const linea of m[2].split("\n")) {
        const c = linea.trim().match(/^("?\w+"?)\s+/);
        if (!c) continue;
        if (/^(constraint|primary|unique|foreign|check)$/i.test(limpio(c[1]))) continue;
        meter(m[1], c[1]);
      }
    }
    // ALTER TABLE x ADD COLUMN [IF NOT EXISTS] y
    for (const m of sql.matchAll(/alter table\s+("?[\w.]+"?)\s+add column(?:\s+if not exists)?\s+("?\w+"?)/gi)) {
      meter(m[1], m[2]);
    }

    const faltan: string[] = [];
    let revisadas = 0;
    for (const tabla of Object.values(schema)) {
      // El módulo exporta también helpers: `getTableConfig` es quien decide qué
      // es una tabla de verdad. Antes esto filtraba con `"_" in tabla`, y como
      // los objetos de Drizzle no tienen esa propiedad se saltaba LAS QUINCE:
      // la lista de fallos salía vacía y el test pasaba sin mirar nada.
      let cfg;
      try { cfg = getTableConfig(tabla as PgTable); } catch { continue; }
      if (!cfg?.columns?.length) continue;
      revisadas++;
      const suyas = porTabla.get(limpio(cfg.name));
      if (!suyas) { faltan.push(`${cfg.name} (la tabla entera)`); continue; }
      for (const col of cfg.columns) {
        if (!suyas.has(limpio(col.name))) faltan.push(`${cfg.name}.${col.name}`);
      }
    }
    // Y que de verdad haya mirado algo: es justo por lo que este test no servía.
    expect(revisadas, "no se ha revisado ninguna tabla").toBeGreaterThan(10);
    expect(faltan, `sin migración: ${faltan.join(", ")}`).toEqual([]);
  });
});
