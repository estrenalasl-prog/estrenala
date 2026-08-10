/**
 * La clave con la que se deduplica un cambio pendiente.
 *
 * Dos cambios con la misma clave son EL MISMO cambio hecho dos veces: mover una
 * barra de tamaño manda una op por cada tirón y el panel se queda con la última,
 * así que el contador dice «1 cambio» y no cuarenta.
 *
 * Vive aquí y no dentro del panel porque la usan tres sitios que tienen que
 * coincidir a la letra:
 * - el panel (`PreviewPane`), para deduplicar y contar;
 * - `public/wc-editor.js`, que corre dentro del iframe y no puede importar nada,
 *   así que la lleva escrita a mano (`claveDe`) — hay un test que compara las dos;
 * - `applyEdits` en el servidor, que agrupa con el mismo criterio al guardar.
 *
 * Si dijeran cosas distintas, el usuario vería una cosa en la vista previa y se
 * publicaría otra.
 */
export type OpConClave = {
  page: string;
  nodeId: number;
  kind: string;
  property?: string;
  index?: number;
  posicion?: string;
  value?: unknown;
  lado?: string;
};

export function claveOp(op: OpConClave): string {
  // Las imágenes NUEVAS se distinguen además por cuál es y dónde va: si no, poner
  // dos fotos distintas debajo del mismo párrafo dejaría solo la última.
  const extra =
    op.kind === "style" ? String(op.property)
      : op.kind === "textNode" ? String(op.index)
        : op.kind === "insertImage" ? `${op.posicion}#${op.value}`
          : op.kind === "margen" ? (op.lado ?? "ambos")
            : "";
  return `${op.page}#${op.nodeId}#${op.kind}#${extra}`;
}
