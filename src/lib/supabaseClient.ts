import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Durante o desenvolvimento inicial (sem projeto Supabase ainda criado),
// as páginas usam dados de exemplo em src/lib/mockData.ts.
// Assim que houver URL/anon key reais em .env.local, os pedidos passam a ir para a base de dados.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
