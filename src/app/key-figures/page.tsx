"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Totais mensais de 2025 (mesma altura), tal como estavam na folha "Key Figures" do Excel —
// valores históricos fechados, usados só para comparação (coluna Var%).
const REF_2025 = {
  propostas: [438248, 671720, 937494, 1188032, 2852228, 2377363, 3046187, 1415466, 3221733, 2062141, 1272411, 1196904],
  perdidos: [353950, 483074, 791195, 926604, 2259494, 1800402, 2221757, 973593, 2438903, 1374425, 188571, 386395],
  adjudicados: [112880, 200886, 172173, 261428, 583960, 519462, 835105, 392533, 475755, 221259, 91028, 96087],
  faturado: [119327, 221819, 187592, 275187, 627045, 546725, 893106, 362810, 332527, 167722, 35500, 4328],
};
const soma = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

function formatEUR(v: number) {
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function formatPct(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}
function mesDe(dataStr: string) {
  return Number(dataStr.slice(5, 7));
}

type LinhaKF = { label: string; valores: number[]; total: number; ref2025Total: number };

export default function KeyFiguresPage() {
  const router = useRouter();
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [linhas, setLinhas] = useState<LinhaKF[]>([]);
  const [propostasPorMes, setPropostasPorMes] = useState<number[]>(Array(12).fill(0));
  const [adjudicadosPorMes, setAdjudicadosPorMes] = useState<number[]>(Array(12).fill(0));

  useEffect(() => {
    async function carregar() {
      if (!supabase) {
        setErro("Supabase não está configurado (falta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
        setCarregado(true);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      // O Supabase limita cada pedido a um máximo de linhas (normalmente 1000),
      // independentemente do .limit() pedido — por isso paginamos com .range()
      // até trazer o ano inteiro (aqui já vão mais de 2500 eventos em 2026).
      const data: { data: string; status: string; proveito: number | null; fatura: number | null }[] = [];
      const TAMANHO_PAGINA = 1000;
      for (let pagina = 0; ; pagina++) {
        const inicio = pagina * TAMANHO_PAGINA;
        const { data: lote, error } = await supabase
          .from("pipeline")
          .select("data, status, proveito, fatura")
          .gte("data", "2026-01-01")
          .lt("data", "2027-01-01")
          .order("data", { ascending: true })
          .range(inicio, inicio + TAMANHO_PAGINA - 1);

        if (error) {
          setErro(error.message);
          setCarregado(true);
          return;
        }
        data.push(...((lote as any[]) ?? []));
        if (!lote || lote.length < TAMANHO_PAGINA) break;
      }

      const propostas = Array(12).fill(0);
      const perdidos = Array(12).fill(0);
      const adjudicados = Array(12).fill(0);
      const faturado = Array(12).fill(0);

      for (const r of data ?? []) {
        const m = mesDe(r.data) - 1;
        if (m < 0 || m > 11) continue;
        const proveito = Number(r.proveito ?? 0);
        const fat = Number(r.fatura ?? 0);
        propostas[m] += proveito;
        faturado[m] += fat;
        if (r.status === "Perdido") perdidos[m] += proveito;
        if (r.status === "Ganho") adjudicados[m] += proveito;
      }

      const emPropEAdj = propostas.map((v, i) => v - perdidos[i]);
      const emProposta = emPropEAdj.map((v, i) => v - adjudicados[i]);
      const porFaturar = adjudicados.map((v, i) => v - faturado[i]);

      const refEmPropEAdj = REF_2025.propostas.map((v, i) => v - REF_2025.perdidos[i]);
      const refEmProposta = refEmPropEAdj.map((v, i) => v - REF_2025.adjudicados[i]);
      const refPorFaturar = REF_2025.adjudicados.map((v, i) => v - REF_2025.faturado[i]);

      setLinhas([
        { label: "Propostas", valores: propostas, total: soma(propostas), ref2025Total: soma(REF_2025.propostas) },
        { label: "Perdidos", valores: perdidos, total: soma(perdidos), ref2025Total: soma(REF_2025.perdidos) },
        { label: "Em proposta e adjudicados", valores: emPropEAdj, total: soma(emPropEAdj), ref2025Total: soma(refEmPropEAdj) },
        { label: "Adjudicados", valores: adjudicados, total: soma(adjudicados), ref2025Total: soma(REF_2025.adjudicados) },
        { label: "Em proposta", valores: emProposta, total: soma(emProposta), ref2025Total: soma(refEmProposta) },
        { label: "Faturado", valores: faturado, total: soma(faturado), ref2025Total: soma(REF_2025.faturado) },
        { label: "Por faturar / comissões", valores: porFaturar, total: soma(porFaturar), ref2025Total: soma(refPorFaturar) },
      ]);
      setPropostasPorMes(propostas);
      setAdjudicadosPorMes(adjudicados);
      setCarregado(true);
    }
    carregar();
  }, [router]);

  const maxGrafico = useMemo(
    () => Math.max(1, ...propostasPorMes, ...adjudicadosPorMes),
    [propostasPorMes, adjudicadosPorMes]
  );

  if (!carregado) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-8">
        <p className="text-sm text-[#6B6B76]">A carregar…</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-xs text-[#6B6B76] hover:underline">← Início</Link>
        <h1 className="text-xl font-medium mt-1">Key Figures</h1>
        <p className="text-sm text-[#6B6B76] mt-1">2026 · calculado em tempo real a partir do Pipeline</p>
      </div>

      {erro && <p className="text-sm text-status-perdido mb-4">{erro}</p>}

      <div className="rounded-xl border border-[#E7E6F0] bg-white p-5 mb-6">
        <h2 className="text-sm font-medium mb-4">Propostas vs. Adjudicados por mês</h2>
        <div className="flex items-end gap-2 h-40">
          {MESES.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5 h-32">
                <div
                  className="flex-1 bg-status-analiseBg rounded-t"
                  style={{ height: `${(propostasPorMes[i] / maxGrafico) * 100}%` }}
                  title={`Propostas ${m}: ${formatEUR(propostasPorMes[i])}`}
                />
                <div
                  className="flex-1 bg-status-ganho rounded-t"
                  style={{ height: `${(adjudicadosPorMes[i] / maxGrafico) * 100}%` }}
                  title={`Adjudicados ${m}: ${formatEUR(adjudicadosPorMes[i])}`}
                />
              </div>
              <span className="text-[10px] text-[#6B6B76]">{m}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-[#6B6B76]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-status-analiseBg inline-block" /> Propostas</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-status-ganho inline-block" /> Adjudicados</span>
        </div>
      </div>

      <div className="rounded-xl border border-[#E7E6F0] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6B6B76] border-b border-[#E7E6F0]">
              <th className="px-3 py-3 font-medium sticky left-0 bg-white">Indicador</th>
              {MESES.map((m) => <th key={m} className="px-2 py-3 font-medium text-right">{m}</th>)}
              <th className="px-3 py-3 font-medium text-right">Total 2026</th>
              <th className="px-3 py-3 font-medium text-right">Var% vs 2025</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.label} className="border-b border-[#F1F0F7] last:border-0">
                <td className="px-3 py-2.5 font-medium sticky left-0 bg-white whitespace-nowrap">{linha.label}</td>
                {linha.valores.map((v, i) => (
                  <td key={i} className="px-2 py-2.5 text-right text-[#6B6B76] whitespace-nowrap">{formatEUR(v)}</td>
                ))}
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{formatEUR(linha.total)}</td>
                <td className={`px-3 py-2.5 text-right whitespace-nowrap ${linha.total >= linha.ref2025Total ? "text-status-ganho" : "text-status-perdido"}`}>
                  {formatPct(linha.ref2025Total !== 0 ? linha.total / linha.ref2025Total - 1 : null)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#6B6B76] mt-4">
        Propostas = valor de todos os eventos criados no mês, seja qual for o estado. Perdidos / Adjudicados = Propostas
        filtradas por estado. Em proposta = ainda por decidir (Boa possibilidade + Em análise). Faturado = soma do campo
        Fatura. Por faturar / comissões = Adjudicados − Faturado. Os valores de 2025 são os totais fechados do ano anterior,
        para comparação.
      </p>
    </main>
  );
}
