"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  Archive, ClipboardList, FilePlus2, Gauge, History, LayoutDashboard, MoreHorizontal,
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
    { href: "/painel", label: "Início", icon: LayoutDashboard },
    { href: "/avaliacoes", label: "Minha avaliação", icon: ClipboardList },
    { href: "/historico", label: "Meu resultado", icon: History },
    { href: "/gestor/pessoas", label: "Pessoas", icon: UsersRound },
  ],
  questionnaire_editor: [
    { href: "/questionarios", label: "Questionários", icon: ListChecks },
    { href: "/questionarios/criar", label: "Criar questionário", icon: FilePlus2 },
  ],
  admin: [
    { href: "/admin", label: "Início", icon: Gauge },
    { href: "/admin/pessoas", label: "Pessoas", icon: Users },
    { href: "/admin/resultados", label: "Resultados", icon: ClipboardList },
  ],
  super_admin: [
    { href: "/admin", label: "Início", icon: Gauge },
    { href: "/admin/pessoas", label: "Pessoas", icon: Users },
    { href: "/admin/resultados", label: "Resultados", icon: ClipboardList },
    { href: "/avaliacoes", label: "Minha avaliação", icon: ClipboardList },
    { href: "/historico", label: "Meu resultado", icon: History },
    { href: "/gestor/pessoas", label: "Pessoas da equipe", icon: UsersRound },
  ],
  auditor: [{ href: "/admin/auditoria", label: "Auditoria", icon: Archive }],
};

const adminMore: Item[] = [
  { href: "/questionarios", label: "Questionários", icon: ListChecks },
  { href: "/admin/auditoria", label: "Auditoria", icon: Shield },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings2 },
];

export function AppSidebar({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navigation[role as Role] ?? navigation.participant;
  const isAdmin = role === "admin" || role === "super_admin";
  const moreActive = adminMore.some(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  return (
    <aside className="sidebar">
      <BrandLogo href="/painel" variant="sidebar" onClick={onNavigate} />
      <nav className="nav-section" aria-label="Navegação principal">
        <p className="nav-label">Workspace</p>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} onClick={onNavigate} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={16} /><span>{label}</span></Link>;
        })}
        {isAdmin && <details className="nav-more" open={moreActive}>
          <summary><MoreHorizontal size={16} /><span>Mais opções</span></summary>
          <div className="nav-more-items">{adminMore.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} onClick={onNavigate} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={16} /><span>{label}</span></Link>;
          })}</div>
        </details>}
      </nav>
      <div style={{ marginTop: "auto", padding: "0 10px", color: "#7890ad", fontSize: 10, display: "flex", gap: 8, alignItems: "center" }}><LockKeyhole size={13} /> Acesso governado por perfil</div>
    </aside>
  );
}