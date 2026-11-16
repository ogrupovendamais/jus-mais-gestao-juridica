/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatarNumeroCnj } from "./oabSync";

export type TipoComunicacao = "publicacao" | "intimacao";
export type StatusTratamento = "nao_tratada" | "tratada" | "descartada";

export interface SugestaoIaTratamento {
  tipo: "prazo" | "audiencia" | "tarefa";
  label: string;
  dataSugerida: string;
  horaSugerida?: string;
  diasUteis?: number;
  descricao?: string;
}

export interface PublicacaoItem {
  id: string;
  tipo: TipoComunicacao; // "publicacao" (Diário Oficial 📄) ou "intimacao" (Intimação Eletrônica 🔔)
  dataDivulgacao: string; // YYYY-MM-DD
  dataPublicacao?: string; // YYYY-MM-DD
  numeroProcesso: string;
  partesProcesso?: string; // Ex: "G. O. S. x V. S. F."
  responsavel?: string; // Ex: "ALEX F"
  processoId?: string;
  diario: string; // Ex: "TRSPDJN | SOROCABA", "TJSPDJN | 1A VARA JUDICIAL ITAPEVA"
  tribunal?: string; // Ex: "TRT15", "TJSP"
  orgao?: string; // Ex: "CON1 - Sorocaba"
  nomePesquisado: string; // Ex: "JOSIEL FERNANDES LICO"
  status: StatusTratamento;
  conteudoCompleto: string;
  resumoIa?: string;
  sugestoesIa?: SugestaoIaTratamento[];
  dataTratamento?: string;
  tratamentoAcao?: string;
}

export interface ConfigNomesPublicacoes {
  plano: "UP" | "Smart" | "Company" | "VIP";
  limiteNomes: number;
  nomes: {
    id: string;
    nome: string;
    tipoPessoa: "PF" | "PJ";
    oab?: string;
    uf?: string;
    diarios: string[];
    ativo: boolean;
  }[];
  diariosAbrangencia: string[];
}

export interface CredenciamentoTribunal {
  id: string;
  tribunal: string; // Ex: "TRT15", "TJSP", "TRF3"
  sistema: "PJe" | "Eproc" | "Projudi" | "Esaj";
  login: string;
  statusConexao: "Conectado" | "Pendente" | "Erro 2FA" | "Desconectado";
  codigoSeed2fa?: string;
  ultimaSincronizacao?: string;
  totalIntimacoes?: number;
}

const STORAGE_PUBLICACOES_KEY = "jusmais_publicacoes_cache_v1";
const STORAGE_CONFIG_NOMES_KEY = "jusmais_config_nomes_publicacoes_v1";
const STORAGE_CREDENCIAMENTO_KEY = "jusmais_credenciamento_tribunais_v1";

// 26 publicações realistas de inicialização imediata (0ms) baseadas no cadastro do advogado
export const PUBLICACOES_SEMENTE: PublicacaoItem[] = [
  {
    id: "pub-001",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-16",
    dataPublicacao: "2026-11-17",
    numeroProcesso: "0011057-21.2026.5.15.0047",
    partesProcesso: "G. O. S. x V. S. F.",
    responsavel: "ALEX F",
    diario: "TRSPDJN | SOROCABA",
    tribunal: "TRT15",
    orgao: "CON1 - Sorocaba",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 0011057-21.2026.5.15.0047 Órgão: CON1 - Sorocaba Data de disponibilização: 16-11-2026 Tipo de comunicação: Intimação Meio: Diário de Justiça Eletrônico Nacional. Fica o patrono intimado a manifestar-se sobre laudo pericial contábil apresentado no prazo preclusivo de 15 (quinze) dias úteis, bem como designada audiência de instrução para 10/05/2027 às 10:45.",
    resumoIa:
      "O juízo concedeu prazo de 15 dias para manifestação sobre o laudo pericial contábil e agendou audiência de instrução e julgamento para 10/05/2027 às 10:45.",
    sugestoesIa: [
      {
        tipo: "prazo",
        label: "ADICIONAR UM PRAZO PARA QUA, 25 DE NOV 2026",
        dataSugerida: "2026-11-25",
        diasUteis: 15,
        descricao: "Manifestação sobre laudo pericial contábil",
      },
      {
        tipo: "audiencia",
        label: "ADICIONAR UMA AUDIÊNCIA PARA TER, 10 DE MAI 2027 ÀS 10:45",
        dataSugerida: "2027-05-10",
        horaSugerida: "10:45",
        descricao: "Audiência de Instrução - CON1 Sorocaba",
      },
    ],
  },
  {
    id: "pub-002",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-13",
    dataPublicacao: "2026-11-16",
    numeroProcesso: "0001824-82.2008.8.26.0270",
    partesProcesso: "Adilson Miranda x Jose Airton Miranda",
    responsavel: "ALEX F",
    diario: "TJSPDJN | 1A VARA JUDICIAL ITAPEVA",
    tribunal: "TJSP",
    orgao: "Foro de Itapeva - 1ª Vara Judicial",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 0001824-82.2008.8.26.0270 Órgão: Foro de Itapeva - 1ª Vara Judicial Data de disponibilização: 13/11/2026 Tipo de comunicação: Intimação Meio: Diário de Justiça Eletrônico Nacional. Vistos. Ante o trânsito em julgado, manifeste-se a parte autora acerca do prosseguimento do feito no prazo legal de 5 dias.",
    resumoIa: "Intimação para requerer o cumprimento de sentença ou manifestar interesse no prosseguimento no prazo de 5 dias.",
    sugestoesIa: [
      {
        tipo: "prazo",
        label: "ADICIONAR UM PRAZO PARA TER, 24 DE NOV 2026",
        dataSugerida: "2026-11-24",
        diasUteis: 5,
        descricao: "Manifestação sobre prosseguimento do feito",
      },
    ],
  },
  {
    id: "pub-003",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-13",
    dataPublicacao: "2026-11-16",
    numeroProcesso: "0002141-50.2026.8.26.0270",
    partesProcesso: "M.H.A.A. x T.C.D.B.",
    responsavel: "ALEX F",
    diario: "TJSPDJN | 1A VARA JUDICIAL ITAPEVA",
    tribunal: "TJSP",
    orgao: "Foro de Itapeva - 1ª Vara Judicial",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 0002141-50.2026.8.26.0270 Órgão: Foro de Itapeva - 1ª Vara Judicial Data de disponibilização: 13/11/2026 Tipo de comunicação: Intimação. Vistos. Homologo o acordo de alimentos firmado entre as partes para que produza os regulares efeitos de direito.",
    resumoIa: "Homologação de acordo de alimentos com extinção da execução pelo pagamento.",
    sugestoesIa: [
      {
        tipo: "tarefa",
        label: "NOTIFICAR CLIENTE SOBRE HOMOLOGAÇÃO DO ACORDO",
        dataSugerida: "2026-11-17",
        descricao: "Informar ao cliente sobre a homologação judicial do acordo",
      },
    ],
  },
  {
    id: "pub-004",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-13",
    dataPublicacao: "2026-11-16",
    numeroProcesso: "1500742-43.2025.8.26.0270",
    partesProcesso: "C. D. M. x M. P. Do E. De S. P.",
    responsavel: "ALEX F",
    diario: "TJSPDJN | 2A VARA JUDICIAL ITAPEVA",
    tribunal: "TJSP",
    orgao: "Foro de Itapeva - 2ª Vara Judicial",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 1500742-43.2025.8.26.0270 Órgão: Foro de Itapeva - 2ª Vara Judicial Data de disponibilização: 13/11/2026. Intime-se a defesa para apresentar resposta à acusação no prazo de 10 dias.",
    resumoIa: "Abertura de prazo de 10 dias para apresentação de Resposta à Acusação (Art. 396 do CPP).",
    sugestoesIa: [
      {
        tipo: "prazo",
        label: "ADICIONAR PRAZO RESPOSTA À ACUSAÇÃO (10 DIAS)",
        dataSugerida: "2026-11-27",
        diasUteis: 10,
        descricao: "Apresentar resposta à acusação",
      },
    ],
  },
  {
    id: "pub-005",
    tipo: "intimacao",
    dataDivulgacao: "2026-11-12",
    dataPublicacao: "2026-11-13",
    numeroProcesso: "0010399-86.2024.5.15.0047",
    partesProcesso: "Josemir Fagner De Araujo Torres x Franciskeyla De Oliveira",
    responsavel: "ALEX F",
    diario: "PJe Eletrônico | TRT15",
    tribunal: "TRT15",
    orgao: "Exe2 - Sorocaba",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Intimação Eletrônica PJe. Expedido alvará judicial eletrônico em favor da parte exequente. Valores transferidos via SISCONDJ para a conta informada.",
    resumoIa: "Expedição de alvará eletrônico e depósito efetuado em conta judicial.",
    sugestoesIa: [
      {
        tipo: "tarefa",
        label: "CONFIRMAR CRÉDITO DE ALVARÁ E REPASSAR CLIENTE",
        dataSugerida: "2026-11-17",
        descricao: "Checar recebimento do valor do alvará e realizar prestação de contas",
      },
    ],
  },
  {
    id: "pub-006",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-11",
    dataPublicacao: "2026-11-12",
    numeroProcesso: "0000662-22.2026.8.26.0270",
    partesProcesso: "Kele Aparecida Carriel Leandro x Joelma Druski Santiago De Oliveira Almeida",
    responsavel: "ALEX F",
    diario: "TJSPDJN | 3A VARA JUDICIAL ITAPEVA",
    tribunal: "TJSP",
    orgao: "Foro de Itapeva - 3ª Vara Judicial",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 0000662-22.2026.8.26.0270. Intimação da executada para comprovar o pagamento do débito alimentar remanescente em 3 dias sob pena de prisão civil.",
    resumoIa: "Intimação sob rito de prisão civil (Art. 528 do CPC) com prazo improrrogável de 3 dias.",
    sugestoesIa: [
      {
        tipo: "prazo",
        label: "ADICIONAR PRAZO URGENTE PRISÃO CIVIL (3 DIAS)",
        dataSugerida: "2026-11-18",
        diasUteis: 3,
        descricao: "Comprovar pagamento da pensão alimentícia",
      },
    ],
  },
  {
    id: "pub-007",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-10",
    dataPublicacao: "2026-11-11",
    numeroProcesso: "1001199-09.2024.8.26.0270",
    partesProcesso: "Normi De Jesus Silva x Banco Santander S.A.",
    responsavel: "ALEX F",
    diario: "TJSPDJN | VARA DO JUIZADO ESPECIAL CÍVEL ITAPEVA",
    tribunal: "TJSP",
    orgao: "Vara do Juizado Especial Cível",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 1001199-09.2024.8.26.0270. Julgo procedente a presente ação para declarar a inexigibilidade dos descontos indevidos e condenar o réu em danos morais de R$ 8.000,00.",
    resumoIa: "Sentença de PROCEDÊNCIA com condenação do banco em R$ 8.000,00 por danos morais.",
    sugestoesIa: [
      {
        tipo: "tarefa",
        label: "NOTIFICAR VITÓRIA PARA NORMI DE JESUS SILVA",
        dataSugerida: "2026-11-17",
        descricao: "Enviar áudio / mensagem WhatsApp comunicando vitória de R$ 8.000,00",
      },
    ],
  },
  {
    id: "pub-008",
    tipo: "publicacao",
    dataDivulgacao: "2026-11-07",
    dataPublicacao: "2026-11-10",
    numeroProcesso: "0010509-93.2026.5.15.0047",
    partesProcesso: "Admilson De Almeida Carvalho x Souza Lima Seguranca Patrimonial Ltda.",
    responsavel: "ALEX F",
    diario: "TRSPDJN | 2A VARA DO TRABALHO SOROCABA",
    tribunal: "TRT15",
    orgao: "Con2 - Sorocaba Con2 - Sorocaba",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto:
      "Publicação Processo: 0010509-93.2026.5.15.0047 Órgão: Con2 - Sorocaba. Recebido o Recurso Ordinário de ADMILSON DE ALMEIDA CARVALHO sem efeito suspensivo. Intime-se a reclamada para apresentar contrarrazões.",
    resumoIa: "Admissibilidade do Recurso Ordinário com abertura de prazo para contrarrazões da parte contrária.",
    sugestoesIa: [
      {
        tipo: "tarefa",
        label: "MONITORAR CONTRARRAZÕES DA RECLAMADA",
        dataSugerida: "2026-11-20",
        descricao: "Verificar se a reclamada interpôs contrarrazões recursais",
      },
    ],
  },
];

// Gera 18 itens adicionais até totalizar 26 publicações realistas
for (let i = 9; i <= 26; i++) {
  const dia = 10 - Math.floor(i / 3);
  const diaFormatado = dia > 0 ? (dia < 10 ? `0${dia}` : `${dia}`) : "01";
  const numProcesso = `000${1000 + i * 47}-88.2026.8.26.0270`;
  PUBLICACOES_SEMENTE.push({
    id: `pub-${i < 10 ? "00" + i : "0" + i}`,
    tipo: i % 4 === 0 ? "intimacao" : "publicacao",
    dataDivulgacao: `2026-11-${diaFormatado}`,
    dataPublicacao: `2026-11-${diaFormatado}`,
    numeroProcesso: numProcesso,
    partesProcesso: `Cliente Processo #${i} x Requerido #${i}`,
    responsavel: "ALEX F",
    diario: i % 2 === 0 ? "TJSPDJN | FORO DE ITAPEVA" : "TRSPDJN | SOROCABA",
    tribunal: i % 2 === 0 ? "TJSP" : "TRT15",
    orgao: i % 2 === 0 ? "Vara Judicial de Itapeva" : "Vara do Trabalho de Sorocaba",
    nomePesquisado: "JOSIEL FERNANDES LICO",
    status: "nao_tratada",
    conteudoCompleto: `Publicação Processo: ${numProcesso}. Intimação dos patronos para ciência do despacho de fls. Autos aguardando decurso de prazo legal de 15 dias.`,
    resumoIa: "Ciência de despacho interlocutório sem alteração de prazo urgente.",
    sugestoesIa: [
      {
        tipo: "tarefa",
        label: "DAR CIÊNCIA AO PROCESSO",
        dataSugerida: "2026-11-20",
        descricao: "Verificar despacho judicial",
      },
    ],
  });
}

/**
 * Lê todas as publicações salvas no cache local
 */
export function lerPublicacoesCache(): PublicacaoItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_PUBLICACOES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return PUBLICACOES_SEMENTE;
}

/**
 * Salva a lista completa de publicações no cache local
 */
export function salvarPublicacoesCache(lista: PublicacaoItem[]): void {
  localStorage.setItem(STORAGE_PUBLICACOES_KEY, JSON.stringify(lista));
}

/**
 * Atualiza o status de uma publicação (tratada, descartada, etc.)
 */
export function atualizarStatusPublicacao(
  pubId: string,
  novoStatus: StatusTratamento,
  acaoTratamento?: string
): PublicacaoItem[] {
  const lista = lerPublicacoesCache();
  const index = lista.findIndex((p) => p.id === pubId);
  if (index !== -1) {
    lista[index] = {
      ...lista[index],
      status: novoStatus,
      dataTratamento: new Date().toISOString(),
      tratamentoAcao: acaoTratamento || lista[index].tratamentoAcao,
    };
    salvarPublicacoesCache(lista);
  }
  return lista;
}

/**
 * Configuração dos nomes pesquisados nos Diários Oficiais (Passo 3)
 */
export function lerConfigNomesPublicacoes(): ConfigNomesPublicacoes {
  const padrao: ConfigNomesPublicacoes = {
    plano: "VIP",
    limiteNomes: 10,
    diariosAbrangencia: [
      "DJEN - Diário de Justiça Eletrônico Nacional",
      "DJESP - Diário de Justiça do Estado de São Paulo",
      "TRT15 - Diário Eletrônico da Justiça do Trabalho (Campinas/Sorocaba)",
      "TRF3 - Diário da Justiça Federal da 3ª Região",
    ],
    nomes: [
      {
        id: "nome-1",
        nome: "JOSIEL FERNANDES LICO",
        tipoPessoa: "PF",
        oab: "432226",
        uf: "SP",
        diarios: ["DJEN Oficial Nacional", "TJSP - Diário da Justiça SP", "TRT15 - Campinas/Sorocaba"],
        ativo: true,
      },
      {
        id: "nome-2",
        nome: "ALEX F",
        tipoPessoa: "PF",
        oab: "432226",
        uf: "SP",
        diarios: ["DJEN Oficial Nacional", "TJSP - Diário da Justiça SP"],
        ativo: true,
      },
    ],
  };

  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_NOMES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...padrao,
        ...parsed,
        diariosAbrangencia: Array.isArray(parsed?.diariosAbrangencia) && parsed.diariosAbrangencia.length > 0
          ? parsed.diariosAbrangencia
          : padrao.diariosAbrangencia,
        nomes: Array.isArray(parsed?.nomes) ? parsed.nomes : padrao.nomes,
      };
    }
  } catch {
    // ignore
  }
  return padrao;
}

export function salvarConfigNomesPublicacoes(cfg: ConfigNomesPublicacoes): void {
  localStorage.setItem(STORAGE_CONFIG_NOMES_KEY, JSON.stringify(cfg));
}

/**
 * Credenciamento de Intimações Eletrônicas em Tribunais (PJe, Eproc, Projudi)
 */
export function lerCredenciamentoTribunais(): CredenciamentoTribunal[] {
  try {
    const raw = localStorage.getItem(STORAGE_CREDENCIAMENTO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [
    {
      id: "trib-1",
      tribunal: "TRT15 - Região Campinas / Sorocaba",
      sistema: "PJe",
      login: "432226/SP",
      statusConexao: "Conectado",
      ultimaSincronizacao: new Date().toISOString(),
      totalIntimacoes: 84,
    },
    {
      id: "trib-2",
      tribunal: "TJSP - Tribunal de Justiça de São Paulo",
      sistema: "Esaj",
      login: "432226/SP",
      statusConexao: "Conectado",
      ultimaSincronizacao: new Date().toISOString(),
      totalIntimacoes: 43,
    },
    {
      id: "trib-3",
      tribunal: "TRF3 - Tribunal Regional Federal 3ª Região",
      sistema: "Eproc",
      login: "432226/SP",
      statusConexao: "Pendente",
      codigoSeed2fa: "••••••••",
      ultimaSincronizacao: "2026-11-10T14:30:00Z",
      totalIntimacoes: 12,
    },
  ];
}

export function salvarCredenciamentoTribunais(lista: CredenciamentoTribunal[]): void {
  localStorage.setItem(STORAGE_CREDENCIAMENTO_KEY, JSON.stringify(lista));
}

/**
 * Consulta a API Oficial do CNJ e sincroniza novas publicações em tempo real
 */
export async function sincronizarPublicacoesComCnj(
  numeroOab: string,
  ufOab: string
): Promise<{ totalEncontrados: number; novas: number }> {
  const cleanOab = (numeroOab || "432226").replace(/\D/g, "");
  const cleanUf = (ufOab || "SP").toUpperCase().trim();

  const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${encodeURIComponent(
    cleanOab
  )}&ufOab=${encodeURIComponent(cleanUf)}&itensPorPagina=50&pagina=1`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API CNJ retornou status ${response.status}`);
  }

  const data = await response.json();
  const items: any[] = Array.isArray(data?.items) ? data.items : [];

  const listaAtual = lerPublicacoesCache();
  const mapExistentes = new Map<string, PublicacaoItem>();
  listaAtual.forEach((p) => mapExistentes.set(p.id, p));

  let novasCount = 0;

  for (const item of items) {
    const idItem = `cnj-${item.id || item.numeroprocessocommascara || Math.random()}`;
    if (mapExistentes.has(idItem)) continue;

    const numCnj = item.numeroprocessocommascara || formatarNumeroCnj(item.numero_processo || "");
    const partes = item.destinatarios?.[0]?.nome
      ? `${item.destinatarios[0].nome} x Requerido`
      : "Processo sem identificação de partes";

    const nova: PublicacaoItem = {
      id: idItem,
      tipo: item.tipoComunicacao?.toLowerCase().includes("intima") ? "intimacao" : "publicacao",
      dataDivulgacao: item.data_disponibilizacao || new Date().toISOString().slice(0, 10),
      dataPublicacao: item.data_disponibilizacao || new Date().toISOString().slice(0, 10),
      numeroProcesso: numCnj,
      partesProcesso: partes,
      responsavel: "ALEX F",
      diario: `${item.siglaTribunal || "DJEN"} | ${item.nomeOrgao || "Vara Única"}`,
      tribunal: item.siglaTribunal || "CNJ",
      orgao: item.nomeOrgao || "Juízo Titular",
      nomePesquisado: "JOSIEL FERNANDES LICO",
      status: "nao_tratada",
      conteudoCompleto: item.texto || "Texto indisponível no repositório do tribunal.",
      resumoIa: "Publicação capturada automaticamente da base nacional do CNJ / DJEN.",
      sugestoesIa: [
        {
          tipo: "prazo",
          label: "ADICIONAR PRAZO LEGAL (15 DIAS)",
          dataSugerida: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          diasUteis: 15,
          descricao: "Prazo para manifestação sobre publicação",
        },
      ],
    };

    listaAtual.unshift(nova);
    novasCount++;
  }

  salvarPublicacoesCache(listaAtual);
  return { totalEncontrados: items.length, novas: novasCount };
}
