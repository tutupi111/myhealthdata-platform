import { RoleLayoutShell } from "@/components/layout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { researcherNavItems } from "@/config/navigation";

export default function ResearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard role="researcher">
      <RoleLayoutShell role="researcher" navItems={researcherNavItems} title="研究者端">
        {children}
      </RoleLayoutShell>
    </AuthGuard>
  );
}
