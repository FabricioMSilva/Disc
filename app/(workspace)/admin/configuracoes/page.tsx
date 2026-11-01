import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/shared";

export default async function SettingsPage() {
  const { profile } = await requireAdmin();
  if (profile?.role !== "super_admin") redirect("/acesso-negado");
  const settings = [
    ["Supabase Auth e banco", isSupabaseConfigured() ? "Configurado neste ambiente" : "Aguardando variáveis de ambiente"],
    ["SSO corporativo", "Preparado para integração OIDC; requer configuração do provedor"],
    ["E-mail de convites", "Configure SMTP ou Auth Invite no Supabase"],
    ["Segredo service_role", "Não utilizado pelo frontend"],
  ];
  return <><p className="eyebrow">Governança técnica</p><h1 className="page-title">Configurações</h1><p className="page-subtitle">Estado de integrações e requisitos do ambiente.</p><section className="surface" style={{ marginTop: 24, padding: 20, display: "grid", gap: 18 }}>{settings.map(([label, value]) => <div key={label} style={{ display: "grid", gridTemplateColumns: "minmax(160px,.6fr) 1fr", gap: 15 }}><strong style={{ fontSize: 12 }}>{label}</strong><span className="muted" style={{ fontSize: 12 }}>{value}</span></div>)}</section><p className="muted" style={{ fontSize: 11, marginTop: 12 }}>A integração Microsoft Entra ID via OIDC depende de credenciais e configuração do tenant corporativo.</p></>;
}