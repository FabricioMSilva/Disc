"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, Search, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SplashScreen } from "@/components/auth/SplashScreen";
import { searchEmployeeDirectoryAction, signInAction, signUpAction } from "@/app/login/actions";
import type { Database } from "@/lib/database.types";
import {
  APP_DEVELOPER,
  APP_DESCRIPTION,
  APP_NAME,
  SPLASH_DURATION_MS,
  SPLASH_EXIT_DURATION_MS,
  SPLASH_SESSION_KEY,
} from "@/lib/app-config";

type Employee = Omit<Database["public"]["Functions"]["search_employee_directory"]["Returns"][number], "email">;

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [password, setPassword] = useState("");
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();
  const [searchError, setSearchError] = useState("");
  const [messageType, setMessageType] = useState<"error" | "status">("error");
  const [splashPhase, setSplashPhase] = useState<"checking" | "visible" | "exiting" | "done">("checking");

  const showMessage = (text: string, type: "error" | "status" = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  useEffect(() => {
    let active = true;
    if (query.trim().length < 3) {
      setEmployees([]);
      setSearchError("");
      setSearching(false);
      return () => { active = false; };
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      let result: Awaited<ReturnType<typeof searchEmployeeDirectoryAction>>;
      try {
        result = await searchEmployeeDirectoryAction(query);
      } catch {
        if (active) {
          setSearchError("Não foi possível pesquisar funcionários. Verifique sua conexão e tente novamente.");
          setEmployees([]);
          setSearching(false);
        }
        return;
      }
      if (!active) return;
      if ("employees" in result) {
        setSearchError("");
        setEmployees(result.employees ?? []);
      } else {
        setSearchError(result.error);
        setEmployees([]);
      }
      setSearching(false);
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "confirmation") {
      showMessage("O link expirou ou não pôde ser confirmado. Pesquise seu cadastro e solicite um novo link.");
    }
  }, []);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "1";
      if (!alreadySeen) window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch (error) {
      console.warn("Splash session storage is unavailable:", error);
    }

    if (alreadySeen) {
      setSplashPhase("done");
      return;
    }

    setSplashPhase("visible");
    const exitTimer = window.setTimeout(
      () => setSplashPhase("exiting"),
      SPLASH_DURATION_MS - SPLASH_EXIT_DURATION_MS,
    );
    const completeTimer = window.setTimeout(() => setSplashPhase("done"), SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(completeTimer);
    };
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      if (!selectedEmployee?.employee_number) {
        showMessage("Selecione um cadastro com matrícula.");
        return;
      }
      try {
        if (selectedEmployee.has_account && (!selectedEmployee.has_password || !selectedEmployee.email_confirmed)) {
          showMessage("Seu acesso ainda não está configurado. Contate o administrador.");
          return;
        }
        if (selectedEmployee.has_account) {
          const result = await signInAction({ employeeNumber: selectedEmployee.employee_number, password });
          if (result?.error) showMessage(result.error);
          return;
        }

        const result = await signUpAction({ employeeNumber: selectedEmployee.employee_number, password });
        if (result?.authenticated) {
          window.location.assign("/painel");
          return;
        }
        if (result?.error) showMessage(result.error);
      } catch (error) {
        showMessage(error instanceof Error ? error.message : "Não foi possível conectar ao Supabase.");
      }
    });
  };

  const selectedActionLabel = !selectedEmployee
    ? "Pesquise sua matrícula"
    : selectedEmployee.has_account && (!selectedEmployee.email_confirmed || !selectedEmployee.has_password)
        ? "Acesso pendente"
        : selectedEmployee.has_account
            ? "Entrar"
            : "Criar senha e continuar";

  const loginVisible = splashPhase === "exiting" || splashPhase === "done";
  const splashVisible = splashPhase === "visible" || splashPhase === "exiting";

  return (
    <>
    {splashPhase === "checking" && <div className="disc-splash splash-checking" aria-hidden="true" />}
    {splashVisible && <SplashScreen isExiting={splashPhase === "exiting"} />}
    <main className={`login-layout${loginVisible ? " is-visible" : ""}`} aria-hidden={!loginVisible}>
      <section className="login-intro">
        <BrandLogo href="/" variant="login" />
        <div><p style={{ color: "var(--yellow)", fontWeight: 700, textTransform: "uppercase", fontSize: 10 }}>Acesso seguro</p><h1 className="display" style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, maxWidth: 520 }}>Desenvolvimento começa com perspectiva.</h1><p style={{ color: "#a9bad0", maxWidth: 440, lineHeight: 1.7, fontSize: 13 }}>Use sua matrícula para entrar ou criar sua senha de primeiro acesso.</p></div>
        <div style={{ color: "#8296b0", fontSize: 12 }}>Autenticação protegida pelo Supabase</div>
      </section>
      <section className="login-form-panel">
        <form onSubmit={handleSubmit} className="surface" style={{ width: "min(100%, 430px)", padding: "clamp(26px, 5vw, 44px)" }}>
          <Link href="/" aria-label="Voltar" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 28 }}><ArrowLeft size={18} /></Link>
          <p className="eyebrow">Acesso à plataforma</p><h2 style={{ margin: "8px 0", fontSize: 23 }}>Entrar</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>Pesquise sua matrícula e selecione seu cadastro.</p>
          <label className="field-label" htmlFor="employee-search">Matrícula</label>
          <div style={{ position: "relative" }}>
            <Search size={17} style={{ position: "absolute", left: 13, top: 14, color: "var(--muted)" }} />
            <input id="employee-search" type="search" autoComplete="off" className="field" style={{ paddingLeft: 40 }} value={query} onChange={(event) => { setQuery(event.target.value); setEmployees([]); setSelectedEmployee(null); setPassword(""); setMessage(""); }} placeholder="Digite sua matrícula" />
          </div>
          {searching && <p role="status" style={{ color: "var(--muted)", fontSize: 12, margin: "8px 0" }}>Pesquisando...</p>}
          {searchError && <p role="alert" style={{ color: "var(--red)", fontSize: 12, margin: "8px 0" }}>{searchError}</p>}
          {!searching && !searchError && query.trim().length >= 3 && employees.length === 0 && <p style={{ color: "var(--muted)", fontSize: 12, margin: "8px 0" }}>Nenhum funcionário encontrado.</p>}
          {employees.length > 0 && <div role="listbox" aria-label="Resultados da pesquisa" style={{ display: "grid", gap: 6, marginTop: 8, maxHeight: 190, overflowY: "auto" }}>
            {employees.map((employee) => <button key={employee.employee_id} type="button" role="option" aria-selected={selectedEmployee?.employee_id === employee.employee_id} onClick={() => { setSelectedEmployee(employee); setPassword(""); setMessage(""); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1px solid ${selectedEmployee?.employee_id === employee.employee_id ? "var(--blue)" : "var(--border)"}`, background: selectedEmployee?.employee_id === employee.employee_id ? "var(--blue-light)" : "white", cursor: "pointer", color: "var(--ink)" }}>
              <UserRound size={17} style={{ marginTop: 2, color: "var(--blue)", flexShrink: 0 }} />
              <span><strong style={{ display: "block", fontSize: 13 }}>{employee.name}</strong><span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{[employee.employee_number, employee.profile].filter(Boolean).join(" · ")}</span></span>
            </button>)}
          </div>}
          {selectedEmployee && <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{selectedEmployee.name}</p>
            <p style={{ color: "var(--muted)", fontSize: 11, margin: "0 0 12px" }}>Matrícula: {selectedEmployee.employee_number}</p>
            {(!selectedEmployee.has_account || (selectedEmployee.has_password && selectedEmployee.email_confirmed)) && <><label className="field-label" htmlFor="password">{selectedEmployee.has_account ? "Senha" : "Crie sua senha"}</label>
              <input id="password" type="password" autoComplete={selectedEmployee.has_account ? "current-password" : "new-password"} className="field" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
              {!selectedEmployee.has_account && <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>Use pelo menos 8 caracteres. Você acessará sem precisar confirmar e-mail.</p>}
            </>}
            {selectedEmployee.has_account && (!selectedEmployee.has_password || !selectedEmployee.email_confirmed) && <p style={{ color: "var(--muted)", fontSize: 12, margin: "8px 0 0" }}>Este acesso precisa ser liberado pelo administrador.</p>}
          </div>}
          {message && <p role={messageType === "error" ? "alert" : "status"} style={{ color: messageType === "error" ? "var(--red)" : "var(--green)", fontSize: 12, marginTop: 14 }}>{message}</p>}
          <button className="button-primary" disabled={pending || !selectedEmployee || (!selectedEmployee.has_account || (selectedEmployee.has_password && selectedEmployee.email_confirmed)) && password.length < 8} style={{ width: "100%", marginTop: 22 }}>{pending ? "Aguarde..." : selectedActionLabel} {!pending && <ArrowRight size={16} />}</button>
          <p style={{ display: "flex", gap: 7, justifyContent: "center", alignItems: "center", color: "var(--muted)", fontSize: 11, marginTop: 21 }}><LockKeyhole size={13} /> Seus dados são acessados conforme seu perfil.</p>
        </form>
        <footer className="login-brand-footer">
          <span>{APP_NAME} • {APP_DESCRIPTION}</span>
          <span>Desenvolvido por <strong>{APP_DEVELOPER}</strong></span>
        </footer>
      </section>
    </main>
    </>
  );
}