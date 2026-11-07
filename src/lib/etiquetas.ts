import { useEffect, useState, useCallback } from "react";

export type EtiquetaKanban = {
  id: string;
  nome: string;
  cor: string;
  textoEscuro?: boolean;
};

const OLD_STORAGE_KEY = "jusmais_kanban_etiquetas_v1";
const STORAGE_KEY = "jusmais_kanban_etiquetas_v2";
const EVENT_NAME = "jusmais_etiquetas_updated";

export const ETIQUETAS_PADRAO: EtiquetaKanban[] = [];

export const CORES_ETIQUETAS: string[] = [
  "#010E38", // Azul Marinho (Paleta)
  "#EBB52C", // Amarelo Sinal (Paleta)
  "#00A859", // Verde
  "#E53935", // Vermelho
  "#7B1FA2", // Roxo
  "#1E88E5", // Azul
  "#F4511E", // Laranja
  "#546E7A", // Cinza Azulado
];

export function listarEtiquetas(): EtiquetaKanban[] {
  try {
    localStorage.removeItem(OLD_STORAGE_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ETIQUETAS_PADRAO;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return ETIQUETAS_PADRAO;
  } catch {
    return ETIQUETAS_PADRAO;
  }
}

export function salvarEtiquetas(lista: EtiquetaKanban[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

export function useEtiquetasKanban() {
  const [etiquetas, setEtiquetas] = useState<EtiquetaKanban[]>(() => listarEtiquetas());

  useEffect(() => {
    const atualizar = () => setEtiquetas(listarEtiquetas());
    window.addEventListener(EVENT_NAME, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENT_NAME, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  const adicionarEtiqueta = useCallback((nome: string, cor: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    const atual = listarEtiquetas();
    const nova: EtiquetaKanban = {
      id: String(Date.now()),
      nome: limpo,
      cor,
      textoEscuro: isCorClara(cor),
    };
    salvarEtiquetas([...atual, nova]);
  }, []);

  const removerEtiqueta = useCallback((id: string) => {
    const atual = listarEtiquetas().filter((e) => e.id !== id);
    salvarEtiquetas(atual);
  }, []);

  const obterCorEtiqueta = useCallback(
    (nome: string): string => {
      const encontrada = etiquetas.find(
        (e) => e.nome.toLowerCase() === nome.trim().toLowerCase()
      );
      return encontrada?.cor || "#010E38";
    },
    [etiquetas]
  );

  return { etiquetas, adicionarEtiqueta, removerEtiqueta, obterCorEtiqueta };
}

export function montarDescricaoComEtiquetas(
  descricao: string,
  etiquetas: string[]
): string {
  const limpo = (descricao || "").trim();
  if (!etiquetas || etiquetas.length === 0) return limpo;
  const prefixos = etiquetas.map((et) => `[${et}]`).join(" ");
  return `${prefixos} ${limpo}`.trim();
}

export function isCorClara(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.65;
}

export type TipoAtividadeKanban = "Tarefas" | "Eventos" | "Prazos" | "Audiências";

export function extrairMetadadosDescricao(descricao: string): {
  etiquetas: string[];
  tipoAtividade: TipoAtividadeKanban;
  processoCaso: string | null;
  cancelada: boolean;
  textoLimpo: string;
} {
  const etiquetas: string[] = [];
  let tipoAtividade: TipoAtividadeKanban = "Tarefas";
  let processoCaso: string | null = null;
  let cancelada = false;
  let textoLimpo = descricao || "";

  const regex = /^\s*\[([^\]]+)\]\s*/;
  let match = textoLimpo.match(regex);
  while (match) {
    const valor = match[1].trim();
    const upper = valor.toUpperCase();
    if (upper === "TIPO:EVENTO" || upper === "EVENTO") {
      tipoAtividade = "Eventos";
    } else if (upper === "TIPO:PRAZO" || upper === "PRAZO") {
      tipoAtividade = "Prazos";
    } else if (upper === "TIPO:AUDIÊNCIA" || upper === "TIPO:AUDIENCIA") {
      tipoAtividade = "Audiências";
    } else if (upper === "TIPO:TAREFA") {
      tipoAtividade = "Tarefas";
    } else if (upper.startsWith("PROC:")) {
      processoCaso = valor.slice(5).trim();
    } else if (upper === "STATUS:CANCELADA" || upper === "CANCELADA") {
      cancelada = true;
    } else {
      etiquetas.push(valor);
    }
    textoLimpo = textoLimpo.slice(match[0].length);
    match = textoLimpo.match(regex);
  }

  return {
    etiquetas,
    tipoAtividade,
    processoCaso,
    cancelada,
    textoLimpo: textoLimpo || descricao,
  };
}

// Aliases para compatibilidade retroativa
export type EtiquetaItem = EtiquetaKanban;
export const lerEtiquetas = listarEtiquetas;
export function criarEtiqueta(nome: string, cor: string) {
  const limpo = nome.trim();
  if (!limpo) return;
  const atual = listarEtiquetas();
  const nova: EtiquetaKanban = { id: String(Date.now()), nome: limpo, cor, textoEscuro: isCorClara(cor) };
  salvarEtiquetas([...atual, nova]);
}
export function excluirEtiqueta(id: string) {
  const atual = listarEtiquetas().filter((e) => e.id !== id);
  salvarEtiquetas(atual);
}
