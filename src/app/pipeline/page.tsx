"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import KpiCard from "@/components/KpiCard";
import { supabase } from "@/lib/supabaseClient";
import { statusProbabilidade, type Status } from "@/lib/mockData";

const TODOS_STATUS: Status[] = ["Ganho", "Boa possibilidade", "Em análise", "Perdido"];
const COLUNAS_OPCIONAIS = ["N Evento", "F&B"] as const;

type PipelineEvento = {
  id: number;
  n_evento: number | null;
  status: Status;
  data: string;
  cliente_direto: string;
  cliente_final: string;
  segmento: string;
  espaco: string;
  tipo_servico: string;
  comercial: string;
  operacao: string;
  n_pax: number;
  proveito: number;
  fatura: number;
};

function formatEUR(v: number) {
  return v.toLocaleString("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function PipelinePage() {
  const router = useRouter();
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [eventos, setEventos] = useState<PipelineEvento[]>([]);

  const anoAtual = new Date().getFullYear();
  const mesesDisponiveis = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${anoAtual}-${String(i + 1).padStart(2, "0")}`).reverse(),
    [anoAtual]
  );

  const mesAtualStr = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesesDisponiveis.includes(mesAtualStr) ? mesAtualStr : mesesDisponiveis[0]);
  const [statusAtivos, setStatusAtivos] = useState<Status[]>(["Ganho", "Boa possibilidade", "Em análise"]);
  const [comercial, setComercial] = useState("Todos");
  const [colunasExtra, setColunasExtra] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
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

      if (!mes) {
        setCarregado(true);
        return;
      }

      // Filtro por mês feito no servidor (não trazemos o ano todo de cada vez —
      // evita o limite por defeito de linhas por pedido da API do Supabase).
      const inicio = `${mes}-01`;
      const [anoStr, mesStr] = mes.split("-");
      const anoNum = Number(anoStr);
      const mesNum = Number(mesStr);
      const proximoMes = mesNum === 12 ? `${anoNum + 1}-01-01` : `${anoNum}-${String(mesNum + 1).padStart(2, "0")}-01`;

      const { data, error } = await supabase
        .from("pipeline")
        .select(
          `id, n_evento, n_evento_legado, status, data, n_pax, proveito, fatura, tipo_servico, espaco, operacao,
           cliente_direto:clientes!pipeline_cliente_direto_id_fkey(nome),
           cliente_final:clientes!pipeline_cliente_final_id_fkey(nome),
           segmentos(nome),
           pipeline_comerciais(utilizadores(nome))`
        )
        .gte("data", inicio)
        .lt("data", proximoMes)
        .order("data", { ascending: false })
        .limit(5000);

      if (error) {
        setErro(error.message);
        setCarregado(true);
        return;
      }

      const mapeados: PipelineEvento[] = (data ?? []).map((r: any) => ({
        id: r.id,
        n_evento: r.n_evento_legado ?? r.n_evento,
        status: r.status,
        data: r.data,
        cliente_direto: r.cliente_direto?.nome ?? "—",
        cliente_final: r.cliente_final?.nome ?? "—",
        segmento: r.segmentos?.nome ?? "—",
        espaco: r.espaco ?? "—",
        tipo_servico: r.tipo_servico ?? "—",
        comercial: (r.pipeline_comerciais ?? []).map((pc: any) => pc.utilizadores?.nome).filter(Boolean).join(" / ") || "—",
        operacao: r.operacao ?? "—",
        n_pax: r.n_pax ?? 0,
        proveito: Number(r.proveito ?? 0),
        fatura: Number(r.fatura ?? 0),
      }));

      setEventos(mapeados);
      setCarregado(true);
    }
    setCarregado(false);
    setComercial("Todos"); // o filtro de comercial é por mês; ao mudar de mês, repõe para não esconder dados sem se perceber porquê
    load();
  }, [router, mes]);

  const comerciais = useMemo(
    () => ["Todos", ...Array.from(new Set(eventos.flatMap((e) => e.comercial.split(" / ")))).filter((c) => c && c !== "—")],
    [eventos]
  );

  const eventosFiltrados = useMemo(() => {
    // O mês já foi filtrado no servidor (ver query acima); aqui só falta status e comercial.
    return eventos.filter((e) => {
      if (!statusAtivos.includes(e.status)) return false;
      if (comercial !== "Todos" && !e.comercial.split(" / ").includes(comercial)) return false;
      return true;
    });
  }, [eventos, statusAtivos, comercial]);

  const kpis = useMemo(() => {
    const totais = { total: 0, ponderado: 0, ganho: 0, boa: 0, analise: 0 };
    for (const e of eventosFiltrados) {
      totais.total += e.proveito;
      totais.ponderado += e.proveito * statusProbabilidade[e.status];
      if (e.status === "Ganho") totais.ganho += e.proveito;
      if (e.status === "Boa possibilidade") totais.boa += e.proveito;
      if (e.status === "Em análise") totais.analise += e.proveito;
    }
    return totais;
  }, [eventosFiltrados]);

  function toggleStatus(s: Status) {
    setStatusAtivos((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleColuna(c: string) {
    setColunasExtra((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  if (!carregado) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-sm text-[#6B6B76]">A carregar…</p>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-sm text-status-perdido">Erro a carregar o Pipeline: {erro}</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <Link href="/" className="text-xs text-[#6B6B76] hover:underline">← Início</Link>
          <h1 className="text-xl font-medium mt-1">Pipeline</h1>
        </div>
        <button className="rounded-lg bg-brand-500 text-white text-sm font-medium px-4 h-9 hover:bg-brand-600 transition-colors">
          + Novo evento
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <KpiCard label="Pipeline total" value={formatEUR(kpis.total)} />
        <KpiCard label="Ponderado" value={formatEUR(kpis.ponderado)} />
        <KpiCard label="Ganho" value={formatEUR(kpis.ganho)} tone="ganho" />
        <KpiCard label="Boa possibilidade" value={formatEUR(kpis.boa)} tone="boa" />
        <KpiCard label="Em análise" value={formatEUR(kpis.analise)} tone="analise" />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={mes} onChange={(e) => setMes(e.target.value)} className="h-9 rounded-lg border border-[#E7E6F0] bg-white px-3 text-sm">
          {mesesDisponiveis.length === 0 && <option value="">Sem eventos</option>}
          {mesesDisponiveis.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select value={comercial} onChange={(e) => setComercial(e.target.value)} className="h-9 rounded-lg border border-[#E7E6F0] bg-white px-3 text-sm">
          {comerciais.map((c) => (
            <option key={c} value={c}>{c === "Todos" ? "Comercial: Todos" : c}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 ml-1">
          {TODOS_STATUS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
                statusAtivos.includes(s) ? "border-brand-400 bg-brand-50 text-brand-600" : "border-[#E7E6F0] bg-white text-[#6B6B76]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-[#6B6B76]">+ colunas:</span>
          {COLUNAS_OPCIONAIS.map((c) => (
            <button
              key={c}
              onClick={() => toggleColuna(c)}
              className={`h-8 rounded-lg border px-2 text-xs transition-colors ${
                colunasExtra.includes(c) ? "border-brand-400 bg-brand-50 text-brand-600" : "border-[#E7E6F0] bg-white text-[#6B6B76]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#E7E6F0] bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6B6B76] border-b border-[#E7E6F0]">
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Cliente direto</th>
              <th className="px-4 py-3 font-medium">Cliente final</th>
              <th className="px-4 py-3 font-medium">Segmento</th>
              <th className="px-4 py-3 font-medium">Espaço</th>
              <th className="px-4 py-3 font-medium">Tipo serviço</th>
              <th className="px-4 py-3 font-medium">Comercial</th>
              <th className="px-4 py-3 font-medium">Operação</th>
              <th className="px-4 py-3 font-medium">N Pax</th>
              <th className="px-4 py-3 font-medium">Proveito</th>
              {colunasExtra.includes("N Evento") && <th className="px-4 py-3 font-medium">N Evento</th>}
              {colunasExtra.includes("F&B") && <th className="px-4 py-3 font-medium">F&amp;B</th>}
            </tr>
          </thead>
          <tbody>
            {eventosFiltrados.map((e) => (
              <tr key={e.id} className="border-b border-[#F1F0F7] last:border-0">
                <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-3 text-[#6B6B76]">{new Date(e.data).toLocaleDateString("pt-PT")}</td>
                <td className="px-4 py-3">{e.cliente_direto}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.cliente_final}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.segmento}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.espaco}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.tipo_servico}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.comercial}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.operacao}</td>
                <td className="px-4 py-3 text-[#6B6B76]">{e.n_pax}</td>
                <td className="px-4 py-3 font-medium">{formatEUR(e.proveito)}</td>
                {colunasExtra.includes("N Evento") && <td className="px-4 py-3 text-[#6B6B76]">{e.n_evento}</td>}
                {colunasExtra.includes("F&B") && <td className="px-4 py-3 text-[#6B6B76]">{formatEUR(e.proveito)}</td>}
              </tr>
            ))}
            {eventosFiltrados.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-[#6B6B76]">
                  Sem eventos para os filtros escolhidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

