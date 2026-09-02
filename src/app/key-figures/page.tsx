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
// Orçamento mensal 2026 por espaço, tal como estava fixado na folha "Key Figures" do Excel
// (linhas 69-72) — são metas definidas manualmente no início do ano, não vêm do Pipeline.
const BUDGET_2026 = {
  outsideCatering: [80000, 80000, 80000, 100000, 225000, 325000, 450000, 25000, 300000, 200000, 550000, 325000],
  ccb: [50000, 50000, 70000, 150000, 165000, 120000, 120000, 10000, 80000, 200000, 200000, 100000],
  regium: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  vandelli: [80000, 80000, 80000, 105000, 320000, 340000, 325000, 370000, 400000, 270000, 140000, 150000],
};

// "Outside Catering" = todos os espaços que não são CCB / Regium / Vandelli, tal como no Excel
// (Monsanto, Rive Rouge, Parceiros, Esp. Externos, ou qualquer outro espaço agrupados).
function baldeEspaco(catEspaco: string | null): "ccb" | "regium" | "vandelli" | "outsideCatering" {
  if (catEspaco === "CCB") return "ccb";
  if (catEspaco === "Regium") return "regium";
  if (catEspaco === "Vandelli") return "vandelli";
  return "outsideCatering";
}

const soma = (arr: (number | null)[]) => arr.reduce((a: number, b) => a + (b ?? 0), 0);
const somarColunas12 = (linhas: number[][]) => {
  const out = Array(12).fill(0);
  for (const l of linhas) for (let i = 0; i < 12; i++) out[i] += l[i] ?? 0;
  return out;
};

function formatEUR(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function formatPct(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}
function formatInt(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return v.toLocaleString("pt-PT");
}
function mesDe(dataStr: string) {
  return Number(dataStr.slice(5, 7));
}

type LinhaKF = { label: string; valores: number[]; total: number; ref2025Total: number };
type LinhaEspacoKF = { label: string; valores: number[]; total: number; budgetTotal: number };
type LinhaDimMensal = { label: string; vendas: number[]; propostas: number[]; numPropostas: number[]; volumeNegocios: number[] };
type LinhaMensal = { label: string; valores: (number | null)[]; total: number | null };

function novaLinhaDimMensal(label: string): LinhaDimMensal {
  return { label, vendas: Array(12).fill(0), propostas: Array(12).fill(0), numPropostas: Array(12).fill(0), volumeNegocios: Array(12).fill(0) };
}

function paraLinhasMensais(mapa: LinhaDimMensal[], campo: "vendas" | "propostas" | "numPropostas" | "volumeNegocios"): LinhaMensal[] {
  return mapa
    .map((l) => ({ label: l.label, valores: l[campo], total: soma(l[campo]) }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
}

function paraLinhasTxConversao(mapa: LinhaDimMensal[]): LinhaMensal[] {
  return mapa
    .map((l) => ({
      label: l.label,
      valores: l.vendas.map((v, i) => (l.propostas[i] ? v / l.propostas[i] : null)),
      total: soma(l.propostas) ? soma(l.vendas) / soma(l.propostas) : null,
    }))
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0));
}

function linhaTotalSoma(linhas: LinhaMensal[]): LinhaMensal {
  const valores = somarColunas12(linhas.map((l) => l.valores.map((v) => v ?? 0)));
  return { label: "TOTAL", valores, total: soma(valores) };
}

function linhaTotalTxConversao(mapa: LinhaDimMensal[]): LinhaMensal {
  const vendas = somarColunas12(mapa.map((l) => l.vendas));
  const propostas = somarColunas12(mapa.map((l) => l.propostas));
  return {
    label: "TOTAL",
    valores: vendas.map((v, i) => (propostas[i] ? v / propostas[i] : null)),
    total: soma(propostas) ? soma(vendas) / soma(propostas) : null,
  };
}

function TabelaMensal({
  titulo, linhas, linhaTotal, formato = "eur", colunaLabel = "Nome", nota,
}: {
  titulo: string;
  linhas: LinhaMensal[];
  linhaTotal?: LinhaMensal;
  formato?: "eur" | "int" | "pct";
  colunaLabel?: string;
  nota?: string;
}) {
  const formatar = formato === "pct" ? formatPct : formato === "int" ? formatInt : formatEUR;
  return (
    <div className="mb-8">
      <h2 className="text-lg font-medium mb-2">{titulo}</h2>
      <div className="rounded-xl border border-[#E7E6F0] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6B6B76] border-b border-[#E7E6F0]">
              <th className="px-3 py-3 font-medium sticky left-0 bg-white">{colunaLabel}</th>
              {MESES.map((m) => <th key={m} className="px-2 py-3 font-medium text-right">{m}</th>)}
              <th className="px-3 py-3 font-medium text-right">Total 2026</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={linha.label} className="border-b border-[#F1F0F7] last:border-0">
                <td className="px-3 py-2.5 font-medium sticky left-0 bg-white whitespace-nowrap">{linha.label}</td>
                {linha.valores.map((v, i) => (
                  <td key={i} className="px-2 py-2.5 text-right text-[#6B6B76] whitespace-nowrap">{formatar(v)}</td>
                ))}
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{formatar(linha.total)}</td>
              </tr>
            ))}
            {linhaTotal && (
              <tr className="bg-[#FAFAFC] font-semibold">
                <td className="px-3 py-2.5 sticky left-0 bg-[#FAFAFC] whitespace-nowrap">{linhaTotal.label}</td>
                {linhaTotal.valores.map((v, i) => (
                  <td key={i} className="px-2 py-2.5 text-right whitespace-nowrap">{formatar(v)}</td>
                ))}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{formatar(linhaTotal.total)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {nota && <p className="text-xs text-[#6B6B76] mt-2">{nota}</p>}
    </div>
  );
}

export default function KeyFiguresPage() {
  const router = useRouter();
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [linhas, setLinhas] = useState<LinhaKF[]>([]);
  const [propostasPorMes, setPropostasPorMes] = useState<number[]>(Array(12).fill(0));
  const [adjudicadosPorMes, setAdjudicadosPorMes] = useState<number[]>(Array(12).fill(0));
  const [linhasEspaco, setLinhasEspaco] = useState<LinhaEspacoKF[]>([]);

  const [mapaComercial, setMapaComercial] = useState<LinhaDimMensal[]>([]);
  const [mapaOperacao, setMapaOperacao] = useState<LinhaMensal[]>([]);
  const [mapaEspaco, setMapaEspaco] = useState<LinhaDimMensal[]>([]);
  const [mapaSegmento, setMapaSegmento] = useState<LinhaDimMensal[]>([]);
  const [mapaSource, setMapaSource] = useState<LinhaDimMensal[]>([]);
  const [faturacao2026, setFaturacao2026] = useState({ faturacao: 0, pax: 0, eventos: 0 });
  const [semSource, setSemSource] = useState(0);

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
      const TAMANHO_PAGINA = 1000;

      const data: { data: string; status: string; proveito: number | null; fatura: number | null }[] = [];
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

      // Faturação (Adjudicados) por espaço — só precisamos dos eventos Ganho.
      const dadosEspaco: { data: string; proveito: number | null; categorias_espaco: { nome: string } | null }[] = [];
      for (let pagina = 0; ; pagina++) {
        const inicio = pagina * TAMANHO_PAGINA;
        const { data: lote, error } = await supabase
          .from("pipeline")
          .select("data, proveito, categorias_espaco(nome)")
          .eq("status", "Ganho")
          .gte("data", "2026-01-01")
          .lt("data", "2027-01-01")
          .order("data", { ascending: true })
          .range(inicio, inicio + TAMANHO_PAGINA - 1);

        if (error) break;
        dadosEspaco.push(...(((lote as any[]) ?? []) as any));
        if (!lote || lote.length < TAMANHO_PAGINA) break;
      }

      const ccb = Array(12).fill(0);
      const regium = Array(12).fill(0);
      const vandelli = Array(12).fill(0);
      const outsideCatering = Array(12).fill(0);
      const baldes = { ccb, regium, vandelli, outsideCatering };

      for (const r of dadosEspaco) {
        const m = mesDe(r.data) - 1;
        if (m < 0 || m > 11) continue;
        const nome = (r as any).categorias_espaco?.nome ?? null;
        baldes[baldeEspaco(nome)][m] += Number(r.proveito ?? 0);
      }

      const totalVN = ccb.map((v, i) => v + regium[i] + vandelli[i] + outsideCatering[i]);
      const totalBudget = BUDGET_2026.ccb.map((v, i) => v + BUDGET_2026.regium[i] + BUDGET_2026.vandelli[i] + BUDGET_2026.outsideCatering[i]);

      setLinhasEspaco([
        { label: "Vandelli BG", valores: vandelli, total: soma(vandelli), budgetTotal: soma(BUDGET_2026.vandelli) },
        { label: "CCB", valores: ccb, total: soma(ccb), budgetTotal: soma(BUDGET_2026.ccb) },
        { label: "Regium", valores: regium, total: soma(regium), budgetTotal: soma(BUDGET_2026.regium) },
        { label: "Outside Catering", valores: outsideCatering, total: soma(outsideCatering), budgetTotal: soma(BUDGET_2026.outsideCatering) },
        { label: "Total VN", valores: totalVN, total: soma(totalVN), budgetTotal: soma(totalBudget) },
      ]);

      // Quarto pedido: traz tudo o resto (segmento, espaço detalhado, source, comerciais,
      // operação, pax) numa só passagem, já com o mês de cada evento.
      const dadosDetalhe: any[] = [];
      for (let pagina = 0; ; pagina++) {
        const inicio = pagina * TAMANHO_PAGINA;
        const { data: lote, error } = await supabase
          .from("pipeline")
          .select(
            `data, status, proveito, fatura, n_pax, operacao,
             segmentos(nome), categorias_espaco(nome), sources(nome),
             pipeline_comerciais(utilizadores(nome))`
          )
          .gte("data", "2026-01-01")
          .lt("data", "2027-01-01")
          .order("data", { ascending: true })
          .range(inicio, inicio + TAMANHO_PAGINA - 1);

        if (error) break;
        dadosDetalhe.push(...(((lote as any[]) ?? []) as any));
        if (!lote || lote.length < TAMANHO_PAGINA) break;
      }

      const mComercial = new Map<string, LinhaDimMensal>();
      const mOperacao = new Map<string, number[]>();
      const mEspaco = new Map<string, LinhaDimMensal>();
      const mSegmento = new Map<string, LinhaDimMensal>();
      const mSource = new Map<string, LinhaDimMensal>();
      let fatTotal = 0, paxTotal = 0, eventosTotal = 0, semSourceCount = 0;

      for (const r of dadosDetalhe) {
        const m = mesDe(r.data) - 1;
        if (m < 0 || m > 11) continue;
        const proveito = Number(r.proveito ?? 0);
        const fat = Number(r.fatura ?? 0);
        const ganho = r.status === "Ganho";

        fatTotal += fat;
        paxTotal += Number(r.n_pax ?? 0);
        eventosTotal += 1;

        const comercialLabel = (r.pipeline_comerciais ?? []).map((pc: any) => pc.utilizadores?.nome).filter(Boolean).join(" / ") || "Sem comercial";
        if (!mComercial.has(comercialLabel)) mComercial.set(comercialLabel, novaLinhaDimMensal(comercialLabel));
        const lc = mComercial.get(comercialLabel)!;
        lc.propostas[m] += proveito;
        lc.numPropostas[m] += 1;
        lc.volumeNegocios[m] += fat;
        if (ganho) lc.vendas[m] += proveito;

        const operacaoLabel = r.operacao || "Sem operação";
        if (!mOperacao.has(operacaoLabel)) mOperacao.set(operacaoLabel, Array(12).fill(0));
        if (ganho) mOperacao.get(operacaoLabel)![m] += proveito;

        const espacoLabel = r.categorias_espaco?.nome || "Sem espaço";
        if (!mEspaco.has(espacoLabel)) mEspaco.set(espacoLabel, novaLinhaDimMensal(espacoLabel));
        const le = mEspaco.get(espacoLabel)!;
        le.propostas[m] += proveito;
        if (ganho) le.vendas[m] += proveito;

        const segmentoLabel = r.segmentos?.nome || "Sem segmento";
        if (!mSegmento.has(segmentoLabel)) mSegmento.set(segmentoLabel, novaLinhaDimMensal(segmentoLabel));
        const ls = mSegmento.get(segmentoLabel)!;
        ls.propostas[m] += proveito;
        ls.volumeNegocios[m] += fat;
        if (ganho) ls.vendas[m] += proveito;

        const sourceLabel = r.sources?.nome || "Sem source";
        if (sourceLabel === "Sem source") semSourceCount += 1;
        if (!mSource.has(sourceLabel)) mSource.set(sourceLabel, novaLinhaDimMensal(sourceLabel));
        const lso = mSource.get(sourceLabel)!;
        lso.propostas[m] += proveito;
        if (ganho) lso.vendas[m] += proveito;
      }

      setMapaComercial(Array.from(mComercial.values()));
      setMapaOperacao(
        Array.from(mOperacao.entries())
          .map(([label, valores]) => ({ label, valores, total: soma(valores) }))
          .sort((a, b) => (b.total ?? 0) - (a.total ?? 0))
      );
      setMapaEspaco(Array.from(mEspaco.values()));
      setMapaSegmento(Array.from(mSegmento.values()));
      setMapaSource(Array.from(mSource.values()));
      setFaturacao2026({ faturacao: fatTotal, pax: paxTotal, eventos: eventosTotal });
      setSemSource(semSourceCount);

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

      <div className="mt-8 mb-2">
        <h2 className="text-lg font-medium">Faturação por espaço (Adjudicados) vs. Orçamento 2026</h2>
      </div>

      <div className="rounded-xl border border-[#E7E6F0] bg-white overflow-x-auto mb-3">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6B6B76] border-b border-[#E7E6F0]">
              <th className="px-3 py-3 font-medium sticky left-0 bg-white">Espaço</th>
              {MESES.map((m) => <th key={m} className="px-2 py-3 font-medium text-right">{m}</th>)}
              <th className="px-3 py-3 font-medium text-right">Total 2026</th>
              <th className="px-3 py-3 font-medium text-right">Orçamento</th>
              <th className="px-3 py-3 font-medium text-right">Balanço</th>
            </tr>
          </thead>
          <tbody>
            {linhasEspaco.map((linha) => {
              const balanco = linha.total - linha.budgetTotal;
              const destaque = linha.label === "Total VN";
              return (
                <tr key={linha.label} className={`border-b border-[#F1F0F7] last:border-0 ${destaque ? "bg-[#FAFAFC]" : ""}`}>
                  <td className={`px-3 py-2.5 sticky left-0 whitespace-nowrap ${destaque ? "font-semibold bg-[#FAFAFC]" : "font-medium bg-white"}`}>{linha.label}</td>
                  {linha.valores.map((v, i) => (
                    <td key={i} className="px-2 py-2.5 text-right text-[#6B6B76] whitespace-nowrap">{formatEUR(v)}</td>
                  ))}
                  <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{formatEUR(linha.total)}</td>
                  <td className="px-3 py-2.5 text-right text-[#6B6B76] whitespace-nowrap">{formatEUR(linha.budgetTotal)}</td>
                  <td className={`px-3 py-2.5 text-right whitespace-nowrap ${balanco >= 0 ? "text-status-ganho" : "text-status-perdido"}`}>
                    {balanco >= 0 ? "+" : ""}{formatEUR(balanco)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#6B6B76] mb-8">
        Outside Catering = tudo o que não é CCB, Regium ou Vandelli (Monsanto, Rive Rouge, Parceiros, Esp. Externos e
        outros). Orçamento = metas fixadas no início do ano (não vem do Pipeline). Balanço = Total 2026 − Orçamento.
      </p>

      <div className="rounded-xl border border-[#E7E6F0] bg-white p-5 mb-8">
        <h2 className="text-sm font-medium mb-4">Faturação 2026</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-[#6B6B76]">Faturação</p>
            <p className="text-lg font-medium">{formatEUR(faturacao2026.faturacao)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B6B76]"># Eventos</p>
            <p className="text-lg font-medium">{faturacao2026.eventos}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B6B76]"># Pax</p>
            <p className="text-lg font-medium">{formatInt(faturacao2026.pax)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B6B76]">Val. Evento</p>
            <p className="text-lg font-medium">{formatEUR(faturacao2026.eventos ? faturacao2026.faturacao / faturacao2026.eventos : 0)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B6B76]">Val. Pax</p>
            <p className="text-lg font-medium">{formatEUR(faturacao2026.pax ? faturacao2026.faturacao / faturacao2026.pax : 0)}</p>
          </div>
        </div>
        <p className="text-xs text-[#6B6B76] mt-3">
          Faturação = soma do campo Fatura de todos os eventos de 2026 (qualquer estado), tal como na linha "Faturado".
        </p>
      </div>

      {/* --- Por Comercial --- */}
      <TabelaMensal titulo="Vendas por Comercial" colunaLabel="Comercial" linhas={paraLinhasMensais(mapaComercial, "vendas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaComercial, "vendas"))} />
      <TabelaMensal titulo="Propostas por Comercial" colunaLabel="Comercial" linhas={paraLinhasMensais(mapaComercial, "propostas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaComercial, "propostas"))} />
      <TabelaMensal titulo="Nº de Propostas por Comercial" colunaLabel="Comercial" formato="int" linhas={paraLinhasMensais(mapaComercial, "numPropostas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaComercial, "numPropostas"))} />
      <TabelaMensal titulo="Volume de Negócios por Comercial" colunaLabel="Comercial" linhas={paraLinhasMensais(mapaComercial, "volumeNegocios")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaComercial, "volumeNegocios"))} />
      <TabelaMensal
        titulo="Taxa de Conversão por Comercial"
        colunaLabel="Comercial"
        formato="pct"
        linhas={paraLinhasTxConversao(mapaComercial)}
        linhaTotal={linhaTotalTxConversao(mapaComercial)}
        nota="Agrupado pelo(s) comercial(is) atribuído(s) a cada evento — eventos com mais do que um comercial aparecem juntos (ex.: 'Joana S / Rita A'), tal como no Excel."
      />

      {/* --- Execução por Operação --- */}
      <TabelaMensal
        titulo="Execução por Operação"
        colunaLabel="Operação"
        linhas={mapaOperacao}
        linhaTotal={linhaTotalSoma(mapaOperacao)}
      />

      {/* --- Por Espaço (detalhe) --- */}
      <TabelaMensal titulo="Vendas por Espaço (detalhe)" colunaLabel="Espaço" linhas={paraLinhasMensais(mapaEspaco, "vendas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaEspaco, "vendas"))} />
      <TabelaMensal titulo="Propostas por Espaço (detalhe)" colunaLabel="Espaço" linhas={paraLinhasMensais(mapaEspaco, "propostas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaEspaco, "propostas"))} />
      <TabelaMensal
        titulo="Taxa de Conversão por Espaço (detalhe)"
        colunaLabel="Espaço"
        formato="pct"
        linhas={paraLinhasTxConversao(mapaEspaco)}
        linhaTotal={linhaTotalTxConversao(mapaEspaco)}
        nota="As 7 categorias de espaço em separado, sem o agrupamento 'Outside Catering' usado no mapa de orçamento acima."
      />

      {/* --- Por Segmento --- */}
      <TabelaMensal titulo="Vendas por Segmento" colunaLabel="Segmento" linhas={paraLinhasMensais(mapaSegmento, "vendas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaSegmento, "vendas"))} />
      <TabelaMensal titulo="Propostas por Segmento" colunaLabel="Segmento" linhas={paraLinhasMensais(mapaSegmento, "propostas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaSegmento, "propostas"))} />
      <TabelaMensal
        titulo="Taxa de Conversão por Segmento"
        colunaLabel="Segmento"
        formato="pct"
        linhas={paraLinhasTxConversao(mapaSegmento)}
        linhaTotal={linhaTotalTxConversao(mapaSegmento)}
      />
      <TabelaMensal titulo="Volume de Negócios por Segmento" colunaLabel="Segmento" linhas={paraLinhasMensais(mapaSegmento, "volumeNegocios")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaSegmento, "volumeNegocios"))} />

      {/* --- Por Source --- */}
      <TabelaMensal titulo="Vendas por Source" colunaLabel="Source" linhas={paraLinhasMensais(mapaSource, "vendas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaSource, "vendas"))} />
      <TabelaMensal titulo="Propostas por Source" colunaLabel="Source" linhas={paraLinhasMensais(mapaSource, "propostas")} linhaTotal={linhaTotalSoma(paraLinhasMensais(mapaSource, "propostas"))} />
      <TabelaMensal
        titulo="Taxa de Conversão por Source"
        colunaLabel="Source"
        formato="pct"
        linhas={paraLinhasTxConversao(mapaSource)}
        linhaTotal={linhaTotalTxConversao(mapaSource)}
        nota={semSource > 0 ? `${semSource} eventos ainda sem Source associado (importados antes de existir esse campo) — corre a migração 006 para preencher o histórico.` : undefined}
      />
    </main>
  );
}
