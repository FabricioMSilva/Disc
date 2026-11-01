import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const { user, profile } = await requireUser();
  const fields = [
    ["Nome completo", profile?.nome || "Não informado"], ["E-mail", profile?.email || user.email || "Não informado"],
    ["Matrícula", profile?.matricula || "Não informada"], ["Função", profile?.funcao || "Não informada"],
    ["Equipe", profile?.equipe || "Não informada"], ["Gestor", profile?.gestor || "Não informado"],
  ];
  return <><p className="eyebrow">Conta</p><h1 className="page-title">Meu perfil</h1><p className="page-subtitle">Informações vinculadas à sua conta corporativa.</p>
    <section className="surface" style={{ marginTop: 26, padding: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 22 }}>{fields.map(([label, value]) => <div key={label}><div className="field-label">{label}</div><div style={{ fontSize: 14 }}>{value}</div></div>)}</section>
    <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>Para corrigir dados corporativos, contate o administrador da plataforma.</p>
  </>;
}