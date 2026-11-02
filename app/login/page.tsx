"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, Search, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SplashScreen } from "@/components/auth/SplashScreen";
import { searchEmployeeDirectoryAction, signInAction } from "@/app/login/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";
import {
  APP_DEVELOPER,
  APP_DESCRIPTION,
  APP_NAME,
  SPLASH_DURATION_MS,
  SPLASH_EXIT_DURATION_MS,
  SPLASH_SESSION_KEY,
} from "@/lib/app-config";

type Employee = Database["public"]["Functions"]["search_employee_directory"]["Returns"][number];

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
      if (!selectedEmployee?.email) {
        showMessage("Selecione um funcionário com e-mail cadastrado.");
        return;
      }
      try {
        const supabase = createSupabaseBrowserClient();
        const email = selectedEmployee.email;
        if (selectedEmployee.has_account && !selectedEmployee.email_confirmed) {
          const { error } = await supabase.auth.resend({ type: "signup", email });
          showMessage(error
            ? "Não foi possível reenviar a confirmação. Tente novamente ou contate o administrador."
            : "Enviamos novamente o link de confirmação para o e-mail cadastrado.", error ? "error" : "status");
          return;
        }
        if (selectedEmployee.has_account && !selectedEmployee.has_password) {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/definir-senha`,
          });
          showMessage(error
            ? "Não foi possível enviar o link para criar sua senha. Tente novamente."
            : "Enviamos um link para criar sua senha. Acesse o e-mail cadastrado para continuar.", error ? "error" : "status");
          return;
        }
        if (selectedEmployee.has_account) {
          const result = await signInAction({ email, password });
          if (result?.error) showMessage(result.error);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: selectedEmployee.name,
              employee_number: selectedEmployee.employee_number,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/painel`,
          },
        });
        if (error) {
          console.error("Supabase sign-up failed", { code: error.code, status: error.status, message: error.message });
          const errorMessage = error.message.toLocaleLowerCase("pt-BR");
          if (error.code === "user_already_exists" || errorMessage.includes("already registered")) {
            showMessage("Este cadastro já tem uma conta. Atualize a página e pesquise novamente; se continuar pendente, o administrador precisa revisar a conta no Supabase.");
          } else if (error.status === 429 || errorMessage.includes("rate limit")) {
            showMessage("Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente.");
          } else if (errorMessage.includes("database error saving new user")) {
            showMessage("O Supabase não conseguiu criar o perfil deste cadastro. O administrador precisa verificar o registro de usuário no banco.");
          } else {
            const errorCode = error.code ?? (error.status ? `HTTP ${error.status}` : "sem código");
            showMessage(`O Supabase recusou o cadastro (${errorCode}). Confirme que “Confirm email” está desligado e salvo; se já estiver, envie este código ao administrador.`);
          }
          return;
        }
        if (data.session) {
          window.location.assign("/painel");
          return;
        }
        showMessage("Cadastro criado. Enviamos um link de confirmação ao e-mail cadastrado; depois de confirmá-lo, você entrará automaticamente.", "status");
      } catch (error) {
        showMessage(error instanceof Error ? error.message : "Não foi possível conectar ao Supabase.");
      }
    });
  };

  const selectedActionLabel = !selectedEmployee
    ? "Selecione seu nome"
    : selectedEmployee.has_account && !selectedEmployee.email_confirmed
      ? "Reenviar confirmação"
      : selectedEmployee.has_account && !selectedEmployee.has_password
        ? "Enviar link para criar senha"
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
        <div><p style={{ color: "var(--yellow)", fontWeight: 700, textTransform: "uppercase", fontSize: 10 }}>Acesso seguro</p><h1 className="display" style={{ fontSize: "clamp(32px, 4vw, 48px)", lineHeight: 1.1, maxWidth: 520 }}>Desenvolvimento começa com perspectiva.</h1><p style={{ color: "#a9bad0", maxWidth: 440, lineHeight: 1.7, fontSize: 13 }}>Encontre seu cadastro para entrar ou criar sua senha de primeiro acesso.</p></div>
        <div style={{ color: "#8296b0", fontSize: 12 }}>Autenticação protegida pelo Supabase</div>
      </section>
      <section className="login-form-panel">
        <form onSubmit={handleSubmit} className="surface" style={{ width: "min(100%, 430px)", padding: "clamp(26px, 5vw, 44px)" }}>
          <Link href="/" aria-label="Voltar" style={{ display: "inline-flex", color: "var(--muted)", marginBottom: 28 }}><ArrowLeft size={18} /></Link>
          <p className="eyebrow">Acesso à plataforma</p><h2 style={{ margin: "8px 0", fontSize: 23 }}>Entrar</h2>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.6, margin: "0 0 20px" }}>Pesquise pelo seu nome, e-mail ou matrícula e selecione seu cadastro.</p>
          <label className="field-label" htmlFor="employee-search">Funcionário</label>
          <div style={{ position: "relative" }}>
            <Search size={17} style={{ position: "absolute", left: 13, top: 14, color: "var(--muted)" }} />
            <input id="employee-search" type="search" autoComplete="off" className="field" style={{ paddingLeft: 40 }} value={query} onChange={(event) => { setQuery(event.target.value); setEmployees([]); setSelectedEmployee(null); setPassword(""); setMessage(""); }} placeholder="Nome, e-mail ou matrícula" />
          </div>
          {searching && <p role="status" style={{ color: "var(--muted)", fontSize: 12, margin: "8px 0" }}>Pesquisando...</p>}
          {searchError && <p role="alert" style={{ color: "var(--red)", fontSize: 12, margin: "8px 0" }}>{searchError}</p>}
          {!searching && !searchError && query.trim().length >= 3 && employees.length === 0 && <p style={{ color: "var(--muted)", fontSize: 12, margin: "8px 0" }}>Nenhum funcionário encontrado.</p>}
          {employees.length > 0 && <div role="listbox" aria-label="Resultados da pesquisa" style={{ display: "grid", gap: 6, marginTop: 8, maxHeight: 190, overflowY: "auto" }}>
            {employees.map((employee) => <button key={employee.employee_id} type="button" role="option" aria-selected={selectedEmployee?.employee_id === employee.employee_id} onClick={() => { setSelectedEmployee(employee); setPassword(""); setMessage(""); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left", padding: "10px 12px", borderRadius: 9, border: `1px solid ${selectedEmployee?.employee_id === employee.employee_id ? "var(--blue)" : "var(--border)"}`, background: selectedEmployee?.employee_id === employee.employee_id ? "var(--blue-light)" : "white", cursor: "pointer", color: "var(--ink)" }}>
              <UserRound size={17} style={{ marginTop: 2, color: "var(--blue)", flexShrink: 0 }} />
              <span><strong style={{ display: "block", fontSize: 13 }}>{employee.name}</strong><span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{[employee.employee_number, employee.email, employee.profile].filter(Boolean).join(" · ")}</span></span>
            </button>)}
          </div>}
          {selectedEmployee && <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>{selectedEmployee.name}</p>
            <p style={{ color: "var(--muted)", fontSize: 11, margin: "0 0 12px" }}>{selectedEmployee.email ?? "Este cadastro não possui e-mail. Contate o administrador."}</p>
            {(!selectedEmployee.has_account || (selectedEmployee.has_password && selectedEmployee.email_confirmed)) && <><label className="field-label" htmlFor="password">{selectedEmployee.has_account ? "Senha" : "Crie sua senha"}</label>
              <input id="password" type="password" autoComplete={selectedEmployee.has_account ? "current-password" : "new-password"} className="field" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
              {!selectedEmployee.has_account && <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>Use pelo menos 8 caracteres. Você poderá acessar automaticamente após confirmar o e-mail.</p>}
            </>}
          </div>}
          {message && <p role={messageType === "error" ? "alert" : "status"} style={{ color: messageType === "error" ? "var(--red)" : "var(--green)", fontSize: 12, marginTop: 14 }}>{message}</p>}
          <button className="button-primary" disabled={pending || !selectedEmployee || !selectedEmployee.email || ((!selectedEmployee.has_account || (selectedEmployee.has_password && selectedEmployee.email_confirmed)) && password.length < 8)} style={{ width: "100%", marginTop: 22 }}>{pending ? "Aguarde..." : selectedActionLabel} {!pending && <ArrowRight size={16} />}</button>
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