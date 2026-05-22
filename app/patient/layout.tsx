import { LocalizedRoleLayout } from "@/components/layout/LocalizedRoleLayout";

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocalizedRoleLayout role="patient">{children}</LocalizedRoleLayout>;
}
