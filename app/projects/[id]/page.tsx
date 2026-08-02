import Link from "next/link";
import { notFound } from "next/navigation";
import { getContexto } from "@/src/auth/contexto";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import type { ProjectRow } from "@/src/repositories/types";
import { listPages } from "@/src/projects/entry";
import { AppHeader } from "../../_components/AppHeader";
import { PublishBar } from "./PublishBar";
import { PreviewPane } from "./PreviewPane";
import { ToolsPanel } from "./ToolsPanel";
import { BlogPanel, BlogDePago } from "./BlogPanel";
import { AssistantPanel } from "./AssistantPanel";
import { ActualizarPanel } from "./ActualizarPanel";
import { DangerZone } from "./DangerZone";
import { esOwner } from "@/src/auth/roles";
import { accountStore } from "@/src/repositories/accounts";
import { puede } from "@/src/planes/planes";
import { dominiosAjenosDelSitemap } from "@/src/publish/seo";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { textosPanel, type TextosPanel } from "@/src/i18n/panel";
import { textosBlog } from "@/src/i18n/blog";

export const dynamic = "force-dynamic";

/**
 * ¿Su sitemap anuncia las páginas en un dominio que no es suyo aquí? Se avisa,
 * no se corrige (el porqué, en seo.ts).
 *
 * En un try: es un aviso, y un aviso jamás debe poder tumbar el panel entero de
 * alguien que solo quería publicar.
 */
async function dominiosDelSitemap(
  orgId: string, projectId: string, sitesBaseDomain: string, dominio: string | null
): Promise<string[]> {
  try {
    const snap = await projectStore.getCurrentSnapshot(orgId, projectId);
    if (!snap) return [];
    const file = await getStorage().get(`${snap.storagePrefix}sitemap.xml`);
    if (!file) return []; // sin sitemap propio se le genera uno al servir, y ese ya sale bien
    return dominiosAjenosDelSitemap({ xml: file.body.toString("utf-8"), sitesBaseDomain, dominio });
  } catch {
    return [];
  }
}

function estadoProyecto(p: ProjectRow, t: TextosPanel["estado"]): { clase: string; texto: string } {
  if (!p.publishedSnapshotId) return { clase: "badge-neutro", texto: t.sinPublicar };
  if (p.publishedSnapshotId === p.currentSnapshotId) return { clase: "badge-exito", texto: t.publicado };
  return { clase: "badge-aviso", texto: t.cambiosSinPublicar };
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId, rol } = await getContexto();
  const project = await projectStore.getProject(orgId, id);
  if (!project) notFound();
  const plan = await accountStore.getPlan(orgId);
  const pages = await listPages({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });
  const platformHost = process.env.PLATFORM_HOST ?? "localhost:3000";
  const sitesBaseDomain = process.env.SITES_BASE_DOMAIN ?? platformHost;
  const dnsTargetIp = process.env.DNS_TARGET_IP ?? "127.0.0.1";
  const idioma = await idiomaDeSesion();
  const textos = textosPanel(idioma);
  const estado = estadoProyecto(project, textos.estado);
  const sitemapAjeno = await dominiosDelSitemap(orgId, id, sitesBaseDomain, project.dominio);

  return (
    <>
      <AppHeader />
      <main className="proyecto">
        <p className="miga"><Link href="/">← {textos.panel.tusWebs}</Link></p>
        <div className="proj-cabeza">
          <h1>{project.nombre}</h1>
          <span className={`badge ${estado.clase}`}><span className="punto" />{estado.texto}</span>
        </div>

        <PublishBar
          projectId={id}
          subdominio={project.subdominio}
          dominio={project.dominio}
          publishedSnapshotId={project.publishedSnapshotId}
          currentSnapshotId={project.currentSnapshotId}
          sitesBaseDomain={sitesBaseDomain}
          dnsTargetIp={dnsTargetIp}
          noIndexar={project.noIndexar}
          sitemapAjeno={sitemapAjeno}
          t={textos.proyecto}
        />
        <AssistantPanel projectId={id} pages={pages} entryPath={project.entryPath} textos={textos.proyecto} />
        <ActualizarPanel projectId={id} textos={textos.proyecto} />
        <ToolsPanel projectId={id} textos={textos.proyecto} />
        {puede(plan, "blog")
          ? <BlogPanel projectId={id} idioma={idioma} t={textosBlog(idioma)} />
          : <BlogDePago t={textosBlog(idioma)} />}
        <PreviewPane projectId={id} entryPath={project.entryPath} pages={pages} t={textos.proyecto} />
        {esOwner(rol) && <DangerZone projectId={id} nombre={project.nombre} textos={textos.proyecto} />}
      </main>
    </>
  );
}
