// Padrão de compliance da Cadore para nome de usuário: Nome + iniciais do meio + Sobrenome final
// (ex.: "Laura Beatriz Gomes Mota" -> "Laura B G Mota"). Mesma regra de public.nome_compliance no banco.
const PREPOSICOES = ["da", "de", "do", "das", "dos", "e"];

export const nomeCompliance = (nome: string | null | undefined): string => {
  const partes = (nome || "").trim().split(/\s+/).filter((p) => p && !PREPOSICOES.includes(p.toLowerCase()));
  if (partes.length <= 2) return partes.join(" ") || (nome || "").trim();
  const meio = partes.slice(1, -1).map((p) => p[0].toUpperCase());
  return [partes[0], ...meio, partes[partes.length - 1]].join(" ");
};
