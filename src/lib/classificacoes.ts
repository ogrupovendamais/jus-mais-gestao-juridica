// Classificação de usuários conforme o Procedimento Operacional (item 6).
// A classificação define o "role" no banco: Gestão Administrativa = master (acesso total),
// as demais = parceiro (acesso restrito à própria carteira).

export type Classificacao =
  | "gestao_administrativa"
  | "parceiro_juridico_oab"
  | "parceiro_juridico_tecnico"
  | "assistente_financeiro";

export const CLASSIFICACOES: { value: Classificacao; label: string; descricao: string }[] = [
  { value: "gestao_administrativa", label: "Gestão Administrativa", descricao: "Acesso total, filtra por nicho ou responsável" },
  { value: "parceiro_juridico_oab", label: "Parceiro Jurídico OAB", descricao: "Acesso à sua carteira de clientes" },
  { value: "parceiro_juridico_tecnico", label: "Parceiro Jurídico Técnico", descricao: "Sua carteira + consulta prazos (processos, audiências, tarefas) de todos" },
  { value: "assistente_financeiro", label: "Assistente Financeiro(a)", descricao: "Financeiro completo + cadastro de clientes (gera boletos)" },
];

export const classificacaoLabel = (value?: string | null) =>
  CLASSIFICACOES.find((c) => c.value === value)?.label ?? null;

export const roleFromClassificacao = (value: Classificacao): "master" | "parceiro" =>
  value === "gestao_administrativa" ? "master" : "parceiro";

// Opções do cadastro de membros (aba Equipe)
export const CARGOS_EQUIPE = [
  "Gestão Administrativa",
  "Parceiro Jurídico OAB",
  "Parceiro Jurídico Técnico",
  "Assistente Financeiro(a)",
  "Advogado(a)",
  "Estagiário(a)",
];

export const DEPARTAMENTOS_EQUIPE = [
  "Gestão Administrativa",
  "Jurídico",
  "Financeiro",
  "Atendimento",
];

// Mantém visível no Select um valor antigo que não está mais na lista
export const withLegacyOption = (options: string[], current?: string | null) =>
  current && !options.includes(current) ? [current, ...options] : options;
