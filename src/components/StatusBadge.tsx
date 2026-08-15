import type { Status } from "@/lib/mockData";

const styles: Record<Status, string> = {
  "Ganho": "bg-status-ganhoBg text-status-ganho",
  "Boa possibilidade": "bg-status-boaBg text-status-boa",
  "Em análise": "bg-status-analiseBg text-status-analise",
  "Perdido": "bg-status-perdidoBg text-status-perdido"
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
