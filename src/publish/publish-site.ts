import { slugify, esSlugValido, formatoSlugValido, esReservado } from "./slug";
import { suplanta, sinMarcas } from "./suplantacion";
import { normalizarDominio, formatoDominioValido, dominioProhibido } from "./domain";
import { PublishError } from "./errors";
import { MSG_CUPO_DIRECCIONES } from "./cupo-direcciones";
import type { DeployTarget } from "./deploy-target";
import type { Veredicto } from "./verificar-dominio";
import type { ProjectStore } from "@/src/repositories/types";

/** Comprueba que el dominio es de quien lo conecta (ver verificar-dominio.ts). */
export type VerificarDominio = (dominio: string) => Promise<Veredicto>;

/**
 * Apunta que se va a estrenar una dirección y dice si cabía en el cupo del día
 * (ver cupo-direcciones.ts). Se llama SOLO justo antes de pedir el certificado:
 * así el que esté peleándose con su DNS no gasta cupo en cada intento fallido.
 */
export type Cupo = () => Promise<boolean>;

/**
 * Aviso de que una direccion ha dejado de significar lo que significaba.
 *
 * Lo usa la cache de la ruta publica para olvidarla al instante: sin esto,
 * alguien publicaria su web y estaria hasta un minuto viendo el «esta web
 * todavia no esta publicada», justo en el momento que mas ilusion le hace.
 *
 * Se recibe como dependencia en vez de importar la cache aqui porque este
 * modulo no tiene que saber que existe ninguna cache: quien las conecta es la
 * ruta publica, y los tests siguen llamando a esto sin estado compartido.
 *
 * Se avisa de la direccion VIEJA y de la NUEVA. La vieja importa igual: si se
 * queda cacheada, sigue sirviendo la web despues de haberla cambiado de sitio.
 */
export type AlCambiarDireccion = (h: { subdominio?: string | null; dominio?: string | null }) => void;

/**
 * Se explica el porqué y se ofrece salida, en vez de un «no» a secas.
 *
 * Quien se lo encuentra casi siempre es alguien legítimo —una tienda que vende
 * productos Apple, una gestoría que tramita cosas de Hacienda— y no un estafador:
 * al estafador le da igual el mensaje, se cambia el nombre y sigue. Así que el
 * texto está escrito para el primero.
 */
export const MSG_SUBDOMINIO_SUPLANTA =
  "Ese nombre lleva una marca registrada y no podemos darlo: si alguien la usara para " +
  "engañar a la gente, los navegadores marcarían como peligrosas las webs de todos " +
  "nuestros clientes. Elige otro nombre, o escríbenos si la marca es tuya.";

// Fijado literalmente: la pantalla lo reconoce para enseñar el TXT de respaldo.
export const MSG_DOMINIO_SIN_VERIFICAR =
  "Todavía no veo que ese dominio apunte aquí. Añade los registros DNS y vuelve a intentarlo en unos minutos.";

export async function generarSubdominio(store: ProjectStore, nombre: string): Promise<string> {
  // El nombre del PROYECTO lo escribe el usuario, así que por aquí se colaba
  // entero: llamarlo «BBVA Clientes» daba `bbva-clientes` sin pasar por ninguna
  // comprobación, porque esta rama no es la de elegir subdominio a mano.
  //
  // Se le quitan los trozos de marca en vez de rechazarlo: aquí no hay nadie a
  // quien avisar —esto corre solo, al publicar—, y fallar dejaría sin publicar a
  // una «Clínica Apple» que no ha hecho nada malo. `slugify` ya devuelve "sitio"
  // si no queda nada.
  const base = slugify(sinMarcas(nombre));
  for (let i = 1; i <= 20; i++) {
    const sufijo = i === 1 ? "" : `-${i}`;
    const cand = base.slice(0, 63 - sufijo.length).replace(/-+$/g, "") + sufijo;
    if (esSlugValido(cand) && (await store.subdominioLibre(cand))) return cand;
  }
  throw new PublishError("No hay subdominios libres para ese nombre", 409);
}

export async function publishSite(
  deps: { store: ProjectStore; deploy: DeployTarget; alCambiar?: AlCambiarDireccion },
  input: { orgId: string; projectId: string }
): Promise<{ subdominio: string; publishedSnapshotId: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const current = await deps.store.getCurrentSnapshot(input.orgId, input.projectId);
  if (!current) throw new PublishError("El proyecto no tiene contenido que publicar", 400);

  let sub = project.subdominio;
  if (!sub) {
    sub = await generarSubdominio(deps.store, project.nombre);
    const ok = await deps.store.setSubdominio(input.orgId, input.projectId, sub);
    if (!ok) throw new PublishError("Ese subdominio ya está en uso", 409);
  }

  await deps.store.setPublished(input.orgId, input.projectId, current.id);
  await deps.deploy.publish({
    projectId: input.projectId, snapshotId: current.id,
    storagePrefix: current.storagePrefix, subdominio: sub,
  });
  deps.alCambiar?.({ subdominio: sub, dominio: project.dominio });
  return { subdominio: sub, publishedSnapshotId: current.id };
}

export async function unpublishSite(
  deps: { store: ProjectStore; deploy: DeployTarget; alCambiar?: AlCambiarDireccion },
  input: { orgId: string; projectId: string }
): Promise<void> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  await deps.store.setPublished(input.orgId, input.projectId, null);
  deps.alCambiar?.({ subdominio: project.subdominio, dominio: project.dominio });
  if (project.subdominio) {
    await deps.deploy.unpublish({ projectId: input.projectId, subdominio: project.subdominio });
  }
}

export async function cambiarSubdominio(
  deps: { store: ProjectStore; deploy: DeployTarget; cupo?: Cupo; alCambiar?: AlCambiarDireccion },
  input: { orgId: string; projectId: string; subdominio: string }
): Promise<{ subdominio: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const sub = input.subdominio.trim().toLowerCase();
  if (!formatoSlugValido(sub)) {
    throw new PublishError("Subdominio no válido (minúsculas, números y guiones)", 400);
  }
  if (esReservado(sub)) throw new PublishError("Ese subdominio está reservado", 400);
  // Suplantar una marca aquí no le hace daño solo a quien lo hace: si Google
  // marca `estrenala.com` por una web de phishing, la pantalla roja de «sitio
  // peligroso» sale en las webs de TODOS los clientes (ver suplantacion.ts).
  const imita = suplanta(sub);
  if (imita) {
    console.warn("[seguridad] subdominio de suplantacion rechazado", JSON.stringify({
      orgId: input.orgId, projectId: input.projectId, sub, marca: imita.marca, cebo: imita.cebo,
    }));
    throw new PublishError(MSG_SUBDOMINIO_SUPLANTA, 400);
  }
  if (project.subdominio === sub) return { subdominio: sub };
  if (!(await deps.store.subdominioLibre(sub))) throw new PublishError("Ese subdominio ya está en uso", 409);
  // A partir de aquí el cambio va a salir adelante y va a pedir certificado.
  if (deps.cupo && !(await deps.cupo())) throw new PublishError(MSG_CUPO_DIRECCIONES, 429);
  const anterior = project.subdominio;
  const ok = await deps.store.setSubdominio(input.orgId, input.projectId, sub);
  if (!ok) throw new PublishError("Ese subdominio ya está en uso", 409);
  // La vieja tambien: si se queda cacheada, la direccion de antes seguiria
  // sirviendo la web despues de haberla movido.
  deps.alCambiar?.({ subdominio: anterior });
  deps.alCambiar?.({ subdominio: sub });

  // Si la web estaba publicada, hay que MOVER su ruta en el servidor: dar de alta
  // la dirección nueva (que además necesita su certificado) y retirar la vieja.
  // Sin esto, cambiar la dirección dejaba la web inaccesible en producción.
  // El alta va primero: si fallara, se prefiere que siga viva la dirección
  // anterior a quedarse sin ninguna.
  if (project.publishedSnapshotId) {
    await deps.deploy.publish({ projectId: input.projectId, subdominio: sub });
    if (anterior) {
      try {
        await deps.deploy.unpublish({ projectId: input.projectId, subdominio: anterior });
      } catch { /* la ruta vieja sobra, pero no molesta: no se arruina el cambio por esto */ }
    }
  }
  return { subdominio: sub };
}

export async function conectarDominio(
  deps: {
    store: ProjectStore; deploy: DeployTarget; verificar?: VerificarDominio; cupo?: Cupo;
    alCambiar?: AlCambiarDireccion;
  },
  input: {
    orgId: string; projectId: string; dominio: string; platformHost: string; sitesBaseDomain: string;
  }
): Promise<{ dominio: string }> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  const dom = normalizarDominio(input.dominio);
  if (!formatoDominioValido(dom) || dominioProhibido(dom, input.platformHost, input.sitesBaseDomain)) {
    throw new PublishError("Dominio no válido (ejemplo: miempresa.com)", 400);
  }
  if (project.dominio === dom) return { dominio: dom };
  if (!(await deps.store.dominioLibre(dom))) {
    throw new PublishError("Ese dominio ya está conectado a otro proyecto", 409);
  }
  // La prueba de que el dominio es suyo va ANTES de reservarlo y antes de pedir
  // su certificado: es lo que impide bloquear dominios ajenos y quemar el cupo
  // de Let's Encrypt, que es compartido por todos los clientes.
  if (deps.verificar) {
    const v = await deps.verificar(dom);
    if (!v.ok) throw new PublishError(MSG_DOMINIO_SIN_VERIFICAR, 409);
  }
  if (deps.cupo && !(await deps.cupo())) throw new PublishError(MSG_CUPO_DIRECCIONES, 429);
  try {
    await deps.deploy.connectDomain({ dominio: dom });
  } catch {
    throw new PublishError("No se pudo activar el dominio en el servidor. Vuelve a intentarlo en unos minutos.", 502);
  }
  const ok = await deps.store.setDominio(input.orgId, input.projectId, dom);
  if (!ok) {
    // Carrera: otro proyecto lo reclamó entre la comprobación y el guardado.
    try { await deps.deploy.disconnectDomain({ dominio: dom }); } catch { /* best-effort */ }
    throw new PublishError("Ese dominio ya está conectado a otro proyecto", 409);
  }
  if (project.dominio && project.dominio !== dom) {
    // Cambio de dominio: liberar el anterior en el deploy (best-effort).
    try { await deps.deploy.disconnectDomain({ dominio: project.dominio }); } catch { /* best-effort */ }
  }
  // El nuevo, y el anterior si lo habia: los dos han cambiado de significado.
  deps.alCambiar?.({ dominio: dom });
  if (project.dominio) deps.alCambiar?.({ dominio: project.dominio });
  return { dominio: dom };
}

export async function quitarDominio(
  deps: { store: ProjectStore; deploy: DeployTarget; alCambiar?: AlCambiarDireccion },
  input: { orgId: string; projectId: string }
): Promise<void> {
  const project = await deps.store.getProject(input.orgId, input.projectId);
  if (!project) throw new PublishError("Proyecto no encontrado", 404);
  if (!project.dominio) return;
  await deps.store.setDominio(input.orgId, input.projectId, null);
  deps.alCambiar?.({ dominio: project.dominio });
  try {
    await deps.deploy.disconnectDomain({ dominio: project.dominio });
  } catch (e) {
    console.error("No se pudo quitar el dominio en el deploy (limpieza manual):", e);
  }
}
