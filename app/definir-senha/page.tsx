"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function DefinePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError("As senhas não coincidem.");
      return;
    }
    startTransition(async () => {
      setError("");
      setMessage("");
      try {
        const { error: updateError } = await createSupabaseBrowserClient().auth.updateUser({ password });
        if (updateError) {
          setError("Não foi possível salvar a senha. Abra novamente o link enviado ao seu e-mail.");
          return;
        }
      } catch {
        setError("Não foi possível salvar a senha. Abra novamente o link enviado ao seu e-mail.");
        return;
      }
      setMessage("Senha criada. Entrando...");
      window.location.assign("/painel");
    });
  };

  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 22, background: "var(--page)" }}>
    <form onSubmit={submit} className="surface" style={{ width: "min(100%, 430px)", padding: "clamp(26px, 5vw, 44px)" }}>
      <p className="eyebrow">Primeiro acesso</p>
      <h1 style={{ fontSize: 23, margin: "8px 0 10px" }}>Criar senha</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: "0 0 22px" }}>Defina uma senha para acessar sua conta.</p>
      <label className="field-label" htmlFor="password">Nova senha</label>
      <input id="password" type="password" autoComplete="new-password" className="field" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <label className="field-label" htmlFor="confirmation" style={{ marginTop: 16 }}>Confirme a senha</label>
      <input id="confirmation" type="password" autoComplete="new-password" className="field" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      {error && <p role="alert" style={{ color: "var(--red)", fontSize: 12, marginTop: 14 }}>{error}</p>}
      {message && <p role="status" style={{ color: "var(--green)", fontSize: 12, marginTop: 14 }}>{message}</p>}
      <button className="button-primary" disabled={pending || password.length < 8 || confirmation.length < 8} style={{ width: "100%", marginTop: 22 }}>{pending ? "Salvando..." : "Salvar senha"} {!pending && <ArrowRight size={16} />}</button>
      <p style={{ display: "flex", gap: 7, justifyContent: "center", alignItems: "center", color: "var(--muted)", fontSize: 11, marginTop: 20 }}><LockKeyhole size={13} /> Use pelo menos 8 caracteres.</p>
      <p style={{ textAlign: "center", fontSize: 12, margin: "18px 0 0" }}><Link href="/login" style={{ color: "var(--blue)", fontWeight: 700 }}>Voltar ao acesso</Link></p>
    </form>
  </main>;
}
