import { LocalizedRoleLayout } from "@/components/layout/LocalizedRoleLayout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocalizedRoleLayout role="admin">{children}</LocalizedRoleLayout>;
}
