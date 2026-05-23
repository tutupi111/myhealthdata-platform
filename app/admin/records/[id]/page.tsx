import { AdminRecordDetailClient } from "./AdminRecordDetailClient";

export default function AdminRecordDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <AdminRecordDetailClient recordId={params.id} />;
}
