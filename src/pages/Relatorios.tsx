import { nomeCompliance } from "@/lib/nomes";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPast, subDays, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  PiggyBank,
  Briefcase,
  AlertTriangle,
  CheckSquare,
  FileText,
  DollarSign,
  Activity,
  Award
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";

interface Profile {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
}

interface Lancamento {
  id: string;
  user_id?: string;
  tipo_lancamento?: string;
  status?: string;
  status_parceiro?: string;
  valor: number;
  valor_cliente?: number;
  valor_parceiro?: number;
  valor_escritorio?: number;
  valor_reserva?: number;
  descricao?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  created_at?: string;
  profiles?: Profile;
}

interface Equipe {
  id: string;
  user_id?: string;
  nome?: string;
  departamento?: string;
}

interface Processo {
  id: string;
  user_id?: string;
  status?: string;
  assunto?: string;
}

interface Tarefa {
  id: string;
  status?: string;
}

const Relatorios = () => {
  const { role, user, classificacao } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [equipe, setEquipe] = useState<Equipe[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("all"); // "30" | "90" | "180" | "all"

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const [lancRes, eqRes, procRes, tarRes] = await Promise.all([
          supabase
            .from("financeiro_lancamentos")
            .select("*, profiles!financeiro_lancamentos_user_id_fkey(id, full_name, email, role)")
            .order("created_at", { ascending: false }),
          supabase.from("equipe").select("*"),
          supabase.from("processos").select("*"),
          supabase.from("tarefas").select("*")
        ]);

        if (lancRes.error) throw lancRes.error;
        if (eqRes.error) throw eqRes.error;
        if (procRes.error) throw procRes.error;
        if (tarRes.error) throw tarRes.error;

        setLancamentos((lancRes.data || []) as unknown as Lancamento[]);
        setEquipe((eqRes.data || []) as Equipe[]);
        setProcessos((procRes.data || []) as Processo[]);
        setTarefas((tarRes.data || []) as Tarefa[]);
      } catch (err) {
        console.error("Erro ao carregar relatórios:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Função auxiliar de filtro de datas
  const filterByPeriod = (dateStr: string | null) => {
    if (!dateStr) return false;
    if (filtroPeriodo === "all") return true;
    
    const date = new Date(dateStr + "T00:00:00");
    const limitDate = subDays(new Date(), Number(filtroPeriodo));
    return date >= limitDate;
  };

  // Filtragem dos lançamentos baseado no período selecionado
  const filteredLancamentos = lancamentos.filter((l) => filterByPeriod(
    l.data_vencimento ?? l.created_at?.split("T")[0] ?? null
  ));

  // ==================== CÁLCULOS DRE & FINANCEIRO ====================
  const receitaBruta = filteredLancamentos
    .filter((l) => l.status === "Pago" && (l.tipo_lancamento === "Receita" || l.tipo_lancamento === "Acordo"))
    .reduce((sum, l) => sum + Number(l.valor), 0);

  const repasseClientes = filteredLancamentos
    .filter((l) => l.status === "Pago" && l.tipo_lancamento === "Acordo")
    .reduce((sum, l) => sum + Number(l.valor_cliente || 0), 0);

  const comissaoParceirosPaga = filteredLancamentos
    .filter((l) => l.status === "Pago" && l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pago")
    .reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0);

  const despesasOperacionais = filteredLancamentos
    .filter((l) => l.status === "Pago" && l.tipo_lancamento === "Despesa")
    .reduce((sum, l) => sum + Number(l.valor), 0);

  const lucroLiquido = receitaBruta - repasseClientes - comissaoParceirosPaga - despesasOperacionais;
  const margemLucro = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const ticketMedioAcordo = filteredLancamentos.filter(l => l.tipo_lancamento === "Acordo").length > 0
    ? (filteredLancamentos.filter(l => l.tipo_lancamento === "Acordo").reduce((sum, l) => sum + l.valor, 0) / filteredLancamentos.filter(l => l.tipo_lancamento === "Acordo").length)
    : 0;

  const reservaAdministrativa = filteredLancamentos
    .filter((l) => l.status === "Pago" && l.tipo_lancamento === "Acordo")
    .reduce((sum, l) => sum + Number(l.valor_reserva || 0), 0);

  const comissoesAPagarPendente = filteredLancamentos
    .filter((l) => l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pendente")
    .reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0);

  // ==================== CÁLCULOS OPERACIONAIS & KPIs JURÍDICOS ====================
  const processosAtivosCount = processos.filter(p => p.status !== "Arquivado").length;
  const tarefasConcluidas = tarefas.filter(t => t.status === "Concluída").length;
  const totalTarefas = tarefas.length;
  const taxaConclusaoTarefas = totalTarefas > 0 ? (tarefasConcluidas / totalTarefas) * 100 : 0;

  // Distribuição por Área de Atuação (Processos)
  const getAreasData = () => {
    let trabCount = 0;
    let prevCount = 0;
    let civCount = 0;

    processos.forEach(p => {
      const assunto = p.assunto?.toLowerCase() || "";
      if (assunto.includes("trabalhista") || assunto.includes("trabalho")) trabCount++;
      else if (assunto.includes("previdenciária") || assunto.includes("aposentadoria") || assunto.includes("inss")) prevCount++;
      else civCount++;
    });

    return [
      { name: "Trabalhista", value: trabCount, color: "#EBB52C" },
      { name: "Previdenciário", value: prevCount, color: "#244185" },
      { name: "Cível/Outros", value: civCount, color: "#010E38" }
    ].filter(a => a.value > 0);
  };

  const areasData = getAreasData();

  // Gráfico de Fluxo de Caixa Mensal (Receitas vs Despesas)
  const getFluxoCaixaMensal = () => {
    const mesesMap: Record<string, { mes: string; receitas: number; despesas: number }> = {};

    filteredLancamentos
      .filter((l) => l.status === "Pago" && (l.data_pagamento || l.data_vencimento))
      .forEach((l) => {
        const date = parseISO(l.data_pagamento || l.data_vencimento);
        const mesChave = format(date, "yyyy-MM");
        const mesLabel = format(date, "MMM/yy", { locale: ptBR });

        if (!mesesMap[mesChave]) {
          mesesMap[mesChave] = { mes: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1), receitas: 0, despesas: 0 };
        }

        if (l.tipo_lancamento === "Receita" || l.tipo_lancamento === "Acordo") {
          // Para DRE consideramos apenas a parte que fica na banca se for acordo
          const valorRealEscritorio = l.tipo_lancamento === "Acordo" ? (l.valor_escritorio || 0) : l.valor;
          mesesMap[mesChave].receitas += Number(valorRealEscritorio);
        } else if (l.tipo_lancamento === "Despesa") {
          mesesMap[mesChave].despesas += Number(l.valor);
        }
      });

    return Object.keys(mesesMap)
      .sort()
      .map((key) => mesesMap[key]);
  };

  const fluxoCaixaData = getFluxoCaixaMensal();

  // ==================== CÁLCULOS POR PARCEIRO ====================
  const listParceirosSummary = () => {
    const lawyerIds = Array.from(
      new Set([
        ...equipe.map((e) => e.user_id),
        ...lancamentos.filter((l) => l.profiles?.role === "parceiro").map((l) => l.user_id),
      ])
    ).filter(Boolean);

    return lawyerIds.map((lawyerId) => {
      const dbMember = equipe.find((e) => e.user_id === lawyerId);
      const dbProfile = lancamentos.find((l) => l.user_id === lawyerId)?.profiles;
      const nomeParceiro = (dbMember?.nome && nomeCompliance(dbMember.nome)) || dbProfile?.full_name || dbProfile?.email || "Advogado Parceiro";
      
      const partnerLancamentos = filteredLancamentos.filter((l) => l.user_id === lawyerId);
      const partnerProcessosCount = processos.filter((p) => p.user_id === lawyerId).length;

      const acordosCount = partnerLancamentos.filter((l) => l.tipo_lancamento === "Acordo").length;
      const faturamentoBrutoAcordos = partnerLancamentos
        .filter((l) => l.tipo_lancamento === "Acordo")
        .reduce((sum, l) => sum + Number(l.valor), 0);

      const honorariosBanca = partnerLancamentos
        .filter((l) => l.tipo_lancamento === "Acordo")
        .reduce((sum, l) => sum + Number(l.valor_escritorio || 0), 0);

      const comissaoTotal = partnerLancamentos
        .filter((l) => l.tipo_lancamento === "Acordo")
        .reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0);

      const comissaoPaga = partnerLancamentos
        .filter((l) => l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pago")
        .reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0);

      const comissaoPendente = partnerLancamentos
        .filter((l) => l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pendente")
        .reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0);

      return {
        id: lawyerId,
        nome: nomeParceiro,
        departamento: dbMember?.departamento || "Geral",
        processosCount: partnerProcessosCount,
        acordosCount,
        faturamentoBruto: faturamentoBrutoAcordos,
        honorariosBanca,
        comissaoTotal,
        comissaoPaga,
        comissaoPendente,
      };
    });
  };

  const parceirosStats = listParceirosSummary();
  const isParceiroView = role === "parceiro" && classificacao !== "assistente_financeiro";
  
  const parceiroPessoalStats = isParceiroView
    ? parceirosStats.find((p) => p.id === user?.id) || {
        nome: user?.email || "Meu Perfil",
        departamento: "Geral",
        processosCount: processos.filter((p) => p.user_id === user?.id).length,
        acordosCount: filteredLancamentos.filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo").length,
        faturamentoBruto: filteredLancamentos.filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo").reduce((sum, l) => sum + Number(l.valor), 0),
        honorariosBanca: filteredLancamentos.filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo").reduce((sum, l) => sum + Number(l.valor_escritorio || 0), 0),
        comissaoTotal: filteredLancamentos.filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo").reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0),
        comissaoPaga: filteredLancamentos.filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pago").reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0),
        comissaoPendente: filteredLancamentos.filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pendente").reduce((sum, l) => sum + Number(l.valor_parceiro || 0), 0),
      }
    : null;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-background/50">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 animate-spin text-[#EBB52C]" />
          <p className="mt-4 text-sm font-sans text-muted-foreground">Processando inteligência de negócios...</p>
        </div>
      </div>
    );
  }

  // ==================== RENDERS ====================
  if (isParceiroView) {
    return (
      <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">Relatório de Comissão</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Painel pessoal consolidado de honorários de: <span className="font-semibold text-foreground">{parceiroPessoalStats?.nome}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border/60 bg-gradient-to-br from-card to-primary/5 hover:border-primary/20 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Gerado</CardTitle>
              <DollarSign className="h-4 w-4 text-[#EBB52C]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif text-[#010E38] dark:text-[#EBB52C]">
                {parceiroPessoalStats?.comissaoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Sua participação em acordos cadastrados.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-gradient-to-br from-card to-green-500/5 hover:border-green-500/20 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recebidas (Pagas)</CardTitle>
              <CheckSquare className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif text-green-500">
                {parceiroPessoalStats?.comissaoPaga.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Comissões liquidadas pelo escritório.</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-gradient-to-br from-card to-orange-500/5 hover:border-orange-500/20 transition-all duration-300">
            <CardHeader className="pb-2 flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pendentes (A Receber)</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-serif text-orange-500">
                {parceiroPessoalStats?.comissaoPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Aguardando faturamento do escritório.</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="font-serif">Meus Casos Judiciais & Splits</CardTitle>
            <CardDescription>Visualização detalhada dos acordos sob sua responsabilidade.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Caso / Cliente</TableHead>
                    <TableHead className="text-right">Faturamento Bruto</TableHead>
                    <TableHead className="text-right">Honorários Escritório</TableHead>
                    <TableHead className="text-right">Sua Participação (20%)</TableHead>
                    <TableHead className="text-center">Status Repasse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLancamentos
                    .filter((l) => l.user_id === user?.id && l.tipo_lancamento === "Acordo")
                    .map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/10">
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <div>{l.descricao}</div>
                          <div className="text-[10px] text-muted-foreground">Vencimento: {format(new Date(l.data_vencimento + "T00:00:00"), "dd/MM/yyyy")}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm font-semibold">
                          {l.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-muted-foreground">
                          {l.valor_escritorio?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-[#010E38] dark:text-[#EBB52C] font-bold">
                          {l.valor_parceiro?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            l.status_parceiro === "Pago" 
                              ? "bg-green-500/10 text-green-500 border-green-500/20" 
                              : "bg-orange-500/10 text-orange-500 border-orange-500/20"
                          }`}>
                            {l.status_parceiro === "Pago" ? "Pago" : "Pendente"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Top Header com Filtro de Período e Reserva */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground tracking-tight flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-[#EBB52C]" /> Dashboard Gerencial
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Métricas executivas, demonstrativo financeiro DRE e performance de parceiros.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="min-w-[150px]">
            <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
              <SelectTrigger className="w-full text-sm bg-background border-border/60">
                <SelectValue placeholder="Selecionar Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="180">Últimos 6 meses</SelectItem>
                <SelectItem value="all">Todo o Histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="p-2 sm:p-3 border-border/60 bg-gradient-to-br from-card to-primary/5 flex items-center gap-3">
            <PiggyBank className="h-8 w-8 text-[#EBB52C]" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fundo de Reserva (5%)</p>
              <p className="text-base font-bold font-serif text-[#010E38] dark:text-[#EBB52C]">
                {reservaAdministrativa.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Grid de KPIs Jurídicos e Financeiros Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Lucro Líquido */}
        <Card className="border-border/60 bg-gradient-to-br from-card via-card to-green-500/5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lucro Líquido Banca</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-serif ${lucroLiquido >= 0 ? "text-green-500" : "text-red-500"}`}>
              {lucroLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-muted-foreground">Margem Operacional:</span>
              <span className="text-[10px] font-bold text-green-500">{margemLucro.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Ticket Médio de Acordos */}
        <Card className="border-border/60 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Médio Acordo</CardTitle>
            <Award className="h-4 w-4 text-[#EBB52C]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-[#010E38] dark:text-[#EBB52C]">
              {ticketMedioAcordo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Valor médio dos acordos firmados no período.
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Processos Ativos */}
        <Card className="border-border/60 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Processos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {processosAtivosCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Ações judiciais em andamento no momento.
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Produtividade da Equipe */}
        <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Eficiência da Equipe</CardTitle>
            <CheckSquare className="h-4 w-4 text-foreground/80" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-foreground">
              {taxaConclusaoTarefas.toFixed(0)}%
            </div>
            <div className="mt-2.5">
              <Progress value={taxaConclusaoTarefas} className="h-1.5 bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="dre" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/30 p-1 border border-border/10 rounded-lg">
          <TabsTrigger value="dre" className="text-xs sm:text-sm">Geral & DRE do Escritório</TabsTrigger>
          <TabsTrigger value="parceiros" className="text-xs sm:text-sm">Performance por Parceiro</TabsTrigger>
        </TabsList>

        {/* ==================== ABA 1: DRE E FLUXO ==================== */}
        <TabsContent value="dre" className="space-y-6 mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Tabela da DRE */}
            <Card className="border-border/60 lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-serif text-lg">DRE - Demonstrativo de Resultado do Exercício</CardTitle>
                <CardDescription>Acompanhamento financeiro estruturado no regime de caixa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/50 text-sm font-semibold">
                  <span>RECEITA OPERACIONAL BRUTA</span>
                  <span className="text-green-500 font-bold">{receitaBruta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs text-muted-foreground pl-4">
                  <span>Honorários Advocatícios Contratuais</span>
                  <span>{filteredLancamentos.filter(l => l.status === "Pago" && l.tipo_lancamento === "Receita").reduce((sum, l) => sum + l.valor, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground pl-4">
                  <span>Acordos Homologados (Crédito Bruto)</span>
                  <span>{filteredLancamentos.filter(l => l.status === "Pago" && l.tipo_lancamento === "Acordo").reduce((sum, l) => sum + l.valor, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>

                <div className="flex justify-between items-center pb-2 pt-2 border-b border-border/40 pl-4 text-red-500/80 text-xs sm:text-sm">
                  <span>(-) Repasse Financeiro a Clientes</span>
                  <span className="font-semibold">-{repasseClientes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>

                <div className="flex justify-between items-center pb-2 pt-2 border-b border-border/40 pl-4 text-red-500/80 text-xs sm:text-sm">
                  <span>(-) Repasse de Comissão a Sócios/Parceiros</span>
                  <span className="font-semibold">-{comissaoParceirosPaga.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>

                <div className="flex justify-between items-center pb-2 pt-2 border-b border-border/40 pl-4 text-red-500/80 text-xs sm:text-sm">
                  <span>(-) Custos de Funcionamento e Infraestrutura</span>
                  <span className="font-semibold">-{despesasOperacionais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>

                <div className="flex justify-between items-center pt-4 pb-2 border-t-2 border-border/70 font-serif text-sm sm:text-base font-bold">
                  <span>(=) RESULTADO FINANCEIRO LÍQUIDO</span>
                  <span className={lucroLiquido >= 0 ? "text-green-500" : "text-red-500"}>{lucroLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              </CardContent>
            </Card>

            {/* Distribuição Gráfica de Repasses */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Distribuição de Splits</CardTitle>
                <CardDescription>Destinação financeira das parcelas recebidas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Repasses a Clientes</span>
                    <span>{receitaBruta > 0 ? ((repasseClientes/receitaBruta)*100).toFixed(0) : 0}%</span>
                  </div>
                  <Progress value={receitaBruta > 0 ? (repasseClientes/receitaBruta)*100 : 0} className="h-1.5 bg-muted [&>div]:bg-blue-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Comissões de Parceiros</span>
                    <span>{receitaBruta > 0 ? ((comissaoParceirosPaga/receitaBruta)*100).toFixed(0) : 0}%</span>
                  </div>
                  <Progress value={receitaBruta > 0 ? (comissaoParceirosPaga/receitaBruta)*100 : 0} className="h-1.5 bg-muted [&>div]:bg-orange-500" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Fundo de Reserva da Banca</span>
                    <span>{receitaBruta > 0 ? ((reservaAdministrativa/receitaBruta)*100).toFixed(0) : 0}%</span>
                  </div>
                  <Progress value={receitaBruta > 0 ? (reservaAdministrativa/receitaBruta)*100 : 0} className="h-1.5 bg-muted [&>div]:bg-[#EBB52C]" />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span>Lucro Líquido Retido</span>
                    <span>{receitaBruta > 0 ? ((lucroLiquido/receitaBruta)*100).toFixed(0) : 0}%</span>
                  </div>
                  <Progress value={receitaBruta > 0 ? (lucroLiquido/receitaBruta)*100 : 0} className="h-1.5 bg-muted [&>div]:bg-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Entradas & Fluxo de Caixa */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Gráfico de Barras: Entradas e Saídas */}
            <Card className="border-border/60 md:col-span-2">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Histórico de Caixa Mensal</CardTitle>
                <CardDescription>Fluxo financeiro de entradas de honorários versus custos de despesas administrativas.</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] pt-4">
                {fluxoCaixaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fluxoCaixaData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} stroke="#888888" />
                      <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="#888888" tickFormatter={(v) => `R$${v}`} />
                      <RechartsTooltip formatter={(v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                      <Bar dataKey="receitas" name="Receita Banca" fill="#EBB52C" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesa Operac." fill="#010E38" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Nenhum fluxo financeiro registrado neste período.</div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Pizza: Áreas de Atuação */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Distribuição por Área</CardTitle>
                <CardDescription>Participação percentual de processos cadastrados por matéria.</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px] flex items-center justify-center">
                {areasData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={areasData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {areasData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-sm text-muted-foreground">Nenhuma matéria jurídica mapeada.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== ABA 2: PERFORMANCE POR PARCEIRO ==================== */}
        <TabsContent value="parceiros" className="space-y-6 mt-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Desempenho Geral de Advogados Sócios / Parceiros</CardTitle>
              <CardDescription>Acompanhamento analítico de causas, faturamento bruto gerado, repasses efetuados e comissões pendentes.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead className="text-center">Processos</TableHead>
                      <TableHead className="text-center">Acordos (Qtd)</TableHead>
                      <TableHead className="text-right">Faturamento Bruto</TableHead>
                      <TableHead className="text-right">Honorários Banca</TableHead>
                      <TableHead className="text-right">Comissão Total</TableHead>
                      <TableHead className="text-right text-green-500">Comissão Paga</TableHead>
                      <TableHead className="text-right text-orange-500 font-bold">Pendente</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parceirosStats.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/10">
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <div>{p.nome}</div>
                          <div className="text-[10px] text-muted-foreground">{p.departamento}</div>
                        </TableCell>
                        <TableCell className="text-center text-xs sm:text-sm font-semibold">{p.processosCount}</TableCell>
                        <TableCell className="text-center text-xs sm:text-sm">{p.acordosCount}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-muted-foreground">
                          {p.faturamentoBruto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-muted-foreground">
                          {p.honorariosBanca.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-[#010E38] dark:text-[#EBB52C] font-semibold">
                          {p.comissaoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-green-500 font-semibold">
                          {p.comissaoPaga.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm text-orange-500 font-bold">
                          {p.comissaoPendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>
                      </TableRow>
                    ))}
                    {parceirosStats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhum advogado parceiro com transações localizadas no período.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
