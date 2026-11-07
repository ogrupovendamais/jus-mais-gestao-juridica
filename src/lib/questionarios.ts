// Questionários de entrevista inicial (levantamento de dados), por nicho.
// O texto pode ser copiado para o WhatsApp e as respostas do cliente coladas de volta.

export type Pergunta = { chave: string; pergunta: string; ajuda?: string };

const TRABALHISTA: Pergunta[] = [
  { chave: "nome", pergunta: "Nome completo" },
  { chave: "empresa", pergunta: "Empresa" },
  { chave: "admissao", pergunta: "Data de admissão" },
  { chave: "demissao", pergunta: "Data de demissão" },
  { chave: "salario", pergunta: "Salário" },
  { chave: "funcao", pergunta: "Qual sua função/cargo" },
  { chave: "cargo_superior", pergunta: "Qual cargo era o cargo superior ao seu?" },
  { chave: "subordinados", pergunta: "Seu cargo possuía funcionários subordinados? Quais?" },
  {
    chave: "acumulo",
    pergunta: "Fazia outra função além da sua? Cite o período em que ocorreu o acúmulo de função",
    ajuda: 'Exemplo: "até mês tal eu só fazia essa função, depois no mês tal comecei a fazer outras coisas…" — descrever o que fazia',
  },
  {
    chave: "mudanca_horario",
    pergunta: "Se mudou de função, mudou os horários de trabalho, descrever os novos horários nesse tempo que fez outras coisas e quais meses",
  },
  { chave: "outros_estados", pergunta: "Trabalhou em outros Estados? Quais?" },
  {
    chave: "cidades",
    pergunta: "Quais cidades trabalhou pela empresa? Cite todas as cidades que se lembrar",
    ajuda: "Só as cidades e estado, não precisa ser fazendas ou armazéns",
  },
  { chave: "entrada", pergunta: "Horário de entrada" },
  {
    chave: "saida",
    pergunta: "Horário de saída",
    ajuda: "Escrever horário que fazia em média nas horas que ficava a mais; detalhe o máximo possível",
  },
  { chave: "almoco", pergunta: "Quantas horas/ minutos de almoço fazia normalmente" },
  { chave: "modalidade", pergunta: "Modalidade de demissão", ajuda: "Sem/com justa causa? Pedido de demissão?" },
  { chave: "rescisao", pergunta: "Recebeu algum valor de rescisão? Qual?" },
  { chave: "fgts", pergunta: "Recebeu o FGTS + multa de 40%?" },
  { chave: "seguro", pergunta: "Recebeu o seguro-desemprego?" },
  { chave: "nao_pago", pergunta: "O que você acha que não foi pago e que deveriam te pagar?" },
];

const GERAL: Pergunta[] = [
  { chave: "nome", pergunta: "Nome completo" },
  { chave: "relato", pergunta: "Conte o que aconteceu", ajuda: "Datas, valores e pessoas envolvidas" },
  { chave: "parte_contraria", pergunta: "Contra quem é a questão? (pessoa ou empresa)" },
  { chave: "documentos", pergunta: "Quais documentos você possui sobre o caso?" },
  { chave: "tentativas", pergunta: "Já tentou resolver de outra forma? Como?" },
  { chave: "objetivo", pergunta: "O que você espera conseguir?" },
];

export function perguntasDoNicho(nicho?: string | null): { titulo: string; perguntas: Pergunta[] } {
  if ((nicho || "").toUpperCase().includes("TRABALHISTA")) return { titulo: "Questionário inicial — Trabalhista", perguntas: TRABALHISTA };
  return { titulo: "Questionário inicial", perguntas: GERAL };
}

// Texto para enviar ao cliente pelo WhatsApp
export function textoParaWhatsApp(perguntas: Pergunta[], nomeCliente?: string) {
  const intro = `Olá${nomeCliente ? " " + nomeCliente.split(" ")[0] : ""}! Para darmos andamento ao seu atendimento, responda as perguntas abaixo logo após cada ":" e nos devolva esta mensagem.\n`;
  return (
    intro +
    perguntas.map((p) => `\n▪️ ${p.pergunta}:${p.ajuda ? `\n(${p.ajuda})` : ""}\n`).join("")
  );
}

// Normalização 1:1 (mesmo comprimento) para localizar as perguntas no texto colado
const norm = (s: string) =>
  Array.from(s)
    .map((c) => (c.normalize("NFD")[0] || c).toLowerCase())
    .join("");

// Lê as respostas de um texto devolvido pelo cliente (mesma ordem/rótulos das perguntas)
export function lerRespostas(texto: string, perguntas: Pergunta[]): Record<string, string> {
  const t = norm(texto);
  const achados: { p: Pergunta; ini: number; fim: number }[] = [];
  let cursor = 0;
  for (const p of perguntas) {
    const alvo = norm(p.pergunta).replace(/[?:]+$/, "").trim();
    let idx = t.indexOf(alvo, cursor);
    if (idx < 0) idx = t.indexOf(alvo);
    if (idx < 0) continue;
    achados.push({ p, ini: idx, fim: idx + alvo.length });
    cursor = idx + alvo.length;
  }
  achados.sort((a, b) => a.ini - b.ini);
  const respostas: Record<string, string> = {};
  achados.forEach((a, i) => {
    const prox = achados[i + 1]?.ini ?? texto.length;
    let r = texto.slice(a.fim, prox);
    r = r.replace(/^[\s?:)\-–]+/, ""); // tira ":" logo após a pergunta
    if (a.p.ajuda) r = r.replace(/^\([^)]*\)\s*/, ""); // tira a orientação entre parênteses
    r = r.replace(/(?:\s|▪️|▪|•|\*)+$/u, "").trim();
    if (r) respostas[a.p.chave] = r;
  });
  return respostas;
}
