"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, LockKeyhole, Search, UserRound } from "lucide-react";
import { searchEmployeeDirectoryAction, signInEmployeeAction } from "@/app/login/actions";

type EmployeeOption = { name: string; employeeNumber: string; profile: string; shift: string; location: string; hasEmail: boolean };

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<EmployeeOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<EmployeeOption | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (query.trim().length < 3 || selected) { setMatches([]); setSearching(false); return; }
    let cancelled = false;
    const timer = window.setTimeout(() => startTransition(async () => {
      try {
        const result = await searchEmployeeDirectoryAction(query);
        if (!cancelled) {
          setMatches(result.matches);
          setMessage(result.error ?? "");
        }
      } catch {
        if (!cancelled) setMessage("Não foi possível consultar a lista de funcionários.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }), 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, selected]);
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || !confirmed || !selected.hasEmail || pending) return;
    setMessage("");
    startTransition(async () => {
      const result = await signInEmployeeAction({ employeeNumber: selected.employeeNumber, password });
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
          <label className="field-label" htmlFor="employee-search">Nome, matrícula ou e-mail corporativo</label>
          <div style={{ position: "relative" }}><Search size={16} aria-hidden="true" style={{ position: "absolute", left: 12, top: 14, color: "var(--muted)" }} /><input id="employee-search" autoComplete="off" className="field" value={query} disabled={Boolean(confirmed)} onChange={(event) => { setQuery(event.target.value); setSearching(event.target.value.trim().length >= 3); setSelected(null); setConfirmed(false); setPassword(""); setMessage(""); }} placeholder="Comece a digitar..." style={{ paddingLeft: 38 }} /></div>
          {matches.length > 0 && <div role="listbox" aria-label="Funcionários encontrados" style={{ maxHeight: 220, overflowY: "auto", marginTop: 6, border: "1px solid var(--line)", borderRadius: 6, background: "var(--surface)" }}>{matches.map((employee) => <button key={employee.employeeNumber} type="button" role="option" aria-selected={selected?.employeeNumber === employee.employeeNumber} onClick={() => { setSelected(employee); setMatches([]); setConfirmed(false); setPassword(""); setMessage(""); }} className="employee-suggestion"><span className="employee-suggestion-icon"><UserRound size={16} /></span><span className="employee-suggestion-copy"><strong>{employee.name}</strong><span>{employee.employeeNumber} · {employee.profile}</span></span><ArrowRight size={14} /></button>)}</div>}
          {searching && matches.length === 0 && !message && <p role="status" className="muted" style={{ fontSize: 11, marginTop: 8 }}>Buscando funcionário...</p>}
          {query.trim().length >= 3 && !searching && !pending && matches.length === 0 && !selected && !message && <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>Nenhum funcionário encontrado.</p>}
          {selected && <div className="employee-confirmation" style={{ marginTop: 14 }}><div style={{ display: "flex", gap: 11, alignItems: "center" }}><span className="employee-suggestion-icon"><UserRound size={18} /></span><div><strong style={{ display: "block", fontSize: 13 }}>{selected.name}</strong><span className="muted" style={{ fontSize: 11 }}>{selected.employeeNumber} · {selected.profile} · {selected.shift}</span></div></div>{!confirmed ? <><p className="muted" style={{ fontSize: 11, margin: "13px 0" }}>Este é você?</p><div style={{ display: "flex", gap: 8 }}><button type="button" className="button-primary" disabled={!selected.hasEmail} onClick={() => { setConfirmed(true); setMessage(""); }}><BadgeCheck size={15} /> Sim, continuar</button><button type="button" className="button-secondary" onClick={() => { setSelected(null); setQuery(""); }}>Trocar</button></div>{!selected.hasEmail && <p role="status" className="muted" style={{ fontSize: 11, marginBottom: 0 }}>Seu cadastro ainda não tem e-mail. Peça ao administrador para habilitar o acesso.</p>}</> : <><label className="field-label" htmlFor="password" style={{ marginTop: 17 }}>Senha da conta corporativa</label><input id="password" type="password" autoComplete="current-password" className="field" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /><button type="button" className="text-button" onClick={() => { setConfirmed(false); setPassword(""); setMessage(""); }}>Não sou eu</button></>}</div>}
          {message && <p role="alert" style={{ color: "var(--red)", fontSize: 12, marginTop: 14 }}>{message}</p>}
          {confirmed && <button className="button-primary" disabled={pending || password.length < 8} style={{ width: "100%", marginTop: 22 }}>{pending ? "Autenticando..." : "Entrar"} {!pending && <ArrowRight size={16} />}</button>}
          <p style={{ display: "flex", gap: 7, justifyContent: "center", alignItems: "center", color: "var(--muted)", fontSize: 11, marginTop: 21 }}><LockKeyhole size={13} /> Seus dados são acessados conforme seu perfil.</p>
          <p style={{ textAlign: "center", fontSize: 12, margin: "18px 0 0" }}>Tem um convite? <Link href="/cadastro" style={{ color: "var(--blue)", fontWeight: 700 }}>Ativar conta</Link></p>
        </form>
      </section>
    </main>
  );
}