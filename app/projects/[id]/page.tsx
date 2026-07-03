import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevContext } from "@/src/auth/dev-stub";
import { getStorage } from "@/src/storage/factory";
import { projectStore } from "@/src/repositories/projects";
import { listPages } from "@/src/projects/entry";
import { PublishBar } from "./PublishBar";
import { PreviewPane } from "./PreviewPane";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getDevContext();
  const project = await projectStore.getProject(orgId, id);
  if (!project) notFound();
  const pages = await listPages({ store: projectStore, storage: getStorage() }, { orgId, projectId: id });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">← Volver</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">{project.nombre}</h1>
      <PublishBar
        projectId={id}
        subdominio={project.subdominio}
        publishedSnapshotId={project.publishedSnapshotId}
        currentSnapshotId={project.currentSnapshotId}
      />
      <PreviewPane projectId={id} entryPath={project.entryPath} pages={pages} />
    </main>
  );
}
