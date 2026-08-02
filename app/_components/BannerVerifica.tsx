"use client";
import { useState } from "react";
import type { TextosPanel } from "@/src/i18n/panel";

type Textos = TextosPanel["verifica"];

export function BannerVerifica({ email, t }: { email: string; t: Textos }) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "enviado">("idle");

  async function reenviar() {
    setEstado("enviando");
    try {
      await fetch("/api/auth/reenviar", { method: "POST" });
      setEstado("enviado");
    } catch {
      setEstado("idle");
    }
  }

  return (
    <div className="banner-verifica" role="status">
      <span className="crece">
        {t.antes}<b>{email}</b>{t.despues}
      </span>
      {estado === "enviado" ? (
        <span className="badge badge-exito"><span className="punto" />{t.reenviado}</span>
      ) : (
        <button className="btn btn-sec btn-sm" onClick={reenviar} disabled={estado === "enviando"}>
          {estado === "enviando" ? t.enviando : t.reenviar}
        </button>
      )}
    </div>
  );
}
