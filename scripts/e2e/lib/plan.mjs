// Ajustes en la base de datos para usuarios DE PRUEBAS: plan del espacio y
// confirmación del correo. Los e2e los necesitan porque no hay bandeja de
// entrada ni pasarela de pago en medio.
//
// GUARDA: solo actúa sobre correos @wordclicks.local (los que fabrican los e2e).
// Así es imposible tocar por error el espacio real de desarrollo. NO lee ni
// escribe org_settings: solo `plan` de organizations y `email_verificado_at`.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const require = createRequire(path.join(RAIZ, "package.json"));
const postgres = require("postgres");

const PLANES_VALIDOS = ["free", "personal", "agencia"];

function deTests(email) {
  const limpio = String(email ?? "").trim().toLowerCase();
  if (!limpio.endsWith("@wordclicks.local")) {
    throw new Error(`plan.mjs: solo para usuarios de prueba (@wordclicks.local), no "${limpio}"`);
  }
  return limpio;
}

function conexion() {
  const url = readFileSync(path.join(RAIZ, ".env.local"), "utf8").match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
  if (!url) throw new Error("Falta DATABASE_URL en .env.local");
  return postgres(url, { prepare: false, max: 1 });
}

// Cambia el plan de los espacios que posee un usuario de pruebas.
export async function ponerPlan(email, plan) {
  const limpio = deTests(email);
  if (!PLANES_VALIDOS.includes(plan)) throw new Error(`plan.mjs: plan desconocido "${plan}"`);
  const sql = conexion();
  try {
    await sql`
      UPDATE organizations SET plan = ${plan}
      WHERE id IN (
        SELECT m.org_id FROM memberships m
        JOIN users u ON u.id = m.user_id
        WHERE u.email = ${limpio} AND m.rol = 'owner'
      )`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function planAgencia(email) {
  return ponerPlan(email, "agencia");
}

// Da por confirmado el correo de un usuario de pruebas: publicar lo exige
// cuando el envío de correo está activo, y en los e2e no hay bandeja.
export async function marcarVerificado(email) {
  const limpio = deTests(email);
  const sql = conexion();
  try {
    await sql`UPDATE users SET email_verificado_at = now() WHERE email = ${limpio}`;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
