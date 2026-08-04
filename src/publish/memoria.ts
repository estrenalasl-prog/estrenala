/**
 * Una caché en memoria con presupuesto de BYTES, no de número de entradas.
 *
 * Contar entradas no sirve aquí: mil páginas de 8 KB y mil fotos de 4 MB son el
 * mismo número y no ocupan lo mismo ni de lejos. Con un tope en bytes, el
 * servidor no se queda sin memoria por muchas webs grandes que entren.
 *
 * Cuando se llena, tira lo que lleva más tiempo sin pedirse (LRU). El truco es
 * el `Map` de JavaScript: recuerda el orden en que se metieron las claves, así
 * que la primera del recorrido es siempre la más vieja. Al leer una entrada se
 * borra y se vuelve a meter, con lo que pasa al final y deja de ser candidata.
 */
export class CacheLRU<T> {
  private datos = new Map<string, T>();
  private usados = 0;

  constructor(
    private readonly maxBytes: number,
    private readonly pesoDe: (v: T) => number,
    /**
     * Lo que pase de aquí no entra. Un vídeo de 40 MB vaciaría la caché entera
     * para quedarse él solo, y una sola visita no compensa echar a todo lo demás.
     */
    private readonly maxPorEntrada = Math.max(1, Math.floor(maxBytes / 8))
  ) {}

  get(clave: string): T | undefined {
    const v = this.datos.get(clave);
    if (v === undefined) return undefined;
    this.datos.delete(clave);
    this.datos.set(clave, v); // al final: acaba de usarse
    return v;
  }

  set(clave: string, valor: T): void {
    const peso = this.pesoDe(valor);
    if (peso > this.maxPorEntrada) return;

    const anterior = this.datos.get(clave);
    if (anterior !== undefined) this.usados -= this.pesoDe(anterior);
    this.datos.delete(clave);
    this.datos.set(clave, valor);
    this.usados += peso;

    // `keys().next()` da la más vieja. Se tira hasta caber, nunca la que se
    // acaba de meter: si ella sola pasara del tope se habría descartado arriba.
    while (this.usados > this.maxBytes && this.datos.size > 1) {
      const vieja = this.datos.keys().next().value as string;
      this.usados -= this.pesoDe(this.datos.get(vieja)!);
      this.datos.delete(vieja);
    }
  }

  olvidar(clave: string): void {
    const v = this.datos.get(clave);
    if (v === undefined) return;
    this.usados -= this.pesoDe(v);
    this.datos.delete(clave);
  }

  vaciar(): void {
    this.datos.clear();
    this.usados = 0;
  }

  /** Para poder mirar cómo va sin abrirla en canal. */
  get estado(): { entradas: number; bytes: number } {
    return { entradas: this.datos.size, bytes: this.usados };
  }
}

/**
 * Caché con caducidad, para lo que SÍ puede cambiar.
 *
 * La usa la búsqueda del sitio por dominio: eso vive en la base de datos y
 * cambia cuando alguien publica, despublica o se cambia de dirección. Se
 * invalida a mano en esos tres momentos (ver cache-servir.ts), y la caducidad
 * está de red de seguridad por si algún día esto corre en más de un proceso y la
 * invalidación de uno no llega al otro.
 */
export class CacheConCaducidad<T> {
  private datos = new Map<string, { valor: T; hasta: number }>();

  constructor(private readonly maxEntradas = 5000) {}

  get(clave: string, ahora = Date.now()): T | undefined {
    const e = this.datos.get(clave);
    if (!e) return undefined;
    if (e.hasta <= ahora) {
      this.datos.delete(clave);
      return undefined;
    }
    return e.valor;
  }

  set(clave: string, valor: T, duracionMs: number, ahora = Date.now()): void {
    if (this.datos.size >= this.maxEntradas) {
      // Sin LRU: aquí las entradas son diminutas y lo que las quita de en medio
      // es la caducidad. Se tira la más vieja solo para que no crezca sin fin.
      const vieja = this.datos.keys().next().value;
      if (vieja !== undefined) this.datos.delete(vieja);
    }
    this.datos.set(clave, { valor, hasta: ahora + duracionMs });
  }

  olvidar(clave: string): void {
    this.datos.delete(clave);
  }

  vaciar(): void {
    this.datos.clear();
  }

  get estado(): { entradas: number } {
    return { entradas: this.datos.size };
  }
}
