import React from "react";
import { Lock, Sparkles, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { PlanModule, usePlan, PLANS_CONFIG } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlanGuardProps {
  module: PlanModule;
  title: string;
  description: string;
  features?: string[];
  children: React.ReactNode;
}

export const PlanGuard: React.FC<PlanGuardProps> = ({
  module,
  title,
  description,
  features = [],
  children,
}) => {
  const { plan, setPlan, planInfo, canAccessModule, getRequiredPlanForModule } = usePlan();

  if (canAccessModule(module)) {
    return <>{children}</>;
  }

  const requiredPlan = getRequiredPlanForModule(module);

  const defaultFeatures =
    requiredPlan.id === "essencial"
      ? [
          "Painel de Publicações e Intimações Eletrônicas (OAB/DJEN)",
          "Integração Oficial com Google Drive & Google Docs",
          "Gestão Financeira Completa (Receitas, Despesas, Contas e Honorários)",
          "Até 3 Usuários na Equipe e Modelos de Mensagens",
        ]
      : [
          "Usuários Ilimitados (Sócios, Advogados, Financeiro e Parceiros)",
          "Workflows e Esteiras Automáticas de Tarefas por Fase Processual",
          "Cálculo e Divisão de Comissões de Associados e Parceiros",
          "Relatórios Gerenciais, Controle de Permissões e Backup Completo",
        ];

  const listToRender = features.length > 0 ? features : defaultFeatures;

  return (
    <div className="p-4 sm:p-8 lg:p-12 w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border-2 border-[#010E38]/15 shadow-xl overflow-hidden">
        {/* Cabeçalho Navy & Gold */}
        <div className="bg-[#010E38] text-white p-6 sm:p-10 relative overflow-hidden border-b-4 border-[#EBB52C]">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#EBB52C]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#EBB52C] text-[#010E38] flex items-center justify-center shrink-0 shadow-lg">
              <Lock className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-[#EBB52C]/20 border border-[#EBB52C]/40 text-[#EBB52C] text-[11px] font-mono font-bold uppercase px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Disponível a partir do plano {requiredPlan.nome}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {title} está bloqueado no seu plano atual
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Seu escritório está atualmente no plano <strong className="text-[#EBB52C]">{planInfo.nome}</strong>.{" "}
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Corpo com Benefícios do Upgrade */}
        <div className="p-6 sm:p-10 space-y-8 text-[#010E38]">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
              O que você desbloqueia ao fazer upgrade para o {requiredPlan.nome}:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {listToRender.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-semibold text-[#010E38] leading-snug">
                    {feat}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Box de Preço e Ação */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase text-slate-400 block">
                INVESTIMENTO DO {requiredPlan.nome.toUpperCase()}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-[#010E38]">
                  R$ {requiredPlan.precoAnual}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  / mês no plano anual (ou R$ {requiredPlan.precoMensal}/mês no mensal)
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button
                asChild
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-bold text-xs px-6 py-5 rounded-xl shadow-md"
              >
                <Link to="/planos" className="flex items-center justify-center gap-2">
                  <span>Ver Planos e Fazer Upgrade</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Barra Rápida de Teste de Planos */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#EBB52C]" />
              <span>
                <strong>Modo Simulador de Planos:</strong> Deseja testar este módulo agora alterando o plano ativo?
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(["start", "essencial", "escritorio"] as const).map((pId) => (
                <button
                  key={pId}
                  type="button"
                  onClick={() => {
                    setPlan(pId);
                    toast.success(`Plano alterado para ${PLANS_CONFIG[pId].nome}!`);
                  }}
                  className={`px-2.5 py-1 rounded-md font-bold text-[11px] border transition-all ${
                    plan === pId
                      ? "bg-[#010E38] text-[#EBB52C] border-[#010E38]"
                      : "bg-white text-slate-600 border-slate-200 hover:border-[#010E38]"
                  }`}
                >
                  {PLANS_CONFIG[pId].nome.replace("JURI+ TECH ", "").replace("JUS+ ", "")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
