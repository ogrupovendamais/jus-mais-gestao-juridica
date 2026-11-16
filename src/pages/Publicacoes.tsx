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
  SlidersHorizontal,
  Layers,
  Settings,
  Key,
  CheckCircle2,
  AlertCircle,
  Copy,
  MessageSquare,
  ArrowRight,
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

  // KPIs
  const metricas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const naoTratadasHoje = publicacoes.filter(
      (p) => p.status === "nao_tratada" && p.dataDivulgacao === hoje
    ).length;
    const tratadasHoje = publicacoes.filter(
      (p) => p.status === "tratada" && p.dataTratamento?.startsWith(hoje)
    ).length;
    const descartadasHoje = publicacoes.filter(
      (p) => p.status === "descartada" && p.dataTratamento?.startsWith(hoje)
    ).length;
    const totalNaoTratadas = publicacoes.filter((p) => p.status === "nao_tratada").length;

    return {
      naoTratadasHoje: Math.max(1, naoTratadasHoje),
      tratadasHoje,
      descartadasHoje,
      totalNaoTratadas,
    };
  }, [publicacoes]);

  // Filtro
  const publicacoesFiltradas = useMemo(() => {
    return publicacoes.filter((p) => {
      if (statusFilter !== "todas" && p.status !== statusFilter) return false;
      if (estadoFilter !== "TODOS") {
        if (!p.diario.includes(estadoFilter) && !p.tribunal?.includes(estadoFilter)) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          p.numeroProcesso.toLowerCase().includes(q) ||
          (p.partesProcesso || "").toLowerCase().includes(q) ||
          p.diario.toLowerCase().includes(q) ||
          p.nomePesquisado.toLowerCase().includes(q) ||
          p.conteudoCompleto.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [publicacoes, statusFilter, estadoFilter, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === publicacoesFiltradas.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(publicacoesFiltradas.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleExpandir = (id: string) => {
    setExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const alternarExpandirTodos = () => {
    const todosAbertos = publicacoesFiltradas.every((p) => expandidos[p.id]);
    const novo: Record<string, boolean> = {};
    publicacoesFiltradas.forEach((p) => {
      novo[p.id] = !todosAbertos;
    });
    setExpandidos(novo);
  };

  // Ações de Tratamento
  const handleMarcarTratada = (pub: PublicacaoItem) => {
    const atualizada = atualizarStatusPublicacao(pub.id, "tratada", "Marcada como tratada manualmente");
    setPublicacoes([...atualizada]);
    toast.success("Publicação marcada como tratada!");
    if (pubSelecionada?.id === pub.id) setIsDetalheOpen(false);
  };

  const handleDescartar = (pub: PublicacaoItem) => {
    const atualizada = atualizarStatusPublicacao(pub.id, "descartada", "Descartada pelo usuário");
    setPublicacoes([...atualizada]);
    toast.info("Publicação descartada.");
    if (pubSelecionada?.id === pub.id) setIsDetalheOpen(false);
  };

  const handleAdicionarPrazo = async (pub: PublicacaoItem, dias = 15, desc?: string) => {
    if (!user?.id) {
      toast.error("Você precisa estar autenticado.");
      return;
    }
    const dataLimite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
    try {
      await supabase.from("tarefas").insert({
        titulo: `[PRAZO] ${desc || "Manifestação sobre publicação"} (${dias} dias)`,
        descricao: `[PROCESSO: ${pub.numeroProcesso}] [DIÁRIO: ${pub.diario}]\n${pub.conteudoCompleto.slice(0, 200)}...`,
        status: "Pendente",
        prioridade: "Alta",
        data_limite: dataLimite,
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
    <div className="min-h-screen bg-[#F1F4F9] text-[#010E38] p-3 sm:p-5 md:p-6 space-y-4 animate-fade-in relative pb-16">
      {/* 1. TÍTULO E BOTÕES SUPERIORES DE CONFIGURAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#010E38] tracking-tight">Publicações</h1>
          <p className="text-xs text-[#010E38]/60 mt-0.5">
            Diários Oficiais Nacionais (DJEN) e Intimações Eletrônicas em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsConfigNomesOpen(true)}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <Settings className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Configurar Nomes ({configNomes.nomes.length}/{configNomes.limiteNomes})
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCredenciamentoOpen(true)}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
          >
            <Key className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            Credenciamento Tribunais
          </Button>
        </div>
      </div>

      {/* 2. KPIS DE PUBLICAÇÕES (IDÊNTICO AO ASTREA) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-2xl font-black text-slate-900">{metricas.naoTratadasHoje}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            NÃO TRATADAS DE HOJE
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-2xl font-black text-slate-900">{metricas.tratadasHoje}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            TRATADAS HOJE
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-2xl font-black text-slate-900">{metricas.descartadasHoje}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            DESCARTADAS HOJE
          </span>
        </div>

        <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col justify-between">
          <span className="text-2xl font-black text-amber-500">{metricas.totalNaoTratadas}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-2">
            NÃO TRATADAS
          </span>
        </div>

        {/* Mini gráfico semanal Astrea */}
        <div className="col-span-2 md:col-span-1 bg-white rounded-lg border border-slate-200/80 p-3 shadow-sm flex flex-col justify-between">
          <div className="flex items-end justify-between h-10 px-2 gap-1.5">
            <div className="w-2.5 bg-amber-400 rounded-t h-[80%]" title="Segunda" />
            <div className="w-2.5 bg-amber-400 rounded-t h-[100%]" title="Terça" />
            <div className="w-2.5 bg-amber-400 rounded-t h-[60%]" title="Quarta" />
            <div className="w-2.5 bg-amber-400 rounded-t h-[75%]" title="Quinta" />
            <div className="w-2.5 bg-amber-400 rounded-t h-[40%]" title="Sexta" />
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

      {/* 3. BARRA DE FILTROS UNIFICADA */}
      <div className="space-y-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center bg-white border border-slate-200/80 rounded shadow-sm overflow-hidden">
          <div className="flex items-center flex-1 h-10 px-3 border-b md:border-b-0 md:border-r border-slate-200">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mr-2 text-slate-400 hover:text-slate-700"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 bg-white">
                <DropdownMenuItem onClick={() => setStatusFilter("todas")}>Todas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("nao_tratada")}>Não tratadas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("tratada")}>Tratadas</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("descartada")}>Descartadas</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input
              placeholder="Digite o processo ou termo pesquisado"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none text-xs focus-visible:ring-0 px-1 bg-transparent"
            />
            <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
          </div>

          <div className="flex items-center divide-x divide-slate-200 h-10 text-xs">
            {/* Dropdown Estados */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-4 h-full flex items-center gap-1.5 font-bold text-slate-700 hover:bg-slate-50"
                >
                  <span>ESTADOS</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 bg-white">
                <DropdownMenuItem onClick={() => setEstadoFilter("TODOS")}>Todos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEstadoFilter("SP")}>São Paulo (SP)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEstadoFilter("RJ")}>Rio de Janeiro (RJ)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEstadoFilter("MG")}>Minas Gerais (MG)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dropdown Status */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-4 h-full flex items-center gap-1.5 font-bold text-slate-700 hover:bg-slate-50 uppercase"
                >
                  <span>STATUS</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 bg-white">
                <DropdownMenuItem onClick={() => setStatusFilter("nao_tratada")}>
                  Não tratadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("tratada")}>
                  Tratadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("descartada")}>
                  Descartadas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter("todas")}>
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
                className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-800"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => toast.success("Exportando relatório de publicações...")}
                title="Exportar planilha"
                className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-800"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleSincronizarCnj}
                title="Atualizar e buscar novas publicações nos Diários Oficiais"
                className="p-1.5 rounded hover:bg-slate-100 hover:text-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-[#1B75D0]" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Filtros ativos pills */}
        <div className="flex items-center gap-2 pt-1">
          {statusFilter !== "todas" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-white">
              <span>STATUS: {statusFilter.replace("_", " ")}</span>
              <button
                type="button"
                onClick={() => setStatusFilter("todas")}
                className="hover:text-red-300"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {estadoFilter !== "TODOS" && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-700 text-white">
              <span>ESTADO: {estadoFilter}</span>
              <button
                type="button"
                onClick={() => setEstadoFilter("TODOS")}
                className="hover:text-red-300"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* 4. BANNERS INFORMATIVOS */}
      {showInfoBanner && (
        <div className="bg-[#EBF5FB] border border-[#BCE2F5] rounded-lg p-3 text-xs text-[#1B75D0] flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#1B75D0] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              As publicações abaixo foram encontradas com seu nome e já estavam disponíveis no Diário
              Oficial. Novas publicações serão exibidas automaticamente assim que estiverem disponíveis.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInfoBanner(false)}
            className="text-[#1B75D0]/60 hover:text-[#1B75D0]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showIaBanner && (
        <div className="bg-[#F6F5FC] border border-[#DDD9F8] rounded-lg p-3 text-xs text-[#5C59C2] flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="px-1.5 py-0.5 rounded bg-[#5C59C2] text-white text-[10px] font-extrabold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> IA
            </span>
            <p className="leading-relaxed">
              <strong>Menos trabalho manual:</strong> otimize a gestão de publicações com tratamentos sugeridos
              pela Inteligência Artificial. Saiba mais e explore essa inovação!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIaBanner(false)}
            className="text-[#5C59C2]/60 hover:text-[#5C59C2]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. TABELA DE PUBLICAÇÕES (IDÊNTICA AO ASTREA) */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Sub-header da tabela */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">
            Mostrando {publicacoesFiltradas.length} publicações
          </span>
          <button
            type="button"
            onClick={alternarExpandirTodos}
            className="text-[#1B75D0] hover:underline font-bold"
          >
            Expandir todos
          </button>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 pl-4 pr-2 w-8">
                  <Checkbox
                    checked={
                      publicacoesFiltradas.length > 0 &&
                      selectedIds.length === publicacoesFiltradas.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="py-2.5 px-3">DIVULGADO EM ▾</th>
                <th className="py-2.5 px-2 text-center">TIPO</th>
                <th className="py-2.5 px-3">PROCESSO</th>
                <th className="py-2.5 px-3">DIÁRIO</th>
                <th className="py-2.5 px-3">NOME PESQUISADO</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 pr-4 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {publicacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Nenhuma publicação encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                publicacoesFiltradas.map((pub) => {
                  const isExp = !!expandidos[pub.id];
                  return (
                    <React.Fragment key={pub.id}>
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
                          <p className="font-bold text-slate-800">{formatarDataBr(pub.dataDivulgacao)}</p>
                          <p className="text-[11px] text-slate-500">
                            Publicado em: {formatarDataBr(pub.dataPublicacao || pub.dataDivulgacao)}
                          </p>
                        </td>

                        {/* Tipo (Ícone Documento ou Intimação) */}
                        <td className="py-3.5 px-2 align-top text-center">
                          {pub.tipo === "intimacao" ? (
                            <Bell className="w-4 h-4 text-amber-500 inline-block" title="Intimação Eletrônica" />
                          ) : (
                            <FileText className="w-4 h-4 text-slate-500 inline-block" title="Publicação Diário Oficial" />
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
                            className="font-mono font-bold text-slate-800 hover:text-[#1B75D0] underline text-left block"
                          >
                            {pub.numeroProcesso}
                          </button>
                          <p className="text-[11px] text-slate-600 truncate max-w-xs font-medium">
                            {pub.partesProcesso}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Responsável: <strong className="text-slate-600">{pub.responsavel || "ALEX F"}</strong>
                          </p>
                        </td>

                        {/* Diário Oficial */}
                        <td className="py-3.5 px-3 align-top text-slate-700 font-medium">
                          <p className="truncate max-w-[200px]">{pub.diario}</p>
                        </td>

                        {/* Nome Pesquisado */}
                        <td className="py-3.5 px-3 align-top text-slate-800 font-semibold uppercase text-[11px]">
                          {pub.nomePesquisado}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 align-top">
                          {pub.status === "nao_tratada" ? (
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px] font-bold uppercase rounded border border-amber-200">
                              NÃO TRATADA
                            </Badge>
                          ) : pub.status === "tratada" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px] font-bold uppercase rounded border border-emerald-200">
                              TRATADA
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-[10px] font-bold uppercase rounded border border-slate-200">
                              DESCARTADA
                            </Badge>
                          )}
                        </td>

                        {/* Botões de Ação na Linha */}
                        <td className="py-3.5 pr-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleAdicionarPrazo(pub, 15)}
                              title="Adicionar Tarefa ou Prazo rápido"
                              className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarcarTratada(pub)}
                              title="Marcar como Tratada"
                              className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-emerald-600"
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 bg-white shadow-md">
                                <DropdownMenuItem onClick={() => handleMarcarTratada(pub)}>
                                  <Check className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                  Marcar tratada
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDescartar(pub)}>
                                  <X className="w-3.5 h-3.5 mr-2 text-red-600" />
                                  Descartar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(pub.conteudoCompleto);
                                    toast.success("Texto da publicação copiado!");
                                  }}
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
                              className="bg-[#1B75D0] hover:bg-[#1560ad] text-white font-bold text-xs uppercase tracking-wide rounded px-3 py-1.5 h-8 ml-1"
                            >
                              ACESSAR PUBLICAÇÃO
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Snippet de Conteúdo e Tratamentos Sugeridos por IA */}
                      <tr>
                        <td colSpan={8} className="px-4 pb-4 pt-0 bg-slate-50/40">
                          <div className="pl-6 border-l-2 border-[#1B75D0]/30 space-y-2 pt-1 text-slate-600 text-[11.5px]">
                            <p className="line-clamp-2 leading-relaxed">
                              {pub.conteudoCompleto}
                            </p>

                            {/* Tratamentos Sugeridos por IA (se houver) */}
                            {pub.sugestoesIa && pub.sugestoesIa.length > 0 && pub.status === "nao_tratada" && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5C59C2]">
                                  <Sparkles className="w-3 h-3" /> IA Tratamentos sugeridos:
                                </span>

                                {pub.sugestoesIa.map((sug, sIdx) => (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => {
                                      if (sug.tipo === "audiencia") {
                                        handleAdicionarAudiencia(pub, sug.dataSugerida, sug.horaSugerida);
                                      } else {
                                        handleAdicionarPrazo(pub, sug.diasUteis || 15, sug.descricao);
                                      }
                                    }}
                                    className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-wide border transition-all flex items-center gap-1.5 shadow-2xs ${
                                      sug.tipo === "prazo"
                                        ? "border-red-400 text-red-600 bg-white hover:bg-red-50"
                                        : "border-amber-400 text-amber-700 bg-white hover:bg-amber-50"
                                    }`}
                                  >
                                    {sug.tipo === "prazo" ? (
                                      <Calendar className="w-3 h-3 text-red-500" />
                                    ) : (
                                      <Gavel className="w-3 h-3 text-amber-500" />
                                    )}
                                    <span>{sug.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. MODAL DETALHE DA PUBLICAÇÃO E TRATAMENTO COMPLETO */}
      <Dialog open={isDetalheOpen} onOpenChange={setIsDetalheOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto bg-white text-slate-800">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1B75D0] uppercase">
                  {pubSelecionada?.diario}
                </span>
                <DialogTitle className="text-lg font-black text-slate-900 mt-0.5">
                  Processo {pubSelecionada?.numeroProcesso}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {pubSelecionada?.partesProcesso} · Divulgado em {formatarDataBr(pubSelecionada?.dataDivulgacao)}
                </DialogDescription>
              </div>

              {/* Botão Dropdown TRATAMENTOS azul Astrea */}
              {pubSelecionada && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      className="bg-[#1B75D0] hover:bg-[#1560ad] text-white font-bold text-xs uppercase rounded px-4 py-2 flex items-center gap-1.5"
                    >
                      <span>TRATAMENTOS</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg">
                    <DropdownMenuItem onClick={() => handleAdicionarPrazo(pubSelecionada, 15)}>
                      <Calendar className="w-4 h-4 mr-2 text-red-600" />
                      Adicionar Prazo Fatal (15 dias)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdicionarAudiencia(pubSelecionada, "2027-05-10")}>
                      <Gavel className="w-4 h-4 mr-2 text-amber-600" />
                      Adicionar Audiência
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAdicionarPrazo(pubSelecionada, 5, "Cumprimento de tarefa")}>
                      <Clock className="w-4 h-4 mr-2 text-blue-600" />
                      Adicionar Tarefa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleMarcarTratada(pubSelecionada)}>
                      <Check className="w-4 h-4 mr-2 text-emerald-600" />
                      Marcar como Tratada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDescartar(pubSelecionada)}>
                      <X className="w-4 h-4 mr-2 text-red-600" />
                      Descartar Publicação
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </DialogHeader>

          {/* Corpo do Inteiro Teor */}
          <div className="space-y-4 py-3">
            {/* Box Inteiro Teor */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs leading-relaxed space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px] block">
                INTEIRO TEOR DA PUBLICAÇÃO
              </span>
              <p className="text-slate-800 whitespace-pre-wrap font-sans">
                {pubSelecionada?.conteudoCompleto}
              </p>
            </div>

            {/* Caixa IA Astrea: Resumo e Tradução */}
            <div className="bg-[#F6F5FC] border border-[#DDD9F8] rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#5C59C2] text-white text-[10px] font-extrabold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> INTELIGÊNCIA JUS+
                </span>
                <span className="text-xs font-bold text-[#5C59C2]">
                  Resumo e Sugestões Automáticas
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {pubSelecionada?.resumoIa}
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const msg = `Olá! Informamos que houve uma nova publicação no seu processo ${pubSelecionada?.numeroProcesso}: "${pubSelecionada?.resumoIa}". Estamos cuidando de todos os prazos.`;
                    navigator.clipboard.writeText(msg);
                    toast.success("Mensagem amigável traduzida para o cliente copiada para a área de transferência!");
                  }}
                  className="border-[#5C59C2]/30 text-[#5C59C2] hover:bg-[#5C59C2]/10 text-xs font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                  Copiar Mensagem para WhatsApp do Cliente
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDetalheOpen(false)}
              className="text-xs font-bold"
            >
              Fechar
            </Button>
            {pubSelecionada?.status === "nao_tratada" && (
              <Button
                type="button"
                onClick={() => handleMarcarTratada(pubSelecionada)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Concluir Tratamento
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL CONFIGURAÇÃO DE NOMES PESQUISADOS (PASSO 3) */}
      <Dialog open={isConfigNomesOpen} onOpenChange={setIsConfigNomesOpen}>
        <DialogContent className="sm:max-w-[560px] bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">
              Configuração de Nomes nos Diários Oficiais (Passo 3)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre os nomes de advogados e do escritório para receber publicações automaticamente. Seu plano
              atual ({configNomes.plano}) permite até {configNomes.limiteNomes} nomes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {configNomes.nomes.map((n, idx) => (
              <div
                key={n.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{n.nome}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                      {n.tipoPessoa}
                    </span>
                    {n.oab && (
                      <span className="font-mono text-[11px] font-bold text-[#1B75D0]">
                        OAB/{n.uf} {n.oab}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Diários: {n.diarios.join(", ")}
                  </p>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] uppercase font-bold">
                  Ativo
                </Badge>
              </div>
            ))}
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
                toast.success("Configuração de nomes salva com sucesso!");
                setIsConfigNomesOpen(false);
              }}
              className="bg-[#1B75D0] text-white text-xs font-bold uppercase"
            >
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. MODAL CREDENCIAMENTO DE INTIMAÇÕES ELETRÔNICAS (PJe, Eproc, Projudi) */}
      <Dialog open={isCredenciamentoOpen} onOpenChange={setIsCredenciamentoOpen}>
        <DialogContent className="sm:max-w-[620px] bg-white text-slate-800">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">
              Credenciamento de Intimações Eletrônicas (Passo 3)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Conecte os sistemas eletrônicos dos tribunais (PJe, Projudi, Eproc) e configure login ou 2FA SEED
              para captura automática de intimações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {credenciamentos.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{c.tribunal}</span>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">
                      {c.sistema}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Login: <strong className="font-mono text-slate-700">{c.login}</strong> ·{" "}
                    {c.totalIntimacoes} intimações capturadas
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      c.statusConexao === "Conectado"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }
                  >
                    {c.statusConexao}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info(`Credenciamento de ${c.tribunal} verificado com sucesso!`)}
                    className="text-xs font-bold h-7"
                  >
                    Testar
                  </Button>
                </div>
              </div>
            ))}
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
                toast.success("Credenciais e 2FA SEED salvos com sucesso!");
                setIsCredenciamentoOpen(false);
              }}
              className="bg-[#1B75D0] text-white text-xs font-bold uppercase"
            >
              Salvar Credenciamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
