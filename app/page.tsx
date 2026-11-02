import Link from "next/link";
import { ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <BrandLogo variant="header" />
      </header>
      <section className="landing-hero">
        <p className="landing-eyebrow">Plataforma corporativa de avaliações e desenvolvimento de equipes</p>
        <h1 className="display landing-title">People insights,<br />em perspectiva.</h1>
        <p className="landing-copy">Avaliações estruturadas para apoiar autoconhecimento e desenvolvimento operacional, com governança de dados e acesso por perfil.</p>
        <Link className="button-primary landing-cta" href="/login">Acessar plataforma <ArrowUpRight size={16} /></Link>
      </section>
      <section className="landing-benefits"><div className="landing-benefits-list">{["Sem respostas certas ou erradas", "Responda com sinceridade", "Acesso protegido por perfil"].map((item) => <div className="landing-benefit" key={item}><Check size={16} color="var(--green)" />{item}</div>)}</div></section>
      <footer className="landing-footer"><ShieldCheck size={14} /> Resultados são indicadores de desenvolvimento, não julgamentos de desempenho.</footer>
    </main>
  );
}