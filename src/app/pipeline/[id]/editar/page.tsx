"use client";

import { useParams } from "next/navigation";
import PipelineForm from "@/components/PipelineForm";

export default function EditarEventoPage() {
  const params = useParams();
  const id = Number(params.id);
  return <PipelineForm eventoId={id} />;
}
