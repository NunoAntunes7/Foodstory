export default function KpiCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ganho" | "boa" | "analise";
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-white text-[#17171F]",
    ganho: "bg-status-ganhoBg text-status-ganho",
    boa: "bg-status-boaBg text-status-boa",
    analise: "bg-status-analiseBg text-status-analise"
  };

  return (
    <div className={`rounded-xl p-4 ${toneClasses[tone]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-xl font-medium">{value}</p>
    </div>
  );
}
