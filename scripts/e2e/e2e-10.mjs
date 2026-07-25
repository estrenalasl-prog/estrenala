// E2e del incremento 10 (transferir propiedad): guardas de la ruta.
// El swap real de roles necesita DOS usuarios en la misma org (por HTTP exige el
// token de invitación por correo); eso queda cubierto por los tests unitarios.
// Aquí, con un usuario DESECHABLE (org propia, único miembro), se comprueban las
// guardas sin tocar el e2e compartido ni la org de dev.
import { readFileSync } from "node:fs";

const RAIZ = "C:/Users/Sebas/Desktop/Carpeta de Proyectos/Wordclicks";
const BASE = "http://localhost:3000";
readFileSync(RAIZ + "/.env.local", "utf8"); // guarda: existe

let PASS = 0, FAIL = 0;
function check(n, c, e = "") {
  if (c) { PASS++; console.log(`  PASS  ${n}`); }
  else { FAIL++; console.log(`  FAIL  ${n}${e ? " — " + e : ""}`); }
}

const J = { "content-type": "application/json" };
const email = `e2e-transf-${Date.now()}@wordclicks.local`;
const password = "e2e-clave-fija-para-pruebas-123";

let r = await fetch(`${BASE}/api/registro`, {
  method: "POST", headers: J, body: JSON.stringify({ nombre: "E2E Transf", email, password }),
});
const cookie = (r.headers.get("set-cookie") ?? "").split(";")[0];
check("registro desechable → sesión", r.ok && cookie.startsWith("wc_session="), String(r.status));
const HJ = { cookie, "content-type": "application/json" };

// yo mismo: mi userId lo saco del equipo (soy el único miembro, propietario)
const equipo = await (await fetch(`${BASE}/api/equipo`, { headers: { cookie } })).json();
const yo = equipo?.yo;
check("soy propietario y único miembro", equipo?.rol === "owner" && (equipo?.miembros?.length ?? 0) === 1, JSON.stringify(equipo));

// transferir a mí mismo → 400
r = await fetch(`${BASE}/api/equipo/transferir`, { method: "POST", headers: HJ, body: JSON.stringify({ userId: yo }) });
let d = await r.json();
check("transferir a mí mismo → 400 mensaje exacto", r.status === 400 && d.error === "Elige a otra persona del espacio", JSON.stringify(d));

// transferir a un UUID que no es miembro → 404
r = await fetch(`${BASE}/api/equipo/transferir`, { method: "POST", headers: HJ, body: JSON.stringify({ userId: "00000000-0000-4000-8000-000000000abc" }) });
d = await r.json();
check("transferir a un no-miembro → 404 mensaje exacto", r.status === 404 && d.error === "Esa persona no está en el espacio", JSON.stringify(d));

// sigo siendo propietario (no se transfirió nada)
const equipo2 = await (await fetch(`${BASE}/api/equipo`, { headers: { cookie } })).json();
check("sigo siendo propietario tras las guardas", equipo2?.rol === "owner", JSON.stringify(equipo2));

// limpieza: borro la cuenta desechable
await fetch(`${BASE}/api/cuenta`, { method: "DELETE", headers: { cookie } });

console.log(`\nRESULTADO: ${PASS} PASS, ${FAIL} FAIL`);
process.exit(FAIL ? 1 : 0);
