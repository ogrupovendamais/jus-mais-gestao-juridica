import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Briefcase,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  FileText,
  Target,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardParceiro } from "@/components/dashboard/DashboardParceiro";
import { PainelNichos } from "@/components/dashboard/PainelNichos";
import { rotuloHora } from "@/lib/fusos";
import { corStatusProcesso } from "@/lib/statusProcesso";

const Dashboard = () => {
  const { role } = useAuth();
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalProcessos, setTotalProcessos] = useState(0);
  const [audienciasHoje, setAudienciasHoje] = useState(0);
  const [receitaMensal, setReceitaMensal] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const [processos, setProcessos] = useState<
    Array<{ id: string; numero: string; cliente: string; status: string; prazo: string | null }>
  >([]);
  const [proximasAudiencias, setProximasAudiencias] = useState<
    Array<{ id: string; processo: string; cliente: string; data: string; hora: string; tipo: string }>
  >([]);

  const [resumoFinanceiro, setResumoFinanceiro] = useState({ receitaTotal: 0, pendentes: 0, despesasMes: 0 });
  const [produtividade, setProdutividade] = useState({ procConcl: 0, audReal: 0, tarefasMes: 0 });
  const [statsMes, setStatsMes] = useState({ ganhos: 0, andamento: 0, novos: 0 });

  const currency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

  useEffect(() => {
    const load = async () => {
      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const first = format(startOfMonth(new Date()), "yyyy-MM-dd");
        const last = format(endOfMonth(new Date()), "yyyy-MM-dd");

        const [{ count: clientesCount }, { count: processosCount }, { count: audCount }] = await Promise.all([
          supabase.from("clientes").select("*", { count: "exact", head: true }),
          supabase.from("processos").select("*", { count: "exact", head: true }),
          supabase.from("audiencias").select("*", { count: "exact", head: true }).eq("data", todayStr),
        ]);
        setTotalClientes(clientesCount || 0);
        setTotalProcessos(processosCount || 0);
        setAudienciasHoje(audCount || 0);

        const [{ data: pagosMes }, { data: pagosAll }, { data: pendentes }] = await Promise.all([
          supabase
            .from("financeiro_lancamentos")
            .select("valor, data_pagamento, status")
            .eq("status", "Pago")
            .gte("data_pagamento", first)
            .lte("data_pagamento", last),
          supabase.from("financeiro_lancamentos").select("valor, status").eq("status", "Pago"),
          supabase.from("financeiro_lancamentos").select("valor, status").eq("status", "Pendente"),
        ]);
        const receitaMes = (pagosMes || []).reduce((acc: number, l: any) => acc + Number(l.valor || 0), 0);
        const receitaTotal = (pagosAll || []).reduce((acc: number, l: any) => acc + Number(l.valor || 0), 0);
        const pend = (pendentes || []).reduce((acc: number, l: any) => acc + Number(l.valor || 0), 0);
        setReceitaMensal(receitaMes);
        setResumoFinanceiro({ receitaTotal, pendentes: pend, despesasMes: 0 });

        const { data: procs } = await supabase
          .from("processos")
          .select("id, numero, cliente_id, status, data_limite, created_at")
          .order("created_at", { ascending: false })
          .limit(4);

        const ids = Array.from(new Set((procs || []).map((p: any) => p.cliente_id).filter(Boolean)));
        const clientesMap: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: cls } = await supabase.from("clientes").select("id, nome").in("id", ids);
          (cls || []).forEach((c: any) => (clientesMap[c.id] = c.nome));
        }
        setProcessos(
          (procs || []).map((p: any) => ({
            id: p.id,
            numero: p.numero,
            cliente: clientesMap[p.cliente_id] || "",
            status: p.status,
            prazo: p.data_limite ? format(new Date(p.data_limite + "T00:00:00"), "dd/MM/yyyy") : "-",
          }))
        );

        const { data: auds } = await supabase
          .from("audiencias")
          .select("id, processo_numero, titulo, data, hora, fuso, tipo, local")
          .gte("data", todayStr)
          .order("data", { ascending: true })
          .limit(3);
        setProximasAudiencias(
          (auds || []).map((a: any) => ({
            id: a.id,
            processo: a.titulo || a.processo_numero,
            cliente: a.local || "",
            data: a.data ? format(new Date(a.data + "T00:00:00"), "dd/MM/yyyy") : "",
            hora: rotuloHora(a.hora, a.fuso) || "",
            tipo: a.tipo,
          }))
        );

        const [
          { count: conclAll },
          { count: audMesTotal },
          { count: audMesReal },
          { count: tarefasMesTotal },
          { count: tarefasMesConcl },
          { count: conclMes },
          { count: andamentoAll },
          { count: novosMes },
        ] = await Promise.all([
          supabase.from("processos").select("*", { count: "exact", head: true }).eq("status", "Arquivado"),
          supabase.from("audiencias").select("*", { count: "exact", head: true }).gte("data", first).lte("data", last),
          supabase
            .from("audiencias")
            .select("*", { count: "exact", head: true })
            .gte("data", first)
            .lte("data", last)
            .eq("status", "Realizada"),
          supabase
            .from("tarefas")
            .select("*", { count: "exact", head: true })
            .gte("created_at", first)
            .lte("created_at", last),
          supabase
            .from("tarefas")
            .select("*", { count: "exact", head: true })
            .gte("created_at", first)
            .lte("created_at", last)
            .eq("status", "Concluída"),
          supabase
            .from("processos")
            .select("*", { count: "exact", head: true })
            .eq("status", "Arquivado")
            .gte("created_at", first)
            .lte("created_at", last),
          supabase.from("processos").select("*", { count: "exact", head: true }).neq("status", "Arquivado"),
          supabase
            .from("processos")
            .select("*", { count: "exact", head: true })
            .gte("created_at", first)
            .lte("created_at", last),
        ]);

        const procConclPerc =
          (processosCount || 0) > 0 ? Math.round(((conclAll || 0) * 100) / (processosCount || 1)) : 0;
        const audRealPerc = (audMesTotal || 0) > 0 ? Math.round(((audMesReal || 0) * 100) / (audMesTotal || 1)) : 0;
        const tarefasPerc =
          (tarefasMesTotal || 0) > 0 ? Math.round(((tarefasMesConcl || 0) * 100) / (tarefasMesTotal || 1)) : 0;
        setProdutividade({ procConcl: procConclPerc, audReal: audRealPerc, tarefasMes: tarefasPerc });
        setStatsMes({ ganhos: conclMes || 0, andamento: andamentoAll || 0, novos: novosMes || 0 });

        setUltimaAtualizacao(new Date());
      } catch (e) {
        console.error("Erro ao carregar dashboard:", e);
      }
    };
    load();
  }, []);

  const metrics = useMemo(
    () => [
      {
        title: "Total de Clientes",
        value: String(totalClientes),
        subtitle: "Base ativa cadastrada",
        icon: Users,
        destaque: false,
      },
      {
        title: "Processos Ativos",
        value: String(totalProcessos),
        subtitle: "Em acompanhamento",
        icon: Briefcase,
        destaque: false,
      },
      {
        title: "Audiências Hoje",
        value: String(audienciasHoje),
        subtitle: "Pauta do dia",
        icon: Calendar,
        destaque: false,
      },
      {
        title: "Receita Mensal",
        value: currency(receitaMensal),
        subtitle: "Faturamento liquidado",
        icon: DollarSign,
        destaque: true,
      },
    ],
    [totalClientes, totalProcessos, audienciasHoje, receitaMensal]
  );

  const getStatusBadge = (status: string) => corStatusProcesso(status);

  return role === "parceiro" ? (
    <DashboardParceiro />
  ) : (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Cabeçalho H1: Montserrat ExtraBold 800 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#010E38]/10 pb-4">
        <div>
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#010E38] bg-[#EBB52C] px-2.5 py-0.5 rounded mb-2">
            INFRAESTRUTURA COMERCIAL JURÍDICA
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
            Painel Executivo
          </h1>
          <p className="text-sm text-[#010E38]/70 dark:text-[#F1F4F9]/70 font-normal mt-0.5">
            CRM, automação, dados e processo em tempo real.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-[11px] uppercase tracking-wider font-bold text-[#010E38]/55 dark:text-[#F1F4F9]/55">
            Última sincronização
          </p>
          <p className="font-data text-xs font-bold text-[#010E38] dark:text-[#EBB52C]">
            {ultimaAtualizacao ? format(ultimaAtualizacao, "'Hoje,' HH:mm", { locale: ptBR }) : "Sincronizando..."}
          </p>
        </div>
      </div>

      {/* KPIs com DATA / Space Mono Bold 700 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((metric, index) => (
          <Card
            key={index}
            className={
              metric.destaque
                ? "bg-[#010E38] text-[#F1F4F9] border-[#010E38] shadow-md hover:border-[#EBB52C] transition-all"
                : "bg-white dark:bg-[#010E38] border-[#010E38]/12 hover:border-[#EBB52C] transition-all shadow-2xs"
            }
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p
                    className={
                      metric.destaque
                        ? "text-xs font-bold uppercase tracking-wider text-[#EBB52C]"
                        : "text-xs font-bold uppercase tracking-wider text-[#010E38]/65 dark:text-[#F1F4F9]/65"
                    }
                  >
                    {metric.title}
                  </p>
                  <p
                    className={
                      metric.destaque
                        ? "font-data text-2xl sm:text-3xl font-bold text-white mt-2"
                        : "font-data text-2xl sm:text-3xl font-bold text-[#010E38] dark:text-[#F1F4F9] mt-2"
                    }
                  >
                    {metric.value}
                  </p>
                  <p
                    className={
                      metric.destaque
                        ? "text-xs text-[#F1F4F9]/70 mt-1"
                        : "text-xs text-[#010E38]/55 dark:text-[#F1F4F9]/55 mt-1"
                    }
                  >
                    {metric.subtitle}
                  </p>
                </div>
                <div
                  className={
                    metric.destaque
                      ? "p-3 rounded-lg bg-[#EBB52C] text-[#010E38]"
                      : "p-3 rounded-lg bg-[#010E38] text-[#EBB52C]"
                  }
                >
                  <metric.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PainelNichos />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Processos Recentes */}
        <Card className="lg:col-span-2 gradient-card">
          <CardHeader className="border-b border-[#010E38]/8 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#010E38] dark:text-[#F1F4F9]">
              <Briefcase className="w-5 h-5 text-[#EBB52C]" />
              Processos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {processos.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum processo cadastrado ainda.</p>
              )}
              {processos.map((processo) => (
                <div
                  key={processo.id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-[#F1F4F9] dark:bg-white/5 hover:border-[#EBB52C] border border-transparent transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-data text-sm font-bold text-[#010E38] dark:text-[#F1F4F9] truncate">
                      {processo.numero}
                    </p>
                    <p className="text-xs text-[#010E38]/70 dark:text-[#F1F4F9]/70 truncate">{processo.cliente}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className={`status-badge ${getStatusBadge(processo.status)}`}>{processo.status}</span>
                    <p className="font-data text-xs font-bold text-[#010E38]/70 dark:text-[#F1F4F9]/70">
                      {processo.prazo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Próximas Audiências */}
        <Card className="gradient-card">
          <CardHeader className="border-b border-[#010E38]/8 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#010E38] dark:text-[#F1F4F9]">
              <Calendar className="w-5 h-5 text-[#EBB52C]" />
              Próximas Audiências
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {proximasAudiencias.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma audiência agendada.</p>
              )}
              {proximasAudiencias.map((audiencia) => (
                <div
                  key={audiencia.id}
                  className="p-3.5 rounded-lg bg-[#F1F4F9] dark:bg-white/5 border-l-4 border-l-[#EBB52C]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-[#010E38] dark:text-[#F1F4F9]">{audiencia.cliente}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#010E38] text-[#EBB52C] px-2 py-0.5 rounded">
                      {audiencia.tipo}
                    </span>
                  </div>
                  <p className="text-xs text-[#010E38]/70 dark:text-[#F1F4F9]/70 mb-2">{audiencia.processo}</p>
                  <div className="flex items-center gap-1.5 font-data text-xs font-bold text-[#010E38] dark:text-[#EBB52C]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {audiencia.data} · {audiencia.hora}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="gradient-card">
          <CardHeader className="border-b border-[#010E38]/8 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Target className="w-5 h-5 text-[#EBB52C]" />
              Produtividade
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wide mb-2">
                  <span>Processos Arquivados</span>
                  <span className="font-data font-bold">{produtividade.procConcl}%</span>
                </div>
                <Progress value={produtividade.procConcl} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wide mb-2">
                  <span>Audiências Realizadas</span>
                  <span className="font-data font-bold">{produtividade.audReal}%</span>
                </div>
                <Progress value={produtividade.audReal} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wide mb-2">
                  <span>Tarefas Concluídas</span>
                  <span className="font-data font-bold">{produtividade.tarefasMes}%</span>
                </div>
                <Progress value={produtividade.tarefasMes} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="border-b border-[#010E38]/8 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <TrendingUp className="w-5 h-5 text-[#EBB52C]" />
              Indicadores do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F4F9] dark:bg-white/5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-[#010E38] dark:text-[#EBB52C]" />
                  <span className="text-sm font-medium">Casos Arquivados</span>
                </div>
                <span className="font-data text-base font-bold text-[#010E38] dark:text-[#EBB52C]">
                  {statsMes.ganhos}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F4F9] dark:bg-white/5">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#EBB52C]" />
                  <span className="text-sm font-medium">Processos Ativos</span>
                </div>
                <span className="font-data text-base font-bold text-[#010E38] dark:text-[#EBB52C]">
                  {statsMes.andamento}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F1F4F9] dark:bg-white/5">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#010E38] dark:text-[#EBB52C]" />
                  <span className="text-sm font-medium">Novos Casos</span>
                </div>
                <span className="font-data text-base font-bold text-[#010E38] dark:text-[#EBB52C]">
                  {statsMes.novos}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="border-b border-[#010E38]/8 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <DollarSign className="w-5 h-5 text-[#EBB52C]" />
              Resumo Financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Receita Acumulada</p>
                <p className="font-data text-2xl font-bold text-[#010E38] dark:text-[#EBB52C]">
                  {currency(resumoFinanceiro.receitaTotal)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Honorários Pendentes
                </p>
                <p className="font-data text-lg font-bold text-[#010E38]/80 dark:text-[#F1F4F9]">
                  {currency(resumoFinanceiro.pendentes)}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Despesas do Mês</p>
                <p className="font-data text-lg font-bold text-[#010E38]/60 dark:text-[#F1F4F9]/60">
                  {currency(resumoFinanceiro.despesasMes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
