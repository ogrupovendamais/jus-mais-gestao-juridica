import { useState, useEffect, useCallback } from "react";

export type PlanId = "start" | "essencial" | "escritorio";

export type PlanModule =
  | "dashboard"
  | "clientes"
  | "atendimentos"
  | "processos"
  | "audiencias"
  | "agenda"
  | "tarefas"
  | "documentos"
  | "publicacoes"
  | "google_drive"
  | "financeiro"
  | "mensagens"
  | "equipe"
  | "workflows"
  | "minha_comissao"
  | "relatorios"
  | "backup";

export interface PlanDetails {
  id: PlanId;
  nome: string;
  subtitulo: string;
  precoAnual: number;
  precoMensal: number;
  maxUsuarios: number; // Infinity para ilimitado
  maxUsuariosLabel: string;
  destaque?: boolean;
}

export const PLANS_CONFIG: Record<PlanId, PlanDetails> = {
  start: {
    id: "start",
    nome: "JURI+ TECH Start",
    subtitulo: "Advogado Autônomo Iniciante",
    precoAnual: 77,
    precoMensal: 97,
    maxUsuarios: 1,
    maxUsuariosLabel: "1 Usuário",
  },
  essencial: {
    id: "essencial",
    nome: "JURI+ TECH Essencial",
    subtitulo: "Advogado Autônomo Estruturado",
    precoAnual: 149,
    precoMensal: 187,
    maxUsuarios: 3,
    maxUsuariosLabel: "Até 3 Usuários",
  },
  escritorio: {
    id: "escritorio",
    nome: "JURI+ TECH Escritório",
    subtitulo: "Pequenos e Médios Escritórios",
    precoAnual: 277,
    precoMensal: 347,
    maxUsuarios: 999999,
    maxUsuariosLabel: "Usuários Ilimitados",
    destaque: true,
  },
};

// Mapeamento de qual plano mínimo cada módulo exige
export const MODULE_MIN_PLAN: Record<PlanModule, PlanId> = {
  dashboard: "start",
  clientes: "start",
  atendimentos: "start",
  processos: "start",
  audiencias: "start",
  agenda: "start",
  tarefas: "start",
  documentos: "start",
  // Exigem pelo menos Essencial:
  publicacoes: "essencial",
  google_drive: "essencial",
  financeiro: "essencial",
  mensagens: "essencial",
  equipe: "start",
  // Exigem Plano Escritório:
  workflows: "escritorio",
  minha_comissao: "escritorio",
  relatorios: "escritorio",
  backup: "escritorio",
};

const PLAN_WEIGHT: Record<PlanId, number> = {
  start: 1,
  essencial: 2,
  escritorio: 3,
};

const STORAGE_KEY = "jus_plano_ativo";

export function getStoredPlan(): PlanId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as PlanId | null;
    if (saved && (saved === "start" || saved === "essencial" || saved === "escritorio")) {
      return saved;
    }
  } catch {
    // ignore
  }
  return "escritorio";
}

export function usePlan() {
  const [plan, setPlanState] = useState<PlanId>(() => getStoredPlan());

  useEffect(() => {
    const handlePlanChange = () => {
      setPlanState(getStoredPlan());
    };

    window.addEventListener("jus-plan-changed", handlePlanChange);
    window.addEventListener("storage", handlePlanChange);
    return () => {
      window.removeEventListener("jus-plan-changed", handlePlanChange);
      window.removeEventListener("storage", handlePlanChange);
    };
  }, []);

  const setPlan = useCallback((newPlan: PlanId) => {
    try {
      localStorage.setItem(STORAGE_KEY, newPlan);
      setPlanState(newPlan);
      window.dispatchEvent(new CustomEvent("jus-plan-changed", { detail: newPlan }));
    } catch (e) {
      console.error("Erro ao salvar plano:", e);
    }
  }, []);

  const canAccessModule = useCallback(
    (module: PlanModule): boolean => {
      const requiredPlan = MODULE_MIN_PLAN[module] || "start";
      return PLAN_WEIGHT[plan] >= PLAN_WEIGHT[requiredPlan];
    },
    [plan]
  );

  const getRequiredPlanForModule = useCallback((module: PlanModule): PlanDetails => {
    const req = MODULE_MIN_PLAN[module] || "start";
    return PLANS_CONFIG[req];
  }, []);

  const planInfo = PLANS_CONFIG[plan];

  return {
    plan,
    setPlan,
    planInfo,
    maxUsers: planInfo.maxUsuarios,
    canAccessModule,
    getRequiredPlanForModule,
  };
}
