import { supabase } from "@/integrations/supabase/client";

export const UFS_BRASIL = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
  "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
  "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;

export type UfBrasil = (typeof UFS_BRASIL)[number];

export interface ConfigOabAdvogado {
  numeroOab: string;
  ufOab: UfBrasil | string;
  nomeAdvogado?: string;
  autoSync: boolean;
  escavadorApiKey?: string;
  ultimaSincronizacao?: string;
  totalProcessosSincronizados?: number;
}

export interface ProcessoExtraAstrea {
  processoId?: string;
  numeroCnj: string;
  tituloPartes: string; // Ex: "Admilson De Almeida Carvalho x Souza Lima Seguranca Patrimonial Ltda."
  poloAtivo?: string;
  poloPassivo?: string;
  acaoClasse: string; // Ex: "Acao Trabalhista - Rito Ordinario"
  foroVara: string; // Ex: "Con2 - Sorocaba"
  siglaTribunal?: string; // Ex: "TRT15", "TJSP"
  ultimaMovData: string; // ISO YYYY-MM-DD
  ultimaMovTexto?: string;
  pasta?: string;
  etiquetas: string[];
  favorito: boolean;
  monitoradoRss: boolean;
   encerrado?: boolean;
  origemSincronizacao?: "CNJ_COMUNICA_PJE" | "ESCAVADOR" | "MANUAL";
}

const OAB_CONFIG_STORAGE_KEY = "jusmais_oab_config_v1";
const PROCESSOS_ASTREA_META_KEY = "jusmais_processos_astrea_meta_v1";

/**
 * Formata 20 dígitos para a máscara CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function formatarNumeroCnj(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 20) {
    return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
  }
  return raw.trim();
}

/**
 * Detecta o Nicho Jurídico pelo dígito do ramo da Justiça no número CNJ ou classe processual
 */
export function detectarNichoPorCnjOuClasse(numeroCnj: string, nomeClasse: string): string {
  const digits = (numeroCnj || "").replace(/\D/g, "");
  const classeUpper = (nomeClasse || "").toUpperCase();
  if (classeUpper.includes("TRABALH") || classeUpper.includes("ATSUM") || classeUpper.includes("ATORD") || digits[13] === "5") {
    return "DIREITO TRABALHISTA";
  }
  if (classeUpper.includes("PREVIDENC") || classeUpper.includes("INSS") || digits[13] === "4") {
    return "DIREITO PREVIDENCIÁRIO";
  }
  if (classeUpper.includes("EXECU") || classeUpper.includes(" BANC") || classeUpper.includes("BUSCA E APREENS")) {
    return "DIREITO BANCÁRIO";
  }
  return "DIREITO CÍVEL";
}

/**
 * Lê os metadados estendidos estilo Astrea (Título Autor x Réu, Ação/Foro, Favorito, RSS, Etiquetas, Últ. Mov)
 */
export function lerMetadadosAstreaProcessos(): Record<string, ProcessoExtraAstrea> {
  try {
    const raw = localStorage.getItem(PROCESSOS_ASTREA_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function salvarMetadadoAstreaProcesso(key: string, meta: Partial<ProcessoExtraAstrea>) {
  const atual = lerMetadadosAstreaProcessos();
  const base: ProcessoExtraAstrea = atual[key] || {
    numeroCnj: key,
    tituloPartes: "",
    acaoClasse: "",
    foroVara: "",
    ultimaMovData: new Date().toISOString().slice(0, 10),
    etiquetas: [],
    favorito: false,
    monitoradoRss: true,
  };
  atual[key] = { ...base, ...meta };
  localStorage.setItem(PROCESSOS_ASTREA_META_KEY, JSON.stringify(atual));
  return atual[key];
}

export function salvarMultiplosMetadadosAstrea(map: Record<string, ProcessoExtraAstrea>) {
  const atual = lerMetadadosAstreaProcessos();
  const merged = { ...atual, ...map };
  localStorage.setItem(PROCESSOS_ASTREA_META_KEY, JSON.stringify(merged));
}

/**
 * Carrega a configuração de OAB + UF do advogado (do Supabase profiles + localStorage)
 */
export async function carregarConfigOabAdvogado(userId?: string): Promise<ConfigOabAdvogado> {
  let local: ConfigOabAdvogado = {
    numeroOab: "",
    ufOab: "SP",
    autoSync: true,
  };
  try {
    const raw = localStorage.getItem(OAB_CONFIG_STORAGE_KEY);
    if (raw) {
      local = { ...local, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }

  if (userId) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, possui_oab, numero_oab")
        .eq("id", userId)
        .maybeSingle();

      if (profile && (profile as any).numero_oab) {
        const rawOab = String((profile as any).numero_oab).trim();
        // Aceita formato "123456/SP" ou "SP 123456" ou "123456-SP"
        const matchUf = rawOab.match(/([A-Z]{2})/i);
        const matchNum = rawOab.replace(/\D/g, "");
        if (matchNum) local.numeroOab = matchNum;
        if (matchUf && UFS_BRASIL.includes(matchUf[1].toUpperCase() as UfBrasil)) {
          local.ufOab = matchUf[1].toUpperCase();
        }
        if ((profile as any).full_name) {
          local.nomeAdvogado = (profile as any).full_name;
        }
      }
    } catch {
      // ignore
    }
  }

  return local;
}

/**
 * Salva a configuração de OAB + UF do advogado tanto no localStorage quanto na tabela `profiles` do Supabase
 */
export async function salvarConfigOabAdvogado(
  config: ConfigOabAdvogado,
  userId?: string
): Promise<ConfigOabAdvogado> {
  const cleanNum = (config.numeroOab || "").replace(/\D/g, "");
  const cleanUf = (config.ufOab || "SP").toUpperCase().trim();
  const normalized: ConfigOabAdvogado = {
    ...config,
    numeroOab: cleanNum,
    ufOab: cleanUf,
  };

  localStorage.setItem(OAB_CONFIG_STORAGE_KEY, JSON.stringify(normalized));

  if (userId && cleanNum) {
    const formattedOab = `${cleanNum}/${cleanUf}`;
    try {
      await supabase
        .from("profiles")
        .update({
          possui_oab: true,
          numero_oab: formattedOab,
        } as any)
        .eq("id", userId);
    } catch (e) {
      console.warn("Aviso ao salvar OAB no profile:", e);
    }
  }

  return normalized;
}

/**
 * Converte texto em Title Case elegante (como no Astrea: "Admilson De Almeida Carvalho x Souza Lima...")
 */
function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/(?:^|\s|[-/(.])\S/g, (char) => char.toUpperCase());
}

export interface ResultadoSincronizacaoOab {
  totalEncontradosNaApi: number;
  novosImportados: number;
  atualizados: number;
  processosSincronizados: ProcessoExtraAstrea[];
  fonteUtilizada: string;
}

/**
 * Consulta a API Oficial e Pública do CNJ (Comunica PJe / DJEN) por Número da OAB + UF
 * Endpoint oficial: https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=...&ufOab=...
 */
export async function buscarProcessosCnjPorOab(
  numeroOab: string,
  ufOab: string,
  maxPaginas = 3
): Promise<ProcessoExtraAstrea[]> {
  const cleanOab = numeroOab.replace(/\D/g, "");
  const cleanUf = ufOab.trim().toUpperCase();

  if (!cleanOab || cleanUf.length !== 2) {
    throw new Error("Informe o número da OAB (apenas dígitos) e a sigla do Estado (UF).");
  }

  const processosMap = new Map<string, ProcessoExtraAstrea>();

  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?numeroOab=${encodeURIComponent(
      cleanOab
    )}&ufOab=${encodeURIComponent(cleanUf)}&itensPorPagina=100&pagina=${pagina}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (pagina === 1) {
        throw new Error(`API CNJ Comunica PJe retornou status ${response.status}`);
      }
      break;
    }

    const data = await response.json();
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) break;

    for (const item of items) {
      const numeroMascara =
        item.numeroprocessocommascara ||
        formatarNumeroCnj(String(item.numero_processo || ""));
      if (!numeroMascara) continue;

      const destinatarios: any[] = Array.isArray(item.destinatarios)
        ? item.destinatarios
        : [];

      const polosAtivos = destinatarios
        .filter((d) => d.polo === "A" && d.nome)
        .map((d) => toTitleCase(String(d.nome).trim()));
      const polosPassivos = destinatarios
        .filter((d) => d.polo === "P" && d.nome)
        .map((d) => toTitleCase(String(d.nome).trim()));
      const outrosPolos = destinatarios
        .filter((d) => d.polo !== "A" && d.polo !== "P" && d.nome)
        .map((d) => toTitleCase(String(d.nome).trim()));

      const poloAtivo = polosAtivos[0] || outrosPolos[0] || "";
      const poloPassivo =
        polosPassivos[0] ||
        (polosAtivos.length > 1 ? polosAtivos[1] : outrosPolos[1] || "");

      let tituloPartes = "";
      if (poloAtivo && poloPassivo) {
        tituloPartes = `${poloAtivo} x ${poloPassivo}`;
      } else if (poloAtivo) {
        tituloPartes = poloAtivo;
      } else {
        tituloPartes = `Processo ${numeroMascara}`;
      }

      const acaoClasse = toTitleCase(
        String(item.nomeClasse || item.tipoDocumento || "Procedimento Judicial").trim()
      );
      const nomeOrgao = toTitleCase(String(item.nomeOrgao || "").trim());
      const siglaTribunal = String(item.siglaTribunal || "").trim().toUpperCase();
      const foroVara = nomeOrgao || siglaTribunal || "1ª Instância";

      const dataDisp = String(
        item.data_disponibilizacao ||
          (item.datadisponibilizacao
            ? item.datadisponibilizacao.split("/").reverse().join("-")
            : new Date().toISOString().slice(0, 10))
      ).slice(0, 10);

      const textoResumo = String(item.texto || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);

      const existente = processosMap.get(numeroMascara);
      if (!existente) {
        processosMap.set(numeroMascara, {
          numeroCnj: numeroMascara,
          tituloPartes,
          poloAtivo: poloAtivo || "Cliente (Sincronizado via OAB)",
          poloPassivo,
          acaoClasse,
          foroVara,
          siglaTribunal,
          ultimaMovData: dataDisp,
          ultimaMovTexto: textoResumo,
          etiquetas: siglaTribunal ? [siglaTribunal] : [],
          favorito: false,
          monitoradoRss: true,
          origemSincronizacao: "CNJ_COMUNICA_PJE",
        });
      } else {
        // Mantém a data de movimentação mais recente e preenche partes se antes estava vazio
        if (dataDisp > existente.ultimaMovData) {
          existente.ultimaMovData = dataDisp;
          if (textoResumo) existente.ultimaMovTexto = textoResumo;
        }
        if (
          existente.tituloPartes.startsWith("Processo ") &&
          !tituloPartes.startsWith("Processo ")
        ) {
          existente.tituloPartes = tituloPartes;
          existente.poloAtivo = poloAtivo;
          existente.poloPassivo = poloPassivo;
        }
      }
    }

    // Se vieram menos de 100 itens, já é a última página
    if (items.length < 100) break;
  }

  return Array.from(processosMap.values());
}

/**
 * Sincroniza os processos encontrados na OAB diretamente com o banco Supabase (`clientes` e `processos`)
 * e salva os metadados ricos para exibição idêntica ao Astrea.
 */
export async function sincronizarProcessosAdvogadoPorOab(params: {
  numeroOab: string;
  ufOab: string;
  userId: string;
}): Promise<ResultadoSincronizacaoOab> {
  const { numeroOab, ufOab, userId } = params;

  const encontrados = await buscarProcessosCnjPorOab(numeroOab, ufOab, 3);

  if (encontrados.length === 0) {
    await salvarConfigOabAdvogado(
      {
        numeroOab,
        ufOab,
        autoSync: true,
        ultimaSincronizacao: new Date().toISOString(),
        totalProcessosSincronizados: 0,
      },
      userId
    );
    return {
      totalEncontradosNaApi: 0,
      novosImportados: 0,
      atualizados: 0,
      processosSincronizados: [],
      fonteUtilizada: "CNJ Comunica PJe / DJEN Oficial",
    };
  }

  // Carrega processos e clientes existentes no Supabase
  const [procRes, cliRes] = await Promise.all([
    supabase.from("processos").select("id, numero, cliente_id, assunto, assunto_principal, instancia"),
    supabase.from("clientes").select("id, nome"),
  ]);

  const processosExistentes = (procRes.data || []) as any[];
  const clientesExistentes = (cliRes.data || []) as { id: string; nome: string }[];

  const mapPorNumero = new Map<string, any>();
  for (const p of processosExistentes) {
    if (p.numero) {
      mapPorNumero.set(formatarNumeroCnj(p.numero), p);
      mapPorNumero.set(String(p.numero).trim(), p);
    }
  }

  const mapClientesPorNome = new Map<string, string>();
  for (const c of clientesExistentes) {
    if (c.nome) {
      mapClientesPorNome.set(c.nome.trim().toLowerCase(), c.id);
    }
  }

  let novosImportados = 0;
  let atualizados = 0;
  const metaUpdates: Record<string, ProcessoExtraAstrea> = {};

  for (const item of encontrados) {
    metaUpdates[item.numeroCnj] = item;

    const procExistente = mapPorNumero.get(item.numeroCnj);
    if (procExistente) {
      atualizados++;
      metaUpdates[procExistente.id] = { ...item, processoId: procExistente.id };
      continue;
    }

    // Garante cliente na tabela `clientes` para o Polo Ativo / Cliente do processo
    const nomeCliente = (item.poloAtivo || item.tituloPartes.split(" x ")[0] || "Cliente OAB").trim();
    let clienteId = mapClientesPorNome.get(nomeCliente.toLowerCase()) || null;

    if (!clienteId && nomeCliente) {
      const slug = nomeCliente.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "cliente";
      const emailGerado = `contato.${slug}.${Math.random().toString(36).slice(2, 6)}@jusmais.app`;
      const { data: novoCli } = await supabase
        .from("clientes")
        .insert({
          nome: nomeCliente,
          email: emailGerado,
          status: "Ativo",
          user_id: userId,
        } as any)
        .select("id, nome")
        .maybeSingle();

      if (novoCli && (novoCli as any).id) {
        clienteId = (novoCli as any).id;
        mapClientesPorNome.set(nomeCliente.toLowerCase(), clienteId!);
      }
    }

    // Insere o processo na tabela `processos`
    const payloadProcesso = {
      numero: item.numeroCnj,
      cliente_id: clienteId,
      assunto_principal: item.tituloPartes,
      assunto: `${item.acaoClasse}${item.ultimaMovTexto ? ` — Últ. publicação: ${item.ultimaMovTexto}` : ""}`,
      status: "Aguardando movimentação",
      data_inicio: item.ultimaMovData || new Date().toISOString().slice(0, 10),
      prioridade: "Média",
      responsavel_a_id: userId,
      responsavel: `OAB ${numeroOab}/${ufOab}`,
      valor_causa: 0,
      instancia: `${item.foroVara}${item.siglaTribunal ? ` (${item.siglaTribunal})` : ""}`,
      user_id: userId,
    };

    const { data: inserido, error: errInsert } = await supabase
      .from("processos")
      .insert(payloadProcesso as any)
      .select("id")
      .maybeSingle();

    if (!errInsert && inserido && (inserido as any).id) {
      novosImportados++;
      metaUpdates[(inserido as any).id] = {
        ...item,
        processoId: (inserido as any).id,
      };
    }
  }

  salvarMultiplosMetadadosAstrea(metaUpdates);

  await salvarConfigOabAdvogado(
    {
      numeroOab,
      ufOab,
      autoSync: true,
      ultimaSincronizacao: new Date().toISOString(),
      totalProcessosSincronizados: encontrados.length,
    },
    userId
  );

  return {
    totalEncontradosNaApi: encontrados.length,
    novosImportados,
    atualizados,
    processosSincronizados: encontrados,
    fonteUtilizada: "CNJ Comunica PJe / DJEN Oficial",
  };
}
