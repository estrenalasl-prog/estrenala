"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Los avisos de la plataforma, con la cara de la plataforma.
 *
 * Hasta ahora se usaba `window.confirm`, que pinta la ventanita gris del
 * navegador con un «estrenala.com dice» encima. En una pantalla donde todo lo
 * demás está cuidado, eso canta —y canta justo en el peor momento: el aviso más
 * importante que damos es «esto te va a gastar dinero», y darlo con el diálogo
 * del sistema le quita toda la autoridad.
 *
 * Se apoya en el `<dialog>` nativo en vez de montar un modal a mano, y no por
 * pereza: gratis y sin bugs salen el centrado, la capa superior (nada de pelear
 * con z-index contra el iframe de la vista previa), el foco atrapado dentro, el
 * fondo inerte y el cierre con Esc. Un modal casero acierta con lo visual y
 * falla justo en eso.
 */

type Tono = "normal" | "coste" | "peligro";

type Peticion = {
  titulo: string;
  cuerpo?: string;
  aceptar?: string;
  /** `null` = un solo botón: es un aviso, no hay nada que decidir. */
  cancelar?: string | null;
  tono?: Tono;
  /**
   * Sustituye la etiqueta que trae el tono. Existe porque «no se puede deshacer»
   * NO es verdad en todo lo que pinta en rojo: ceder la propiedad de un espacio
   * es grave y es reversible (el nuevo dueño puede devolvértela). Antes de que la
   * plataforma diga algo falso, que lo diga quien llama.
   */
  etiqueta?: string;
};

const ETIQUETA: Record<Tono, string | null> = {
  normal: null,
  coste: "Gasta crédito de tu clave",
  peligro: "No se puede deshacer",
};

type Api = {
  confirmar: (p: Peticion) => Promise<boolean>;
  avisar: (p: Omit<Peticion, "cancelar">) => Promise<void>;
};

const Ctx = createContext<Api | null>(null);

export function useDialogo(): Api {
  const api = useContext(Ctx);
  if (!api) throw new Error("useDialogo necesita <ProveedorDialogo> por encima");
  return api;
}

export function ProveedorDialogo({ children }: { children: React.ReactNode }) {
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  // La promesa que espera la respuesta. Se guarda en una ref y NO en estado: es
  // una función, y meterla en `useState` haría que React la ejecutara.
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const pedir = useCallback((p: Peticion) => {
    return new Promise<boolean>((res) => {
      resolver.current = res;
      setPeticion(p);
    });
  }, []);

  const api = useRef<Api>({
    confirmar: (p) => pedir(p),
    avisar: (p) => pedir({ ...p, cancelar: null }).then(() => undefined),
  }).current;

  useEffect(() => {
    const d = ref.current;
    if (!d || !peticion || d.open) return;
    d.showModal();
    // El foco se pone A MANO y no con `autoFocus`. React lo aplica al montar, y
    // en ese momento el diálogo todavía está cerrado —o sea, no enfocable—, así
    // que se pierde. Aquí ya está abierto y no hay dudas.
    d.querySelector<HTMLButtonElement>("[data-foco]")?.focus();
  }, [peticion]);

  // Responder y cerrar. Se vacía `resolver` ANTES de cerrar para que el `onClose`
  // de abajo —que también salta al cerrar por código— no conteste una segunda vez.
  function responder(ok: boolean) {
    const r = resolver.current;
    resolver.current = null;
    r?.(ok);
    ref.current?.close();
  }

  // Esc, o cerrar por cualquier otra vía: cuenta como «no».
  function alCerrar() {
    const r = resolver.current;
    resolver.current = null;
    r?.(false);
    setPeticion(null);
  }

  const tono = peticion?.tono ?? "normal";
  const etiqueta = peticion?.etiqueta ?? ETIQUETA[tono];
  const soloAviso = peticion?.cancelar === null;

  return (
    <Ctx.Provider value={api}>
      {children}
      <dialog ref={ref} className={`dialogo ${tono}`} onClose={alCerrar} aria-labelledby="dialogo-titulo">
        {peticion && (
          <>
            <div className="dialogo-cuerpo">
              {etiqueta && <p className="dialogo-etiqueta">{etiqueta}</p>}
              <h2 id="dialogo-titulo">{peticion.titulo}</h2>
              {peticion.cuerpo && <p className="dialogo-texto">{peticion.cuerpo}</p>}
            </div>
            <div className="dialogo-pie">
              {!soloAviso && (
                <button
                  type="button"
                  className="btn btn-sec btn-sm"
                  onClick={() => responder(false)}
                  // En lo destructivo el foco arranca en «cancelar»: así un Enter
                  // de más no borra nada.
                  {...(tono === "peligro" ? { "data-foco": true } : {})}
                >
                  {peticion.cancelar ?? "Cancelar"}
                </button>
              )}
              <button
                type="button"
                className={`btn btn-sm ${tono === "peligro" ? "btn-peligro-solido" : "btn-primario"}`}
                onClick={() => responder(true)}
                {...(tono !== "peligro" ? { "data-foco": true } : {})}
              >
                {peticion.aceptar ?? (soloAviso ? "Entendido" : "Continuar")}
              </button>
            </div>
          </>
        )}
      </dialog>
    </Ctx.Provider>
  );
}
