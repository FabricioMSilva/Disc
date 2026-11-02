"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  Activity, Archive, ClipboardList, FilePlus2, Gauge, History, LayoutDashboard,
  ListChecks, LockKeyhole, Settings2, Shield, Users, UsersRound,
} from "lucide-react";

type Role = "super_admin" | "admin" | "manager" | "questionnaire_editor" | "participant" | "auditor";
type Item = { href: string; label: string; icon: typeof LayoutDashboard };

const navigation: Record<Role, Item[]> = {
  participant: [
    { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
    { href: "/avaliacoes", label: "Minha Avaliação", icon: ClipboardList },
    { href: "/historico", label: "Meus Resultados", icon: History },
  ],
  manager: [
    { href: "/painel", label: "Dashboard", icon: LayoutDashboard },
    { href: "/avaliacoes", label: "Minha Avaliação", icon: ClipboardList },
    { href: "/historico", label: "Meus Resultados", icon: History },
    { href: "/gestor", label: "Dashboard da equipe", icon: Gauge },
    { href: "/gestor/equipe", label: "Equipe", icon: UsersRound },
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
      <BrandLogo href="/painel" variant="sidebar" />
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