// Fusos horários do Brasil (sem horário de verão desde 2019, deslocamentos fixos).
// O horário gravado em audiências/compromissos vale no fuso escolhido; a tela também mostra
// a conversão para o fuso do escritório (Mato Grosso).

export type Fuso = "America/Noronha" | "America/Sao_Paulo" | "America/Cuiaba" | "America/Rio_Branco";

export const FUSOS: { id: Fuso; nome: string; sigla: string; offset: number; estados: string }[] = [
  { id: "America/Noronha", nome: "Fernando de Noronha", sigla: "Noronha", offset: -2, estados: "Fernando de Noronha (PE)" },
  { id: "America/Sao_Paulo", nome: "Brasília", sigla: "Brasília", offset: -3, estados: "DF, GO, TO, SP, RJ, MG, ES, PR, SC, RS, BA, Nordeste, PA e AP" },
  { id: "America/Cuiaba", nome: "Mato Grosso", sigla: "MT", offset: -4, estados: "MT, MS, RO, RR e maior parte do AM" },
  { id: "America/Rio_Branco", nome: "Acre", sigla: "Acre", offset: -5, estados: "AC e oeste do AM" },
];

export const FUSO_ESCRITORIO: Fuso = "America/Cuiaba";

export const fusoInfo = (id?: string | null) => FUSOS.find((f) => f.id === id) || FUSOS.find((f) => f.id === FUSO_ESCRITORIO)!;

const pad = (n: number) => String(n).padStart(2, "0");

// Converte "HH:MM" de um fuso para outro (ex.: 14:00 Brasília -> 13:00 Mato Grosso)
export function converterHora(hora: string | null | undefined, de?: string | null, para: string = FUSO_ESCRITORIO): string | null {
  if (!hora) return null;
  const [h, m] = String(hora).slice(0, 5).split(":").map(Number);
  if (isNaN(h)) return null;
  const dif = fusoInfo(para).offset - fusoInfo(de).offset;
  const total = (((h + dif) * 60 + (m || 0)) % 1440 + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// Hora no fuso do escritório; se o evento for de outro fuso, mostra também o horário local dele.
// Ex.: "13:00 (14:00 Brasília)"
export function rotuloHora(hora: string | null | undefined, fuso?: string | null): string | null {
  if (!hora) return null;
  const original = String(hora).slice(0, 5);
  if (!fuso || fuso === FUSO_ESCRITORIO) return original;
  return `${converterHora(original, fuso)} (${original} ${fusoInfo(fuso).sigla})`;
}

// Sugere o fuso pelo texto do local (vara/comarca), quando o horário é o da intimação
export function sugerirFusoPorLocal(local?: string | null): Fuso | null {
  const t = (local || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!t) return null;
  if (/\b(MT|CUIABA|SORRISO|SINOP|RONDONOPOLIS|PRIMAVERA DO LESTE|LUCAS DO RIO VERDE|TRT ?23|MS|CAMPO GRANDE|TRT ?24|RO|PORTO VELHO|RR|BOA VISTA|MANAUS|AM)\b/.test(t)) return "America/Cuiaba";
  if (/\b(AC|RIO BRANCO|ACRE)\b/.test(t)) return "America/Rio_Branco";
  if (/\bNORONHA\b/.test(t)) return "America/Noronha";
  if (/\b(TRT ?[0-9]+|SP|SAO PAULO|RJ|PR|CURITIBA|CASCAVEL|SC|RS|MG|GO|GOIANIA|DF|BRASILIA|BA|ES|TO|PA|AP|PE|CE|RN|PB|AL|SE|PI|MA)\b/.test(t)) return "America/Sao_Paulo";
  return null;
}
