// Vencimentos em dia útil bancário: boleto não é pago em fim de semana nem feriado.
// Feriados nacionais fixos + móveis (Carnaval, Sexta-feira Santa, Corpus Christi), que fecham os bancos.

const pad = (n: number) => String(n).padStart(2, "0");
export const isoData = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher)
function pascoa(ano: number): Date {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia, 12);
}

const cache = new Map<number, Map<string, string>>();
export function feriadosBancarios(ano: number): Map<string, string> {
  if (cache.has(ano)) return cache.get(ano)!;
  const f = new Map<string, string>();
  const fixo = (m: number, d: number, nome: string) => f.set(`${ano}-${pad(m)}-${pad(d)}`, nome);
  fixo(1, 1, "Confraternização Universal");
  fixo(4, 21, "Tiradentes");
  fixo(5, 1, "Dia do Trabalho");
  fixo(9, 7, "Independência");
  fixo(10, 12, "Nossa Senhora Aparecida");
  fixo(11, 2, "Finados");
  fixo(11, 15, "Proclamação da República");
  fixo(11, 20, "Consciência Negra");
  fixo(12, 25, "Natal");
  const p = pascoa(ano);
  const rel = (dias: number, nome: string) => {
    const d = new Date(p);
    d.setDate(d.getDate() + dias);
    f.set(isoData(d), nome);
  };
  rel(-48, "Carnaval");
  rel(-47, "Carnaval");
  rel(-2, "Sexta-feira Santa");
  rel(60, "Corpus Christi");
  cache.set(ano, f);
  return f;
}

export function motivoNaoUtil(d: Date): string | null {
  const dia = d.getDay();
  if (dia === 0) return "domingo";
  if (dia === 6) return "sábado";
  return feriadosBancarios(d.getFullYear()).get(isoData(d)) || null;
}

// Próximo dia útil (a própria data, se já for útil)
export function proximoDiaUtil(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  while (motivoNaoUtil(r)) r.setDate(r.getDate() + 1);
  return r;
}

// Vencimento mensal "dia X": mantém o dia escolhido (ou o último dia do mês, se não existir) e
// empurra para o próximo dia útil. Ex.: dia 31 em fevereiro -> 28/29; sábado -> segunda.
export function vencimentoMensal(primeiro: Date, indice: number): { data: Date; ajustadoDe: string | null } {
  const alvoMes = new Date(primeiro.getFullYear(), primeiro.getMonth() + indice, 1, 12);
  const ultimoDia = new Date(alvoMes.getFullYear(), alvoMes.getMonth() + 1, 0).getDate();
  const original = new Date(alvoMes.getFullYear(), alvoMes.getMonth(), Math.min(primeiro.getDate(), ultimoDia), 12);
  const motivo = motivoNaoUtil(original);
  return { data: proximoDiaUtil(original), ajustadoDe: motivo ? `${pad(original.getDate())}/${pad(original.getMonth() + 1)} era ${motivo}` : null };
}

// "2026-10-10" -> Date ao meio-dia (evita erro de fuso)
export const dataDeIso = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
