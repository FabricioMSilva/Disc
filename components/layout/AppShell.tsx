import { signOutAction } from "@/app/login/actions";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const roleLabel: Record<string, string> = {
  super_admin: "Superadministrador", admin: "Administrador", manager: "Gestor",
  questionnaire_editor: "Editor de questionários", participant: "Participante", auditor: "Auditor",
};

export function AppShell({ children, name, email, role }: { children: React.ReactNode; name: string; email: string; role: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "PI";
  const isParticipant = role === "participant";
  return (
    <div className={`shell${isParticipant ? " shell--participant" : ""}`}>
      {!isParticipant && <AppSidebar role={role} />}
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            {!isParticipant && <MobileNavigation role={role} />}
            {!isParticipant && <div className="topbar-title">People Insights <span style={{ color: "#cbd5e1", padding: "0 7px" }}>/</span>{roleLabel[role] ?? "Workspace"}</div>}
          </div>
          <div className="user-pill">
            <ThemeToggle />
            <div className="avatar" aria-hidden="true">{initials}</div>
            <div style={{ lineHeight: 1.3 }}><div style={{ fontSize: 12, fontWeight: 700 }}>{name || email}</div><div style={{ color: "var(--muted)", fontSize: 10 }}>{roleLabel[role] ?? role}</div></div>
            <form action={signOutAction}><button type="submit" aria-label="Sair" title="Sair" className="button-secondary" style={{ minHeight: 36, padding: "0 9px", marginLeft: 8 }}><LogOut size={15} /></button></form>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}