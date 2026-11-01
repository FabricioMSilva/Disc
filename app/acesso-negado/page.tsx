import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedPage() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "var(--page)" }}><section className="surface" style={{ width: "min(100%, 520px)", padding: 36, textAlign: "center" }}><ShieldAlert size={34} color="var(--orange)" /><h1 style={{ fontSize: 28 }}>Acesso não autorizado</h1><p className="muted" style={{ lineHeight: 1.7 }}>Seu perfil não tem permissão para acessar este recurso. Se acredita que isso é um erro, contate o administrador da plataforma.</p><Link className="button-primary" href="/painel" style={{ marginTop: 16 }}>Ir para meu painel</Link></section></main>;
}