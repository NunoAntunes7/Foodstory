export type Status = "Ganho" | "Boa possibilidade" | "Em análise" | "Perdido";

export const statusProbabilidade: Record<Status, number> = {
  "Ganho": 1,
  "Boa possibilidade": 0.8,
  "Em análise": 0.1,
  "Perdido": 0
};

export type PipelineEvento = {
  id: number;
  n_evento: number;
  status: Status;
  data: string;
  cliente_direto: string;
  cliente_final: string;
  segmento: string;
  cat_espaco: string;
  espaco: string;
  tipo_servico: string;
  comercial: string;
  operacao: string;
  n_pax: number;
  proveito: number;
  fatura: number;
};

export const pipelineMock: PipelineEvento[] = [
  { id: 1, n_evento: 507, status: "Ganho", data: "2026-08-09", cliente_direto: "Nervo", cliente_final: "Tranquilidade", segmento: "Corporate", cat_espaco: "Esp. Externos", espaco: "One 16", tipo_servico: "Almoço buffet", comercial: "Rita A", operacao: "Joana S", n_pax: 900, proveito: 56900, fatura: 58100 },
  { id: 2, n_evento: 512, status: "Boa possibilidade", data: "2026-08-15", cliente_direto: "Empresa A", cliente_final: "Empresa A", segmento: "Corporate", cat_espaco: "CCB", espaco: "CCB", tipo_servico: "Jantar empratado", comercial: "Nuno A", operacao: "Nuno A", n_pax: 500, proveito: 40000, fatura: 0 },
  { id: 3, n_evento: 519, status: "Em análise", data: "2026-08-20", cliente_direto: "Agência X", cliente_final: "Cliente Y", segmento: "Agências", espaco: "Regium", cat_espaco: "Regium", tipo_servico: "Coffee break", comercial: "Joana S", operacao: "Rita S", n_pax: 300, proveito: 15000, fatura: 0 },
  { id: 4, n_evento: 522, status: "Perdido", data: "2026-08-22", cliente_direto: "JUMP", cliente_final: "JUMP", segmento: "Corporate", cat_espaco: "Esp. Externos", espaco: "Instalações cliente", tipo_servico: "Almoço volante", comercial: "Rita S", operacao: "Rita S", n_pax: 200, proveito: 12000, fatura: 0 },
  { id: 5, n_evento: 525, status: "Ganho", data: "2026-08-28", cliente_direto: "Santander", cliente_final: "Santander", segmento: "Corporate", cat_espaco: "Vandelli", espaco: "Vandelli BG", tipo_servico: "Cocktail", comercial: "Ana C", operacao: "Ana C", n_pax: 150, proveito: 22000, fatura: 22000 }
];

export type Tarefa = {
  id: number;
  titulo: string;
  prazo: string;
  estado: "Pendente" | "Concluída";
  evento?: string;
};

export const tarefasMock: Tarefa[] = [
  { id: 1, titulo: "Criar lista de material — evento 512", prazo: "2026-08-17", estado: "Pendente", evento: "Empresa A" },
  { id: 2, titulo: "Validar bebidas confirmadas — evento 507", prazo: "2026-08-14", estado: "Pendente", evento: "Tranquilidade" },
  { id: 3, titulo: "Confirmar fornecedor decoração", prazo: "2026-08-16", estado: "Pendente" }
];

export const menuItems = [
  { label: "Pipeline", href: "/pipeline", icon: "pipeline" },
  { label: "Key Figures", href: "/key-figures", icon: "chart" },
  { label: "Logística", href: "/logistica", icon: "truck" },
  { label: "Financeira", href: "/financeira", icon: "invoice" },
  { label: "Tarefas", href: "/tarefas", icon: "check" },
  { label: "Back Office", href: "/back-office", icon: "settings" }
];
