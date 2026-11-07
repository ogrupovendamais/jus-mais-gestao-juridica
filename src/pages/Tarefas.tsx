import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  MessageSquare,
  LayoutGrid,
  List,
  RotateCw,
  Tag,
  Search,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TarefaForm } from "@/components/tarefas/TarefaForm";
import { DeleteTarefaDialog } from "@/components/tarefas/DeleteTarefaDialog";
import { TarefaDetalhes } from "@/components/tarefas/TarefaDetalhes";
import { TarefasKanban, LABEL_STATUS_TAREFA } from "@/components/tarefas/TarefasKanban";
import { useUsuarios } from "@/lib/nichos";
import { useSubmitUnico } from "@/hooks/useSubmitUnico";
import { toast } from "sonner";
import {
  format,
  isSameMonth,
  isSameWeek,
  isToday,
  isTomorrow,
  isYesterday,
  addDays,
  subDays,
  addWeeks,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDatabase, cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "react-router-dom";
import {
  extrairMetadadosDescricao,
  useEtiquetasKanban,
  type TipoAtividadeKanban,
} from "@/lib/etiquetas";

export type Tarefa = {
  id: string;
  descricao: string;
  dataConclusao: Date;
  prioridade: "Baixa" | "Média" | "Alta";
  status: "Pendente" | "Em Andamento" | "Em Revisão" | "Concluída";
  responsavel: string;
  responsavelId?: string | null;
  autorId?: string;
  propostaId?: string | null;
  clienteNome?: string | null;
};

type FiltroPeriodo =
  | "todos"
  | "hoje"
  | "amanha"
  | "esta_semana"
  | "este_mes"
  | "proximos_3_dias"
  | "proxima_semana"
  | "proximo_mes"
  | "ontem"
  | "ultimos_7_dias"
  | "ultimos_30_dias"
  | "personalizado";

type TipoAtribuicao = "todas" | "responsavel" | "autor" | "envolvido";
type ExibirTipo = "Todas as atividades" | TipoAtividadeKanban;
type StatusFiltro = "todos" | "canceladas";

const LABEL_PERIODO: Record<FiltroPeriodo, string> = {
  todos: "ESTE MÊS",
  hoje: "HOJE",
  amanha: "AMANHÃ",
  esta_semana: "ESTA SEMANA",
  este_mes: "ESTE MÊS",
  proximos_3_dias: "PRÓXIMOS 3 DIAS",
  proxima_semana: "PRÓXIMA SEMANA",
  proximo_mes: "PRÓXIMO MÊS",
  ontem: "ONTEM",
  ultimos_7_dias: "ÚLTIMOS 7 DIAS",
  ultimos_30_dias: "ÚLTIMOS 30 DIAS",
  personalizado: "PERÍODO DEFINIDO",
};

const priorityColors: Record<Tarefa["prioridade"], string> = {
  Alta: "bg-[#EBB52C] text-[#010E38] hover:bg-[#EBB52C]/90 font-bold",
  Média: "bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90",
  Baixa: "bg-[#F1F4F9] text-[#010E38] border border-[#010E38]/20 hover:bg-[#F1F4F9]",
};

const statusColors: Record<Tarefa["status"], string> = {
  Pendente: "bg-[#F1F4F9] text-[#010E38] border border-[#010E38]/20 hover:bg-[#F1F4F9]",
  "Em Andamento": "bg-[#010E38] text-white hover:bg-[#010E38]/90",
  "Em Revisão": "bg-[#EBB52C] text-[#010E38] hover:bg-[#EBB52C]/90 font-bold",
  Concluída: "bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 font-bold",
};

const Tarefas = () => {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTarefa, setSelectedTarefa] = useState<Tarefa | undefined>(undefined);
  const [tipoCriacao, setTipoCriacao] = useState<TipoAtividadeKanban>("Tarefas");
  const [tarefaToDelete, setTarefaToDelete] = useState<Tarefa | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
  const [tarefaAberta, setTarefaAberta] = useState<Tarefa | null>(null);

  // 1) Filtro de Período + Mês de Referência (Screenshot 1)
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodo>("todos");
  const [mesReferencia, setMesReferencia] = useState<Date>(() => new Date());
  const [modalPeriodoOpen, setModalPeriodoOpen] = useState(false);
  const [dataInicioCustom, setDataInicioCustom] = useState("");
  const [dataFimCustom, setDataFimCustom] = useState("");

  // 2) Filtro de Atribuições + Pessoas com CANCELAR / APLICAR (Screenshot 2)
  const [popoverAtribuicaoOpen, setPopoverAtribuicaoOpen] = useState(false);
  const [tipoAtribuicao, setTipoAtribuicao] = useState<TipoAtribuicao>("todas");
  const [pessoaSelecionada, setPessoaSelecionada] = useState<string>("todas");
  const [draftTipoAtribuicao, setDraftTipoAtribuicao] = useState<TipoAtribuicao>("todas");
  const [draftPessoaSelecionada, setDraftPessoaSelecionada] = useState<string>("todas");

  // 3) Filtro Todos os Tipos (Exibir + Status) com CANCELAR / APLICAR (Screenshot 3)
  const [popoverTiposOpen, setPopoverTiposOpen] = useState(false);
  const [exibirTipo, setExibirTipo] = useState<ExibirTipo>("Todas as atividades");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [draftExibirTipo, setDraftExibirTipo] = useState<ExibirTipo>("Todas as atividades");
  const [draftStatusFiltro, setDraftStatusFiltro] = useState<StatusFiltro>("todos");

  // 4) Filtro de Etiquetas + Gerenciar Etiquetas (Screenshot 4)
  const { etiquetas, adicionarEtiqueta, removerEtiqueta } = useEtiquetasKanban();
  const [popoverEtiquetasOpen, setPopoverEtiquetasOpen] = useState(false);
  const [buscaEtiqueta, setBuscaEtiqueta] = useState("");
  const [etiquetaFiltro, setEtiquetaFiltro] = useState<string | null>(null); // null = todas, "__SEM__" = sem etiqueta, ou nome da etiqueta
  const [modalGerenciarEtiquetas, setModalGerenciarEtiquetas] = useState(false);
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState("");
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState("#010E38");

  // Visualização Kanban / Lista
  const [visao, setVisao] = useState<"kanban" | "lista">(() => {
    try {
      return localStorage.getItem("tarefas_visao") === "lista" ? "lista" : "kanban";
    } catch {
      return "kanban";
    }
  });
  const trocarVisao = (v: "kanban" | "lista") => {
    setVisao(v);
    try {
      localStorage.setItem("tarefas_visao", v);
    } catch {
      /* ignore */
    }
  };

  const usuarios = useUsuarios();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, role } = useAuth();

  const podeExcluir = (t: Tarefa) =>
    t.autorId === user?.id || role === "desenvolvedor" || role === "master";

  const carregarTarefas = useCallback(async () => {
    setCarregando(true);
    const [{ data, error }, { data: cls }] = await Promise.all([
      supabase.from("tarefas").select("*").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome"),
    ]);
    setCarregando(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar tarefas");
      return;
    }
    setTarefas(
      (data || []).map((t: any) => ({
        id: t.id,
        descricao: t.descricao,
        dataConclusao: new Date(t.data_conclusao + "T00:00:00"),
        prioridade: t.prioridade as Tarefa["prioridade"],
        status: t.status as Tarefa["status"],
        responsavel: t.responsavel,
        responsavelId: t.responsavel_id,
        autorId: t.user_id,
        propostaId: t.proposta_id,
        clienteNome: ((cls as any[]) || []).find((c) => c.id === t.cliente_id)?.nome || null,
      }))
    );
  }, []);

  useEffect(() => {
    carregarTarefas();
  }, [carregarTarefas]);

  useEffect(() => {
    const id = searchParams.get("tarefa");
    if (!id || tarefas.length === 0) return;
    const t = tarefas.find((x) => x.id === id);
    if (t) setTarefaAberta(t);
    else toast.error("Tarefa não encontrada ou sem permissão de acesso");
    setSearchParams({}, { replace: true });
  }, [searchParams, tarefas, setSearchParams]);

  const hoje = useMemo(() => startOfDay(new Date()), []);
  const mesReferenciaLabel = useMemo(
    () => format(mesReferencia, "MMMM/yyyy", { locale: ptBR }).toUpperCase(),
    [mesReferencia]
  );

  const etiquetasFiltradasNoPopover = useMemo(() => {
    const q = buscaEtiqueta.trim().toLowerCase();
    if (!q) return etiquetas;
    return etiquetas.filter((e) => e.nome.toLowerCase().includes(q));
  }, [etiquetas, buscaEtiqueta]);

  const filteredTarefas = useMemo(() => {
    const termo = searchTerm.toLowerCase();

    return tarefas.filter((tarefa) => {
      const meta = extrairMetadadosDescricao(tarefa.descricao);

      // Busca textual
      const matchBusca =
        !termo ||
        (tarefa.descricao || "").toLowerCase().includes(termo) ||
        (tarefa.responsavel || "").toLowerCase().includes(termo) ||
        (tarefa.clienteNome || "").toLowerCase().includes(termo);

      // 1) Período
      let matchPeriodo = true;
      const d = startOfDay(tarefa.dataConclusao);
      if (filtroPeriodo === "hoje") {
        matchPeriodo = isToday(d);
      } else if (filtroPeriodo === "amanha") {
        matchPeriodo = isTomorrow(d);
      } else if (filtroPeriodo === "ontem") {
        matchPeriodo = isYesterday(d);
      } else if (filtroPeriodo === "esta_semana") {
        matchPeriodo = isSameWeek(d, hoje, { locale: ptBR });
      } else if (filtroPeriodo === "este_mes") {
        matchPeriodo = isSameMonth(d, mesReferencia);
      } else if (filtroPeriodo === "proximos_3_dias") {
        matchPeriodo = isWithinInterval(d, { start: hoje, end: endOfDay(addDays(hoje, 3)) });
      } else if (filtroPeriodo === "proxima_semana") {
        matchPeriodo = isSameWeek(d, addWeeks(hoje, 1), { locale: ptBR });
      } else if (filtroPeriodo === "proximo_mes") {
        matchPeriodo = isSameMonth(d, addMonths(hoje, 1));
      } else if (filtroPeriodo === "ultimos_7_dias") {
        matchPeriodo = isWithinInterval(d, { start: startOfDay(subDays(hoje, 7)), end: endOfDay(hoje) });
      } else if (filtroPeriodo === "ultimos_30_dias") {
        matchPeriodo = isWithinInterval(d, { start: startOfDay(subDays(hoje, 30)), end: endOfDay(hoje) });
      } else if (filtroPeriodo === "personalizado" && dataInicioCustom && dataFimCustom) {
        const ini = startOfDay(new Date(dataInicioCustom + "T00:00:00"));
        const fim = endOfDay(new Date(dataFimCustom + "T00:00:00"));
        if (ini <= fim) {
          matchPeriodo = isWithinInterval(d, { start: ini, end: fim });
        }
      }

      // 2) Atribuição & Pessoas
      let matchAtribuicao = true;
      const idAlvo = pessoaSelecionada === "todas" ? null : pessoaSelecionada;
      if (idAlvo) {
        if (tipoAtribuicao === "responsavel") {
          matchAtribuicao = tarefa.responsavelId === idAlvo;
        } else if (tipoAtribuicao === "autor") {
          matchAtribuicao = tarefa.autorId === idAlvo;
        } else {
          // "todas" ou "envolvido"
          matchAtribuicao = tarefa.responsavelId === idAlvo || tarefa.autorId === idAlvo;
        }
      } else if (tipoAtribuicao !== "todas" && user) {
        if (tipoAtribuicao === "responsavel") {
          matchAtribuicao = tarefa.responsavelId === user.id;
        } else if (tipoAtribuicao === "autor") {
          matchAtribuicao = tarefa.autorId === user.id;
        } else if (tipoAtribuicao === "envolvido") {
          matchAtribuicao = tarefa.responsavelId === user.id || tarefa.autorId === user.id;
        }
      }

      // 3) Exibir Tipo & Status
      let matchTipo = true;
      if (exibirTipo !== "Todas as atividades") {
        matchTipo = meta.tipoAtividade === exibirTipo;
      }
      let matchStatusCancelada = true;
      if (statusFiltro === "canceladas") {
        matchStatusCancelada = meta.cancelada;
      }

      // 4) Etiquetas
      let matchEtiqueta = true;
      if (etiquetaFiltro === "__SEM__") {
        matchEtiqueta = meta.etiquetas.length === 0;
      } else if (etiquetaFiltro) {
        matchEtiqueta = meta.etiquetas.some(
          (e) => e.toLowerCase() === etiquetaFiltro.toLowerCase()
        );
      }

      return (
        matchBusca &&
        matchPeriodo &&
        matchAtribuicao &&
        matchTipo &&
        matchStatusCancelada &&
        matchEtiqueta
      );
    });
  }, [
    tarefas,
    searchTerm,
    filtroPeriodo,
    mesReferencia,
    dataInicioCustom,
    dataFimCustom,
    tipoAtribuicao,
    pessoaSelecionada,
    exibirTipo,
    statusFiltro,
    etiquetaFiltro,
    hoje,
    user,
  ]);

  const podeMover = (t: Tarefa) =>
    t.autorId === user?.id ||
    t.responsavelId === user?.id ||
    role === "master" ||
    role === "desenvolvedor";

  const handleAddClick = (tipo: TipoAtividadeKanban = "Tarefas") => {
    setSelectedTarefa(undefined);
    setTipoCriacao(tipo);
    setIsFormOpen(true);
  };

  const handleEditClick = (tarefa: Tarefa) => {
    setSelectedTarefa(tarefa);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (tarefa: Tarefa) => {
    setTarefaToDelete(tarefa);
    setIsDeleteDialogOpen(true);
  };

  const salvarTarefa = async (data: Omit<Tarefa, "id"> & { id?: string }) => {
    if (!user) {
      toast.error("É necessário estar logado.");
      return;
    }
    try {
      if (data.id) {
        const { error } = await supabase
          .from("tarefas")
          .update({
            descricao: data.descricao,
            data_conclusao:
              typeof data.dataConclusao === "string"
                ? data.dataConclusao
                : formatDateForDatabase(data.dataConclusao),
            prioridade: data.prioridade || "Média",
            status: data.status || "Pendente",
            responsavel: data.responsavel || null,
            responsavel_id: data.responsavelId || null,
          } as any)
          .eq("id", data.id);
        if (error) throw error;
        setTarefas((prev) =>
          prev.map((t) =>
            t.id === data.id
              ? {
                  ...t,
                  ...data,
                  id: data.id!,
                  dataConclusao:
                    typeof data.dataConclusao === "string"
                      ? new Date(data.dataConclusao + "T00:00:00")
                      : data.dataConclusao,
                }
              : t
          )
        );
        toast.success("Tarefa atualizada com sucesso!");
      } else {
        const { data: inserted, error } = await supabase
          .from("tarefas")
          .insert([
            {
              descricao: data.descricao,
              data_conclusao:
                typeof data.dataConclusao === "string"
                  ? data.dataConclusao
                  : formatDateForDatabase(data.dataConclusao),
              prioridade: data.prioridade || "Média",
              status: data.status || "Pendente",
              responsavel: data.responsavel || null,
              responsavel_id: data.responsavelId || null,
              user_id: user.id,
            } as any,
          ])
          .select()
          .single();
        if (error) throw error;
        setTarefas((prev) => [
          {
            id: inserted!.id,
            descricao: inserted!.descricao,
            dataConclusao: new Date(inserted!.data_conclusao + "T00:00:00"),
            prioridade: inserted!.prioridade,
            status: inserted!.status,
            responsavel: inserted!.responsavel,
            responsavelId: (inserted as any).responsavel_id,
            autorId: user.id,
          },
          ...prev,
        ]);
        toast.success("Tarefa criada com sucesso!");
      }
      setIsFormOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar tarefa", {
        description: e?.message || String(e),
      });
    }
  };
  const handleSaveTarefa = useSubmitUnico(salvarTarefa);

  const alterarStatus = async (t: Tarefa, status: Tarefa["status"]) => {
    const { error } = await supabase
      .from("tarefas")
      .update({ status })
      .eq("id", t.id);
    if (error) {
      toast.error("Erro ao alterar status", { description: error.message });
      return;
    }
    setTarefas((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status } : x))
    );
    setTarefaAberta((prev) =>
      prev && prev.id === t.id ? { ...prev, status } : prev
    );
    toast.success(`Tarefa movida para ${LABEL_STATUS_TAREFA[status]}`);
  };

  const confirmDelete = async () => {
    if (tarefaToDelete) {
      const { data: removidas, error } = await supabase
        .from("tarefas")
        .delete()
        .eq("id", tarefaToDelete.id)
        .select("id");
      if (!error && (removidas || []).length === 0) {
        toast.error("Só quem lançou a tarefa pode excluí-la.");
        setIsDeleteDialogOpen(false);
        return;
      }
      if (error) {
        console.error(error);
        toast.error("Erro ao excluir tarefa");
        return;
      }
      setTarefas(tarefas.filter((t) => t.id !== tarefaToDelete.id));
      toast.success("Tarefa excluída com sucesso!");
      setIsDeleteDialogOpen(false);
      setTarefaToDelete(undefined);
    }
  };

  // Rótulo dinâmico do botão MINHAS ATRIBUIÇÕES
  const rotuloAtribuicao = useMemo(() => {
    if (pessoaSelecionada !== "todas") {
      const u = usuarios.find((x) => x.id === pessoaSelecionada);
      return (u?.full_name || u?.email || "MINHAS ATRIBUIÇÕES").toUpperCase();
    }
    if (tipoAtribuicao === "responsavel") return "RESPONSÁVEL";
    if (tipoAtribuicao === "autor") return "QUEM CRIOU";
    if (tipoAtribuicao === "envolvido") return "ENVOLVIDO";
    return "MINHAS ATRIBUIÇÕES";
  }, [pessoaSelecionada, tipoAtribuicao, usuarios]);

  // Rótulo dinâmico do botão TODOS OS TIPOS
  const rotuloTipos = useMemo(() => {
    if (statusFiltro === "canceladas") return "CANCELADAS";
    if (exibirTipo === "Todas as atividades") return "TODOS OS TIPOS";
    return exibirTipo.toUpperCase();
  }, [exibirTipo, statusFiltro]);

  const temFiltroAtivo =
    Boolean(searchTerm) ||
    filtroPeriodo !== "todos" ||
    tipoAtribuicao !== "todas" ||
    pessoaSelecionada !== "todas" ||
    exibirTipo !== "Todas as atividades" ||
    statusFiltro !== "todos" ||
    etiquetaFiltro !== null;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Cabeçalho superior estilo Astrea com a Paleta Imutável (#010E38, #EBB52C, #F1F4F9) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
            Gestão kanban
          </h1>
          <span className="inline-flex items-center rounded-full border border-[#010E38]/20 bg-[#F1F4F9] dark:bg-[#010E38] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] shadow-2xs">
            QUADRO KANBAN PADRÃO
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex rounded-md border border-[#010E38]/20 bg-white dark:bg-[#010E38] overflow-hidden"
            role="group"
            aria-label="Visualização"
          >
            <Button
              variant={visao === "kanban" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-none h-8 px-2.5 text-xs font-semibold",
                visao === "kanban"
                  ? "bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90"
                  : "text-[#010E38] hover:bg-[#F1F4F9]"
              )}
              onClick={() => trocarVisao("kanban")}
              title="Quadro Kanban"
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Kanban
            </Button>
            <Button
              variant={visao === "lista" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "rounded-none h-8 px-2.5 text-xs font-semibold",
                visao === "lista"
                  ? "bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90"
                  : "text-[#010E38] hover:bg-[#F1F4F9]"
              )}
              onClick={() => trocarVisao("lista")}
              title="Visualização em Lista"
            >
              <List className="h-3.5 w-3.5 mr-1" /> Lista
            </Button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={carregarTarefas}
            disabled={carregando}
            title="Atualizar quadro"
            className="h-8 w-8 rounded-md border-[#010E38]/20 bg-[#F1F4F9] hover:bg-[#010E38] hover:text-[#EBB52C] text-[#010E38] transition-colors"
          >
            <RotateCw className={cn("h-4 w-4", carregando && "animate-spin")} />
          </Button>

          {/* Botão + com menu suspenso: Tarefa, Evento, Prazo, Audiência (Screenshot 5) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                title="Adicionar"
                className="h-8 w-8 rounded-md bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] shadow-xs font-bold"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40 py-1.5 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg"
            >
              <DropdownMenuItem
                onClick={() => handleAddClick("Tarefas")}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Tarefa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAddClick("Eventos")}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Evento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAddClick("Prazos")}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Prazo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleAddClick("Audiências")}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Audiência
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BARRA DE FILTROS IDÊNTICA AO ASTREA (4 SCREENSHOTS)                   */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Dropdown de Período (Screenshot 1) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-between gap-2 h-8 rounded-md border px-3 text-[11px] font-bold uppercase tracking-wide transition-colors shadow-2xs",
                filtroPeriodo !== "todos"
                  ? "border-[#010E38] bg-[#010E38] text-[#EBB52C]"
                  : "border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9]"
              )}
            >
              <span>{LABEL_PERIODO[filtroPeriodo]}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-48 py-1.5 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl"
          >
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("todos")}
              className="text-xs py-2 cursor-pointer font-medium"
            >
              Todo o período
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("hoje")}
              className="text-xs py-2 cursor-pointer"
            >
              Hoje
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("amanha")}
              className="text-xs py-2 cursor-pointer"
            >
              Amanhã
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("esta_semana")}
              className="text-xs py-2 cursor-pointer"
            >
              Esta semana
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setMesReferencia(new Date());
                setFiltroPeriodo("este_mes");
              }}
              className="text-xs py-2 cursor-pointer"
            >
              Este mês
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("proximos_3_dias")}
              className="text-xs py-2 cursor-pointer"
            >
              Próximos 3 dias
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("proxima_semana")}
              className="text-xs py-2 cursor-pointer"
            >
              Próxima semana
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("proximo_mes")}
              className="text-xs py-2 cursor-pointer"
            >
              Próximo mês
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("ontem")}
              className="text-xs py-2 cursor-pointer"
            >
              Ontem
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("ultimos_7_dias")}
              className="text-xs py-2 cursor-pointer"
            >
              Últimos 7 dias
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setFiltroPeriodo("ultimos_30_dias")}
              className="text-xs py-2 cursor-pointer"
            >
              Últimos 30 dias
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setModalPeriodoOpen(true)}
              className="text-xs py-2 cursor-pointer font-semibold text-[#010E38] dark:text-[#EBB52C]"
            >
              Definir período
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Seletor de Mês/Ano (ex: NOVEMBRO/2026) ao lado do período */}
        <div
          className={cn(
            "inline-flex items-center h-8 rounded-md border px-1.5 text-[11px] font-bold uppercase tracking-wide transition-colors shadow-2xs",
            filtroPeriodo === "este_mes"
              ? "border-[#010E38] bg-[#010E38] text-[#EBB52C]"
              : "border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9]"
          )}
        >
          <button
            type="button"
            onClick={() => {
              setMesReferencia((m) => subMonths(m, 1));
              setFiltroPeriodo("este_mes");
            }}
            className="p-1 hover:opacity-70"
            title="Mês anterior"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() =>
              setFiltroPeriodo((p) => (p === "este_mes" ? "todos" : "este_mes"))
            }
            className="px-1.5 font-data text-[11px]"
            title="Filtrar por este mês"
          >
            {mesReferenciaLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              setMesReferencia((m) => addMonths(m, 1));
              setFiltroPeriodo("este_mes");
            }}
            className="p-1 hover:opacity-70"
            title="Próximo mês"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* 2. Popover MINHAS ATRIBUIÇÕES (Screenshot 2: ATRIBUIÇÃO x PESSOAS + CANCELAR / APLICAR) */}
        <Popover
          open={popoverAtribuicaoOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftTipoAtribuicao(tipoAtribuicao);
              setDraftPessoaSelecionada(pessoaSelecionada);
            }
            setPopoverAtribuicaoOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-between gap-2 h-8 rounded-md border px-3 text-[11px] font-bold uppercase tracking-wide transition-colors shadow-2xs",
                tipoAtribuicao !== "todas" || pessoaSelecionada !== "todas"
                  ? "border-[#010E38] bg-[#010E38] text-[#EBB52C]"
                  : "border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9]"
              )}
            >
              <span className="truncate max-w-[180px]">{rotuloAtribuicao}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[380px] sm:w-[430px] p-0 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 p-4">
              {/* Coluna Esquerda: ATRIBUIÇÃO */}
              <div className="space-y-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  ATRIBUIÇÃO
                </p>
                <div className="space-y-2.5">
                  {(
                    [
                      { id: "todas", label: "Todas as atribuições" },
                      { id: "responsavel", label: "Responsável" },
                      { id: "autor", label: "Quem criou" },
                      { id: "envolvido", label: "Envolvido" },
                    ] as const
                  ).map((op) => {
                    const checked = draftTipoAtribuicao === op.id;
                    return (
                      <label
                        key={op.id}
                        onClick={() => setDraftTipoAtribuicao(op.id)}
                        className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border flex items-center justify-center transition-colors",
                            checked
                              ? "border-[#010E38] dark:border-[#EBB52C]"
                              : "border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {checked && (
                            <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                          )}
                        </span>
                        <span>{op.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Coluna Direita: PESSOAS */}
              <div className="space-y-3 border-l border-[#010E38]/10 pl-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  PESSOAS
                </p>
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  <label
                    onClick={() => setDraftPessoaSelecionada("todas")}
                    className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                  >
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                        draftPessoaSelecionada === "todas"
                          ? "border-[#010E38] dark:border-[#EBB52C]"
                          : "border-slate-300 dark:border-slate-600"
                      )}
                    >
                      {draftPessoaSelecionada === "todas" && (
                        <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                      )}
                    </span>
                    <span>Todas as pessoas</span>
                  </label>

                  {usuarios.map((u) => {
                    const checked = draftPessoaSelecionada === u.id;
                    return (
                      <label
                        key={u.id}
                        onClick={() => setDraftPessoaSelecionada(u.id)}
                        className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                            checked
                              ? "border-[#010E38] dark:border-[#EBB52C]"
                              : "border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {checked && (
                            <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                          )}
                        </span>
                        <span className="truncate">{u.full_name || u.email}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 px-4 py-3 border-t border-[#010E38]/10 bg-[#F1F4F9]/50 dark:bg-black/20">
              <button
                type="button"
                onClick={() => setPopoverAtribuicaoOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-[#010E38]/65 dark:text-[#F1F4F9]/65 hover:text-[#010E38]"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoAtribuicao(draftTipoAtribuicao);
                  setPessoaSelecionada(draftPessoaSelecionada);
                  setPopoverAtribuicaoOpen(false);
                }}
                className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] hover:underline"
              >
                APLICAR
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 3. Popover TODOS OS TIPOS (Screenshot 3: EXIBIR + STATUS + CANCELAR / APLICAR) */}
        <Popover
          open={popoverTiposOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftExibirTipo(exibirTipo);
              setDraftStatusFiltro(statusFiltro);
            }
            setPopoverTiposOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center justify-between gap-2 h-8 rounded-md border px-3 text-[11px] font-bold uppercase tracking-wide transition-colors shadow-2xs",
                exibirTipo !== "Todas as atividades" || statusFiltro !== "todos"
                  ? "border-[#010E38] bg-[#010E38] text-[#EBB52C]"
                  : "border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9]"
              )}
            >
              <span>{rotuloTipos}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-60 p-0 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg overflow-hidden"
          >
            <div className="p-4 space-y-5">
              {/* EXIBIR */}
              <div className="space-y-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  EXIBIR
                </p>
                <div className="space-y-2.5">
                  {(
                    [
                      "Todas as atividades",
                      "Tarefas",
                      "Eventos",
                      "Prazos",
                      "Audiências",
                    ] as const
                  ).map((tipo) => {
                    const checked = draftExibirTipo === tipo;
                    return (
                      <label
                        key={tipo}
                        onClick={() => setDraftExibirTipo(tipo)}
                        className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border flex items-center justify-center",
                            checked
                              ? "border-[#010E38] dark:border-[#EBB52C]"
                              : "border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {checked && (
                            <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                          )}
                        </span>
                        <span>{tipo}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* STATUS */}
              <div className="space-y-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  STATUS
                </p>
                <div className="space-y-2.5">
                  {(
                    [
                      { id: "todos", label: "Todos os status" },
                      { id: "canceladas", label: "Canceladas" },
                    ] as const
                  ).map((st) => {
                    const checked = draftStatusFiltro === st.id;
                    return (
                      <label
                        key={st.id}
                        onClick={() => setDraftStatusFiltro(st.id)}
                        className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border flex items-center justify-center",
                            checked
                              ? "border-[#010E38] dark:border-[#EBB52C]"
                              : "border-slate-300 dark:border-slate-600"
                          )}
                        >
                          {checked && (
                            <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                          )}
                        </span>
                        <span>{st.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 px-4 py-3 border-t border-[#010E38]/10 bg-[#F1F4F9]/50 dark:bg-black/20">
              <button
                type="button"
                onClick={() => setPopoverTiposOpen(false)}
                className="text-xs font-bold uppercase tracking-wider text-[#010E38]/65 dark:text-[#F1F4F9]/65 hover:text-[#010E38]"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={() => {
                  setExibirTipo(draftExibirTipo);
                  setStatusFiltro(draftStatusFiltro);
                  setPopoverTiposOpen(false);
                }}
                className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] hover:underline"
              >
                APLICAR
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 4. Popover ETIQUETAS (Screenshot 4) */}
        <Popover
          open={popoverEtiquetasOpen}
          onOpenChange={setPopoverEtiquetasOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Filtrar por etiquetas"
              className={cn(
                "h-8 w-8 rounded-md border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9] shadow-2xs",
                etiquetaFiltro !== null &&
                  "border-[#010E38] bg-[#010E38] text-[#EBB52C]"
              )}
            >
              <Tag className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-72 p-0 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg overflow-hidden"
          >
            <div className="p-3.5 space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                ETIQUETAS
              </p>
              <div className="relative flex items-center">
                <Input
                  placeholder="Encontrar etiqueta"
                  value={buscaEtiqueta}
                  onChange={(e) => setBuscaEtiqueta(e.target.value)}
                  className="h-8 pr-8 text-xs border-[#010E38]/20"
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                {etiquetaFiltro !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEtiquetaFiltro(null);
                      setPopoverEtiquetasOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-left"
                  >
                    Mostrar todas as etiquetas
                  </button>
                )}

                {/* Sem etiqueta (quadrado vermelho com traço diagonal igual ao Astrea) */}
                <button
                  type="button"
                  onClick={() => {
                    setEtiquetaFiltro(
                      etiquetaFiltro === "__SEM__" ? null : "__SEM__"
                    );
                    setPopoverEtiquetasOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-left transition-colors",
                    etiquetaFiltro === "__SEM__" && "bg-[#F1F4F9] font-bold"
                  )}
                >
                  <span className="relative h-3.5 w-3.5 rounded-[2px] border border-red-600 shrink-0 overflow-hidden bg-white">
                    <span className="absolute inset-0 border-t border-red-600 rotate-45 origin-top-left translate-x-[1px]" />
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    Sem etiqueta
                  </span>
                </button>

                {etiquetasFiltradasNoPopover.map((et) => {
                  const selecionada = etiquetaFiltro === et.nome;
                  return (
                    <button
                      key={et.id}
                      type="button"
                      onClick={() => {
                        setEtiquetaFiltro(selecionada ? null : et.nome);
                        setPopoverEtiquetasOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-left transition-colors",
                        selecionada && "bg-[#F1F4F9] font-bold"
                      )}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-[2px] shrink-0 border border-black/10"
                        style={{ backgroundColor: et.cor }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-200">
                        {et.nome}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#010E38]/10 p-2.5 text-center bg-[#F1F4F9]/50 dark:bg-black/20">
              <button
                type="button"
                onClick={() => {
                  setPopoverEtiquetasOpen(false);
                  setModalGerenciarEtiquetas(true);
                }}
                className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] hover:underline"
              >
                GERENCIAR ETIQUETAS
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 5. Botão de Pesquisar com Tooltip escuro "Pesquisar" (Screenshot 4) */}
        {buscaAberta || searchTerm ? (
          <div className="relative flex items-center">
            <Search className="h-3.5 w-3.5 text-[#010E38]/50 absolute left-2.5 pointer-events-none" />
            <Input
              autoFocus
              placeholder="Pesquisar tarefa, cliente ou responsável..."
              className="h-8 w-56 sm:w-72 pl-8 pr-7 text-xs rounded-md border-[#010E38]/20 bg-white dark:bg-[#010E38]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setBuscaAberta(false);
              }}
              className="absolute right-2 text-[#010E38]/50 hover:text-[#010E38]"
              title="Fechar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setBuscaAberta(true)}
                className="h-8 w-8 rounded-md border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9] shadow-2xs"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[#010E38] text-white text-xs font-bold px-3 py-1.5 border-none">
              Pesquisar
            </TooltipContent>
          </Tooltip>
        )}

        {etiquetaFiltro && (
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#EBB52C] text-[#010E38] text-[11px] font-bold uppercase">
            <Tag className="h-3 w-3" />
            {etiquetaFiltro === "__SEM__" ? "Sem etiqueta" : etiquetaFiltro}
            <button
              type="button"
              onClick={() => setEtiquetaFiltro(null)}
              className="ml-1 hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {temFiltroAtivo && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setFiltroPeriodo("todos");
              setTipoAtribuicao("todas");
              setPessoaSelecionada("todas");
              setExibirTipo("Todas as atividades");
              setStatusFiltro("todos");
              setEtiquetaFiltro(null);
            }}
            className="h-8 px-2.5 text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:bg-[#EBB52C]/20"
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {visao === "kanban" && (
        <TarefasKanban
          tarefas={filteredTarefas}
          podeMover={podeMover}
          onMover={alterarStatus}
          onAbrir={setTarefaAberta}
        />
      )}

      {visao === "lista" && (
        <>
          <div className="hidden md:block border border-[#010E38]/15 rounded-lg overflow-hidden bg-white dark:bg-[#010E38]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F1F4F9]">
                  <TableHead className="text-[#010E38] font-bold">Descrição</TableHead>
                  <TableHead className="text-[#010E38] font-bold">Data de Conclusão</TableHead>
                  <TableHead className="text-[#010E38] font-bold">Prioridade</TableHead>
                  <TableHead className="text-[#010E38] font-bold">Etapa</TableHead>
                  <TableHead className="text-[#010E38] font-bold">Responsável</TableHead>
                  <TableHead className="w-[64px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTarefas.length > 0 ? (
                  filteredTarefas.map((tarefa) => (
                    <TableRow key={tarefa.id}>
                      <TableCell className="font-medium max-w-md">
                        <button
                          type="button"
                          onClick={() => setTarefaAberta(tarefa)}
                          className="text-left w-full line-clamp-2 hover:text-primary hover:underline underline-offset-2"
                        >
                          {extrairMetadadosDescricao(tarefa.descricao).textoLimpo}
                        </button>
                      </TableCell>
                      <TableCell className="font-data text-xs font-bold">
                        {format(tarefa.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityColors[tarefa.prioridade]}>
                          {tarefa.prioridade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[tarefa.status]}>
                          {LABEL_STATUS_TAREFA[tarefa.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{tarefa.responsavel}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTarefaAberta(tarefa)}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              <span>Abrir / Recados</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(tarefa)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!podeExcluir(tarefa)}
                              onClick={() => handleDeleteClick(tarefa)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      Nenhuma tarefa encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-3">
            {filteredTarefas.length > 0 ? (
              filteredTarefas.map((tarefa) => (
                <Card key={tarefa.id} className="p-3">
                  <CardHeader className="p-0 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => setTarefaAberta(tarefa)}
                          className="text-left font-medium text-sm leading-tight line-clamp-3 hover:text-primary"
                        >
                          {extrairMetadadosDescricao(tarefa.descricao).textoLimpo}
                        </button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setTarefaAberta(tarefa)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>Abrir / Recados</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditClick(tarefa)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!podeExcluir(tarefa)}
                            onClick={() => handleDeleteClick(tarefa)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Excluir</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-data">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(tarefa.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{tarefa.responsavel}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge className={`${priorityColors[tarefa.prioridade]} text-xs px-2 py-1`}>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {tarefa.prioridade}
                      </Badge>
                      <Badge className={`${statusColors[tarefa.status]} text-xs px-2 py-1`}>
                        {LABEL_STATUS_TAREFA[tarefa.status]}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="p-6">
                <div className="text-center text-muted-foreground">
                  Nenhuma tarefa encontrada.
                </div>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Modal Definir Período Personalizado */}
      <Dialog open={modalPeriodoOpen} onOpenChange={setModalPeriodoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
              Definir período
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5">
                Data inicial
              </label>
              <Input
                type="date"
                value={dataInicioCustom}
                onChange={(e) => setDataInicioCustom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5">
                Data final
              </label>
              <Input
                type="date"
                value={dataFimCustom}
                onChange={(e) => setDataFimCustom(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setModalPeriodoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (dataInicioCustom && dataFimCustom) {
                  setFiltroPeriodo("personalizado");
                  setModalPeriodoOpen(false);
                } else {
                  toast.error("Selecione a data inicial e final.");
                }
              }}
              className="bg-[#EBB52C] text-[#010E38] font-bold hover:bg-[#EBB52C]/90"
            >
              Aplicar período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerenciar Etiquetas */}
      <Dialog
        open={modalGerenciarEtiquetas}
        onOpenChange={setModalGerenciarEtiquetas}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
              Gerenciar Etiquetas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={novaEtiquetaCor}
                onChange={(e) => setNovaEtiquetaCor(e.target.value)}
                className="h-9 w-11 rounded border cursor-pointer p-0.5 bg-white"
                title="Escolher cor da etiqueta"
              />
              <Input
                placeholder="Nome da nova etiqueta..."
                value={novaEtiquetaNome}
                onChange={(e) => setNovaEtiquetaNome(e.target.value)}
                className="flex-1 text-xs"
              />
              <Button
                type="button"
                onClick={() => {
                  if (!novaEtiquetaNome.trim()) return;
                  adicionarEtiqueta(novaEtiquetaNome, novaEtiquetaCor);
                  setNovaEtiquetaNome("");
                  toast.success("Etiqueta adicionada!");
                }}
                className="bg-[#EBB52C] text-[#010E38] font-bold hover:bg-[#EBB52C]/90 text-xs"
              >
                Adicionar
              </Button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 border rounded-md p-2">
              {etiquetas.map((et) => (
                <div
                  key={et.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-muted/60 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-3.5 w-3.5 rounded-[2px] shrink-0 border border-black/10"
                      style={{ backgroundColor: et.cor }}
                    />
                    <span className="font-medium truncate">{et.nome}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerEtiqueta(et.id)}
                    className="text-destructive hover:opacity-75 p-1"
                    title="Excluir etiqueta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setModalGerenciarEtiquetas(false)}
              className="bg-[#010E38] text-[#EBB52C] font-bold"
            >
              Concluído
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TarefaDetalhes
        tarefa={tarefaAberta}
        onClose={() => setTarefaAberta(null)}
        onEdit={(t) => {
          setTarefaAberta(null);
          handleEditClick(t);
        }}
        onStatusChange={alterarStatus}
      />

      <TarefaForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveTarefa}
        tarefa={selectedTarefa}
        tipoInicial={tipoCriacao}
      />

      <DeleteTarefaDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default Tarefas;
