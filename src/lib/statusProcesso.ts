// Status de processo, na ordem definida pela Dra. Keila (19/10/2026).
export const STATUS_PROCESSO = [
  "A protocolar (pendente)",
  "Em confecção inicial",
  "Protocolado petição inicial",
  "Aguardando citação",
  "Aguardando audiência inicial",
  "Prazo recursal",
  "Aguardando movimentação",
  "Aguardando audiência instrução",
  "Preparar audiência",
  "Aguardando sentença",
  "Impulsionar",
  "Acordo em andamento",
  "Aguardando alvará",
  "Aguardando audiência",
  "Arquivado",
] as const;

export type StatusProcesso = (typeof STATUS_PROCESSO)[number];

export const STATUS_INICIAL: StatusProcesso = "A protocolar (pendente)";

// Grupos usados nos números do topo e nos painéis
export const STATUS_PRE_PROTOCOLO: StatusProcesso[] = ["A protocolar (pendente)", "Em confecção inicial"];
export const STATUS_ACAO_INTERNA: StatusProcesso[] = ["A protocolar (pendente)", "Em confecção inicial", "Prazo recursal", "Preparar audiência", "Impulsionar"];
export const STATUS_ENCERRADO: StatusProcesso[] = ["Arquivado"];

export const processoAtivo = (status?: string | null) => !STATUS_ENCERRADO.includes(status as StatusProcesso);

// Cor do selo de status
export function corStatusProcesso(status?: string | null): string {
  if (status === "Arquivado") return "bg-gray-500/10 text-gray-500 border border-gray-500/20";
  if (STATUS_PRE_PROTOCOLO.includes(status as StatusProcesso)) return "bg-red-500/10 text-red-500 border border-red-500/20";
  if (status === "Prazo recursal" || status === "Impulsionar" || status === "Preparar audiência") return "bg-orange-500/10 text-orange-500 border border-orange-500/20";
  if (status === "Acordo em andamento" || status === "Aguardando alvará") return "bg-green-500/10 text-green-500 border border-green-500/20";
  return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
}
