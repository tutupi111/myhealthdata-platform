import { RoleLayoutShell } from "@/components/layout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { patientNavItems } from "@/config/navigation";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard role="patient">
      <RoleLayoutShell role="patient" navItems={patientNavItems} title="患者端">
        {children}
      </RoleLayoutShell>
    </AuthGuard>
  );
}
