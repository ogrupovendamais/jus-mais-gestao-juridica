import { useState } from "react";
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Zap, 
  Users, 
  Scale, 
  MessageSquare, 
  FileText, 
  HelpCircle,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

export default function Planos() {
  const [isAnual, setIsAnual] = useState(true);

  // Plano simulado ativo no escritório
  const planoAtivoId = "escritorio";

  const handleContratar = (nomePlano: string, valor: string) => {
    toast.success(`Redirecionando para contratação do plano ${nomePlano} (${valor})...`);
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
              ● ASSINATURA ATIVA
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#010E38] tracking-tight">
            Meu Plano & Assinatura
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhe o consumo da sua banca, altere seu ciclo de cobrança ou faça upgrade de recursos.
          </p>
        </div>

        <Button
          onClick={() => window.open("https://chat.whatsapp.com/LrVwonFNCaY5B924nmpmT2", "_blank")}
          variant="outline"
          className="bg-white hover:bg-slate-50 text-[#010E38] border-slate-300 font-bold text-xs gap-2 self-start sm:self-auto"
        >
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Falar com Gerente de Contas</span>
        </Button>
      </div>

      {/* Card do Plano Atual & Consumo */}
      <div className="bg-[#010E38] text-white rounded-2xl p-6 sm:p-8 shadow-md border-2 border-[#EBB52C]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EBB52C]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="space-y-2 lg:col-span-1">
            <span className="text-xs font-mono font-bold text-[#EBB52C] uppercase tracking-wider block">
              PLANO CONTRATADO
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              JUS+ Escritório
              <span className="text-base font-normal text-[#EBB52C]">⭐</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ciclo Anual • Próxima renovação em <strong>15/12/2026</strong>.
            </p>
            <div className="pt-2">
              <span className="text-xs bg-emerald-950/80 text-emerald-300 font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Usuários Ilimitados Liberados
              </span>
            </div>
          </div>

          {/* Barras de Consumo */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/10 lg:pl-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Processos c/ Push</span>
                <span className="text-[#EBB52C] font-mono font-bold">14 / 750</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-[#EBB52C] h-full rounded-full" style={{ width: "2%" }} />
              </div>
              <p className="text-[10px] text-slate-400">736 processos disponíveis</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Usuários na Equipe</span>
                <span className="text-emerald-400 font-mono font-bold">2 / Ilimitado</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: "100%" }} />
              </div>
              <p className="text-[10px] text-slate-400">Cadastre quantos sócios quiser</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Termos OAB/DJEN</span>
                <span className="text-[#EBB52C] font-mono font-bold">1 / 5</span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-[#EBB52C] h-full rounded-full" style={{ width: "20%" }} />
              </div>
              <p className="text-[10px] text-slate-400">4 termos OAB disponíveis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Seção Comparativa com Toggle */}
      <div className="space-y-6 pt-4">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h3 className="text-xl sm:text-2xl font-bold text-[#010E38]">
            Compare e mude seu plano quando quiser
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Ajuste os limites do seu escritório conforme sua banca cresce.
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-[#010E38] px-2.5 py-1 rounded">
                  INICIANTE
                </span>
                <span className="text-xs font-semibold text-slate-400">1 Usuário</span>
              </div>

              <div>
                <h4 className="text-xl font-bold text-[#010E38]">JUS+ Start</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Para advogados autônomos em início de carreira com foco em prazos.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#010E38]">
                    {isAnual ? "R$ 77" : "R$ 97"}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">/ mês</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  {isAnual ? "R$ 924 cobrado anualmente (20% OFF)" : "Faturamento mensal sem carência"}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>1 Usuário</strong> de acesso</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>60 Processos</strong> monitorados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>1 Termo OAB/DJEN</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Processos e clientes ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Calculadora de Prazos CPC e CLT</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>Geração de Peças no Word (.docx)</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => handleContratar("Start", isAnual ? "R$ 77/mês" : "R$ 97/mês")}
              variant="outline"
              className="w-full mt-6 bg-white hover:bg-slate-50 text-[#010E38] border-slate-300 font-bold text-xs"
            >
              Downgrade para Start
            </Button>
          </div>

          {/* 2. PLANO ESSENCIAL */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 sm:p-7 shadow-sm flex flex-col justify-between hover:border-[#010E38]/50 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-200">
                  ESTRUTURADO
                </span>
                <span className="text-xs font-semibold text-slate-500">Até 3 Usuários</span>
              </div>

              <div>
                <h4 className="text-xl font-bold text-[#010E38]">JUS+ Essencial</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Para quem tem estagiário e precisa de financeiro e boletos com Pix.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#010E38]">
                    {isAnual ? "R$ 149" : "R$ 187"}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">/ mês</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  {isAnual ? "R$ 1.788 cobrado anualmente (20% OFF)" : "Faturamento mensal sem carência"}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>Até 3 Usuários</strong> inclusos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>250 Processos</strong> monitorados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>2 Termos OAB/DJEN</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>Financeiro por processo</strong> e honorários</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>Boletos e Pix com régua automática</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span><strong>Portal do Cliente</strong> com acesso seguro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span>50 créditos mensais de IA jurídica</span>
                </li>
              </ul>
            </div>

            <Button
              onClick={() => handleContratar("Essencial", isAnual ? "R$ 149/mês" : "R$ 187/mês")}
              variant="outline"
              className="w-full mt-6 bg-[#010E38] hover:bg-[#021B66] text-white font-bold text-xs"
            >
              Mudar para Essencial
            </Button>
          </div>

          {/* 3. PLANO ESCRITÓRIO (PLANO ATUAL) */}
          <div className="bg-[#010E38] text-white rounded-2xl border-2 border-[#EBB52C] p-6 sm:p-7 shadow-xl flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EBB52C] text-[#010E38] text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm tracking-wider">
              ⭐ PLANO ATUAL DA SUA BANCA
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EBB52C]/20 text-[#EBB52C] px-2.5 py-1 rounded border border-[#EBB52C]/30">
                  PEQUENOS E MÉDIOS
                </span>
                <span className="text-xs font-bold text-[#EBB52C]">USUÁRIOS ILIMITADOS</span>
              </div>

              <div>
                <h4 className="text-xl font-bold text-white">JUS+ Escritório</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Software jurídico completo com WhatsApp integrado e sem cobrança por usuário.
                </p>
              </div>

              <div className="bg-[#021B66] p-4 rounded-xl border border-[#EBB52C]/30">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#EBB52C]">
                    {isAnual ? "R$ 277" : "R$ 347"}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">/ mês</span>
                </div>
                <p className="text-[10px] text-[#EBB52C]/90 mt-1 font-medium">
                  {isAnual ? "R$ 3.324 cobrado anualmente (20% OFF)" : "Faturamento mensal sem carência"}
                </p>
              </div>

              <ul className="space-y-2 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>USUÁRIOS ILIMITADOS</strong> (Sem cobrança extra)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>750 Processos</strong> monitorados</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>5 Termos OAB/DJEN</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>WhatsApp Integrado</strong> ao sistema</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Workflows automáticos</strong> de prazos</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span><strong>Controle de permissões</strong> (Sócios e Estágio)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#EBB52C] shrink-0 stroke-[2.5]" />
                  <span>200 créditos de IA jurídica/mês</span>
                </li>
              </ul>
            </div>

            <Button
              disabled
              className="w-full mt-6 bg-emerald-600 text-white font-bold text-xs cursor-default hover:bg-emerald-600"
            >
              ✓ Seu Plano Atual
            </Button>
          </div>

        </div>
      </div>

      {/* Seção de Add-ons & Expansão de Recursos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-[#010E38]">
            Precisa expandir os recursos da sua banca?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adicione pacotes avulsos a qualquer momento sem precisar mudar de plano.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">+100 Processos</span>
            <p className="text-[11px] text-slate-500">Monitoramento adicional de processos com alertas push.</p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#010E38]">R$ 49/mês</span>
              <button
                type="button"
                onClick={() => handleContratar("+100 Processos", "R$ 49/mês")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">+1 Termo OAB/DJEN</span>
            <p className="text-[11px] text-slate-500">Captura automática diária em Diários Oficiais.</p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#010E38]">R$ 29/mês</span>
              <button
                type="button"
                onClick={() => handleContratar("+1 Termo OAB", "R$ 29/mês")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">+100 Créditos IA</span>
            <p className="text-[11px] text-slate-500">Para resumos, tradução aos clientes e minutas.</p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#010E38]">R$ 39/mês</span>
              <button
                type="button"
                onClick={() => handleContratar("+100 Créditos IA", "R$ 39/mês")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Adicionar
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <span className="text-xs font-bold text-[#010E38] block">+1 WhatsApp Conectado</span>
            <p className="text-[11px] text-slate-500">Número corporativo adicional integrado ao ERP.</p>
            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#010E38]">R$ 59/mês</span>
              <button
                type="button"
                onClick={() => handleContratar("+1 WhatsApp", "R$ 59/mês")}
                className="text-xs font-bold text-[#010E38] hover:underline"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
