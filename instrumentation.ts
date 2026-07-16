// Tick de publicación programada (4e): al arrancar el servidor (dev o next
// start), cada 60 s se publican las programaciones vencidas. El primer tick
// espera 15 s para no competir con el arranque.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // El hot reload de dev puede volver a llamar a register(): el flag global
  // evita acumular intervalos duplicados en el mismo proceso.
  const g = globalThis as typeof globalThis & { __tickProgramados?: boolean };
  if (g.__tickProgramados) return;
  g.__tickProgramados = true;

  const tick = async () => {
    try {
      const [{ publicarVencidos }, { projectStore }, { blogStore }, { getStorage }, { getDeploy }] =
        await Promise.all([
          import("@/src/blog/programados"),
          import("@/src/repositories/projects"),
          import("@/src/repositories/blog"),
          import("@/src/storage/factory"),
          import("@/src/publish/deploy-factory"),
        ]);
      const r = await publicarVencidos({
        store: projectStore, blog: blogStore, storage: getStorage(), deploy: getDeploy(),
      });
      if (r.publicados || r.errores) {
        console.log(`[programados] publicados: ${r.publicados} · errores: ${r.errores}`);
      }
    } catch (e) {
      // Un tick roto (BD caída, storage inaccesible) no tumba el servidor.
      console.error("[programados] tick fallido:", e instanceof Error ? e.message : e);
    }
  };
  setTimeout(() => void tick(), 15_000);
  setInterval(() => void tick(), 60_000);
}
