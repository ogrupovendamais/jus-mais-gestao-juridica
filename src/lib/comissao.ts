// Parte do usuário num lançamento com divisão entre até 3 parceiros
export const FILTRO_MEUS_LANCAMENTOS = (uid: string) =>
  `parceiro_beneficiario_id.eq.${uid},parceiro_id_1.eq.${uid},parceiro_id_2.eq.${uid},parceiro_id_3.eq.${uid}`;

export const COLUNAS_COMISSAO = "valor_parceiro, valor_parceiro2, valor_parceiro3, parceiro_id_1, parceiro_id_2, parceiro_id_3, parceiro_beneficiario_id";

export function minhaParte(l: any, uid: string): number {
  if (l.parceiro_id_2 === uid) return Number(l.valor_parceiro2 || 0);
  if (l.parceiro_id_3 === uid) return Number(l.valor_parceiro3 || 0);
  return Number(l.valor_parceiro || 0);
}
