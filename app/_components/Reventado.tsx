"use client";

/**
 * La pantalla de «algo se ha roto». No había ninguna: hasta hoy, un fallo del
 * servidor enseñaba la de Next de fábrica —fondo blanco, texto en inglés, sin
 * logo y sin salida—, que es exactamente lo que no quieres que le pase a nadie
 * el día que te mira mucha gente a la vez.
 *
 * Se parece a la 404 a propósito (mismo glifo negro con el número en lima): son
 * la misma casa, y quien se cruce con las dos tiene que reconocerlo.
 *
 * POR QUÉ LOS TEXTOS ESTÁN AQUÍ Y NO EN EL CATÁLOGO: esto es un componente de
 * CLIENTE —lo exige `error.tsx` de Next, porque trae el botón de reintentar— y no
 * puede llamar a `idiomaActual()`, que es de servidor. Importar el catálogo
 * entero le metería los cinco idiomas al navegador de todo el mundo para enseñar
 * cuatro frases que casi nadie va a ver. Así que las cuatro frases viven aquí, y
 * el idioma se lee del `<html lang>` que ya puso el layout.
 *
 * Los estilos van en línea por lo mismo que en la 404: esta pantalla tiene que
 * poder pintarse aunque lo que haya fallado sea la hoja de estilos.
 */

type Textos = { titulo: string; texto: string; reintentar: string; portada: string };

const TEXTOS: Record<string, Textos> = {
  es: {
    titulo: "Algo se ha roto por nuestra parte",
    texto: "No es cosa tuya. Vuelve a intentarlo: si sigue pasando, lo estamos mirando.",
    reintentar: "Volver a intentarlo",
    portada: "Ir a la portada",
  },
  en: {
    titulo: "Something broke on our end",
    texto: "This one's on us, not you. Try again — if it keeps happening, we're on it.",
    reintentar: "Try again",
    portada: "Go to the home page",
  },
  pt: {
    titulo: "Alguma coisa partiu do nosso lado",
    texto: "Não foste tu. Tenta outra vez: se continuar, já estamos a ver o que é.",
    reintentar: "Tentar outra vez",
    portada: "Ir para a página inicial",
  },
  fr: {
    titulo: "Quelque chose a cassé chez nous",
    texto: "Ce n'est pas toi, c'est nous. Réessaie : si ça continue, on est déjà dessus.",
    reintentar: "Réessayer",
    portada: "Aller à l'accueil",
  },
  it: {
    titulo: "Qualcosa si è rotto da parte nostra",
    texto: "Non è colpa tua. Riprova: se continua, ce ne stiamo già occupando.",
    reintentar: "Riprova",
    portada: "Vai alla home",
  },
};

/** El idioma que ya decidió el servidor, leído de donde lo dejó. */
function textos(): Textos {
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "es";
  return TEXTOS[lang] ?? TEXTOS.es;
}

export function Reventado({ reset }: { reset?: () => void }) {
  const t = textos();
  return (
    <main
      style={{
        minHeight: "80vh", display: "grid", placeItems: "center", padding: "72px 20px",
        background: "#F5F6F1", color: "#141509",
        font: "16px/1.6 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div
          style={{
            width: 76, height: 76, borderRadius: 20, margin: "0 auto 26px",
            background: "#141509", color: "#C4F000", display: "grid", placeItems: "center",
            font: "700 30px system-ui, sans-serif", boxShadow: "0 4px 14px -3px rgba(20,21,9,.12)",
          }}
        >
          500
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.03em", margin: "0 0 12px", lineHeight: 1.15 }}>
          {t.titulo}
        </h1>
        <p style={{ color: "#55584C", fontSize: 17, margin: "0 auto 30px", maxWidth: 440 }}>{t.texto}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {reset && (
            <button
              type="button"
              onClick={reset}
              style={{
                height: 46, padding: "0 22px", borderRadius: 9, border: "1px solid transparent",
                background: "#C4F000", color: "#141509", font: "600 15px system-ui, sans-serif",
                cursor: "pointer",
              }}
            >
              {t.reintentar}
            </button>
          )}
          <a
            href="/"
            style={{
              height: 46, padding: "0 22px", borderRadius: 9, border: "1px solid #DEDFD6",
              background: "#FFF", color: "#141509", font: "600 15px system-ui, sans-serif",
              display: "inline-flex", alignItems: "center", textDecoration: "none",
            }}
          >
            {t.portada}
          </a>
        </div>
      </div>
    </main>
  );
}
