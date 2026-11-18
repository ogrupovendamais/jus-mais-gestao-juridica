import { useState } from "react";
import { 
  Check, 
  ShieldCheck, 
  MessageSquare, 
  Lock,
  Sparkles,
  SlidersHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePlan, PlanId, PLANS_CONFIG } from "@/hooks/usePlan";

export default function Planos() {
  const [isAnual, setIsAnual] = useState(true);
  const { plan, setPlan, planInfo } = usePlan();

  const handleSelecionarPlano = (novoPlano: PlanId) => {
    setPlan(novoPlano);
    toast.success(`Plano ativo alterado para ${PLANS_CONFIG[novoPlano].nome}! As travas do sistema foram atualizadas.`);
  };

  const handleContratar = (nomePlano: string, valor: string) => {
    toast.success(`Redirecionando para atendimento do plano ${nomePlano} (${valor})...`);
    window.open("https://chat.whatsapp.com/LrVwonFNCaY5B924nmpmT2", "_blank");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-8 text-[#010E38]">
      
      {/* Topo do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#EBB52C] text-[#010E38] px-2.5 py-0.5 rounded">
              GERENCIAMENTO DE ASSINATURA
            </span>
            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold">
              ● {planInfo.nome.toUpperCase()} ATIVO
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#010E38] tracking-tight">
            Meu Plano & Assinatura
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe os recursos liberados para a sua banca, teste as travas por plano ou altere sua assinatura.
          </p>
        </div>

        <Button
          onClick={() => window.open("https://chat.whatsapp.com/LrVwonFNCaY5B924nmpmT2", "_blank")}
          variant="outline"
          className="bg-white hover:bg-slate-50 text-[#010E38] border-slate-300 font-bold text-xs gap-2 self-start sm:self-auto"
        >
          <MessageSquare className="w-4 h-4 text-[#010E38]" />
          <span>Falar com Gerente de Contas</span>
        </Button>
      </div>

      {/* Painel de Controle Rápido das Travas por Plano */}
      <div className="bg-amber-50/90 border-2 border-[#EBB52C] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#010E38] text-[#EBB52C] flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Controle de Travas por Plano (Ativo Agora: {planInfo.nome})
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Alterne abaixo entre os 3 planos para ativar ou testar os bloqueios de módulos e limites de usuários no sistema em tempo real:
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(["start", "essencial", "escritorio"] as PlanId[]).map((pId) => {
            const ativo = plan === pId;
            return (
              <button
                key={pId}
                type="button"
                onClick={() => handleSelecionarPlano(pId)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border ${
                  ativo
                    ? "bg-[#010E38] text-[#EBB52C] border-[#010E38] shadow-md"
                    : "bg-white text-[#010E38] border-slate-300 hover:border-[#010E38]"
                }`}
              >
                {ativo ? <ShieldCheck className="w-3.5 h-3.5 text-[#EBB52C]" /> : <Lock className="w-3 h-3 text-slate-400" />}
                <span>{PLANS_CONFIG[pId].nome}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Card do Plano Atual & Consumo */}
      <div className="bg-[#010E38] text-white rounded-2xl p-6 sm:p-8 shadow-md border-2 border-[#EBB52C]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EBB52C]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="space-y-2 lg:col-span-1">
            <span className="text-xs font-mono font-bold text-[#EBB52C] uppercase tracking-wider block">
              PLANO ATIVO NO SISTEMA
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              {planInfo.nome}
              {plan === "escritorio" && <span className="text-base font-normal text-[#EBB52C]">⭐</span>}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {planInfo.subtitulo} • R$ {isAnual ? planInfo.precoAnual : planInfo.precoMensal}/mês
            </p>
            <div className="pt-2">
              <span className="text-xs bg-emerald-950/80 text-emerald-300 font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {planInfo.maxUsuariosLabel}
              </span>
            </div>
          </div>

          {/* Barras de Recursos Ativos */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Processos & Clientes</span>
                <span className="text-emerald-400 font-mono font-bold">Ilimitado</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: "100%" }} />
              </div>
              <p className="text-[10px] text-slate-400">Sincronização CNJ por OAB ativa</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Limite de Usuários</span>
                <span className="text-[#EBB52C] font-mono font-bold">
                  {plan === "start" ? "1 / 1" : plan === "essencial" ? "Até 3" : "Ilimitado"}
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#EBB52C] h-full rounded-full"
                  style={{ width: plan === "start" ? "35%" : plan === "essencial" ? "70%" : "100%" }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                {plan === "start"
                  ? "Trava ativa em 1 usuário"
                  : plan === "essencial"
                  ? "Trava ativa acima de 3 usuários"
                  : "Cadastre quantos membros quiser"}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Módulos Liberados</span>
                <span className="text-[#EBB52C] font-mono font-bold">
                  {plan === "start" ? "Essenciais" : plan === "essencial" ? "Intermediários" : "100% Total"}
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#EBB52C] h-full rounded-full"
                  style={{ width: plan === "start" ? "45%" : plan === "essencial" ? "75%" : "100%" }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                {plan === "start"
                  ? "Financeiro, Drive e Publicações travados"
                  : plan === "essencial"
                  ? "Workflows, BI e Comissões travados"
                  : "Todos os módulos destravados"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Comparativa com Toggle */}
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-[#010E38]">
            Compare os planos e entregáveis do sistema
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Todos os módulos abaixo possuem travas automáticas conforme o plano selecionado.
          </p>

          {/* Alternador Mensal / Anual */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAnual(false)}
              className={`text-xs sm:text-sm font-bold transition-colors ${
                !isAnual ? "text-[#010E38]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Mensal
            </button>

            <button
              type="button"
              onClick={() => setIsAnual(!isAnual)}
              className="relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[#010E38] transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-[#EBB52C] shadow-md ring-0 transition duration-200 ease-in-out ${
                  isAnual ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => setIsAnual(true)}
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-bold transition-colors ${
                isAnual ? "text-[#010E38]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <span>Anual</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-300">
                20% OFF 🔥
              </span>
            </button>
          </div>
        </div>

        {/* Grade com os 3 Planos Oficiais */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch pt-2">
          
          {/* 1. PLANO START */}
          <div
            className={`rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-all relative ${
              plan === "start"
                ? "bg-[#010E38] text-white border-2 border-[#EBB52C] shadow-xl"
                : "bg-white text-[#010E38] border border-slate-200 hover:border-slate-300"
            }`}
          >
            {plan === "start" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EBB52C] text-[#010E38] text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
                ✓ PLANO ATIVO AGORA
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                  plan === "start" ? "bg-[#EBB52C]/20 text-[#EBB52C]" : "bg-slate-100 text-[#010E38]"
                }`}>
                  INICIANTE
                </span>
                <span className={`text-xs font-semibold ${plan === "start" ? "text-[#EBB52C]" : "text-slate-400"}`}>
                  1 Usuário
                </span>
              </div>

              <div>
                <h4 className={`text-xl font-bold ${plan === "start" ? "text-white" : "text-[#010E38]"}`}>
                  JUS+ Start
                </h4>
                <p className={`text-xs mt-1 ${plan === "start" ? "text-slate-300" : "text-slate-500"}`}>
                  Para advogados autônomos organizarem processos, prazos, clientes e peças no Word.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${
                plan === "start" ? "bg-[#021B66] border-[#EBB52C]/30" : "bg-slate-50 border-slate-100"
              }`}>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold ${plan === "start" ? "text-[#EBB52C]" : "text-[#010E38]"}`}>
                    {isAnual ? "R$ 77" : "R$ 97"}
                  </span>
                  <span className={`text-xs font-semibold ${plan === "start" ? "text-slate-300" : "text-slate-500"}`}>
                    / mês
                  </span>
                </div>
                <p className={`text-[10px] mt-1 font-medium ${plan === "start" ? "text-[#EBB52C]/90" : "text-slate-400"}`}>
                  {isAnual ? "R$ 924 cobrado anualmente (20% OFF)" : "Faturamento mensal sem carência"}
                </p>
              </div>

              <ul className={`space-y-2 text-xs ${plan === "start" ? "text-slate-200" : "text-slate-600"}`}>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>1 Usuário</strong> de acesso (Trava acima de 1)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Processos e Clientes 100% ilimitados</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Sincronização pela OAB</strong> (Base Oficial CNJ)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Quadro Visual Kanban de Tarefas e Prazos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Calculadora de Prazos CPC Art. 219 e CLT</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Pauta de Audiências e Agenda Integrada</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Geração de Procuração e Contratos no Word (.docx)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Fichas de Atendimento (10 Ramos do Direito)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Gestão de Documentos (GED) por Pastas</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              {plan === "start" ? (
                <Button disabled className="w-full bg-emerald-600 text-white font-bold text-xs">
                  ✓ Plano Ativo no Sistema
                </Button>
              ) : (
                <Button
                  onClick={() => handleSelecionarPlano("start")}
                  variant="outline"
                  className="w-full bg-white hover:bg-slate-50 text-[#010E38] border-slate-300 font-bold text-xs"
                >
                  Ativar Plano Start
                </Button>
              )}
            </div>
          </div>

          {/* 2. PLANO ESSENCIAL */}
          <div
            className={`rounded-2xl p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-all relative ${
              plan === "essencial"
                ? "bg-[#010E38] text-white border-2 border-[#EBB52C] shadow-xl"
                : "bg-white text-[#010E38] border-2 border-slate-300 hover:border-[#010E38]/50"
            }`}
          >
            {plan === "essencial" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EBB52C] text-[#010E38] text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
                ✓ PLANO ATIVO AGORA
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded ${
                  plan === "essencial"
                    ? "bg-[#EBB52C]/20 text-[#EBB52C]"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}>
                  ESTRUTURADO
                </span>
                <span className={`text-xs font-semibold ${plan === "essencial" ? "text-[#EBB52C]" : "text-slate-500"}`}>
                  Até 3 Usuários
                </span>
              </div>

              <div>
                <h4 className={`text-xl font-bold ${plan === "essencial" ? "text-white" : "text-[#010E38]"}`}>
                  JUS+ Essencial
                </h4>
                <p className={`text-xs mt-1 ${plan === "essencial" ? "text-slate-300" : "text-slate-500"}`}>
                  Para quem conta com estagiário ou assistente e precisa de publicações, Google Drive e financeiro completo.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${
                plan === "essencial" ? "bg-[#021B66] border-[#EBB52C]/30" : "bg-slate-50 border-slate-100"
              }`}>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold ${plan === "essencial" ? "text-[#EBB52C]" : "text-[#010E38]"}`}>
                    {isAnual ? "R$ 149" : "R$ 187"}
                  </span>
                  <span className={`text-xs font-semibold ${plan === "essencial" ? "text-slate-300" : "text-slate-500"}`}>
                    / mês
                  </span>
                </div>
                <p className={`text-[10px] mt-1 font-medium ${plan === "essencial" ? "text-[#EBB52C]/90" : "text-slate-400"}`}>
                  {isAnual ? "R$ 1.788 cobrado anualmente (20% OFF)" : "Faturamento mensal sem carência"}
                </p>
              </div>

              <ul className={`space-y-2 text-xs ${plan === "essencial" ? "text-slate-200" : "text-slate-600"}`}>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Tudo incluso no Plano Start</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Até 3 Usuários</strong> inclusos na equipe</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Painel de Publicações e Intimações</strong> (OAB/DJEN)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Integração Oficial Google Drive & Google Docs</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Gestão Financeira Completa</strong> (Receitas e Despesas)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span><strong>Controle de Honorários</strong> por Processo e Cliente</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Contas Bancárias, Plano de Contas e Centros de Custo</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                  <span>Modelos de Mensagens Padronizadas para Clientes</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              {plan === "essencial" ? (
                <Button disabled className="w-full bg-emerald-600 text-white font-bold text-xs">
                  ✓ Plano Ativo no Sistema
                </Button>
              ) : (
                <Button
                  onClick={() => handleSelecionarPlano("essencial")}
                  className="w-full bg-[#010E38] hover:bg-[#021B66] text-white font-bold text-xs"
                >
                  Ativar Plano Essencial
                </Button>
              )}
            </div>
          </div>

          {/* 3. PLANO ESCRITÓRIO */}
          <div
            className={`rounded-2xl p-6 sm:p-7 shadow-xl flex flex-col justify-between relative transition-all ${
              plan === "escritorio"
                ? "bg-[#010E38] text-white border-2 border-[#EBB52C]"
                : "bg-white text-[#010E38] border-2 border-[#EBB52C]"
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EBB52C] text-[#010E38] text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
              {plan === "escritorio" ? "⭐ PLANO ATIVO DA SUA BANCA" : "⭐ O MAIS ESCOLHIDO"}
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EBB52C]/20 text-[#EBB52C] px-2.5 py-1 rounded border border-[#EBB52C]/30">
                  PEQUENOS E MÉDIOS
                </span>
                <span className="text-xs font-bold text-[#EBB52C]">USUÁRIOS ILIMITADOS</span>
              </div>

              <div>
                <h4 className={`text-xl font-bold ${plan === "escritorio" ? "text-white" : "text-[#010E38]"}`}>
                  JUS+ Escritório
                </h4>
                <p className={`text-xs mt-1 ${plan === "escritorio" ? "text-slate-300" : "text-slate-500"}`}>
                  O ERP jurídico completo com usuários ilimitados, workflows, permissões e divisão de comissões.
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${
                plan === "escritorio" ? "bg-[#021B66] border-[#EBB52C]/30" : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-baseline gap-1">
                  <span className={`text-3xl font-extrabold ${plan === "escritorio" ? "text-[#EBB52C]" : "text-[#010E38]"}`}>
                    {isAnual ? "R$ 277" : "R$ 347"}
                  </span>
                  <span className={`text-xs font-semibold ${plan === "escritorio" ? "text-slate-300" : "text-slate-500"}`}>
                    / mês
                  </span>
                </div>
                <p className={`text-[10px] mt-1 font-medium ${plan === "escritorio" ? "text-[#EBB52C]/90" : "text-slate-400"}`}>
                  {isAnual ? "R$ 3.324 cobrado anualmente (20% OFF)" : "Faturamento mensal sem carência"}
                </p>
              </div>

              <ul className={`space-y-2 text-xs ${plan === "escritorio" ? "text-slate-200" : "text-slate-600"}`}>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Tudo incluso no Plano Essencial</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>USUÁRIOS ILIMITADOS</strong> (Sem cobrança extra)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Workflows e Esteiras de Tarefas</strong> por Fase Processual</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Controle de Permissões</strong> (Sócios, Advogados e Parceiros)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Cálculo e Divisão de Comissões</strong> de Associados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Relatórios Gerenciais</strong> e Indicadores da Banca</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Backup Completo dos Dados</strong> do Escritório</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span>Suporte Técnico Prioritário</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              {plan === "escritorio" ? (
                <Button
                  disabled
                  className="w-full bg-emerald-600 text-white font-bold text-xs cursor-default hover:bg-emerald-600"
                >
                  ✓ Plano Ativo no Sistema
                </Button>
              ) : (
                <Button
                  onClick={() => handleSelecionarPlano("escritorio")}
                  className="w-full bg-[#EBB52C] hover:bg-[#d9a320] text-[#010E38] font-black text-xs"
                >
                  Ativar Plano Escritório ⭐
                </Button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Seção de Serviços Adicionais Reais */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-[#010E38]">
            Serviços Exclusivos & Personalização para sua Banca
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Opções sob medida para escritórios que buscam identidade visual própria ou implantação assistida.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">Marca Própria (White Label)</span>
            <p className="text-[11px] text-slate-500">
              Sistema com o logotipo oficial, cores institucionais e domínio exclusivo do seu escritório.
            </p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#010E38]">Sob consulta</span>
              <button
                type="button"
                onClick={() => handleContratar("Marca Própria (White Label)", "Sob consulta")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Solicitar
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">Migração Assistida de Dados</span>
            <p className="text-[11px] text-slate-500">
              Importação de planilhas de clientes e processos acompanhada pela nossa equipe técnica.
            </p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-700">Incluso no Anual</span>
              <button
                type="button"
                onClick={() => handleContratar("Migração Assistida", "Incluso no Anual")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Agendar
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">Treinamento da Equipe</span>
            <p className="text-[11px] text-slate-500">
              Onboarding prático para sócios, advogados associados e equipe administrativa.
            </p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#010E38]">Sob consulta</span>
              <button
                type="button"
                onClick={() => handleContratar("Treinamento da Equipe", "Sob consulta")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Solicitar
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
