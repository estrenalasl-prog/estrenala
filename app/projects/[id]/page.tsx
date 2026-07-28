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

export const dynamic = "force-dynamic";

function estadoProyecto(p: ProjectRow): { clase: string; texto: string } {
  if (!p.publishedSnapshotId) return { clase: "badge-neutro", texto: "Sin publicar" };
  if (p.publishedSnapshotId === p.currentSnapshotId) return { clase: "badge-exito", texto: "Publicado" };
  return { clase: "badge-aviso", texto: "Cambios sin publicar" };
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
  const estado = estadoProyecto(project);

  return (
    <>
      <AppHeader />
      <main className="proyecto">
        <p className="miga"><Link href="/">← Tus webs</Link></p>
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
        />
        <AssistantPanel projectId={id} pages={pages} entryPath={project.entryPath} />
        <ActualizarPanel projectId={id} />
        <ToolsPanel projectId={id} />
        {puede(plan, "blog") ? <BlogPanel projectId={id} /> : <BlogDePago />}
        <PreviewPane projectId={id} entryPath={project.entryPath} pages={pages} />
        {esOwner(rol) && <DangerZone projectId={id} nombre={project.nombre} />}
      </main>
    </>
  );
}
