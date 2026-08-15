"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [aEntrar, setAEntrar] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!supabase) {
      setErro("Supabase não está configurado (falta NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).");
      return;
    }

    setAEntrar(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAEntrar(false);

    if (error) {
      setErro(error.message === "Invalid login credentials" ? "Email ou password incorretos." : error.message);
      return;
    }
    router.push("/");
  }

  async function handleForgotPassword() {
    if (!supabase || !email) {
      setErro("Escreve o teu email na caixa e tenta de novo.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setErro(error ? error.message : "Email de reset enviado, se a conta existir.");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl bg-white border border-[#E7E6F0] p-6">
        <h1 className="text-lg font-medium mb-1">FoodStory Portal</h1>
        <p className="text-sm text-[#6B6B76] mb-6">Inicia sessão para continuar</p>

        <label className="block text-xs text-[#6B6B76] mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm mb-4"
          placeholder="nome@foodstory.pt"
        />

        <label className="block text-xs text-[#6B6B76] mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-10 rounded-lg border border-[#E7E6F0] px-3 text-sm mb-2"
          placeholder="••••••••"
        />

        <button type="button" onClick={handleForgotPassword} className="text-xs text-brand-500 hover:underline">
          Esqueci-me da password
        </button>

        {erro && <p className="text-xs text-status-perdido mt-3">{erro}</p>}

        <button
          type="submit"
          disabled={aEntrar}
          className="w-full h-10 rounded-lg bg-brand-500 text-white text-sm font-medium mt-4 hover:bg-brand-600 transition-colors disabled:opacity-60"
        >
          {aEntrar ? "A entrar…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
