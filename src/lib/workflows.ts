import { useState, useEffect, useCallback } from "react";
import { addDays, format, isWeekend } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type RegraDataWorkflow =
  | "data_atividade"
  | "dias_uteis_criacao"
  | "dias_uteis_atividade"
  | "dias_corridos_criacao";

export type ResponsavelWorkflowTipo =
  | "nao_selecionado"
  | "criador"
  | "usuario";

export type WorkflowAtividade = {
  id: string;
  titulo: string;
  regraData: RegraDataWorkflow;
  diasOffset: number;
  responsavelTipo: ResponsavelWorkflowTipo;
  responsavelId?: string | null;
  responsavelNome?: string;
  prioridade: "Baixa" | "Média" | "Alta";
  etiquetas: string[];
};

export type Workflow = {
  id: string;
  titulo: string;
  descricao?: string;
  atividades: WorkflowAtividade[];
  criadoEm: string;
};

const STORAGE_KEY = "jusmais_workflows_v1";
const EVENT_NAME = "jusmais_workflows_updated";

// Inicializa vazio conforme solicitado ("use a foto para criar mas crie sem nada")
export const WORKFLOWS_PADRAO: Workflow[] = [];

export function carregarWorkflows(): Workflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return WORKFLOWS_PADRAO;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : WORKFLOWS_PADRAO;
  } catch {
    return WORKFLOWS_PADRAO;
  }
}

export function salvarWorkflowsStorage(lista: Workflow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore storage errors
  }
}

export function formatarRegraDataWorkflow(ativ: WorkflowAtividade): string {
  const dias = Math.max(0, Number(ativ.diasOffset) || 0);
  if (ativ.regraData === "data_atividade" || dias === 0) {
    return "Data da atividade";
  }
  if (ativ.regraData === "dias_uteis_criacao") {
    return `+${dias} ${dias === 1 ? "dia útil" : "dias úteis"} da data de criação`;
  }
  if (ativ.regraData === "dias_uteis_atividade") {
    return `+${dias} ${dias === 1 ? "dia útil" : "dias úteis"} da data da atividade`;
  }
  return `+${dias} ${dias === 1 ? "dia corrido" : "dias corridos"} da data de criação`;
}

export function formatarResponsavelWorkflow(ativ: WorkflowAtividade): string {
  if (ativ.responsavelTipo === "criador") return "Criador da tarefa";
  if (ativ.responsavelTipo === "usuario" && ativ.responsavelNome) {
    return ativ.responsavelNome;
  }
  return "Não selecionado";
}

function adicionarDiasUteis(dataInicial: Date, dias: number): Date {
  let resultado = new Date(dataInicial);
  let adicionados = 0;
  while (adicionados < dias) {
    resultado = addDays(resultado, 1);
    if (!isWeekend(resultado)) {
      adicionados++;
    }
  }
  return resultado;
}

export function calcularDataAtividadeWorkflow(
  dataAtividadeBase: Date,
  ativ: WorkflowAtividade
): Date {
  const dias = Math.max(0, Number(ativ.diasOffset) || 0);
  const hoje = new Date();
  if (ativ.regraData === "data_atividade" || dias === 0) {
    return dataAtividadeBase;
  }
  if (ativ.regraData === "dias_uteis_criacao") {
    return adicionarDiasUteis(hoje, dias);
  }
  if (ativ.regraData === "dias_uteis_atividade") {
    return adicionarDiasUteis(dataAtividadeBase, dias);
  }
  return addDays(hoje, dias);
}

export async function aplicarWorkflowEmAtividade(
  workflow: Workflow,
  opcoes: {
    dataBase: Date;
    userId: string;
    userName: string;
    processoCaso?: string;
    clienteId?: string | null;
  }
): Promise<string[]> {
  if (!workflow.atividades.length) return [];

  const payloads = workflow.atividades.map((ativ) => {
    const dataCalculada = calcularDataAtividadeWorkflow(opcoes.dataBase, ativ);
    const prefixos: string[] = ["[TIPO:TAREFA]"];
    if (opcoes.processoCaso?.trim()) {
      prefixos.push(`[PROC:${opcoes.processoCaso.trim()}]`);
    }
    (ativ.etiquetas || []).forEach((et) => prefixos.push(`[${et}]`));

    const descricaoFinal = `${prefixos.join(" ")} ${ativ.titulo.trim()}`.trim();

    let respNome: string | null = null;
    let respId: string | null = null;
    if (ativ.responsavelTipo === "criador") {
      respNome = opcoes.userName || "Grupo Venda+";
      respId = opcoes.userId;
    } else if (ativ.responsavelTipo === "usuario") {
      respNome = ativ.responsavelNome || null;
      respId = ativ.responsavelId || null;
    }

    return {
      descricao: descricaoFinal,
      data_conclusao: format(dataCalculada, "yyyy-MM-dd"),
      prioridade: ativ.prioridade || "Baixa",
      status: "Pendente",
      responsavel: respNome,
      responsavel_id: respId,
      cliente_id: opcoes.clienteId || null,
      user_id: opcoes.userId,
    };
  });

  const { data, error } = await supabase
    .from("tarefas")
    .insert(payloads as any)
    .select("id");

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map((row) => row.id);
}

export function useWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>(() =>
    carregarWorkflows()
  );

  useEffect(() => {
    const sync = () => setWorkflows(carregarWorkflows());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const salvarWorkflow = useCallback((wf: Workflow) => {
    const atuais = carregarWorkflows();
    const idx = atuais.findIndex((item) => item.id === wf.id);
    const novaLista =
      idx >= 0
        ? atuais.map((item, i) => (i === idx ? wf : item))
        : [...atuais, wf];
    salvarWorkflowsStorage(novaLista);
    setWorkflows(novaLista);
  }, []);

  const excluirWorkflow = useCallback((id: string) => {
    const atuais = carregarWorkflows().filter((item) => item.id !== id);
    salvarWorkflowsStorage(atuais);
    setWorkflows(atuais);
  }, []);

  const duplicarWorkflow = useCallback((id: string) => {
    const atuais = carregarWorkflows();
    const original = atuais.find((item) => item.id === id);
    if (!original) return null;
    const copia: Workflow = {
      ...original,
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: `${original.titulo} (CÓPIA)`,
      criadoEm: new Date().toISOString(),
      atividades: original.atividades.map((a, idx) => ({
        ...a,
        id: `wf-ativ-${Date.now()}-${idx}`,
      })),
    };
    const novaLista = [...atuais, copia];
    salvarWorkflowsStorage(novaLista);
    setWorkflows(novaLista);
    return copia;
  }, []);

  return {
    workflows,
    salvarWorkflow,
    excluirWorkflow,
    duplicarWorkflow,
  };
}
