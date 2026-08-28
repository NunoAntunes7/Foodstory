"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Status } from "@/lib/mockData";
import TarefasEvento from "@/components/TarefasEvento";

const TODOS_STATUS: Status[] = ["Ganho", "Boa possibilidade", "Em análise", "Perdido"];

type Catalogo = { id: number; nome: string };

type CamposTexto =
  | "data" | "n_fatura" | "cs_versao" | "cliente_direto" | "cliente_final"
  | "espaco" | "tipo_servico" | "source" | "operacao";

type CamposNumero =
  | "n_pax" | "fb" | "fatura" | "comissao_paga" | "comissao_recebida" | "sup"
  | "custo_producao_fb" | "custo_producao_pes_sala" | "custo_producao_pes_logistica"
  | "custo_producao_pes_cozinha" | "custo_producao_pes_copa" | "custo_producao_t_logistica"
  | "custo_producao_t_cozinha"
  | "custo_decoracao" | "custo_seguranca" | "custo_animacao" | "custo_aluguer_espacos"
  | "custo_staff" | "custo_taxa_logistica" | "custo_limpeza" | "custo_outros"
  | "producao_decoracao" | "producao_seguranca" | "producao_animacao"
  | "producao_aluguer_espacos" | "producao_limpeza" | "producao_outros";

type FormState = Record<CamposTexto, string> & Record<CamposNumero, string> & {
  status: Status;
  segmento_id: string;
  cat_espaco_id: string;
  comerciais: number[];
};

const ESTADO_INICIAL: FormState = {
  status: "Em análise",
  data: new Date().toISOString().slice(0, 10),
  n_fatura: "", cs_versao: "", cliente_direto: "", cliente_final: "",
  espaco: "", tipo_servico: "", source: "", operacao: "",
  segmento_id: "", cat_espaco_id: "", comerciais: [],
  n_pax: "", fb: "", fatura: "", comissao_paga: "", comissao_recebida: "", sup: "",
  custo_producao_fb: "", custo_producao_pes_sala: "", custo_producao_pes_logistica: "",
  custo_producao_pes_cozinha: "", custo_producao_pes_copa: "", custo_producao_t_logistica: "",
  custo_producao_t_cozinha: "",
  custo_decoracao: "", custo_seguranca: "", custo_animacao: "", custo_aluguer_espacos: "",
  custo_staff: "", custo_taxa_logistica: "", custo_limpeza: "", custo_outros: "",
  producao_decoracao: "", producao_seguranca: "", producao_animacao: "",
  producao_aluguer_espacos: "", producao_limpeza: "", producao_outros: "",
};

function inputClass() {
  return "w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm";
}
function labelClass(obrigatorio?: boolean) {
  return `block text-xs mb-1 ${obrigatorio ? "text-[#3A3A44] font-medium" : "text-[#6B6B76]"}`;
}

async function resolveOuCriar(table: "clientes" | "sources", nome: string): Promise<number | null> {
  if (!supabase) return null;
  const nomeTrim = nome.trim();
  if (!nomeTrim) return null;
  const { data: existente } = await supabase.from(table).select("id").eq("nome", nomeTrim).maybeSingle();
  if (existente) return (existente as any).id;
  const payload: any = table === "clientes"
    ? { nome: nomeTrim, origem: "Criado na App", estado_sincronizacao: "Pendente" }
    : { nome: nomeTrim };
  const { data: criado, error } = await supabase.from(table).insert(payload).select("id").single();
  if (error) throw error;
  return (criado as any).id;
}

export default function PipelineForm({ eventoId }: { eventoId?: number }) {
  const router = useRouter();
  const modoEdicao = typeof eventoId === "number";

  const [carregado, setCarregado] = useState(false);
  const [aGuardar, setAGuardar] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<FormState>(ESTADO_INICIAL);

  const [segmentos, setSegmentos] = useState<Catalogo[]>([]);
  const [catEspacos, setCatEspacos] = useState<Catalogo[]>([]);
  const [utilizadores, setUtilizadores] = useState<Catalogo[]>([]);
  const [clientesSugestoes, setClientesSugestoes] = useState<string[]>([]);
  const [espacosSugestoes, setEspacosSugestoes] = useState<string[]>([]);
  const [sourcesSugestoes, setSourcesSugestoes] = useState<string[]>([]);
  const [tiposServicoSugestoes, setTiposServicoSugestoes] = useState<string[]>([]);
  const [operacaoSugestoes, setOperacaoSugestoes] = useState<string[]>([]);
  const [meuUtilizadorId, setMeuUtilizadorId] = useState<number | null>(null);

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

      const { data: euUtilizador } = await supabase
        .from("utilizadores")
        .select("id")
        .eq("auth_user_id", sessionData.session.user.id)
        .maybeSingle();
      if (euUtilizador) setMeuUtilizadorId((euUtilizador as any).id);

      const [
        { data: segs }, { data: cats }, { data: utils },
        { data: clientesRows }, { data: espacosRows }, { data: sourcesRows },
        { data: tiposRows }, { data: operacaoRows },
      ] = await Promise.all([
        supabase.from("segmentos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("categorias_espaco").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("utilizadores").select("id, nome").order("nome"),
        supabase.from("clientes").select("nome").order("nome").limit(3000),
        supabase.from("pipeline").select("espaco").not("espaco", "is", null).limit(3000),
        supabase.from("sources").select("nome").order("nome"),
        supabase.from("pipeline").select("tipo_servico").not("tipo_servico", "is", null).limit(3000),
        supabase.from("pipeline").select("operacao").not("operacao", "is", null).limit(3000),
      ]);

      setSegmentos(segs ?? []);
      setCatEspacos(cats ?? []);
      setUtilizadores(utils ?? []);
      setClientesSugestoes(Array.from(new Set((clientesRows ?? []).map((c: any) => c.nome))).sort());
      setEspacosSugestoes(Array.from(new Set((espacosRows ?? []).map((e: any) => e.espaco))).filter(Boolean).sort());
      setSourcesSugestoes(Array.from(new Set((sourcesRows ?? []).map((s: any) => s.nome))).sort());
      setTiposServicoSugestoes(Array.from(new Set((tiposRows ?? []).map((t: any) => t.tipo_servico))).filter(Boolean).sort());
      setOperacaoSugestoes(Array.from(new Set((operacaoRows ?? []).map((o: any) => o.operacao))).filter(Boolean).sort());

      if (modoEdicao) {
        const { data: evento, error: erroEvento } = await supabase
          .from("pipeline")
          .select(
            `*, cliente_direto:clientes!pipeline_cliente_direto_id_fkey(nome), cliente_final:clientes!pipeline_cliente_final_id_fkey(nome),
             sources(nome), pipeline_comerciais(utilizador_id)`
          )
          .eq("id", eventoId)
          .single();

        if (erroEvento || !evento) {
          setErro(erroEvento?.message ?? "Evento não encontrado.");
          setCarregado(true);
          return;
        }

        const e: any = evento;
        setForm({
          status: e.status,
          data: e.data,
          n_fatura: e.n_fatura ?? "", cs_versao: e.cs_versao ?? "",
          cliente_direto: e.cliente_direto?.nome ?? "", cliente_final: e.cliente_final?.nome ?? "",
          espaco: e.espaco ?? "", tipo_servico: e.tipo_servico ?? "",
          source: e.sources?.nome ?? "", operacao: e.operacao ?? "",
          segmento_id: e.segmento_id ? String(e.segmento_id) : "",
          cat_espaco_id: e.cat_espaco_id ? String(e.cat_espaco_id) : "",
          comerciais: (e.pipeline_comerciais ?? []).map((pc: any) => pc.utilizador_id),
          n_pax: e.n_pax != null ? String(e.n_pax) : "",
          fb: e.fb != null ? String(e.fb) : "",
          fatura: e.fatura != null ? String(e.fatura) : "",
          comissao_paga: e.comissao_paga != null ? String(e.comissao_paga) : "",
          comissao_recebida: e.comissao_recebida != null ? String(e.comissao_recebida) : "",
          sup: e.sup != null ? String(e.sup) : "",
          custo_producao_fb: e.custo_producao_fb != null ? String(e.custo_producao_fb) : "",
          custo_producao_pes_sala: e.custo_producao_pes_sala != null ? String(e.custo_producao_pes_sala) : "",
          custo_producao_pes_logistica: e.custo_producao_pes_logistica != null ? String(e.custo_producao_pes_logistica) : "",
          custo_producao_pes_cozinha: e.custo_producao_pes_cozinha != null ? String(e.custo_producao_pes_cozinha) : "",
          custo_producao_pes_copa: e.custo_producao_pes_copa != null ? String(e.custo_producao_pes_copa) : "",
          custo_producao_t_logistica: e.custo_producao_t_logistica != null ? String(e.custo_producao_t_logistica) : "",
          custo_producao_t_cozinha: e.custo_producao_t_cozinha != null ? String(e.custo_producao_t_cozinha) : "",
          custo_decoracao: e.custo_decoracao != null ? String(e.custo_decoracao) : "",
          custo_seguranca: e.custo_seguranca != null ? String(e.custo_seguranca) : "",
          custo_animacao: e.custo_animacao != null ? String(e.custo_animacao) : "",
          custo_aluguer_espacos: e.custo_aluguer_espacos != null ? String(e.custo_aluguer_espacos) : "",
          custo_staff: e.custo_staff != null ? String(e.custo_staff) : "",
          custo_taxa_logistica: e.custo_taxa_logistica != null ? String(e.custo_taxa_logistica) : "",
          custo_limpeza: e.custo_limpeza != null ? String(e.custo_limpeza) : "",
          custo_outros: e.custo_outros != null ? String(e.custo_outros) : "",
          producao_decoracao: e.producao_decoracao != null ? String(e.producao_decoracao) : "",
          producao_seguranca: e.producao_seguranca != null ? String(e.producao_seguranca) : "",
          producao_animacao: e.producao_animacao != null ? String(e.producao_animacao) : "",
          producao_aluguer_espacos: e.producao_aluguer_espacos != null ? String(e.producao_aluguer_espacos) : "",
          producao_limpeza: e.producao_limpeza != null ? String(e.producao_limpeza) : "",
          producao_outros: e.producao_outros != null ? String(e.producao_outros) : "",
        });
      }

      setCarregado(true);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, eventoId]);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function toggleComercial(id: number) {
    setForm((f) => ({
      ...f,
      comerciais: f.comerciais.includes(id) ? f.comerciais.filter((c) => c !== id) : [...f.comerciais, id],
    }));
  }

  function num(v: string): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  // Replica as fórmulas de cálculo do Excel (colunas P, Q, T, V, AC, AE, AO-AU),
  // confirmadas por inspeção direta às folhas mensais. Corre no momento de guardar,
  // para que os eventos criados/editados na app fiquem com os mesmos totais que o Excel.
  function calcularCamposDerivados(f: FormState) {
    const fb = num(f.fb);
    const comissaoPaga = num(f.comissao_paga);
    const sup = num(f.sup);
    const sup2 = 0; // coluna Z ("SUP") ainda não está no formulário — fica reservada para depois
    const comissaoRecebida = num(f.comissao_recebida);
    const fatura = f.fatura ? num(f.fatura) : 0;
    const nPax = f.n_pax ? num(f.n_pax) : 0;

    const custoStaff = num(f.custo_staff);
    // AC — "Produção" (bloco de custos por categoria, sem o staff que já entra à parte)
    const producaoCalc =
      num(f.custo_decoracao) + num(f.custo_seguranca) + num(f.custo_animacao) +
      num(f.custo_aluguer_espacos) + num(f.custo_taxa_logistica) + num(f.custo_limpeza) + num(f.custo_outros);

    // AM — soma do bloco de produção detalhado (BF:BK)
    const producaoTotalBF_BK =
      num(f.producao_decoracao) + num(f.producao_seguranca) + num(f.producao_animacao) +
      num(f.producao_aluguer_espacos) + num(f.producao_limpeza) + num(f.producao_outros);

    // AF:AL — custos de produção/pessoal detalhados
    const custosProducaoPessoal =
      num(f.custo_producao_fb) + num(f.custo_producao_pes_sala) + num(f.custo_producao_pes_logistica) +
      num(f.custo_producao_pes_cozinha) + num(f.custo_producao_pes_copa) + num(f.custo_producao_t_logistica) +
      num(f.custo_producao_t_cozinha);

    // V — Total = SUM(W:AC)
    const totalReceita = fb + comissaoPaga + sup + sup2 + comissaoRecebida + custoStaff + producaoCalc;
    // P — Proveito = V
    const proveito = totalReceita;
    // Q — V Pax = V / N Pax
    const vPax = nPax ? totalReceita / nPax : null;
    // T — DIF = P - R - X - Z - AA
    const dif = proveito - fatura - comissaoPaga - sup2 - comissaoRecebida;
    // AE — Total custo = SUM(AF:AM)
    const totalCusto = custosProducaoPessoal + producaoTotalBF_BK;
    // AO / AP — Margem
    const margemEur = totalReceita - totalCusto;
    const margemPct = totalReceita !== 0 ? margemEur / totalReceita : null;
    // AQ / AR — Margem F&B
    const baseFb = fb + comissaoPaga;
    const margemFbEur = baseFb - custosProducaoPessoal;
    const margemFbPct = baseFb !== 0 ? margemFbEur / baseFb : null;
    // AS / AT — Margem Produção
    const margemProducaoEur = (sup + sup2 + comissaoRecebida + custoStaff + producaoCalc) - producaoTotalBF_BK;
    const baseProducao = sup + producaoCalc;
    const margemProducaoPct = baseProducao !== 0 ? margemProducaoEur / baseProducao : null;
    // AU — Sala %
    const salaPct = fb !== 0 && num(f.custo_producao_pes_sala) > 0 ? num(f.custo_producao_pes_sala) / fb : null;

    return {
      proveito, v_pax: vPax, dif, total_receita: totalReceita, staff: custoStaff, producao: producaoCalc,
      total_custo: totalCusto, margem_eur: margemEur, margem_pct: margemPct,
      margem_fb_eur: margemFbEur, margem_fb_pct: margemFbPct,
      margem_producao_eur: margemProducaoEur, margem_producao_pct: margemProducaoPct, sala_pct: salaPct,
    };
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");

    if (!supabase) return;
    if (!form.data || !form.cliente_direto.trim() || !form.segmento_id || !form.cat_espaco_id || !form.source.trim() || form.comerciais.length === 0 || !form.fb) {
      setErro("Preenche todos os campos obrigatórios: Estado, Data, Cliente direto, Segmento, Cat Espaço, Source, Comercial e F&B.");
      return;
    }

    setAGuardar(true);
    try {
      const clienteDiretoId = await resolveOuCriar("clientes", form.cliente_direto);
      const clienteFinalId = form.cliente_final.trim()
        ? await resolveOuCriar("clientes", form.cliente_final)
        : clienteDiretoId;
      const sourceId = await resolveOuCriar("sources", form.source);

      const payload = {
        status: form.status,
        data: form.data,
        n_fatura: form.n_fatura || null,
        cs_versao: form.cs_versao || null,
        cliente_direto_id: clienteDiretoId,
        cliente_final_id: clienteFinalId,
        segmento_id: Number(form.segmento_id),
        cat_espaco_id: Number(form.cat_espaco_id),
        espaco: form.espaco || null,
        tipo_servico: form.tipo_servico || null,
        source_id: sourceId,
        operacao: form.operacao || null,
        n_pax: form.n_pax ? num(form.n_pax) : 0,
        fb: num(form.fb),
        fatura: form.fatura ? num(form.fatura) : null,
        comissao_paga: num(form.comissao_paga),
        comissao_recebida: num(form.comissao_recebida),
        sup: num(form.sup),
        custo_producao_fb: num(form.custo_producao_fb),
        custo_producao_pes_sala: num(form.custo_producao_pes_sala),
        custo_producao_pes_logistica: num(form.custo_producao_pes_logistica),
        custo_producao_pes_cozinha: num(form.custo_producao_pes_cozinha),
        custo_producao_pes_copa: num(form.custo_producao_pes_copa),
        custo_producao_t_logistica: num(form.custo_producao_t_logistica),
        custo_producao_t_cozinha: num(form.custo_producao_t_cozinha),
        custo_decoracao: num(form.custo_decoracao),
        custo_seguranca: num(form.custo_seguranca),
        custo_animacao: num(form.custo_animacao),
        custo_aluguer_espacos: num(form.custo_aluguer_espacos),
        custo_staff: num(form.custo_staff),
        custo_taxa_logistica: num(form.custo_taxa_logistica),
        custo_limpeza: num(form.custo_limpeza),
        custo_outros: num(form.custo_outros),
        producao_decoracao: num(form.producao_decoracao),
        producao_seguranca: num(form.producao_seguranca),
        producao_animacao: num(form.producao_animacao),
        producao_aluguer_espacos: num(form.producao_aluguer_espacos),
        producao_limpeza: num(form.producao_limpeza),
        producao_outros: num(form.producao_outros),
        ...calcularCamposDerivados(form),
      };

      let pipelineId = eventoId;

      if (modoEdicao) {
        const { error } = await supabase.from("pipeline").update(payload).eq("id", eventoId);
        if (error) throw error;
        await supabase.from("pipeline_comerciais").delete().eq("pipeline_id", eventoId);
      } else {
        const { data: criado, error } = await supabase.from("pipeline").insert(payload).select("id").single();
        if (error) throw error;
        pipelineId = (criado as any).id;
      }

      if (pipelineId) {
        const linhas = form.comerciais.map((utilizadorId) => ({ pipeline_id: pipelineId, utilizador_id: utilizadorId }));
        const { error: erroComerciais } = await supabase.from("pipeline_comerciais").insert(linhas);
        if (erroComerciais) throw erroComerciais;
      }

      router.push("/pipeline");
    } catch (e: any) {
      setErro(e.message ?? "Erro a guardar o evento.");
      setAGuardar(false);
    }
  }

  if (!carregado) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-[#6B6B76]">A carregar…</p>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <a href="/pipeline" className="text-xs text-[#6B6B76] hover:underline">← Pipeline</a>
        <h1 className="text-xl font-medium mt-1">{modoEdicao ? "Editar evento" : "Novo evento"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-[#E7E6F0] bg-white p-5">
          <h2 className="text-sm font-medium mb-4">Dados do evento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass(true)}>Estado *</label>
              <select className={inputClass()} value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
                {TODOS_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass(true)}>Data *</label>
              <input type="date" className={inputClass()} value={form.data} onChange={(e) => set("data", e.target.value)} />
            </div>

            <div>
              <label className={labelClass(true)}>Cliente direto *</label>
              <input list="lista-clientes" className={inputClass()} value={form.cliente_direto} onChange={(e) => set("cliente_direto", e.target.value)} placeholder="Escreve ou escolhe" />
            </div>
            <div>
              <label className={labelClass()}>Cliente final</label>
              <input list="lista-clientes" className={inputClass()} value={form.cliente_final} onChange={(e) => set("cliente_final", e.target.value)} placeholder="Se vazio, igual ao direto" />
            </div>
            <datalist id="lista-clientes">
              {clientesSugestoes.map((c) => <option key={c} value={c} />)}
            </datalist>

            <div>
              <label className={labelClass(true)}>Segmento *</label>
              <select className={inputClass()} value={form.segmento_id} onChange={(e) => set("segmento_id", e.target.value)}>
                <option value="">Escolhe…</option>
                {segmentos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass(true)}>Cat Espaço *</label>
              <select className={inputClass()} value={form.cat_espaco_id} onChange={(e) => set("cat_espaco_id", e.target.value)}>
                <option value="">Escolhe…</option>
                {catEspacos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass()}>Espaço</label>
              <input list="lista-espacos" className={inputClass()} value={form.espaco} onChange={(e) => set("espaco", e.target.value)} />
              <datalist id="lista-espacos">{espacosSugestoes.map((e) => <option key={e} value={e} />)}</datalist>
            </div>
            <div>
              <label className={labelClass()}>Tipo serviço</label>
              <input list="lista-tipos-servico" className={inputClass()} value={form.tipo_servico} onChange={(e) => set("tipo_servico", e.target.value)} />
              <datalist id="lista-tipos-servico">{tiposServicoSugestoes.map((t) => <option key={t} value={t} />)}</datalist>
            </div>

            <div>
              <label className={labelClass(true)}>Source *</label>
              <input list="lista-sources" className={inputClass()} value={form.source} onChange={(e) => set("source", e.target.value)} />
              <datalist id="lista-sources">{sourcesSugestoes.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div>
              <label className={labelClass()}>Operação</label>
              <input list="lista-operacao" className={inputClass()} value={form.operacao} onChange={(e) => set("operacao", e.target.value)} />
              <datalist id="lista-operacao">{operacaoSugestoes.map((o) => <option key={o} value={o} />)}</datalist>
            </div>

            <div>
              <label className={labelClass()}>N Pax</label>
              <input type="number" min="0" className={inputClass()} value={form.n_pax} onChange={(e) => set("n_pax", e.target.value)} />
            </div>
            <div>
              <label className={labelClass()}>N Fatura</label>
              <input className={inputClass()} value={form.n_fatura} onChange={(e) => set("n_fatura", e.target.value)} />
            </div>
            <div>
              <label className={labelClass()}>CS (versão)</label>
              <input className={inputClass()} value={form.cs_versao} onChange={(e) => set("cs_versao", e.target.value)} />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass(true)}>Comercial * (podes escolher mais do que um)</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {utilizadores.map((u) => (
                <button
                  type="button"
                  key={u.id}
                  onClick={() => toggleComercial(u.id)}
                  className={`h-8 rounded-lg border px-3 text-xs transition-colors ${
                    form.comerciais.includes(u.id) ? "border-brand-400 bg-brand-50 text-brand-600" : "border-[#E7E6F0] bg-white text-[#6B6B76]"
                  }`}
                >
                  {u.nome}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E7E6F0] bg-white p-5">
          <h2 className="text-sm font-medium mb-4">Financeiro</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass(true)}>F&amp;B *</label>
              <input type="number" step="0.01" className={inputClass()} value={form.fb} onChange={(e) => set("fb", e.target.value)} />
            </div>
            <div>
              <label className={labelClass()}>Fatura</label>
              <input type="number" step="0.01" className={inputClass()} value={form.fatura} onChange={(e) => set("fatura", e.target.value)} />
            </div>
            <div>
              <label className={labelClass()}>Comissão paga</label>
              <input type="number" step="0.01" className={inputClass()} value={form.comissao_paga} onChange={(e) => set("comissao_paga", e.target.value)} />
            </div>
            <div>
              <label className={labelClass()}>Comissão recebida</label>
              <input type="number" step="0.01" className={inputClass()} value={form.comissao_recebida} onChange={(e) => set("comissao_recebida", e.target.value)} />
            </div>
            <div>
              <label className={labelClass()}>SUP</label>
              <input type="number" step="0.01" className={inputClass()} value={form.sup} onChange={(e) => set("sup", e.target.value)} />
            </div>
          </div>
        </section>

        <details className="rounded-xl border border-[#E7E6F0] bg-white p-5">
          <summary className="text-sm font-medium cursor-pointer">Custos de produção (pessoal)</summary>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              ["custo_producao_fb", "F&B"], ["custo_producao_pes_sala", "Pes Sala"],
              ["custo_producao_pes_logistica", "Pes Logística"], ["custo_producao_pes_cozinha", "Pes Cozinha"],
              ["custo_producao_pes_copa", "Pes Copa"], ["custo_producao_t_logistica", "T Logística"],
              ["custo_producao_t_cozinha", "T Cozinha"],
            ].map(([campo, label]) => (
              <div key={campo}>
                <label className={labelClass()}>{label}</label>
                <input type="number" step="0.01" className={inputClass()} value={(form as any)[campo]} onChange={(e) => set(campo as any, e.target.value)} />
              </div>
            ))}
          </div>
        </details>

        <details className="rounded-xl border border-[#E7E6F0] bg-white p-5">
          <summary className="text-sm font-medium cursor-pointer">Custos por categoria</summary>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              ["custo_decoracao", "Decoração"], ["custo_seguranca", "Segurança"], ["custo_animacao", "Animação"],
              ["custo_aluguer_espacos", "Aluguer espaços"], ["custo_staff", "Staff"], ["custo_taxa_logistica", "Taxa Logística"],
              ["custo_limpeza", "Limpeza"], ["custo_outros", "Outros"],
              ["producao_decoracao", "Produção — Decoração"], ["producao_seguranca", "Produção — Segurança"],
              ["producao_animacao", "Produção — Animação"], ["producao_aluguer_espacos", "Produção — Aluguer espaços"],
              ["producao_limpeza", "Produção — Limpeza"], ["producao_outros", "Produção — Outros"],
            ].map(([campo, label]) => (
              <div key={campo}>
                <label className={labelClass()}>{label}</label>
                <input type="number" step="0.01" className={inputClass()} value={(form as any)[campo]} onChange={(e) => set(campo as any, e.target.value)} />
              </div>
            ))}
          </div>
        </details>

        {erro && <p className="text-sm text-status-perdido">{erro}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={aGuardar}
            className="rounded-lg bg-brand-500 text-white text-sm font-medium px-5 h-10 hover:bg-brand-600 transition-colors disabled:opacity-60"
          >
            {aGuardar ? "A guardar…" : "Guardar"}
          </button>
          <a href="/pipeline" className="rounded-lg border border-[#E7E6F0] text-sm font-medium px-5 h-10 flex items-center hover:border-brand-400 transition-colors">
            Cancelar
          </a>
        </div>
      </form>

      {modoEdicao && eventoId && (
        <div className="mt-6">
          <TarefasEvento pipelineId={eventoId} meuUtilizadorId={meuUtilizadorId} />
        </div>
      )}
    </main>
  );
}

