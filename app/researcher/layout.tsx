import { LocalizedRoleLayout } from "@/components/layout/LocalizedRoleLayout";

export default function ResearcherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LocalizedRoleLayout role="researcher">{children}</LocalizedRoleLayout>;
}
