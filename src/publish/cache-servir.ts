import { CacheLRU, CacheConCaducidad } from "./memoria";
import type { StorageAdapter } from "@/src/storage/types";
import type { ProjectStore } from "@/src/repositories/types";

// El tipo del sitio publicado no se exporta suelto: se saca de la propia
// firma, y asi no puede quedarse desfasado si algun dia le anaden un campo.
type PorHost = ProjectStore["getPublishedSiteByHost"];
type Sitio = Awaited<ReturnType<PorHost>>;

/**
 * Las cachés del camino público: lo que hace que servir una web no cueste dos
 * viajes de red CADA VEZ.
 *
 * Hoy, sin esto, cada archivo de cada visita hace:
 *
 *   1. una consulta a Postgres  («¿de quién es este dominio?»)
 *   2. una descarga de Supabase Storage
 *
 * Y una página no es un archivo: son el HTML, el CSS, el JS y las imágenes.
 * Diez archivos = veinte viajes de red para enseñar una página que no ha
 * cambiado desde hace una semana. Medido en producción, eso son 340-620 ms de
 * espera antes del primer byte.
 *
 * Con las cachés puestas, una página caliente se sirve de memoria: microsegundos.
 * La respuesta a «¿aguantará con 1000 clientes?» no es un servidor más grande,
 * es no repetir el mismo trabajo.
 *
 * Viven SOLO aquí y no dentro de `resolvePublicSite` a propósito. Esta es la
 * raíz de composición —la usa únicamente la ruta pública—, así que el editor, el
 * examen y los tests siguen hablando con el almacén de verdad y no se pisan
 * entre ellos con estado compartido.
 */

const MB = 1024 * 1024;

/** Se pueden ajustar sin tocar código: en un servidor con más RAM, súbelos. */
const TOPE_ARCHIVOS = Number(process.env.CACHE_ARCHIVOS_MB || 256) * MB;
const TOPE_COMPRIMIDO = Number(process.env.CACHE_COMPRIMIDO_MB || 64) * MB;

/**
 * Cuánto se fía la caché de la búsqueda del sitio.
 *
 * Un minuto es la red de seguridad, no el mecanismo: al publicar, despublicar o
 * cambiar de dirección se invalida a mano y el cambio se ve al instante. Sin esa
 * invalidación, alguien publicaría su web y estaría un minuto viendo el «esta
 * web todavía no está publicada» — justo en el momento que más ilusión le hace.
 */
const VIDA_SITIO_MS = 60_000;
/**
 * Los «no existe» se guardan mucho menos.
 *
 * Un dominio que no está puede aparecer en cualquier momento —lo acaban de
 * conectar—, y dejarlo cacheado un minuto sería enseñarle un 404 a alguien que
 * ya lo ha hecho todo bien. Cinco segundos bastan para que una ráfaga de peticiones
 * a un host que no existe no se convierta en una ráfaga de consultas.
 */
const VIDA_SIN_SITIO_MS = 5_000;

type Archivo = { body: Buffer; contentType: string };

// El peso real es el del contenido; lo demás (la clave, el objeto) es ruido al
// lado de un HTML de 40 KB.
const cacheArchivos = new CacheLRU<Archivo>(TOPE_ARCHIVOS, (a) => a.body.length);
const cacheListas = new CacheLRU<string[]>(4 * MB, (l) => l.reduce((n, k) => n + k.length * 2, 0));
const cacheSitios = new CacheConCaducidad<Sitio>();
const cacheComprimido = new CacheLRU<Buffer>(TOPE_COMPRIMIDO, (b) => b.length);

/**
 * El almacén, con memoria.
 *
 * Se puede cachear PARA SIEMPRE porque la clave lleva dentro el id de la
 * instantánea, y una instantánea nunca cambia: cada edición copia todo a una
 * nueva (ver crearSnapshotEditado), cada actualización crea otra, y las imágenes
 * subidas llevan un UUID propio. Se comprobó una a una que no hay ni una sola
 * escritura que sobrescriba una clave existente. Si algún día la hubiera, esta
 * caché empezaría a servir lo viejo sin avisar — por eso está escrito aquí.
 */
export function almacenConMemoria(base: StorageAdapter): StorageAdapter {
  return {
    async get(key) {
      const guardado = cacheArchivos.get(key);
      if (guardado) return guardado;
      const f = await base.get(key);
      if (f) cacheArchivos.set(key, f);
      return f;
    },
    async list(prefix) {
      const guardado = cacheListas.get(prefix);
      if (guardado) return guardado;
      const l = await base.list(prefix);
      cacheListas.set(prefix, l);
      return l;
    },
    // Servir no escribe nunca. Se delega igual —el tipo lo exige— y de paso se
    // olvida la clave: si alguna vez alguien sirviera y escribiera con el mismo
    // adaptador, más vale que la caché no se quede con lo de antes.
    async put(key, body, contentType) {
      cacheArchivos.olvidar(key);
      return base.put(key, body, contentType);
    },
    async delete(key) {
      cacheArchivos.olvidar(key);
      return base.delete(key);
    },
    tamanos: base.tamanos?.bind(base),
  };
}

const claveHost = (q: Parameters<PorHost>[0]) =>
  "subdominio" in q ? `s:${q.subdominio}` : `d:${q.dominio}`;

/** El repositorio, con memoria para lo único que se consulta al servir. */
export function storeConMemoria(base: ProjectStore): ProjectStore {
  return new Proxy(base, {
    get(destino, prop, receptor) {
      if (prop !== "getPublishedSiteByHost") return Reflect.get(destino, prop, receptor);
      return async (q: Parameters<PorHost>[0]) => {
        const clave = claveHost(q);
        const guardado = cacheSitios.get(clave);
        if (guardado !== undefined) return guardado;
        const sitio = await base.getPublishedSiteByHost(q);
        cacheSitios.set(clave, sitio, sitio ? VIDA_SITIO_MS : VIDA_SIN_SITIO_MS);
        return sitio;
      };
    },
  });
}

/**
 * Se acaba de publicar, despublicar o cambiar de dirección: que se vea YA.
 *
 * Se olvidan las dos formas de llegar —subdominio y dominio propio— porque no
 * siempre se sabe cuál cambió, y olvidar de más aquí no cuesta nada: la
 * siguiente visita hace una consulta y vuelve a caché.
 */
export function olvidarSitio(input: { subdominio?: string | null; dominio?: string | null }): void {
  if (input.subdominio) cacheSitios.olvidar(`s:${input.subdominio}`);
  if (input.dominio) {
    cacheSitios.olvidar(`d:${input.dominio}`);
    cacheSitios.olvidar(`d:www.${input.dominio}`);
  }
}

/**
 * Lo ya comprimido, para no volver a comprimir los mismos bytes.
 *
 * La clave es el ETag —que ES el contenido, resumido— más la codificación. Dos
 * respuestas con el mismo ETag son los mismos bytes por definición, así que esto
 * no puede devolver lo que no es.
 */
export function comprimidoGuardado(etag: string, codificacion: string): Buffer | undefined {
  return cacheComprimido.get(`${etag}|${codificacion}`);
}

export function guardarComprimido(etag: string, codificacion: string, body: Buffer): void {
  cacheComprimido.set(`${etag}|${codificacion}`, body);
}

/** Para los tests, y para poder vaciarlas a mano si alguna vez hiciera falta. */
export function vaciarCachesServir(): void {
  cacheArchivos.vaciar();
  cacheListas.vaciar();
  cacheSitios.vaciar();
  cacheComprimido.vaciar();
}

export function estadoCaches() {
  return {
    archivos: cacheArchivos.estado,
    listas: cacheListas.estado,
    sitios: cacheSitios.estado,
    comprimido: cacheComprimido.estado,
  };
}
