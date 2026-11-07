// Interpreta o texto copiado de um evento do Google Agenda, por exemplo:
// "INICIAL - DIEGO BARBOSA x GENESIS GROUP TICRM SERVICOS LTDA Segunda-feira, 5 de outubro⋅1:00 – 2:00pm - Entrar com o Google Meet meet.google.com/aic-ktgm-nxd"

export type TipoAudiencia = "Instrução" | "Conciliação" | "Julgamento" | "Una";

export type AgendaParse = {
  titulo: string;
  processoNumero: string | null;
  partes: string[]; // nomes das partes (ex.: ["DIEGO BARBOSA", "GENESIS GROUP TICRM SERVICOS LTDA"])
  data: Date | null;
  hora: string | null; // HH:MM (24h)
  horaFim: string | null;
  link: string | null;
  tipo: TipoAudiencia | null;
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export const CNJ_REGEX = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/;

const pad = (n: number) => String(n).padStart(2, "0");

function para24h(h: number, m: number, meridiano: string | null) {
  if (meridiano === "pm" && h < 12) h += 12;
  if (meridiano === "am" && h === 12) h = 0;
  return `${pad(h)}:${pad(m)}`;
}

function extrairHorario(texto: string): { inicio: string | null; fim: string | null } {
  // "1:00 – 2:00pm", "11:05am – 12:05pm", "8:15 – 9:15am", "14:00 – 15:00", "10am – 11am"
  const r = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[–—-]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(texto);
  if (r) {
    const [, h1, m1, a1, h2, m2, a2] = r;
    const ap2 = a2?.toLowerCase() || null;
    let ap1 = a1?.toLowerCase() || null;
    if (!ap1 && ap2) {
      // início herda am/pm do fim; se ficar depois do fim (ex.: 11:00 – 12:00pm), é am
      ap1 = ap2;
      const ini = para24h(+h1, +(m1 || 0), ap1);
      const fim = para24h(+h2, +(m2 || 0), ap2);
      if (ini > fim) ap1 = ap2 === "pm" ? "am" : "pm";
    }
    return { inicio: para24h(+h1, +(m1 || 0), ap1), fim: para24h(+h2, +(m2 || 0), ap2) };
  }
  const s = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(texto);
  if (s) return { inicio: para24h(+s[1], +s[2], s[3]?.toLowerCase() || null), fim: null };
  return { inicio: null, fim: null };
}

function extrairData(texto: string): { data: Date | null; indice: number } {
  const r = new RegExp(`(\\d{1,2})\\s+de\\s+(${MESES.join("|")})(?:\\s+de\\s+(\\d{4}))?`, "i").exec(texto);
  if (r) {
    const dia = +r[1];
    const mes = MESES.indexOf(r[2].toLowerCase());
    const hoje = new Date();
    let ano = r[3] ? +r[3] : hoje.getFullYear();
    // sem ano explícito: se a data já passou há mais de 6 meses, é do ano seguinte
    if (!r[3] && new Date(ano, mes, dia).getTime() < hoje.getTime() - 180 * 864e5) ano += 1;
    return { data: new Date(ano, mes, dia, 12), indice: r.index };
  }
  const d = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(texto);
  if (d) return { data: new Date(+d[3], +d[2] - 1, +d[1], 12), indice: d.index };
  return { data: null, indice: -1 };
}

function extrairTipo(titulo: string): TipoAudiencia | null {
  const t = titulo.toUpperCase();
  if (/\bUNA\b/.test(t)) return "Una";
  if (t.includes("CONCILIA")) return "Conciliação";
  if (t.includes("INSTRU")) return "Instrução";
  if (t.includes("JULGAMENTO")) return "Julgamento";
  return null;
}

function extrairPartes(titulo: string): string[] {
  const idx = titulo.search(/\s+x\s+/i);
  if (idx < 0) return [];
  let autor = titulo.slice(0, idx);
  let reu = titulo.slice(idx).replace(/^\s+x\s+/i, "");
  // autor: o que vem depois do último separador ("INICIAL - ", "Audiência: ", nº do processo)
  autor = autor.split(/\s[-–]\s|:\s/).pop() || autor;
  autor = autor.replace(CNJ_REGEX, "").replace(/\([^)]*\)/g, "").trim();
  reu = reu.split(/\s[-–]\s/)[0].replace(/\([^)]*\)/g, "").trim();
  return [autor, reu].filter((p) => p.length > 2);
}

export function interpretarTextoAgenda(textoOriginal: string): AgendaParse {
  const texto = textoOriginal.replace(/\s+/g, " ").replace(/⋅/g, " ").trim();
  const link = (/(https?:\/\/)?(meet\.google\.com\/[a-z0-9-]+|[a-z0-9.-]*zoom\.us\/j\/[^\s]+|teams\.microsoft\.com\/[^\s]+)/i.exec(texto)?.[0]) || null;
  const processoNumero = CNJ_REGEX.exec(texto)?.[0] || null;
  const { data, indice } = extrairData(texto);

  // título: tudo antes do dia da semana / data
  const fimTitulo = (() => {
    const dia = /\s(Segunda|Terça|Quarta|Quinta|Sexta)-feira|\s(Sábado|Domingo)\b/i.exec(texto);
    if (dia) return dia.index;
    return indice >= 0 ? indice : texto.length;
  })();
  const titulo = texto.slice(0, fimTitulo).replace(/^Processo:\s*/i, "").replace(/[\s\-–,]+$/, "").trim();
  const resto = indice >= 0 ? texto.slice(indice) : texto.slice(fimTitulo);
  const { inicio, fim } = extrairHorario(resto);

  return {
    titulo,
    processoNumero,
    partes: extrairPartes(titulo),
    data,
    hora: inicio,
    horaFim: fim,
    link: link ? (link.startsWith("http") ? link : `https://${link}`) : null,
    tipo: extrairTipo(titulo),
  };
}

// ---------- busca de cliente pelo nome das partes ----------
export const normalizarNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !["da", "de", "do", "das", "dos", "e", "ltda", "me", "sa", "eireli"].includes(t));

// Considera compatível quando todas as palavras do nome mais curto (mín. 2) aparecem no outro
export function nomesCompativeis(a: string, b: string) {
  const ta = normalizarNome(a);
  const tb = normalizarNome(b);
  if (ta.length < 2 || tb.length < 2) return false;
  const [menor, maior] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return menor.every((t) => maior.includes(t));
}
