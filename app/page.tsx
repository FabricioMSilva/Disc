import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function LandingPage() {
  return (
    <main style={{ minHeight: "100vh", background: "var(--navy)", color: "white", overflow: "hidden" }}>
      <header style={{ height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1320, margin: "auto", padding: "0 24px" }}>
        <BrandLogo variant="header" />
        <Link className="button-secondary" href="/login">Entrar <ArrowUpRight size={16} /></Link>
      </header>
      <section style={{ maxWidth: 1320, margin: "auto", padding: "clamp(58px, 9vh, 96px) 24px 70px", position: "relative" }}>
        <div aria-hidden="true" style={{ position: "absolute", right: 24, top: 35, width: 300, height: 300, border: "1px solid #ffffff24", borderRadius: "50%", boxShadow: "0 0 0 32px #ffffff08, 0 0 0 64px #ffffff05", pointerEvents: "none" }} />
        <p style={{ color: "var(--yellow)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Plataforma corporativa de avaliações e desenvolvimento de equipes</p>
        <h1 className="display" style={{ maxWidth: 720, margin: "14px 0", fontSize: "clamp(34px, 5.5vw, 56px)", lineHeight: 1.08 }}>People insights,<br />em perspectiva.</h1>
        <p style={{ maxWidth: 560, color: "#b3c2d5", lineHeight: 1.7, fontSize: 14 }}>Avaliações estruturadas para apoiar autoconhecimento e desenvolvimento operacional, com governança de dados e acesso por perfil.</p>
        <Link className="button-primary" href="/login" style={{ marginTop: 18, minHeight: 40, background: "var(--yellow)", color: "var(--navy)" }}>Acessar plataforma <ArrowUpRight size={16} /></Link>
      </section>
      <section style={{ borderTop: "1px solid #ffffff20", background: "#ffffff07" }}><div style={{ maxWidth: 1320, margin: "auto", padding: "28px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 20 }}>{["Sem respostas certas ou erradas", "Responda com sinceridade", "Acesso protegido por perfil"].map((item) => <div key={item} style={{ display: "flex", gap: 10, color: "#c6d3e2", fontSize: 12 }}><Check size={16} color="var(--green)" />{item}</div>)}</div></section>
      <footer style={{ maxWidth: 1320, margin: "auto", padding: "20px 28px", color: "#8094ad", fontSize: 11, display: "flex", gap: 8, alignItems: "center" }}><ShieldCheck size={14} /> Resultados são indicadores de desenvolvimento, não julgamentos de desempenho.</footer>
    </main>
  );
}