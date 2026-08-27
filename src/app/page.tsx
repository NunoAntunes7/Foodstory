"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { menuItems } from "@/lib/mockData";

export default function HomePage() {
  const router = useRouter();
  const [carregado, setCarregado] = useState(false);
  const [nome, setNome] = useState("");
  const [tarefasPendentes, setTarefasPendentes] = useState(0);

  useEffect(() => {
    async function load() {
      if (!supabase) {
        setCarregado(true);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/login");
        return;
      }

      const authUserId = sessionData.session.user.id;

      const { data: utilizador } = await supabase
        .from("utilizadores")
        .select("id, nome")
        .eq("auth_user_id", authUserId)
        .maybeSingle();

      if (utilizador) {
        setNome(utilizador.nome);
        const { count } = await supabase
          .from("tarefas")
          .select("id", { count: "exact", head: true })
          .eq("responsavel_id", utilizador.id)
          .eq("estado", "Pendente");
        setTarefasPendentes(count ?? 0);
      }

      setCarregado(true);
    }
    load();
  }, [router]);

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/login");
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-[#6B6B76]">Olá,</p>
          <h1 className="text-2xl font-medium">{nome || "utilizador"}</h1>
        </div>
        <button onClick={handleLogout} className="text-xs text-[#6B6B76] hover:underline">
          Sair
        </button>
      </div>

      <Link
        href="/tarefas"
        className="block rounded-xl bg-brand-500 text-white p-5 mb-8 hover:bg-brand-600 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-brand-50">As minhas tarefas</p>
            <p className="text-3xl font-medium mt-1">{tarefasPendentes} pendentes</p>
          </div>
          <span className="text-2xl">→</span>
        </div>
      </Link>

      <p className="text-sm text-[#6B6B76] mb-3">Menus</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl bg-white border border-[#E7E6F0] p-4 hover:border-brand-400 transition-colors"
          >
            <p className="font-medium text-sm">{item.label}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
