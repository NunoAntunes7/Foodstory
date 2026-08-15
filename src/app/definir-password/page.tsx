"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DefinirPasswordPage() {
  const router = useRouter();
  const [pronto, setPronto] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [aGuardar, setAGuardar] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setSemSessao(true);
      return;
    }

    // O link de convite/reset do Supabase deixa a sessão pronta a ser detetada
    // a partir do URL (fragmento #access_token=...) assim que a página carrega.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
      else setSemSessao(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setPronto(true);
        setSemSessao(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (password.length < 8) {
      setErro("A password tem de ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setErro("As passwords não coincidem.");
      return;
    }
    if (!supabase) return;

    setAGuardar(true);
    const { data: userData, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setErro(updateError.message);
      setAGuardar(false);
      return;
    }

    // Ativa o registo de negócio correspondente (utilizadores.estado_conta -> 'Ativo')
    if (userData.user) {
      await supabase
        .from("utilizadores")
        .update({ estado_conta: "Ativo", password_definida_em: new Date().toISOString() })
        .eq("auth_user_id", userData.user.id);
    }

    router.push("/");
  }

  if (semSessao) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white border border-[#E7E6F0] p-6 text-center">
          <p className="text-sm text-[#6B6B76]">
            Este link já não é válido ou expirou. Pede um novo convite/reset de password.
          </p>
        </div>
      </main>
    );
  }

  if (!pronto) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm text-[#6B6B76]">A validar o link…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white border border-[#E7E6F0] p-6">
        <h1 className="text-lg font-medium mb-1">Definir password</h1>
        <p className="text-sm text-[#6B6B76] mb-6">Escolhe uma password para a tua conta.</p>

        <label className="block text-xs text-[#6B6B76] mb-1">Nova password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm mb-4"
          placeholder="Mínimo 8 caracteres"
        />

        <label className="block text-xs text-[#6B6B76] mb-1">Confirmar password</label>
        <input
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          className="w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm"
        />

        {erro && <p className="text-xs text-status-perdido mt-3">{erro}</p>}

        <button
          type="submit"
          disabled={aGuardar}
          className="w-full h-10 rounded-lg bg-brand-500 text-white text-sm font-medium mt-5 hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {aGuardar ? "A guardar…" : "Guardar e entrar"}
        </button>
      </form>
    </main>
  );
}
