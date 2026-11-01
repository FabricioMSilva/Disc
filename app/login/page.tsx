"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { signInAction } from "@/app/login/actions";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await signInAction({ email, password });
      if (result?.error) setMessage(result.error);
    });
  };
  return (
    <main style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(360px, .95fr)", background: "var(--navy)" }}>
      <section style={{ padding: "40px clamp(28px, 7vw, 100px)", display: "flex", flexDirection: "column", justifyContent: "space-between", color: "white" }}>
        <Link href="/" className="brand" style={{ padding: 0 }}><span className="brand-mark">P</span> PEOPLE INSIGHTS</Link>
        <div><p style={{ color: "var(--yellow)", fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>Acesso seguro</p><h1 className="display" style={{ fontSize: "clamp(38px, 5vw, 64px)", lineHeight: 1.05, maxWidth: 520 }}>Desenvolvimento começa com perspectiva.</h1><p style={{ color: "#a9bad0", maxWidth: 440, lineHeight: 1.8 }}>Entre para acessar avaliações e recursos disponíveis para o seu perfil.</p></div>
        <div style={{ color: "#8296b0", fontSize: 12 }}>Autenticação protegida pelo Supabase</div>
      </section>
      <section style={{ background: "var(--page)", display: "grid", placeItems: "center", padding: 24 }}>
        <form onSubmit={onSubmit} className="surface" style={{ width: "min(100%, 430px)", padding: "clamp(26px, 5vw, 44px)" }}>
          <Link href="/" aria-label="Voltar" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 28 }}><ArrowLeft size={18} /></Link>
          <p className="eyebrow">Acesso à plataforma</p><h2 style={{ margin: "8px 0 24px", fontSize: 28 }}>Entrar</h2>
          <label className="field-label" htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="field-label" htmlFor="password" style={{ marginTop: 17 }}>Senha</label>
          <input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          {message && <p role="alert" style={{ color: "var(--red)", fontSize: 12, marginTop: 14 }}>{message}</p>}
          <button className="button-primary" disabled={pending || !email || password.length < 8} style={{ width: "100%", marginTop: 22 }}>{pending ? "Autenticando..." : "Entrar"} {!pending && <ArrowRight size={16} />}</button>
          <p style={{ display: "flex", gap: 7, justifyContent: "center", alignItems: "center", color: "var(--muted)", fontSize: 11, marginTop: 21 }}><LockKeyhole size={13} /> Seus dados são acessados conforme seu perfil.</p>
          <p style={{ textAlign: "center", fontSize: 12, margin: "18px 0 0" }}>Tem um convite? <Link href="/cadastro" style={{ color: "var(--blue)", fontWeight: 700 }}>Ativar conta</Link></p>
        </form>
      </section>
    </main>
  );
}