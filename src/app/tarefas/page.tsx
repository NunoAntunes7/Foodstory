"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Tarefa = {
  id: number;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  estado: "Pendente" | "Concluída" | "Cancelada";
  criado_em: string;
  responsavel_id: number;
  responsavel_nome: string;
  criado_por_id: number | null;
  criado_por_nome: string;
  pipeline_id: number | null;
  evento_label: string | null;
};

function formatDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("pt-PT");
}

export default function TarefasPage() {
  const router = useRouter();
  const [carregado, setCarregado] = useState(false);
  const [erro, setErro] = useState("");
  const [meuId, setMeuId] = useState<number | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [utilizadores, setUtilizadores] = useState<{ id: number; nome: string }[]>([]);
  const [tab, setTab] = useState<"para-mim" | "enviadas">("para-mim");
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);

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

      const { data: utilizador } = await supabase
        .from("utilizadores")
        .select("id, nome")
        .eq("auth_user_id", sessionData.session.user.id)
        .maybeSingle();

      if (!utilizador) {
        setErro("Não foi possível identificar o teu utilizador.");
        setCarregado(true);
        return;
      }
      setMeuId(utilizador.id);

      // Só utilizadores reais da app (com conta ativa) podem receber tarefas.
      const { data: utils } = await supabase
        .from("utilizadores")
        .select("id, nome")
        .eq("estado_conta", "Ativo")
        .order("nome");
      setUtilizadores(utils ?? []);

      const { data, error } = await supabase
        .from("tarefas")
        .select(
          `id, titulo, descricao, prazo, estado, criado_em, pipeline_id,
           responsavel:utilizadores!tarefas_responsavel_id_fkey(id, nome),
           criador:utilizadores!tarefas_criado_por_fkey(id, nome),
           pipeline:pipeline_id(id, data, cliente_direto:clientes!pipeline_cliente_direto_id_fkey(nome))`
        )
        .or(`responsavel_id.eq.${utilizador.id},criado_por.eq.${utilizador.id}`)
        .order("criado_em", { ascending: false });

      if (error) {
        setErro(error.message);
        setCarregado(true);
        return;
      }

      const mapeadas: Tarefa[] = (data ?? []).map((t: any) => ({
        id: t.id,
        titulo: t.titulo,
        descricao: t.descricao,
        prazo: t.prazo,
        estado: t.estado,
        criado_em: t.criado_em,
        responsavel_id: t.responsavel?.id,
        responsavel_nome: t.responsavel?.nome ?? "—",
        criado_por_id: t.criador?.id ?? null,
        criado_por_nome: t.criador?.nome ?? "—",
        pipeline_id: t.pipeline_id,
        evento_label: t.pipeline ? `${t.pipeline.cliente_direto?.nome ?? "Evento"} · ${formatDate(t.pipeline.data)}` : null,
      }));

      setTarefas(mapeadas);
      setCarregado(true);
    }
    carregar();
  }, [router]);

  const paraMim = useMemo(
    () => tarefas.filter((t) => t.responsavel_id === meuId && (mostrarConcluidas || t.estado === "Pendente")),
    [tarefas, meuId, mostrarConcluidas]
  );
  const enviadas = useMemo(
    () => tarefas.filter((t) => t.criado_por_id === meuId && (mostrarConcluidas || t.estado === "Pendente")),
    [tarefas, meuId, mostrarConcluidas]
  );
  const lista = tab === "para-mim" ? paraMim : enviadas;

  async function concluir(id: number) {
    if (!supabase || !meuId) return;
    await supabase
      .from("tarefas")
      .update({ estado: "Concluída", concluido_em: new Date().toISOString(), concluido_por: meuId })
      .eq("id", id);
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, estado: "Concluída" } : t)));
  }

  async function reatribuir(id: number, novoResponsavelId: number) {
    if (!supabase) return;
    await supabase.from("tarefas").update({ responsavel_id: novoResponsavelId }).eq("id", id);
    const novoNome = utilizadores.find((u) => u.id === novoResponsavelId)?.nome ?? "—";
    setTarefas((prev) => prev.map((t) => (t.id === id ? { ...t, responsavel_id: novoResponsavelId, responsavel_nome: novoNome } : t)));
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
        <Link href="/" className="text-xs text-[#6B6B76] hover:underline">← Início</Link>
        <h1 className="text-xl font-medium mt-1">Tarefas</h1>
      </div>

      {erro && <p className="text-sm text-status-perdido mb-4">{erro}</p>}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-1">
          <button
            onClick={() => setTab("para-mim")}
            className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
              tab === "para-mim" ? "border-brand-400 bg-brand-50 text-brand-600" : "border-[#E7E6F0] bg-white text-[#6B6B76]"
            }`}
          >
            Para mim ({paraMim.length})
          </button>
          <button
            onClick={() => setTab("enviadas")}
            className={`h-9 rounded-lg border px-3 text-xs font-medium transition-colors ${
              tab === "enviadas" ? "border-brand-400 bg-brand-50 text-brand-600" : "border-[#E7E6F0] bg-white text-[#6B6B76]"
            }`}
          >
            Enviadas por mim ({enviadas.length})
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs text-[#6B6B76]">
          <input type="checkbox" checked={mostrarConcluidas} onChange={(e) => setMostrarConcluidas(e.target.checked)} />
          Mostrar concluídas
        </label>
      </div>

      <div className="space-y-3">
        {lista.length === 0 && (
          <p className="text-sm text-[#6B6B76] text-center py-8">Sem tarefas para mostrar.</p>
        )}
        {lista.map((t) => (
          <div key={t.id} className="rounded-xl border border-[#E7E6F0] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-sm">{t.titulo}</p>
                {t.descricao && <p className="text-sm text-[#6B6B76] mt-1">{t.descricao}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-[#6B6B76]">
                  {t.evento_label && (
                    <Link href={`/pipeline/${t.pipeline_id}/editar`} className="text-brand-500 hover:underline">
                      {t.evento_label}
                    </Link>
                  )}
                  <span>Enviado por {t.criado_por_nome}</span>
                  <span>Para {t.responsavel_nome}</span>
                  {t.prazo && <span>Prazo {formatDate(t.prazo)}</span>}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
                  t.estado === "Concluída" ? "bg-status-ganhoBg text-status-ganho" : t.estado === "Cancelada" ? "bg-[#F1F0F7] text-[#6B6B76]" : "bg-status-analiseBg text-status-analise"
                }`}
              >
                {t.estado}
              </span>
            </div>

            {t.estado === "Pendente" && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F1F0F7]">
                {tab === "para-mim" && (
                  <button
                    onClick={() => concluir(t.id)}
                    className="h-8 rounded-lg bg-brand-500 text-white text-xs font-medium px-3 hover:bg-brand-600 transition-colors"
                  >
                    Concluir
                  </button>
                )}
                <select
                  value={t.responsavel_id}
                  onChange={(e) => reatribuir(t.id, Number(e.target.value))}
                  className="h-8 rounded-lg border border-[#E7E6F0] px-2 text-xs"
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
    </main>
  );
}
