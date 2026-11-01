"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Archive, ClipboardList, FilePlus2, Gauge, History, LayoutDashboard,
  ListChecks, LockKeyhole, Settings2, Shield, Users, UsersRound, UserRound,
} from "lucide-react";

type Role = "super_admin" | "admin" | "manager" | "questionnaire_editor" | "participant" | "auditor";
type Item = { href: string; label: string; icon: typeof LayoutDashboard };

const navigation: Record<Role, Item[]> = {
  participant: [
    { href: "/painel", label: "Meu painel", icon: LayoutDashboard },
    { href: "/avaliacoes", label: "Minhas avaliações", icon: ClipboardList },
    { href: "/historico", label: "Meu histórico", icon: History },
    { href: "/perfil", label: "Meu perfil", icon: UserRound },
  ],
  manager: [
    { href: "/gestor", label: "Visão geral", icon: Gauge },
    { href: "/gestor/equipe", label: "Minha equipe", icon: UsersRound },
    { href: "/gestor/pessoas", label: "Pessoas", icon: Users },
    { href: "/campanhas", label: "Campanhas", icon: Activity },
    { href: "/questionarios", label: "Questionários", icon: ListChecks },
    { href: "/resultados", label: "Resultados", icon: ClipboardList },
  ],
  questionnaire_editor: [
    { href: "/questionarios", label: "Questionários", icon: ListChecks },
    { href: "/questionarios/criar", label: "Criar questionário", icon: FilePlus2 },
  ],
  admin: [
    { href: "/admin", label: "Command Center", icon: Gauge },
    { href: "/admin/pessoas", label: "Pessoas e acessos", icon: Users },
    { href: "/admin/equipes", label: "Equipes e gestores", icon: UsersRound },
    { href: "/questionarios", label: "Questionários", icon: ListChecks },
    { href: "/campanhas", label: "Campanhas", icon: Activity },
    { href: "/admin/resultados", label: "Resultados", icon: ClipboardList },
    { href: "/admin/auditoria", label: "Auditoria", icon: Shield },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings2 },
  ],
  super_admin: [
    { href: "/admin", label: "Command Center", icon: Gauge },
    { href: "/admin/pessoas", label: "Pessoas e acessos", icon: Users },
    { href: "/admin/equipes", label: "Equipes e gestores", icon: UsersRound },
    { href: "/questionarios", label: "Questionários", icon: ListChecks },
    { href: "/campanhas", label: "Campanhas", icon: Activity },
    { href: "/admin/resultados", label: "Resultados", icon: ClipboardList },
    { href: "/admin/auditoria", label: "Auditoria", icon: Shield },
    { href: "/admin/configuracoes", label: "Configurações", icon: Settings2 },
  ],
  auditor: [{ href: "/admin/auditoria", label: "Auditoria", icon: Archive }],
};

export function AppSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const items = navigation[role as Role] ?? navigation.participant;
  return (
    <aside className="sidebar">
      <Link href="/painel" className="brand"><span className="brand-mark">P</span><span>PEOPLE INSIGHTS</span></Link>
      <nav className="nav-section" aria-label="Navegação principal">
        <p className="nav-label">Workspace</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={16} /><span>{label}</span></Link>;
        })}
      </nav>
      <div style={{ marginTop: "auto", padding: "0 10px", color: "#7890ad", fontSize: 10, display: "flex", gap: 8, alignItems: "center" }}><LockKeyhole size={13} /> Acesso governado por perfil</div>
    </aside>
  );
}