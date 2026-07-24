import Link from "next/link";
import { getContexto } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { accountStore } from "@/src/repositories/accounts";
import type { ProjectRow } from "@/src/repositories/types";
import { envioActivo } from "@/src/email/enviar";
import { ImportDropzone } from "./_components/ImportDropzone";
import { AppHeader } from "./_components/AppHeader";
import { BannerVerifica } from "./_components/BannerVerifica";

export const dynamic = "force-dynamic";

type Estado = { clase: string; texto: string };

function estadoDe(p: ProjectRow): Estado {
  if (!p.publishedSnapshotId) return { clase: "badge-neutro", texto: "Sin publicar" };
  if (p.publishedSnapshotId === p.currentSnapshotId) return { clase: "badge-exito", texto: "Publicado" };
  return { clase: "badge-aviso", texto: "Cambios sin publicar" };
}

function direccionDe(p: ProjectRow): string {
  if (p.dominio) return p.dominio;
  if (p.subdominio) return p.subdominio;
  return `Borrador · ${p.createdAt.slice(0, 10)}`;
}

export default async function Dashboard() {
  const { orgId, userId } = await getContexto();
  const proyectos = await projectStore.listProjects(orgId);

  // Aviso de «confirma tu correo» solo cuando hay envío real de correos (prod):
  // en dev no hay forma de recibirlo, así que no molestamos.
  let banner: React.ReactNode = null;
  if (envioActivo()) {
    const user = await accountStore.getUserById(userId);
    if (user && !user.emailVerificadoAt) banner = <BannerVerifica email={user.email} />;
  }

  if (proyectos.length === 0) {
    return (
      <>
        <AppHeader />
        <main className="panel-main">
          {banner}
          <div className="vacio">
            <h2>Vamos a poner tu web online.</h2>
            <p>Sube la web que te generó la IA. La alojamos, le damos dirección y HTTPS, y podrás editarla sin código.</p>
            <ImportDropzone tono="claro" />
            <div className="pasos">
              <span className="p"><span className="n">1</span> <b>Súbela</b></span>
              <span>›</span>
              <span className="p"><span className="n">2</span> <b>Edítala</b> con un clic</span>
              <span>›</span>
              <span className="p"><span className="n">3</span> <b>Publícala</b></span>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="panel-main">
        {banner}
        <div className="titulo-fila">
          <h1>Tus webs</h1>
          <span className="cuenta">{proyectos.length} {proyectos.length === 1 ? "proyecto" : "proyectos"}</span>
        </div>

        <section className="importar" id="importar">
          <div className="grano" />
          <div className="txt">
            <div className="eyebrow">Empieza aquí</div>
            <h2>Sube tu web hecha con IA</h2>
            <p>Arrastra el .zip que te dio Claude, ChatGPT o v0. En un clic estará online, con dirección y HTTPS.</p>
          </div>
          <ImportDropzone tono="oscuro" />
        </section>

        <div className="seccion-cab"><h2>Recientes</h2><span className="conteo">· {proyectos.length}</span></div>
        <div className="rejilla">
          {proyectos.map((p) => {
            const estado = estadoDe(p);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card">
                <div className="thumb"><span className="mini">Inicio</span></div>
                <div className="cuerpo">
                  <div className="fila">
                    <h3>{p.nombre}</h3>
                    <span className={`badge ${estado.clase}`}><span className="punto" />{estado.texto}</span>
                  </div>
                  <p className="url">{direccionDe(p)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
