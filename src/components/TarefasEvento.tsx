"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Tarefa = {
  id: number;
  titulo: string;
  descricao: string | null;
  estado: "Pendente" | "Concluída" | "Cancelada";
  responsavel_id: number;
  responsavel_nome: string;
  criado_por_nome: string;
};

export default function TarefasEvento({
  pipelineId,
  meuUtilizadorId,
}: {
  pipelineId: number;
  meuUtilizadorId: number | null;
}) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [utilizadores, setUtilizadores] = useState<{ id: number; nome: string }[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [aCriar, setACriar] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [responsavelId, setResponsavelId] = useState<string>("");
  const [erro, setErro] = useState("");

  async function carregar() {
    if (!supabase) return;

    // Só utilizadores reais da app (com conta ativa) podem receber tarefas —
    // não os comerciais-placeholder criados no import histórico do Excel.
    const { data: utilsAtivos } = await supabase
      .from("utilizadores")
      .select("id, nome")
      .eq("estado_conta", "Ativo")
      .order("nome");
    setUtilizadores(utilsAtivos ?? []);

    const { data } = await supabase
      .from("tarefas")
      .select(
        `id, titulo, descricao, estado,
         responsavel:utilizadores!tarefas_responsavel_id_fkey(id, nome),
         criador:utilizadores!tarefas_criado_por_fkey(nome)`
      )
      .eq("pipeline_id", pipelineId)
      .order("criado_em", { ascending: false });

    setTarefas(
      (data ?? []).map((t: any) => ({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao,
        estado: t.estado,
        responsavel_id: t.responsavel?.id,
        responsavel_nome: t.responsavel?.nome ?? "—",
        criado_por_nome: t.criador?.nome ?? "—",
      }))
    );
    setCarregado(true);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId]);

  async function criarTarefa(ev: React.FormEvent) {
    ev.preventDefault();
    setErro("");
    if (!supabase) return;
    if (!titulo.trim() || !responsavelId) {
      setErro("Escreve um título e escolhe a quem se dirige a tarefa.");
      return;
    }
    const { error } = await supabase.from("tarefas").insert({
      titulo: titulo.trim(),
      descricao: nota.trim() || null,
      pipeline_id: pipelineId,
      responsavel_id: Number(responsavelId),
      criado_por: meuUtilizadorId,
      estado: "Pendente",
      origem: "Manual",
    });
    if (error) {
      setErro(error.message);
      return;
    }
    setTitulo("");
    setNota("");
    setResponsavelId("");
    setACriar(false);
    carregar();
  }

  async function concluir(id: number) {
    if (!supabase || !meuUtilizadorId) return;
    await supabase
      .from("tarefas")
      .update({ estado: "Concluída", concluido_em: new Date().toISOString(), concluido_por: meuUtilizadorId })
      .eq("id", id);
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "Concluída" } : t)));
  }

  async function reatribuir(id: number, novoId: number) {
    if (!supabase) return;
    await supabase.from("tarefas").update({ responsavel_id: novoId }).eq("id", id);
    const novoNome = utilizadores.find((u) => u.id === novoId)?.nome ?? "—";
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, responsavel_id: novoId, responsavel_nome: novoNome } : t)));
  }

  return (
    <section className="rounded-xl border border-[#E7E6F0] bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">Tarefas deste evento</h2>
        <button
          type="button"
          onClick={() => setACriar((v) => !v)}
          className="text-xs text-brand-500 hover:underline"
        >
          {aCriar ? "Cancelar" : "+ Nova tarefa"}
        </button>
      </div>

      {aCriar && (
        <form onSubmit={criarTarefa} className="mb-4 space-y-3 border-b border-[#F1F0F7] pb-4">
          <input
            className="w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm"
            placeholder="Título da tarefa"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border border-[#E7E6F0] px-3 py-2 text-sm"
            placeholder="Nota (opcional)"
            rows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
          <select
            className="w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm"
            value={responsavelId}
            onChange={(e) => setResponsavelId(e.target.value)}
          >
            <option value="">Dirigir a…</option>
            {utilizadores.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
          {erro && <p className="text-xs text-status-perdido">{erro}</p>}
          <button type="submit" className="h-9 rounded-lg bg-brand-500 text-white text-xs font-medium px-4 hover:bg-brand-600 transition-colors">
            Criar tarefa
          </button>
        </form>
      )}

      {!carregado && <p className="text-xs text-[#6B6B76]">A carregar…</p>}
      {carregado && tarefas.length === 0 && <p className="text-xs text-[#6B6B76]">Sem tarefas para este evento.</p>}

      <div className="space-y-2">
        {tarefas.map((t) => (
          <div key={t.id} className="rounded-lg border border-[#F1F0F7] p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{t.titulo}</p>
                {t.descricao && <p className="text-xs text-[#6B6B76] mt-0.5">{t.descricao}</p>}
                <p className="text-xs text-[#6B6B76] mt-1">Enviado por {t.criado_por_nome} · Para {t.responsavel_nome}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  t.estado === "Concluída" ? "bg-status-ganhoBg text-status-ganho" : "bg-status-analiseBg text-status-analise"
                }`}
              >
                {t.estado}
              </span>
            </div>
            {t.estado === "Pendente" && (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => concluir(t.id)}
                  className="h-7 rounded-lg bg-brand-500 text-white text-xs font-medium px-3 hover:bg-brand-600 transition-colors"
                >
                  Concluir
                </button>
                <select
                  value={t.responsavel_id}
                  onChange={(e) => reatribuir(t.id, Number(e.target.value))}
                  className="h-7 rounded-lg border border-[#E7E6F0] px-2 text-xs"
                >
                  {utilizadores.map((u) => (
                    <option key={u.id} value={u.id}>Reatribuir a {u.nome}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

