import Link from "next/link";
import { getDevContext } from "@/src/auth/dev-stub";
import { projectStore } from "@/src/repositories/projects";
import { ImportDropzone } from "./_components/ImportDropzone";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { orgId } = await getDevContext();
  const proyectos = await projectStore.listProjects(orgId);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Wordclicks</h1>
      <section className="mb-10">
        <ImportDropzone />
      </section>
      <h2 className="mb-4 text-xl font-semibold">Tus proyectos</h2>
      {proyectos.length === 0 ? (
        <p className="text-gray-500">Aún no hay proyectos. Sube un ZIP para empezar.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4">
          {proyectos.map((p) => (
            <li key={p.id} className="rounded-lg border p-4">
              <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                {p.nombre}
              </Link>
              <p className="text-sm text-gray-400">{p.createdAt.slice(0, 10)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
