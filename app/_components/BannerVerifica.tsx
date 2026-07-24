"use client";
import { useState } from "react";

export function BannerVerifica({ email }: { email: string }) {
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
        Te enviamos un correo a <b>{email}</b> para confirmar tu cuenta. Revisa tu bandeja (y el spam).
      </span>
      {estado === "enviado" ? (
        <span className="badge badge-exito"><span className="punto" />Reenviado</span>
      ) : (
        <button className="btn btn-sec btn-sm" onClick={reenviar} disabled={estado === "enviando"}>
          {estado === "enviando" ? "Enviando…" : "Reenviar correo"}
        </button>
      )}
    </div>
  );
}
