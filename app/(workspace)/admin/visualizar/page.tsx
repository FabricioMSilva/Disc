import Link from "next/link";
import { ArrowRight, ClipboardList, Eye, UsersRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { DashboardCharts } from "@/components/admin/DashboardCharts";

const managerTeams = [
  { name: "Operação A", total: 8 },
  { name: "Operação B", total: 6 },
  { name: "Logística", total: 5 },
  { name: "Manutenção", total: 4 },
];
const managerProfiles = [
  { name: "D", total: 5 },
  { name: "I", total: 6 },
  { name: "S", total: 7 },
  { name: "C", total: 5 },
];

export default async function AdminPreviewPage({ searchParams }: {
  searchParams: Promise<{ como?: string }>;
}) {
  await requireAdmin();
  const { como } = await searchParams;
  const isManager = como === "jossimar";

  return <>
    <div className="preview-banner">
      <span><Eye size={15} style={{ verticalAlign: "middle", marginRight: 7 }} />Prévia somente de leitura · dados demonstrativos</span>
      <Link href="/admin" style={{ color: "var(--blue)", fontWeight: 700 }}>Voltar ao painel</Link>
    </div>
    <nav className="preview-switcher" aria-label="Escolher prévia">
      <Link href="/admin/visualizar?como=participante" className={isManager ? "button-secondary" : "button-primary"} aria-current={isManager ? undefined : "page"}>Usuário comum</Link>
      <Link href="/admin/visualizar?como=jossimar" className={isManager ? "button-primary" : "button-secondary"} aria-current={isManager ? "page" : undefined}>Jossimar · gestor</Link>
    </nav>
    <div className="preview-enter">
      {isManager ? <>
        <p className="eyebrow">Prévia do gestor</p>
        <h1 className="page-title">Visão geral da equipe</h1>
        <p className="page-subtitle">O painel real de Jossimar mostrará os resultados autorizados das equipes vinculadas ao perfil dele.</p>
        <div className="kpi-grid">
          {[["Integrantes", "23"], ["Pendentes", "6"], ["Em andamento", "5"], ["Concluídas", "12"], ["Participação", "74%"]].map(([label, value]) => <article key={label} className="surface kpi"><span className="kpi-label">{label}</span><p className="kpi-value">{value}</p></article>)}
        </div>
        <DashboardCharts byTeam={managerTeams} discProfiles={managerProfiles} />
        <section className="surface preview-note">
          <UsersRound size={18} color="var(--blue)" />
          <div><strong>Para mostrar os dados reais</strong><p className="muted">Jossimar precisa criar e confirmar a conta, receber o perfil de gestor e ser vinculado às equipes no painel administrativo.</p><div className="preview-links"><Link href="/admin/pessoas">Configurar perfil <ArrowRight size={14} /></Link><Link href="/admin/equipes">Vincular equipes <ArrowRight size={14} /></Link></div></div>
        </section>
      </> : <>
        <p className="eyebrow">Prévia do participante</p>
        <h1 className="page-title">Olá, colaborador</h1>
        <p className="page-subtitle">Acompanhe suas avaliações e seu desenvolvimento.</p>
        <div className="kpi-grid">
          {[["Disponíveis", "1"], ["Em andamento", "1"], ["Concluídas", "2"], ["Última atividade", "Hoje"]].map(([label, value]) => <article key={label} className="surface kpi"><span className="kpi-label">{label}</span><p className="kpi-value">{value}</p></article>)}
        </div>
        <section className="surface preview-note">
          <ClipboardList size={20} color="var(--blue)" />
          <div><p className="eyebrow">Sua próxima etapa</p><h2>Continue sua avaliação</h2><p className="muted">Seu progresso foi salvo e você pode continuar de onde parou.</p><button className="button-primary" type="button" disabled>Continuar avaliação <ArrowRight size={15} /></button></div>
        </section>
        <p className="muted preview-caption">Esta é uma prévia visual. Nenhuma avaliação ou resposta será criada ou alterada.</p>
      </>}
    </div>
  </>;
}
