"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const schema = z.object({ name: z.string().trim().min(2, "Informe seu nome.").max(160), email: z.string().email("Informe um e-mail válido."), password: z.string().min(8, "Use ao menos 8 caracteres.") });
type Values = z.infer<typeof schema>;

export default function SignupPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema) });
  const submit = (values: Values) => startTransition(async () => {
    setError(""); setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signupError } = await supabase.auth.signUp({ email: values.email, password: values.password, options: { data: { name: values.name } } });
      if (signupError) { setError("Não foi possível iniciar o cadastro. Confira o e-mail ou contate o administrador."); return; }
      if (data.session && data.user) {
        const { data: profile } = await supabase.from("profiles").select("status,ativo").eq("id", data.user.id).maybeSingle();
        if (profile?.status === "active" && profile.ativo) { window.location.assign("/painel"); return; }
        await supabase.auth.signOut();
      }
      setMessage("Cadastro recebido. Confirme seu e-mail; o acesso será ativado se houver um convite válido para este endereço.");
    } catch {
      setError("A autenticação ainda não está configurada neste ambiente.");
    }
  });
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 22, background: "var(--page)" }}><form onSubmit={handleSubmit(submit)} className="surface" style={{ width: "min(100%, 470px)", padding: "clamp(24px, 5vw, 42px)" }}>
    <Link href="/login" aria-label="Voltar para login" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 24 }}><ArrowLeft size={18} /></Link><p className="eyebrow">Acesso por convite</p><h1 style={{ fontSize: 27, margin: "8px 0 20px" }}>Ativar conta</h1>
    <label className="field-label" htmlFor="name">Nome completo</label><input id="name" className="field" autoComplete="name" {...register("name")} />{errors.name && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{errors.name.message}</p>}
    <label className="field-label" htmlFor="signup-email" style={{ marginTop: 14 }}>E-mail convidado</label><input id="signup-email" type="email" className="field" autoComplete="email" {...register("email")} />{errors.email && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{errors.email.message}</p>}
    <label className="field-label" htmlFor="signup-password" style={{ marginTop: 14 }}>Senha</label><input id="signup-password" type="password" className="field" autoComplete="new-password" {...register("password")} />{errors.password && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{errors.password.message}</p>}
    {error && <p role="alert" style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}{message && <p role="status" style={{ color: "var(--green)", fontSize: 12, lineHeight: 1.6 }}>{message}</p>}
    <button className="button-primary" disabled={pending} style={{ width: "100%", marginTop: 20 }}>{pending ? "Enviando..." : "Continuar"} {!pending && <ArrowRight size={15} />}</button>
  </form></main>;
}