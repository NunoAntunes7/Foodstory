# FoodStory Portal

Scaffold inicial da aplicação (substituto do Excel "Pipeline Mensal"). Ver `../FoodStory Portal - Especificacao Tecnica.md` para o modelo de dados e regras de negócio completos.

## O que já existe neste scaffold

- Next.js 14 (App Router) + TypeScript + Tailwind, pronto a correr.
- Ecrã **Home** (`/`) — contador de tarefas + menus.
- Ecrã **Pipeline** (`/pipeline`) — KPIs, filtros (mês, status com Perdidos excluídos por defeito, comercial), colunas adicionáveis, tabela. Usa dados de exemplo (`src/lib/mockData.ts`).
- Ecrã **Login** (`/login`) — UI pronta, ainda não ligada à autenticação real.
- `supabase/schema.sql` — schema completo (todas as tabelas da especificação), validado sintaticamente contra o parser do Postgres.

O resto dos módulos (Key Figures, Logística, Financeira, Tarefas, Back Office) segue o mesmo padrão depois de o Pipeline estar validado.

## O que precisas de fazer (contas gratuitas, não posso criar por ti)

1. **Supabase** ([supabase.com](https://supabase.com)) — criar projeto grátis. Depois:
   - Em SQL Editor, correr `supabase/schema.sql`.
   - Copiar `Project URL` e `anon public key` para `.env.local` (usar `.env.local.example` como modelo).
2. **Vercel** ([vercel.com](https://vercel.com)) — criar conta grátis, ligar a um repositório GitHub para deploy automático.
3. **GitHub** — criar repositório e enviar este código.
4. Emails dos primeiros utilizadores a convidar (para o fluxo de onboarding).
5. Mais tarde, para a integração com o Business Central: credenciais de API (registo de aplicação no Azure AD / acesso a Web Services do BC).

## Correr localmente

```bash
npm install
cp .env.local.example .env.local   # preencher com as credenciais do Supabase
npm run dev
```

Abre http://localhost:3000
