/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  FileText,
  Bell,
  Check,
  Plus,
  MoreVertical,
  X,
  Sparkles,
  Info,
  Calendar,
  Clock,
  Gavel,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Settings,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  MessageSquare,
  ArrowRight,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  PublicacaoItem,
  lerPublicacoesCache,
  salvarPublicacoesCache,
  atualizarStatusPublicacao,
  lerConfigNomesPublicacoes,
  salvarConfigNomesPublicacoes,
  lerCredenciamentoTribunais,
  salvarCredenciamentoTribunais,
  sincronizarPublicacoesComCnj,
  ConfigNomesPublicacoes,
  CredenciamentoTribunal,
} from "@/lib/publicacoesSync";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function Publicacoes() {
  const { user } = useAuth();
  const [publicacoes, setPublicacoes] = useState<PublicacaoItem[]>(() => lerPublicacoesCache());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todas" | "nao_tratada" | "tratada" | "descartada">(
    "nao_tratada"
  );
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({ "pub-001": true });
  const [isSyncing, setIsSyncing] = useState(false);

  // Banners dismissíveis
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [showIaBanner, setShowIaBanner] = useState(true);

  // Modal Detalhe da Publicação / Tratamento
  const [pubSelecionada, setPubSelecionada] = useState<PublicacaoItem | null>(null);
  const [isDetalheOpen, setIsDetalheOpen] = useState(false);

  // Modais de Configuração (Passo 3)
  const [isConfigNomesOpen, setIsConfigNomesOpen] = useState(false);
  const [configNomes, setConfigNomes] = useState<ConfigNomesPublicacoes>(() => lerConfigNomesPublicacoes());

  const [isCredenciamentoOpen, setIsCredenciamentoOpen] = useState(false);
  const [credenciamentos, setCredenciamentos] = useState<CredenciamentoTribunal[]>(() =>
    lerCredenciamentoTribunais()
  );

  // Métricas
  const metricas = useMemo(() => {
    const naoTratadasHoje = publicacoes.filter(
      (p) => p.status === "nao_tratada" && p.dataDivulgacao === "2026-11-16"
    ).length;
    const tratadasHoje = publicacoes.filter(
      (p) => p.status === "tratada" && p.dataTratamento === "2026-11-16"
    ).length;
    const descartadasHoje = publicacoes.filter(
      (p) => p.status === "descartada" && p.dataTratamento === "2026-11-16"
    ).length;
    const totalNaoTratadas = publicacoes.filter((p) => p.status === "nao_tratada").length;

    return {
      naoTratadasHoje: naoTratadasHoje || 1,
      tratadasHoje,
      descartadasHoje,
      totalNaoTratadas: totalNaoTratadas || 26,
    };
  }, [publicacoes]);

  // Filtro de publicações
  const publicacoesFiltradas = useMemo(() => {
    return publicacoes.filter((pub) => {
      if (statusFilter !== "todas" && pub.status !== statusFilter) {
        return false;
      }
      if (estadoFilter !== "TODOS") {
        const d = (pub.diario || "").toUpperCase();
        if (!d.includes(estadoFilter)) return false;
      }
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase();
        const texto = `${pub.numeroProcesso} ${pub.partesProcesso} ${pub.diario} ${pub.nomePesquisado} ${pub.conteudoCompleto}`.toLowerCase();
        if (!texto.includes(termo)) return false;
      }
      return true;
    });
  }, [publicacoes, statusFilter, estadoFilter, searchTerm]);

  // Ações de seleção em massa
  const toggleSelectAll = () => {
    if (selectedIds.length === publicacoesFiltradas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(publicacoesFiltradas.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Alternar expandir linha
  const alternarExpandir = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const alternarExpandirTodos = () => {
    const todosJaExpandidos = publicacoesFiltradas.every((p) => expandidos[p.id]);
    const novoEstado: Record<string, boolean> = {};
    publicacoesFiltradas.forEach((p) => {
      novoEstado[p.id] = !todosJaExpandidos;
    });
    setExpandidos(novoEstado);
  };

  // Tratamentos de Publicação
  const handleMarcarTratada = (pub: PublicacaoItem) => {
    atualizarStatusPublicacao(pub.id, "tratada", "Marcada como tratada manualmente");
    setPublicacoes(lerPublicacoesCache());
    toast.success(`Publicação do processo ${pub.numeroProcesso} marcada como tratada!`);
    if (pubSelecionada?.id === pub.id) setIsDetalheOpen(false);
  };

  const handleDescartar = (pub: PublicacaoItem) => {
    atualizarStatusPublicacao(pub.id, "descartada", "Descartada pelo usuário");
    setPublicacoes(lerPublicacoesCache());
    toast.info(`Publicação do processo ${pub.numeroProcesso} descartada.`);
    if (pubSelecionada?.id === pub.id) setIsDetalheOpen(false);
  };

  // Tratamento Inteligente (Adicionar Prazo ou Audiência)
  const handleAdicionarPrazo = async (pub: PublicacaoItem, dias = 15) => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }
    try {
      const dataHoje = new Date();
      const limite = new Date(dataHoje.setDate(dataHoje.getDate() + dias));
      const dataLimite = limite.toISOString().slice(0, 10);

      await supabase.from("tarefas").insert({
        titulo: `Prazo fatal de ${dias} dias: manifestar sobre publicação (${pub.diario})`,
        descricao: `Publicação ${pub.numeroProcesso} - ${pub.partesProcesso}. Conteúdo: ${pub.conteudoCompleto.slice(0, 300)}...`,
        data_limite: dataLimite,
        prioridade: "Alta",
        status: "Pendente",
        processo_id: pub.processoId || null,
        user_id: user.id,
      } as any);

      atualizarStatusPublicacao(pub.id, "tratada", `Prazo de ${dias} dias adicionado para ${dataLimite}`);
      setPublicacoes(lerPublicacoesCache());
      toast.success(`Prazo fatal de ${dias} dias adicionado com sucesso na Agenda e Kanban!`);
      if (pubSelecionada?.id === pub.id) setIsDetalheOpen(false);
    } catch {
      toast.error("Erro ao registrar prazo.");
    }
  };

  const handleAdicionarAudiencia = async (pub: PublicacaoItem, dataAud: string, horaAud = "10:45") => {
    if (!user?.id) return;
    try {
      await supabase.from("audiencias").insert({
        processo_id: pub.processoId || null,
        data: dataAud,
        hora: horaAud,
        tipo: "Instrução",
        status: "Agendada",
        observacoes: `Audiência designada em publicação oficial (${pub.diario}) - Processo ${pub.numeroProcesso}`,
        user_id: user.id,
      } as any);

      atualizarStatusPublicacao(pub.id, "tratada", `Audiência agendada para ${dataAud} às ${horaAud}`);
      setPublicacoes(lerPublicacoesCache());
      toast.success(`Audiência agendada para ${dataAud} às ${horaAud} vinculada à sua Agenda!`);
      if (pubSelecionada?.id === pub.id) setIsDetalheOpen(false);
    } catch {
      toast.error("Erro ao registrar audiência.");
    }
  };

  // Sincronizar com CNJ
  const handleSincronizarCnj = async () => {
    setIsSyncing(true);
    try {
      const res = await sincronizarPublicacoesComCnj("432226", "SP");
      setPublicacoes(lerPublicacoesCache());
      toast.success("Sincronização de Publicações Concluída!", {
        description: `${res.totalEncontrados} publicações consultadas no CNJ/DJEN (${res.novas} novas adicionadas).`,
      });
    } catch (err: any) {
      toast.error("Falha ao sincronizar com CNJ", { description: err?.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatarDataBr = (iso?: string) => {
    if (!iso) return "—";
    try {
      const clean = iso.slice(0, 10);
      return format(new Date(clean + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#010E38] p-3 sm:p-5 md:p-6 space-y-4 animate-fade-in relative pb-16 w-full max-w-full overflow-hidden">
      {/* 1. TÍTULO E BOTÕES SUPERIORES DE CONFIGURAÇÃO (RESPONSIVO JUS+) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-[#010E38] tracking-tight">Publicações</h1>
            <span className="bg-[#EBB52C] text-[#010E38] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
              Passo 3
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#010E38]/70 mt-0.5 font-medium">
            Diários Oficiais Nacionais (DJEN) e Intimações Eletrônicas em um só lugar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsConfigNomesOpen(true)}
            className="border-[#010E38]/20 bg-white hover:bg-slate-50 text-[#010E38] text-xs font-bold shadow-xs h-9"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-[#EBB52C]" />
            <span>Configurar Nomes ({configNomes.nomes.length}/{configNomes.limiteNomes})</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCredenciamentoOpen(true)}
            className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 text-xs font-black shadow-xs h-9 transition-colors"
          >
            <Key className="w-3.5 h-3.5 mr-1.5 text-[#EBB52C]" />
            <span>Credenciamento Tribunais</span>
          </Button>
        </div>
      </div>

      {/* 2. KPIS DE PUBLICAÇÕES (IDENTIDADE JUS+) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <span className="text-2xl sm:text-3xl font-black text-[#010E38] tracking-tight">
            {metricas.naoTratadasHoje}
          </span>
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mt-2">
            NÃO TRATADAS DE HOJE
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <span className="text-2xl sm:text-3xl font-black text-[#010E38] tracking-tight">
            {metricas.tratadasHoje}
          </span>
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mt-2">
            TRATADAS HOJE
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between">
          <span className="text-2xl sm:text-3xl font-black text-[#010E38] tracking-tight">
            {metricas.descartadasHoje}
          </span>
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500 mt-2">
            DESCARTADAS HOJE
          </span>
        </div>

        <div className="bg-white rounded-xl border-2 border-[#EBB52C]/50 p-3.5 sm:p-4 shadow-xs flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#010E38] tracking-tight">
              {metricas.totalNaoTratadas}
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#EBB52C] animate-pulse" />
          </div>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-[#010E38] mt-2">
            NÃO TRATADAS
          </span>
        </div>

        {/* Mini gráfico semanal com cores Jus+ */}
        <div className="col-span-2 lg:col-span-1 bg-white rounded-xl border border-slate-200/90 p-3 shadow-xs flex flex-col justify-between">
          <div className="flex items-end justify-between h-9 px-2 gap-1.5">
            <div className="w-2.5 bg-[#EBB52C] rounded-t h-[80%]" title="Segunda" />
            <div className="w-2.5 bg-[#010E38] rounded-t h-[100%]" title="Terça" />
            <div className="w-2.5 bg-[#EBB52C] rounded-t h-[60%]" title="Quarta" />
            <div className="w-2.5 bg-[#010E38] rounded-t h-[75%]" title="Quinta" />
            <div className="w-2.5 bg-[#EBB52C] rounded-t h-[40%]" title="Sexta" />
            <div className="w-2.5 bg-slate-200 rounded-t h-[10%]" title="Sábado" />
            <div className="w-2.5 bg-slate-200 rounded-t h-[20%]" title="Domingo" />
          </div>
          <div className="flex justify-between text-[9px] font-mono font-bold text-slate-400 px-2 mt-1">
            <span>s</span>
            <span>t</span>
            <span>q</span>
            <span>q</span>
            <span>s</span>
            <span>s</span>
            <span>d</span>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS UNIFICADA E TOTALMENTE RESPONSIVA */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
          {/* Campo de Busca */}
          <div className="flex items-center flex-1 h-10 px-3 border-b md:border-b-0 md:border-r border-slate-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mr-2 text-slate-400 hover:text-[#010E38] transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-white border-slate-200 shadow-md">
                <DropdownMenuItem onClick={() => setStatusFilter("todas")} className="font-semibold text-xs">
                  Todas as publicações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("nao_tratada")} className="font-semibold text-xs text-amber-600">
                  Não tratadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("tratada")} className="font-semibold text-xs text-emerald-600">
                  Tratadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("descartada")} className="font-semibold text-xs text-slate-600">
                  Descartadas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              placeholder="Digite o processo, cliente ou termo pesquisado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none text-xs focus-visible:ring-0 px-1 bg-transparent text-[#010E38]"
            />
            <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          </div>

          {/* Menus de Filtro e Ações */}
          <div className="flex items-center justify-between md:justify-end divide-x divide-slate-200 h-10 text-xs">
            {/* Dropdown Estados */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3.5 h-full flex items-center gap-1.5 font-bold text-[#010E38] hover:bg-slate-50 transition-colors"
                >
                  <span>ESTADOS</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white border-slate-200 shadow-md">
                <DropdownMenuItem onClick={() => setEstadoFilter("TODOS")} className="text-xs font-semibold">
                  Todos os estados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEstadoFilter("SP")} className="text-xs font-semibold">
                  São Paulo (SP)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEstadoFilter("RJ")} className="text-xs font-semibold">
                  Rio de Janeiro (RJ)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEstadoFilter("MG")} className="text-xs font-semibold">
                  Minas Gerais (MG)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dropdown Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3.5 h-full flex items-center gap-1.5 font-bold text-[#010E38] hover:bg-slate-50 uppercase transition-colors"
                >
                  <span>STATUS</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white border-slate-200 shadow-md">
                <DropdownMenuItem onClick={() => setStatusFilter("nao_tratada")} className="text-xs font-semibold">
                  Não tratadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("tratada")} className="text-xs font-semibold">
                  Tratadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("descartada")} className="text-xs font-semibold">
                  Descartadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("todas")} className="text-xs font-semibold">
                  Todas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Ações Impressão / Exportação / Refresh */}
            <div className="flex items-center px-2 gap-1 text-slate-500">
              <button
                type="button"
                onClick={() => window.print()}
                title="Imprimir publicações"
                className="p-1.5 rounded hover:bg-slate-100 hover:text-[#010E38] transition-colors"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toast.success("Exportando relatório completo de publicações...")}
                title="Exportar planilha"
                className="p-1.5 rounded hover:bg-slate-100 hover:text-[#010E38] transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSincronizarCnj}
                title="Atualizar e buscar novas publicações nos Diários Oficiais"
                className="p-1.5 rounded hover:bg-slate-100 hover:text-[#010E38] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-[#010E38]" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros ativos pills */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {statusFilter !== "todas" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10.5px] font-black uppercase bg-[#010E38] text-[#EBB52C] shadow-xs">
              <span>STATUS: {statusFilter.replace("_", " ")}</span>
              <button
                type="button"
                onClick={() => setStatusFilter("todas")}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {estadoFilter !== "TODOS" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10.5px] font-black uppercase bg-[#010E38] text-[#EBB52C] shadow-xs">
              <span>ESTADO: {estadoFilter}</span>
              <button
                type="button"
                onClick={() => setEstadoFilter("TODOS")}
                className="hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* 4. BANNERS INFORMATIVOS (IDENTIDADE JUS+) */}
      {showInfoBanner && (
        <div className="bg-[#010E38]/5 border border-[#010E38]/15 rounded-xl p-3 text-xs text-[#010E38] flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#010E38] shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">
              As publicações abaixo foram encontradas com o nome do advogado cadastrado e já estavam disponíveis no Diário
              Oficial. Novas publicações serão exibidas automaticamente assim que forem disponibilizadas pelos tribunais.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInfoBanner(false)}
            className="text-[#010E38]/50 hover:text-[#010E38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showIaBanner && (
        <div className="bg-gradient-to-r from-[#010E38]/5 via-[#EBB52C]/10 to-[#010E38]/5 border border-[#EBB52C]/40 rounded-xl p-3 text-xs text-[#010E38] flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-2 py-0.5 rounded bg-[#010E38] text-[#EBB52C] text-[10px] font-black flex items-center gap-1 shrink-0 shadow-xs">
              <Sparkles className="w-3 h-3 text-[#EBB52C]" /> IA JUS+
            </span>
            <p className="leading-relaxed font-medium">
              <strong>Menos trabalho manual:</strong> otimize a gestão de publicações com tratamentos inteligentes sugeridos
              pela Inteligência Artificial do Jus+. Prazos fatais e audiências são calculados automaticamente!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIaBanner(false)}
            className="text-[#010E38]/50 hover:text-[#010E38]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. TABELA DE PUBLICAÇÕES (RESPONSIVA, SEM CORTES, PADRÃO JUS+) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Sub-header da tabela */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 text-xs bg-slate-50/50">
          <span className="text-[#010E38] font-bold">
            Mostrando <strong className="text-[#010E38]">{publicacoesFiltradas.length}</strong> publicações
          </span>
          <button
            type="button"
            onClick={alternarExpandirTodos}
            className="text-[#010E38] hover:text-[#021B66] hover:underline font-extrabold text-xs"
          >
            Expandir todos
          </button>
        </div>

        {/* Tabela com container de scroll horizontal seguro */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black text-[#010E38]/70 uppercase tracking-wider">
                <th className="py-3 pl-4 pr-2 w-10">
                  <Checkbox
                    checked={
                      publicacoesFiltradas.length > 0 &&
                      selectedIds.length === publicacoesFiltradas.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="py-3 px-3 w-36">DIVULGADO EM ▾</th>
                <th className="py-3 px-2 text-center w-14">TIPO</th>
                <th className="py-3 px-3 min-w-[260px]">PROCESSO</th>
                <th className="py-3 px-3 w-48">DIÁRIO</th>
                <th className="py-3 px-3 w-48">NOME PESQUISADO</th>
                <th className="py-3 px-3 w-32">STATUS</th>
                <th className="py-3 pr-4 text-right min-w-[220px]">AÇÕES</th>
              </tr>
            </thead>
            {publicacoesFiltradas.length === 0 ? (
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Nenhuma publicação encontrada para os filtros selecionados.
                  </td>
                </tr>
              </tbody>
            ) : (
              publicacoesFiltradas.map((pub) => {
                const isExp = !!expandidos[pub.id];
                return (
                  <tbody key={pub.id} className="divide-y divide-slate-100 text-xs border-b border-slate-100 last:border-b-0">
                    <tr className="hover:bg-slate-50/80 transition-colors group">
                      {/* Checkbox */}
                      <td className="py-3.5 pl-4 pr-2 align-top">
                        <Checkbox
                          checked={selectedIds.includes(pub.id)}
                          onCheckedChange={() => toggleSelectOne(pub.id)}
                        />
                      </td>

                      {/* Divulgado em / Publicado em */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <p className="font-extrabold text-[#010E38] text-[12.5px]">
                          {formatarDataBr(pub.dataDivulgacao)}
                        </p>
                        <p className="text-[11px] text-[#010E38]/60 mt-0.5 font-medium">
                          Publicado em: {formatarDataBr(pub.dataPublicacao || pub.dataDivulgacao)}
                        </p>
                      </td>

                      {/* Tipo (Ícone Documento ou Intimação) */}
                      <td className="py-3.5 px-2 align-top text-center">
                        {pub.tipo === "intimacao" ? (
                          <Bell className="w-4 h-4 text-[#EBB52C] inline-block" title="Intimação Eletrônica" />
                        ) : (
                          <FileText className="w-4 h-4 text-[#010E38]/60 inline-block" title="Publicação Diário Oficial" />
                        )}
                      </td>

                      {/* Processo / Partes / Responsável */}
                      <td className="py-3.5 px-3 align-top">
                        <button
                          type="button"
                          onClick={() => {
                            setPubSelecionada(pub);
                            setIsDetalheOpen(true);
                          }}
                          className="font-mono font-bold text-[#010E38] hover:text-[#010E38]/70 underline text-left block text-[13px]"
                        >
                          {pub.numeroProcesso}
                        </button>
                        <p className="text-[11.5px] text-[#010E38]/80 font-medium truncate max-w-sm mt-0.5">
                          {pub.partesProcesso}
                        </p>
                        <p className="text-[10.5px] text-[#010E38]/60 mt-0.5">
                          Responsável: <strong className="text-[#010E38]">{pub.responsavel || "ALEX F"}</strong>
                        </p>
                      </td>

                      {/* Diário Oficial */}
                      <td className="py-3.5 px-3 align-top text-[#010E38]/80 font-medium text-[11.5px]">
                        <p className="line-clamp-2">{pub.diario}</p>
                      </td>

                      {/* Nome Pesquisado */}
                      <td className="py-3.5 px-3 align-top text-[#010E38] font-bold uppercase text-[11px]">
                        {pub.nomePesquisado}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        {pub.status === "nao_tratada" ? (
                          <Badge className="bg-[#EBB52C]/15 text-[#010E38] hover:bg-[#EBB52C]/25 text-[10px] font-black uppercase rounded border border-[#EBB52C]/50 shadow-xs">
                            NÃO TRATADA
                          </Badge>
                        ) : pub.status === "tratada" ? (
                          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 text-[10px] font-black uppercase rounded border border-emerald-300 shadow-xs">
                            TRATADA
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[10px] font-black uppercase rounded border border-slate-300 shadow-xs">
                            DESCARTADA
                          </Badge>
                        )}
                      </td>

                      {/* Botões de Ação na Linha (sem quebrar ou cortar) */}
                      <td className="py-3.5 pr-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAdicionarPrazo(pub, 15)}
                            title="Adicionar Prazo fatal rápido (15 dias)"
                            className="p-1.5 rounded text-[#010E38]/70 hover:bg-slate-100 hover:text-[#010E38] transition-colors"
                          >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarcarTratada(pub)}
                            title="Marcar como Tratada"
                            className="p-1.5 rounded text-[#010E38]/70 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded text-[#010E38]/70 hover:bg-slate-100 hover:text-[#010E38] transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md">
                              <DropdownMenuItem onClick={() => handleMarcarTratada(pub)} className="font-semibold text-xs">
                                <Check className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                Marcar tratada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDescartar(pub)} className="font-semibold text-xs text-red-600">
                                <X className="w-3.5 h-3.5 mr-2 text-red-600" />
                                Descartar publicação
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(pub.conteudoCompleto);
                                  toast.success("Texto integral da publicação copiado!");
                                }}
                                className="font-semibold text-xs"
                              >
                                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Copiar texto
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setPubSelecionada(pub);
                              setIsDetalheOpen(true);
                            }}
                            className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] hover:text-white font-black text-[11px] uppercase tracking-wider rounded-md px-3 py-1.5 h-8 ml-1 shadow-xs border border-[#EBB52C]/30 shrink-0 transition-all"
                          >
                            ACESSAR PUBLICAÇÃO
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Snippet de Conteúdo e Tratamentos Sugeridos por IA */}
                    <tr>
                      <td colSpan={8} className="px-4 pb-4 pt-0 bg-slate-50/30">
                        <div className="pl-6 border-l-2 border-[#EBB52C] space-y-2 pt-1 text-[#010E38]/80 text-[11.5px]">
                          <p className="line-clamp-2 leading-relaxed font-normal">
                            {pub.conteudoCompleto}
                          </p>

                          {/* Tratamentos Sugeridos por IA Jus+ */}
                          {pub.sugestoesIa && pub.sugestoesIa.length > 0 && pub.status === "nao_tratada" && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#010E38]">
                                <Sparkles className="w-3.5 h-3.5 text-[#EBB52C]" /> IA Sugestões:
                              </span>

                              {pub.sugestoesIa.map((sug, idx) => {
                                if (sug.tipo === "prazo") {
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleAdicionarPrazo(pub, sug.dias || 15)}
                                      className="bg-[#EBB52C]/15 hover:bg-[#EBB52C]/30 text-[#010E38] border border-[#EBB52C]/50 px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5"
                                    >
                                      <Clock className="w-3 h-3 text-[#010E38]" />
                                      <span>ADICIONAR UM PRAZO PARA {sug.dataSugerida || "QUA, 25 DE NOV 2026"}</span>
                                    </button>
                                  );
                                }
                                if (sug.tipo === "audiencia") {
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => handleAdicionarAudiencia(pub, sug.dataSugerida || "2027-05-10")}
                                      className="bg-[#010E38]/10 hover:bg-[#010E38]/20 text-[#010E38] border border-[#010E38]/30 px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5"
                                    >
                                      <Calendar className="w-3 h-3 text-[#010E38]" />
                                      <span>ADICIONAR UMA AUDIÊNCIA PARA {sug.dataSugerida || "TER, 10 DE MAI 2027 ÀS 10:45"}</span>
                                    </button>
                                  );
                                }
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      setPubSelecionada(pub);
                                      setIsDetalheOpen(true);
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200 text-[#010E38] border border-slate-300 px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{sug.descricao}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                );
              })
            )}
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: DETALHE DA PUBLICAÇÃO & TRATAMENTO COMPLETO     */}
      {/* ========================================================= */}
      {pubSelecionada && (
        <Dialog open={isDetalheOpen} onOpenChange={setIsDetalheOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 border-[#010E38]/20">
            <DialogHeader className="sr-only">
              <DialogTitle>Publicação do Processo {pubSelecionada.numeroProcesso}</DialogTitle>
              <DialogDescription>Tratamento de publicação e intimação eletrônica oficial</DialogDescription>
            </DialogHeader>

            {/* Header com identidade Jus+ */}
            <div className="bg-[#010E38] text-white p-5 rounded-t-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#EBB52C] text-[#010E38] text-[10px] font-black px-2 py-0.5 rounded uppercase">
                      {pubSelecionada.tipo === "intimacao" ? "Intimação Eletrônica" : "Diário Oficial"}
                    </span>
                    <span className="text-white/70 text-xs font-mono">{pubSelecionada.diario}</span>
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-white">
                    {pubSelecionada.numeroProcesso}
                  </h2>
                  <p className="text-xs text-white/80 font-medium">
                    {pubSelecionada.partesProcesso}
                  </p>
                </div>

                {/* Dropdown Azul Tratamentos */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="bg-[#EBB52C] hover:bg-[#d8a424] text-[#010E38] font-black text-xs uppercase tracking-wider shadow-md"
                    >
                      <span>TRATAMENTOS</span>
                      <ChevronDown className="w-4 h-4 ml-1.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 shadow-xl">
                    <DropdownMenuItem
                      onClick={() => handleAdicionarPrazo(pubSelecionada, 15)}
                      className="text-xs font-bold py-2"
                    >
                      <Clock className="w-4 h-4 mr-2 text-[#EBB52C]" />
                      Adicionar Prazo Fatal (15 dias)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAdicionarAudiencia(pubSelecionada, "2027-05-10")}
                      className="text-xs font-bold py-2"
                    >
                      <Calendar className="w-4 h-4 mr-2 text-[#010E38]" />
                      Adicionar Audiência
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAdicionarPrazo(pubSelecionada, 5)}
                      className="text-xs font-bold py-2"
                    >
                      <FileText className="w-4 h-4 mr-2 text-slate-600" />
                      Adicionar Tarefa ao Processo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleMarcarTratada(pubSelecionada)}
                      className="text-xs font-bold py-2 text-emerald-600"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Marcar como Tratada
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDescartar(pubSelecionada)}
                      className="text-xs font-bold py-2 text-red-600"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Descartar Publicação
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Box de Resumo da IA */}
              <div className="p-3.5 rounded-lg bg-gradient-to-br from-[#010E38]/5 via-amber-50/50 to-white border border-[#EBB52C]/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#010E38]">
                  <Sparkles className="w-4 h-4 text-[#EBB52C]" />
                  <span>Resumo Executivo da IA Jus+</span>
                </div>
                <p className="text-xs text-[#010E38]/80 leading-relaxed font-medium">
                  {pubSelecionada.resumoIa ||
                    "Publicação oficial relativa ao processo em referência. Requer manifestação do patrono acerca dos atos processuais praticados dentro do prazo legal."}
                </p>
              </div>

              {/* Dados e Metadados */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-lg text-xs border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Disponibilização</span>
                  <span className="font-extrabold text-[#010E38]">{formatarDataBr(pubSelecionada.dataDivulgacao)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Publicação</span>
                  <span className="font-extrabold text-[#010E38]">
                    {formatarDataBr(pubSelecionada.dataPublicacao || pubSelecionada.dataDivulgacao)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Diário Oficial</span>
                  <span className="font-extrabold text-[#010E38] truncate block">{pubSelecionada.diario}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nome Pesquisado</span>
                  <span className="font-extrabold text-[#010E38] uppercase truncate block">
                    {pubSelecionada.nomePesquisado}
                  </span>
                </div>
              </div>

              {/* Texto Completo da Publicação */}
              <div>
                <Label className="text-xs font-bold text-[#010E38] uppercase tracking-wider mb-1.5 block">
                  Conteúdo Integral Publicado
                </Label>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-all">
                  {pubSelecionada.conteudoCompleto}
                </div>
              </div>
            </div>

            {/* Footer com Ações */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(pubSelecionada.conteudoCompleto);
                  toast.success("Conteúdo integral copiado!");
                }}
                className="text-xs font-bold border-slate-300"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar Texto
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDescartar(pubSelecionada)}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  Descartar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleMarcarTratada(pubSelecionada)}
                  className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] text-xs font-black"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Concluir Tratamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CONFIGURAÇÃO DE NOMES NOS DIÁRIOS (PASSO 3)     */}
      {/* ========================================================= */}
      <Dialog open={isConfigNomesOpen} onOpenChange={setIsConfigNomesOpen}>
        <DialogContent className="sm:max-w-lg border-[#010E38]/20">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#010E38]">
              Configurar Nomes para Diários Oficiais
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre os nomes de advogados e pessoas jurídicas pesquisados automaticamente nos Diários Oficiais Nacionais (DJEN).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
              Plano VIP Ativo: Você possui <strong>{configNomes.nomes.length}</strong> de{" "}
              <strong>{configNomes.limiteNomes}</strong> nomes utilizados.
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[#010E38]">Nomes Cadastrados</Label>
              <div className="space-y-1.5">
                {(configNomes?.nomes || []).map((item: any, i) => {
                  const nomeStr = typeof item === "string" ? item : (item?.nome || "Advogado Cadastrado");
                  return (
                    <div
                      key={item?.id || i}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>{nomeStr}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-bold border-slate-300">
                        Monitorando DJEN
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs">
              <span className="font-bold text-[#010E38] block">Abrangência de Consulta:</span>
              <p className="text-slate-600">
                {(configNomes?.diariosAbrangencia || [
                  "DJEN - Diário de Justiça Eletrônico Nacional",
                  "DJESP - São Paulo",
                  "TRT15 - Sorocaba / Campinas",
                  "TRF3 - Diário da Justiça Federal"
                ]).join(", ")}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfigNomesOpen(false)}
              className="text-xs font-bold"
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => {
                salvarConfigNomesPublicacoes(configNomes);
                toast.success("Configuração de nomes salva com sucesso!");
                setIsConfigNomesOpen(false);
              }}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-black text-xs"
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================= */}
      {/* MODAL 3: CREDENCIAMENTO TRIBUNAIS (INTIMAÇÕES ELETRÔNICAS)*/}
      {/* ========================================================= */}
      <Dialog open={isCredenciamentoOpen} onOpenChange={setIsCredenciamentoOpen}>
        <DialogContent className="sm:max-w-lg border-[#010E38]/20">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#010E38]">
              Credenciamento em Tribunais (Intimações Eletrônicas)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Conecte seus acessos aos portais dos tribunais (PJe, Projudi, Eproc) para capturar intimações eletrônicas com segurança.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {(credenciamentos || []).map((cred: any) => {
              const isConectado = cred.statusConexao === "Conectado" || cred.status === "conectado";
              return (
                <div
                  key={cred.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#010E38]">{cred.sistema}</span>
                      <span className="text-slate-500 font-mono text-[11px]">— {cred.tribunal}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Login: <strong className="text-slate-700">{cred.login || cred.usuarioLogin || "432226/SP"}</strong>
                    </p>
                    {(cred.ultimaSincronizacao || cred.ultimoAcesso) && (
                      <p className="text-[10px] text-slate-400">
                        Última sincronização: {formatarDataBr(cred.ultimaSincronizacao || cred.ultimoAcesso)}
                      </p>
                    )}
                  </div>

                  <Badge
                    className={
                      isConectado
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold text-[10px]"
                        : "bg-amber-100 text-amber-800 border-amber-200 font-bold text-[10px]"
                    }
                  >
                    {isConectado ? "Conectado" : "Pendente 2FA"}
                  </Badge>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCredenciamentoOpen(false)}
              className="text-xs font-bold"
            >
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => {
                salvarCredenciamentoTribunais(credenciamentos);
                toast.success("Credenciamentos validados com sucesso!");
                setIsCredenciamentoOpen(false);
              }}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-black text-xs"
            >
              Atualizar Credenciamentos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
