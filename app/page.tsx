import Link from "next/link";
import type { Metadata } from "next";
import { getContexto, haySesion } from "@/src/auth/contexto";
import { projectStore } from "@/src/repositories/projects";
import { accountStore } from "@/src/repositories/accounts";
import type { ProjectRow } from "@/src/repositories/types";
import { envioActivo } from "@/src/email/enviar";
import { ImportDropzone } from "./_components/ImportDropzone";
import { AppHeader } from "./_components/AppHeader";
import { BannerVerifica } from "./_components/BannerVerifica";
import { Landing } from "./_landing/Landing";
import { idiomaDeSesion } from "@/src/i18n/servidor";
import { textosPanel, type TextosPanel } from "@/src/i18n/panel";
import { rellenar } from "@/src/i18n/rellenar";
import { textosLanding } from "@/src/i18n/landing";
import { IDIOMA_POR_DEFECTO, alternativasHreflang } from "@/src/i18n/idiomas";

export const dynamic = "force-dynamic";

// La raíz es pública: sin sesión enseña la landing de marketing; con sesión, el
// panel «Tus webs». Por eso el título depende de quién mire.
export async function generateMetadata(): Promise<Metadata> {
  if (await haySesion()) return { title: "Tus webs · Estrénala" };
  const t = textosLanding(IDIOMA_POR_DEFECTO);
  return {
    title: t.meta.titulo,
    description: t.meta.descripcion,
    // La raíz es la versión española de la landing, así que también declara sus
    // cuatro hermanas. Si solo lo hicieran ellas, Google no se fiaría de ninguna:
    // el hreflang tiene que ser recíproco.
    alternates: { canonical: "/", languages: alternativasHreflang() },
  };
}

type Estado = { clase: string; texto: string };

function estadoDe(p: ProjectRow, t: TextosPanel["estado"]): Estado {
  if (!p.publishedSnapshotId) return { clase: "badge-neutro", texto: t.sinPublicar };
  if (p.publishedSnapshotId === p.currentSnapshotId) return { clase: "badge-exito", texto: t.publicado };
  return { clase: "badge-aviso", texto: t.cambiosSinPublicar };
}

function direccionDe(p: ProjectRow, plantilla: string): string {
  if (p.dominio) return p.dominio;
  if (p.subdominio) return p.subdominio;
  // La fecha va tal cual (aaaa-mm-dd): es un dato, no un texto que traducir.
  return rellenar(plantilla, { fecha: p.createdAt.slice(0, 10) });
}

export default async function Dashboard() {
  // Visitante sin sesión → landing pública (la raíz no exige candado).
  if (!(await haySesion())) return <Landing />;

  const { orgId, userId } = await getContexto();
  const t = textosPanel(await idiomaDeSesion());
  const proyectos = await projectStore.listProjects(orgId);

  // Aviso de «confirma tu correo» solo cuando hay envío real de correos (prod):
  // en dev no hay forma de recibirlo, así que no molestamos.
  let banner: React.ReactNode = null;
  if (envioActivo()) {
    const user = await accountStore.getUserById(userId);
    if (user && !user.emailVerificadoAt) banner = <BannerVerifica email={user.email} t={t.verifica} />;
  }

  if (proyectos.length === 0) {
    return (
      <>
        <AppHeader />
        <main className="panel-main">
          {banner}
          <div className="vacio">
            <h2>{t.panel.vacioTitulo}</h2>
            <p>{t.panel.vacioTexto}</p>
            <ImportDropzone tono="claro" t={t.subir} />
            <div className="pasos">
              <span className="p"><span className="n">1</span> <b>{t.panel.paso1}</b></span>
              <span>›</span>
              <span className="p"><span className="n">2</span> <b>{t.panel.paso2}</b> {t.panel.paso2conClic}</span>
              <span>›</span>
              <span className="p"><span className="n">3</span> <b>{t.panel.paso3}</b></span>
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
          <h1>{t.panel.tusWebs}</h1>
          <span className="cuenta">{proyectos.length} {proyectos.length === 1 ? t.panel.unProyecto : t.panel.variosProyectos}</span>
        </div>

        <section className="importar" id="importar">
          <div className="grano" />
          <div className="txt">
            <div className="eyebrow">{t.panel.empiezaAqui}</div>
            <h2>{t.panel.subeTuWeb}</h2>
            <p>{t.panel.subeTuWebTexto}</p>
          </div>
          <ImportDropzone tono="oscuro" t={t.subir} />
        </section>

        <div className="seccion-cab"><h2>{t.panel.recientes}</h2><span className="conteo">· {proyectos.length}</span></div>
        <div className="rejilla">
          {proyectos.map((p) => {
            const estado = estadoDe(p, t.estado);
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="card">
                <div className="thumb"><span className="mini">{t.panel.miniaturaInicio}</span></div>
                <div className="cuerpo">
                  <div className="fila">
                    <h3>{p.nombre}</h3>
                    <span className={`badge ${estado.clase}`}><span className="punto" />{estado.texto}</span>
                  </div>
                  <p className="url">{direccionDe(p, t.panel.borrador)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
