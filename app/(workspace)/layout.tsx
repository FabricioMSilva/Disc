import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { user, profile } = await requireUser();
  return <AppShell name={profile?.nome || user.user_metadata.name || ""} email={user.email ?? ""} role={profile?.role ?? "participant"}>{children}</AppShell>;
}