"use client";

import { useParams } from "next/navigation";
import { RecordDetailClient } from "./RecordDetailClient";

export default function PatientRecordDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  return <RecordDetailClient recordId={id} />;
}
