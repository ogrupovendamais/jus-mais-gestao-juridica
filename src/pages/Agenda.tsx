import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CalendarDays,
  Clock,
  MapPin,
  Briefcase,
  CheckCircle,
  Plus,
  Trash2,
  Lock,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
  MoreVertical,
  Tag,
  Search,
  X,
  Check,
} from "lucide-react";
import {
  format,
  isToday,
  addDays,
  addMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUsuarios } from "@/lib/nichos";
import { FUSOS, FUSO_ESCRITORIO, converterHora, rotuloHora } from "@/lib/fusos";
import {
  CORES_ETIQUETAS,
  extrairMetadadosDescricao,
  montarDescricaoComEtiquetas,
  useEtiquetasKanban,
  type TipoAtividadeKanban,
} from "@/lib/etiquetas";
import { TarefaForm } from "@/components/tarefas/TarefaForm";

type AgendaItem = {
  id: string;
  type: "audiencia" | "tarefa" | "evento" | "prazo";
  ownerId?: string;
  responsavelId?: string | null;
  ownerName?: string;
  title: string;
  description?: string;
  date: Date;
  time?: string; // "HH:mm"
  timeLabel?: string;
  location?: string;
  status: string;
  priority?: string;
  cliente?: string;
  processo?: string;
  etiquetas?: string[];
  cancelada?: boolean;
  concluida?: boolean;
};

type VisaoAgenda = "lista" | "dia" | "semana" | "mes";
type PapelAtribuicao = "responsaveis" | "envolvidos" | "quem_criou";
type StatusAgendaFiltro = "a_concluir" | "concluidas" | "canceladas" | "todas";

const TODAS_ATIVIDADES_TIPOS: TipoAtividadeKanban[] = [
  "Tarefas",
  "Eventos",
  "Prazos",
  "Audiências",
];

const HORAS_DO_DIA = Array.from({ length: 24 }, (_, i) => i);

const Agenda = () => {
  const { user, role } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const usuarios = useUsuarios();

  // 1. Visão: Em lista, Por dia (padrão com grade de horas), Por semana, Por mês
  const [visao, setVisao] = useState<VisaoAgenda>(() => {
    try {
      const v = localStorage.getItem("agenda_visao_v2");
      return v === "lista" || v === "dia" || v === "semana" || v === "mes"
        ? v
        : "dia";
    } catch {
      return "dia";
    }
  });
  const trocarVisao = (v: VisaoAgenda) => {
    setVisao(v);
    try {
      localStorage.setItem("agenda_visao_v2", v);
    } catch {
      /* ignore */
    }
  };

  // 2. Filtro MINHAS ATRIBUIÇÕES (Checkboxes iguais ao print 2 do Astrea)
  const [popoverAtribuicaoOpen, setPopoverAtribuicaoOpen] = useState(false);
  const [papeisAtribuicao, setPapeisAtribuicao] = useState<PapelAtribuicao[]>([
    "responsaveis",
    "envolvidos",
    "quem_criou",
  ]);
  const [pessoasSelecionadas, setPessoasSelecionadas] = useState<string[]>([]);
  const [inicializouPessoaPadrao, setInicializouPessoaPadrao] = useState(false);

  // Draft para o botão APLICAR / CANCELAR de MINHAS ATRIBUIÇÕES
  const [draftPapeisAtribuicao, setDraftPapeisAtribuicao] = useState<
    PapelAtribuicao[]
  >(["responsaveis", "envolvidos", "quem_criou"]);
  const [draftPessoasSelecionadas, setDraftPessoasSelecionadas] = useState<
    string[]
  >([]);

  // Inicializa com todas as pessoas marcadas (ou o usuário logado) para exibir atividades de imediato
  useEffect(() => {
    if (!inicializouPessoaPadrao && (user?.id || usuarios.length > 0)) {
      const ids = Array.from(
        new Set([
          ...(user?.id ? [user.id] : []),
          ...usuarios.map((u) => u.id),
        ])
      );
      setPessoasSelecionadas(ids);
      setDraftPessoasSelecionadas(ids);
      setInicializouPessoaPadrao(true);
    }
  }, [user?.id, usuarios, inicializouPessoaPadrao]);

  // 3. Filtro TODAS AS ATIVIDADES (Checkboxes EXIBIR + Radio STATUS iguais ao print 3 do Astrea)
  const [popoverTiposOpen, setPopoverTiposOpen] = useState(false);
  const [exibirTipos, setExibirTipos] = useState<TipoAtividadeKanban[]>(
    TODAS_ATIVIDADES_TIPOS
  );
  const [statusFiltro, setStatusFiltro] =
    useState<StatusAgendaFiltro>("todas");
  const [draftExibirTipos, setDraftExibirTipos] = useState<
    TipoAtividadeKanban[]
  >(TODAS_ATIVIDADES_TIPOS);
  const [draftStatusFiltro, setDraftStatusFiltro] =
    useState<StatusAgendaFiltro>("todas");

  // 4. Filtro ETIQUETAS criadas + Gerenciar Etiquetas
  const {
    etiquetas,
    adicionarEtiqueta,
    removerEtiqueta,
    obterCorEtiqueta,
  } = useEtiquetasKanban();
  const [popoverEtiquetasOpen, setPopoverEtiquetasOpen] = useState(false);
  const [buscaEtiqueta, setBuscaEtiqueta] = useState("");
  const [etiquetaFiltro, setEtiquetaFiltro] = useState<string | null>(null);
  const [modalGerenciarEtiquetas, setModalGerenciarEtiquetas] = useState(false);
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState("");
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState<string>(
    CORES_ETIQUETAS[0]
  );

  // 5. Filtro BUSCAR ESCRITO
  const [searchTerm, setSearchTerm] = useState("");
  const [calendarioPopoverOpen, setCalendarioPopoverOpen] = useState(false);

  // Modal de Compromisso Rápido na grade de horas
  const [isEventoOpen, setIsEventoOpen] = useState(false);
  const [novoEvento, setNovoEvento] = useState({
    titulo: "",
    descricao: "",
    hora_inicio: "",
    hora_fim: "",
    local: "",
    fuso: FUSO_ESCRITORIO as string,
    etiquetas: [] as string[],
  });

  // Modal unificado do Astrea (Tarefa, Evento, Prazo, Audiência)
  const [isFormKanbanOpen, setIsFormKanbanOpen] = useState(false);
  const [tipoCriacaoKanban, setTipoCriacaoKanban] =
    useState<TipoAtividadeKanban>("Tarefas");

  const loadAgendaData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: audiencias }, { data: tarefas }, { data: eventos }] =
        await Promise.all([
          supabase.from("audiencias").select("*"),
          supabase.from("tarefas").select("*"),
          supabase.from("agenda_eventos" as never).select("*"),
        ]);

      const eventosItems: AgendaItem[] = ((eventos as any[]) || []).map(
        (ev) => {
          const metaDesc = extrairMetadadosDescricao(ev.descricao || "");
          const metaTitulo = extrairMetadadosDescricao(ev.titulo || "");
          const tagsUnificadas = Array.from(
            new Set([...metaDesc.etiquetas, ...metaTitulo.etiquetas])
          );
          return {
            id: ev.id,
            type: "evento",
            ownerId: ev.user_id,
            responsavelId: ev.user_id,
            ownerName:
              usuarios.find((u) => u.id === ev.user_id)?.full_name ||
              (ev.user_id === user?.id ? "Grupo Venda+" : "Equipe"),
            title: metaTitulo.textoLimpo || ev.titulo,
            description: metaDesc.textoLimpo || undefined,
            date: new Date(ev.data + "T00:00:00"),
            time: converterHora(ev.hora_inicio, ev.fuso) || undefined,
            timeLabel: ev.hora_inicio
              ? `${rotuloHora(ev.hora_inicio, ev.fuso)}${
                  ev.hora_fim ? " - " + rotuloHora(ev.hora_fim, ev.fuso) : ""
                }`
              : undefined,
            location: ev.local || undefined,
            status: "Compromisso",
            etiquetas: tagsUnificadas,
            cancelada: metaDesc.cancelada,
            concluida: false,
          };
        }
      );

      const audienciasItems: AgendaItem[] = (audiencias || []).map(
        (audiencia: any) => {
          const metaTitulo = extrairMetadadosDescricao(
            audiencia.titulo || `Audiência - ${audiencia.tipo}`
          );
          const st = String(audiencia.status || "").toLowerCase();
          return {
            id: audiencia.id,
            type: "audiencia",
            ownerId: audiencia.user_id,
            responsavelId: audiencia.user_id,
            ownerName:
              usuarios.find((u) => u.id === audiencia.user_id)?.full_name ||
              "Grupo Venda+",
            title: metaTitulo.textoLimpo,
            description: [
              audiencia.processo_numero &&
                `Processo ${audiencia.processo_numero}`,
              audiencia.link_reuniao,
            ]
              .filter(Boolean)
              .join(" — "),
            date: new Date(audiencia.data + "T00:00:00"),
            time: converterHora(audiencia.hora, audiencia.fuso) || undefined,
            timeLabel: rotuloHora(audiencia.hora, audiencia.fuso) || undefined,
            location: audiencia.local,
            status: audiencia.status,
            processo: audiencia.processo_numero,
            etiquetas: metaTitulo.etiquetas,
            cancelada: st.includes("cancel"),
            concluida: st.includes("conclu") || st.includes("realiz"),
          };
        }
      );

      const tarefasItems: AgendaItem[] = (tarefas || []).map((tarefa: any) => {
        const meta = extrairMetadadosDescricao(tarefa.descricao);
        const matchHora = meta.textoLimpo.match(/\((\d{2}:\d{2})/);
        const tipoItem: AgendaItem["type"] =
          meta.tipoAtividade === "Eventos"
            ? "evento"
            : meta.tipoAtividade === "Prazos"
            ? "prazo"
            : meta.tipoAtividade === "Audiências"
            ? "audiencia"
            : "tarefa";

        return {
          id: tarefa.id,
          type: tipoItem,
          ownerId: tarefa.user_id,
          responsavelId: tarefa.responsavel_id,
          ownerName: tarefa.responsavel || "Grupo Venda+",
          title: meta.textoLimpo,
          description: meta.processoCaso || tarefa.responsavel,
          date: new Date(tarefa.data_conclusao + "T00:00:00"),
          time: matchHora ? matchHora[1] : undefined,
          timeLabel: matchHora ? matchHora[1] : undefined,
          status: tarefa.status,
          priority: tarefa.prioridade,
          etiquetas: meta.etiquetas,
          cancelada: meta.cancelada,
          concluida: tarefa.status === "Concluída",
        };
      });

      setAgendaItems([...eventosItems, ...audienciasItems, ...tarefasItems]);
    } catch (error) {
      console.error("Erro ao carregar agenda:", error);
      toast.error("Erro ao carregar dados da agenda");
    } finally {
      setLoading(false);
    }
  }, [user, usuarios]);

  useEffect(() => {
    if (user) {
      loadAgendaData();
    }
  }, [user, loadAgendaData]);

  // Lista unificada de pessoas (usuário atual no topo como "Grupo Venda+" igual ao print 2 + demais usuários)
  const usuarioPrincipal = useMemo(() => {
    const encontrado = usuarios.find((u) => u.id === user?.id);
    return {
      id: user?.id || "current-user",
      label: encontrado?.full_name || "Grupo Venda+",
    };
  }, [usuarios, user?.id]);

  const outrosUsuarios = useMemo(
    () => usuarios.filter((u) => u.id !== usuarioPrincipal.id),
    [usuarios, usuarioPrincipal.id]
  );

  const todosIdsPessoas = useMemo(
    () => [usuarioPrincipal.id, ...outrosUsuarios.map((u) => u.id)],
    [usuarioPrincipal.id, outrosUsuarios]
  );

  const filteredItems = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return agendaItems.filter((item) => {
      // 1. Filtro buscar escrito
      const matchBusca =
        !termo ||
        item.title.toLowerCase().includes(termo) ||
        (item.description || "").toLowerCase().includes(termo) ||
        (item.location || "").toLowerCase().includes(termo) ||
        (item.ownerName || "").toLowerCase().includes(termo) ||
        (item.processo || "").toLowerCase().includes(termo) ||
        (item.etiquetas || []).some((e) => e.toLowerCase().includes(termo));

      // 2. Filtro de atribuições (Checkboxes: Responsáveis, Envolvidos, Quem criou + Pessoas)
      let matchAtribuicao = true;
      const todasMarcadas =
        pessoasSelecionadas.length === 0 ||
        pessoasSelecionadas.length >= todosIdsPessoas.length;
      if (!todasMarcadas) {
        const verificaPessoa = (idPessoa: string) => {
          const ehResp =
            papeisAtribuicao.includes("responsaveis") &&
            (item.responsavelId === idPessoa || item.ownerId === idPessoa);
          const ehEnv =
            papeisAtribuicao.includes("envolvidos") &&
            (item.responsavelId === idPessoa || item.ownerId === idPessoa);
          const ehCriador =
            papeisAtribuicao.includes("quem_criou") &&
            item.ownerId === idPessoa;
          return ehResp || ehEnv || ehCriador;
        };
        matchAtribuicao = pessoasSelecionadas.some(verificaPessoa);
      }

      // 3. Filtro de Tipos (Checkboxes EXIBIR: Tarefas, Eventos, Prazos, Audiências)
      const mapaTipo: Record<AgendaItem["type"], TipoAtividadeKanban> = {
        tarefa: "Tarefas",
        evento: "Eventos",
        prazo: "Prazos",
        audiencia: "Audiências",
      };
      const matchTipo = exibirTipos.includes(mapaTipo[item.type]);

      // 4. Filtro de Status (Radio STATUS: A concluir, Concluídas, Canceladas, Todas)
      let matchStatus = true;
      if (statusFiltro === "a_concluir") {
        matchStatus = !item.concluida && !item.cancelada;
      } else if (statusFiltro === "concluidas") {
        matchStatus = Boolean(item.concluida) && !item.cancelada;
      } else if (statusFiltro === "canceladas") {
        matchStatus = Boolean(item.cancelada);
      }

      // 5. Filtro pelas etiquetas criadas
      let matchEtiqueta = true;
      if (etiquetaFiltro === "__SEM__") {
        matchEtiqueta = !item.etiquetas || item.etiquetas.length === 0;
      } else if (etiquetaFiltro) {
        matchEtiqueta = (item.etiquetas || []).some(
          (e) => e.toLowerCase() === etiquetaFiltro.toLowerCase()
        );
      }

      return (
        matchBusca &&
        matchAtribuicao &&
        matchTipo &&
        matchStatus &&
        matchEtiqueta
      );
    });
  }, [
    agendaItems,
    searchTerm,
    pessoasSelecionadas,
    todosIdsPessoas.length,
    papeisAtribuicao,
    exibirTipos,
    statusFiltro,
    etiquetaFiltro,
  ]);

  const selectedDateItems = useMemo(
    () =>
      filteredItems
        .filter((item) => isSameDay(item.date, selectedDate))
        .sort((a, b) => (a.time || "99").localeCompare(b.time || "99")),
    [filteredItems, selectedDate]
  );

  const itensDiaTodo = useMemo(
    () => selectedDateItems.filter((item) => !item.time),
    [selectedDateItems]
  );

  const itensPorHora = useCallback(
    (hora: number) => {
      const prefixo = String(hora).padStart(2, "0") + ":";
      return selectedDateItems.filter(
        (item) => item.time && item.time.startsWith(prefixo)
      );
    },
    [selectedDateItems]
  );

  const abrirNovoNaHora = (hora?: number) => {
    if (hora !== undefined) {
      const ini = `${String(hora).padStart(2, "0")}:00`;
      const fim = `${String(Math.min(23, hora + 1)).padStart(2, "0")}:00`;
      setNovoEvento({
        titulo: "",
        descricao: "",
        hora_inicio: ini,
        hora_fim: fim,
        local: "",
        fuso: FUSO_ESCRITORIO,
        etiquetas: [],
      });
    } else {
      setNovoEvento({
        titulo: "",
        descricao: "",
        hora_inicio: "",
        hora_fim: "",
        local: "",
        fuso: FUSO_ESCRITORIO,
        etiquetas: [],
      });
    }
    setIsEventoOpen(true);
  };

  const salvarEvento = async () => {
    if (!user || !novoEvento.titulo.trim()) {
      toast.error("Informe o título do compromisso");
      return;
    }
    const descricaoComTags = montarDescricaoComEtiquetas(
      novoEvento.descricao || "",
      novoEvento.etiquetas
    );
    const { error } = await supabase.from("agenda_eventos" as never).insert({
      user_id: user.id,
      titulo: novoEvento.titulo.trim(),
      descricao: descricaoComTags || null,
      data: format(selectedDate, "yyyy-MM-dd"),
      hora_inicio: novoEvento.hora_inicio || null,
      fuso: novoEvento.fuso || FUSO_ESCRITORIO,
      hora_fim: novoEvento.hora_fim || null,
      local: novoEvento.local || null,
    } as never);
    if (error) {
      toast.error("Erro ao salvar compromisso", {
        description: error.message,
      });
      return;
    }
    toast.success("Compromisso adicionado");
    setIsEventoOpen(false);
    setNovoEvento({
      titulo: "",
      descricao: "",
      hora_inicio: "",
      hora_fim: "",
      local: "",
      fuso: FUSO_ESCRITORIO,
      etiquetas: [],
    });
    loadAgendaData();
  };

  const salvarAtividadeKanban = async (data: {
    id?: string;
    descricao: string;
    dataConclusao: Date | string;
    prioridade: "Baixa" | "Média" | "Alta";
    status: "Pendente" | "Em Andamento" | "Em Revisão" | "Concluída";
    responsavel: string;
    responsavelId?: string | null;
  }) => {
    if (!user) return;
    const { error } = await supabase.from("tarefas").insert([
      {
        descricao: data.descricao,
        data_conclusao:
          typeof data.dataConclusao === "string"
            ? data.dataConclusao
            : format(data.dataConclusao, "yyyy-MM-dd"),
        prioridade: data.prioridade || "Baixa",
        status: data.status || "Pendente",
        responsavel: data.responsavel || null,
        responsavel_id: data.responsavelId || null,
        user_id: user.id,
      } as any,
    ]);
    if (error) {
      toast.error("Erro ao criar atividade", { description: error.message });
      return;
    }
    toast.success("Atividade adicionada à Agenda e ao Kanban!");
    setIsFormKanbanOpen(false);
    loadAgendaData();
  };

  const excluirEvento = async (item: AgendaItem) => {
    const { data, error } = await supabase
      .from("agenda_eventos" as never)
      .delete()
      .eq("id", item.id)
      .select("id");
    if (error || !(data as any[])?.length) {
      toast.error("Você só pode excluir os seus próprios compromissos.");
      return;
    }
    toast.success("Compromisso excluído");
    loadAgendaData();
  };

  const navegar = (dir: 1 | -1) =>
    setSelectedDate((d) =>
      visao === "dia" || visao === "lista"
        ? addDays(d, dir)
        : visao === "semana"
        ? addDays(d, 7 * dir)
        : addMonths(d, dir)
    );

  const diasSemana = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(selectedDate, { weekStartsOn: 0 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 0 }),
      }),
    [selectedDate]
  );

  const diasMes = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 }),
      }),
    [selectedDate]
  );

  const itensDoDia = useCallback(
    (dia: Date) =>
      filteredItems
        .filter((item) => isSameDay(item.date, dia))
        .sort((a, b) => (a.time || "99").localeCompare(b.time || "99")),
    [filteredItems]
  );

  const corBordaItem = (item: AgendaItem) => {
    if (item.type === "evento")
      return "border-l-4 border-l-[#00A859] bg-[#00A859]/10 text-[#010E38] dark:text-[#F1F4F9]";
    if (item.type === "prazo")
      return "border-l-4 border-l-[#E53935] bg-[#E53935]/10 text-[#010E38] dark:text-[#F1F4F9]";
    if (item.type === "audiencia")
      return "border-l-4 border-l-[#EBB52C] bg-[#EBB52C]/20 text-[#010E38] dark:text-[#F1F4F9]";
    return "border-l-4 border-l-[#010E38] bg-[#010E38]/8 dark:bg-white/10 text-[#010E38] dark:text-[#F1F4F9]";
  };

  const rotuloVisao = useMemo(() => {
    if (visao === "lista") return "EM LISTA";
    if (visao === "dia") return "POR DIA";
    if (visao === "semana") return "POR SEMANA";
    return "POR MÊS";
  }, [visao]);

  const rotuloAtribuicao = useMemo(() => {
    if (
      pessoasSelecionadas.length === 1 &&
      pessoasSelecionadas[0] === usuarioPrincipal.id
    ) {
      return "MINHAS ATRIBUIÇÕES";
    }
    if (
      pessoasSelecionadas.length > 0 &&
      pessoasSelecionadas.length < todosIdsPessoas.length
    ) {
      return `${pessoasSelecionadas.length} PESSOA(S)`;
    }
    return "MINHAS ATRIBUIÇÕES";
  }, [pessoasSelecionadas, usuarioPrincipal.id, todosIdsPessoas.length]);

  const rotuloTipos = useMemo(() => {
    if (
      exibirTipos.length === TODAS_ATIVIDADES_TIPOS.length &&
      statusFiltro === "todas"
    ) {
      return "TODAS AS ATIVIDADES";
    }
    if (exibirTipos.length === 1) {
      return exibirTipos[0].toUpperCase();
    }
    if (statusFiltro === "a_concluir") return "A CONCLUIR";
    if (statusFiltro === "concluidas") return "CONCLUÍDAS";
    if (statusFiltro === "canceladas") return "CANCELADAS";
    return `${exibirTipos.length} TIPOS`;
  }, [exibirTipos, statusFiltro]);

  const etiquetasFiltradasNoPopover = useMemo(() => {
    const q = buscaEtiqueta.trim().toLowerCase();
    if (!q) return etiquetas;
    return etiquetas.filter((e) => e.nome.toLowerCase().includes(q));
  }, [etiquetas, buscaEtiqueta]);

  const temFiltrosExtrasAtivos =
    Boolean(etiquetaFiltro) ||
    Boolean(searchTerm.trim()) ||
    exibirTipos.length !== TODAS_ATIVIDADES_TIPOS.length ||
    statusFiltro !== "todas";

  const limparTodosFiltros = () => {
    setEtiquetaFiltro(null);
    setSearchTerm("");
    setExibirTipos(TODAS_ATIVIDADES_TIPOS);
    setStatusFiltro("todas");
    setPapeisAtribuicao(["responsaveis", "envolvidos", "quem_criou"]);
    setPessoasSelecionadas(todosIdsPessoas);
  };

  const toggleDraftPapel = (papel: PapelAtribuicao) => {
    setDraftPapeisAtribuicao((prev) =>
      prev.includes(papel) ? prev.filter((p) => p !== papel) : [...prev, papel]
    );
  };

  const toggleDraftPessoa = (id: string) => {
    setDraftPessoasSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleDraftTipoExibir = (tipo: TipoAtividadeKanban) => {
    setDraftExibirTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  };

  const handleCriarNovaEtiqueta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaEtiquetaNome.trim()) {
      toast.error("Digite o nome da etiqueta");
      return;
    }
    adicionarEtiqueta(novaEtiquetaNome.trim(), novaEtiquetaCor);
    toast.success(`Etiqueta "${novaEtiquetaNome.trim().toUpperCase()}" criada!`);
    setNovaEtiquetaNome("");
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Cabeçalho estilo Astrea */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
          Agenda
        </h1>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={loadAgendaData}
            disabled={loading}
            title="Atualizar agenda"
            className="h-8 w-8 rounded-md border-[#010E38]/20 bg-[#F1F4F9] hover:bg-[#010E38] hover:text-[#EBB52C] text-[#010E38] transition-colors"
          >
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Mais opções"
                className="h-8 w-8 rounded-md border-[#010E38]/20 bg-[#F1F4F9] hover:bg-[#010E38] hover:text-[#EBB52C] text-[#010E38] transition-colors"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setSelectedDate(new Date())}
                className="text-xs cursor-pointer"
              >
                Ir para Hoje
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => trocarVisao("lista")}
                className="text-xs cursor-pointer"
              >
                Visualização Em lista
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => trocarVisao("dia")}
                className="text-xs cursor-pointer"
              >
                Visualização Por dia
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => trocarVisao("semana")}
                className="text-xs cursor-pointer"
              >
                Visualização Por semana
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => trocarVisao("mes")}
                className="text-xs cursor-pointer"
              >
                Visualização Por mês
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setModalGerenciarEtiquetas(true)}
                className="text-xs cursor-pointer font-bold text-[#010E38]"
              >
                Gerenciar etiquetas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
              className="w-44 py-1.5 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg"
            >
              <DropdownMenuItem
                onClick={() => {
                  setTipoCriacaoKanban("Tarefas");
                  setIsFormKanbanOpen(true);
                }}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Tarefa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTipoCriacaoKanban("Eventos");
                  setIsFormKanbanOpen(true);
                }}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Evento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTipoCriacaoKanban("Prazos");
                  setIsFormKanbanOpen(true);
                }}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Prazo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTipoCriacaoKanban("Audiências");
                  setIsFormKanbanOpen(true);
                }}
                className="text-xs py-2 cursor-pointer font-medium"
              >
                Audiência
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BARRA DE FILTROS ASTREA: POR DIA ▾ | MINHAS ATRIBUIÇÕES ▾ | TODAS AS ATIVIDADES ▾ | 🏷️ | 🔍 BUSCAR ESCRITO */}
      {/* ===================================================================== */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. EM LISTA / POR DIA / POR SEMANA / POR MÊS (Igual ao Print 1) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-between gap-2 h-8 rounded-md border border-[#010E38]/20 bg-white dark:bg-[#010E38] px-3 text-[11px] font-bold uppercase tracking-wide text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9] transition-colors shadow-2xs"
            >
              <span>{rotuloVisao}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-36 py-1.5 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg"
          >
            <DropdownMenuItem
              onClick={() => trocarVisao("lista")}
              className={cn(
                "text-xs py-2 cursor-pointer",
                visao === "lista" && "font-bold bg-[#F1F4F9]"
              )}
            >
              Em lista
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => trocarVisao("dia")}
              className={cn(
                "text-xs py-2 cursor-pointer",
                visao === "dia" && "font-bold bg-[#F1F4F9]"
              )}
            >
              Por dia
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => trocarVisao("semana")}
              className={cn(
                "text-xs py-2 cursor-pointer",
                visao === "semana" && "font-bold bg-[#F1F4F9]"
              )}
            >
              Por semana
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => trocarVisao("mes")}
              className={cn(
                "text-xs py-2 cursor-pointer",
                visao === "mes" && "font-bold bg-[#F1F4F9]"
              )}
            >
              Por mês
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 2. MINHAS ATRIBUIÇÕES (Checkboxes + Equipes + Pessoas marcar todas - Igual ao Print 2) */}
        <Popover
          open={popoverAtribuicaoOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftPapeisAtribuicao(papeisAtribuicao);
              setDraftPessoasSelecionadas(pessoasSelecionadas);
            }
            setPopoverAtribuicaoOpen(open);
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center justify-between gap-2 h-8 rounded-md border border-[#010E38]/20 bg-white dark:bg-[#010E38] px-3 text-[11px] font-bold uppercase tracking-wide text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9] transition-colors shadow-2xs"
            >
              <span className="truncate max-w-[180px]">{rotuloAtribuicao}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[380px] sm:w-[440px] p-0 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-4 p-4">
              {/* Coluna Esquerda: ATRIBUIÇÃO + EQUIPES */}
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    ATRIBUIÇÃO
                  </p>
                  <div className="space-y-2">
                    {(
                      [
                        { id: "responsaveis", label: "Responsáveis" },
                        { id: "envolvidos", label: "Envolvidos" },
                        { id: "quem_criou", label: "Quem criou" },
                      ] as const
                    ).map((op) => {
                      const checked = draftPapeisAtribuicao.includes(op.id);
                      return (
                        <label
                          key={op.id}
                          onClick={() => toggleDraftPapel(op.id)}
                          className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                        >
                          <span
                            className={cn(
                              "h-4 w-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0",
                              checked
                                ? "bg-[#010E38] border-[#010E38] text-[#EBB52C]"
                                : "border-slate-300 dark:border-slate-600 bg-white"
                            )}
                          >
                            {checked && <Check className="h-3 w-3 stroke-[3]" />}
                          </span>
                          <span>{op.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    EQUIPES
                  </p>
                  <p className="text-xs text-[#010E38]/80 dark:text-[#F1F4F9]/80 font-medium">
                    Venda+ Tech
                  </p>
                </div>
              </div>

              {/* Coluna Direita: PESSOAS + marcar todas */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    PESSOAS
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        draftPessoasSelecionadas.length >=
                        todosIdsPessoas.length
                      ) {
                        setDraftPessoasSelecionadas([]);
                      } else {
                        setDraftPessoasSelecionadas(todosIdsPessoas);
                      }
                    }}
                    className="text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline"
                  >
                    {draftPessoasSelecionadas.length >= todosIdsPessoas.length
                      ? "desmarcar todas"
                      : "marcar todas"}
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {/* Usuário Principal no topo com linha divisória igual ao Print 2 */}
                  <div className="pb-2 border-b border-slate-200 dark:border-white/10">
                    <label
                      onClick={() => toggleDraftPessoa(usuarioPrincipal.id)}
                      className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0",
                          draftPessoasSelecionadas.includes(usuarioPrincipal.id)
                            ? "bg-[#010E38] border-[#010E38] text-[#EBB52C]"
                            : "border-slate-300 dark:border-slate-600 bg-white"
                        )}
                      >
                        {draftPessoasSelecionadas.includes(
                          usuarioPrincipal.id
                        ) && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <span className="truncate font-medium">
                        {usuarioPrincipal.label}
                      </span>
                    </label>
                  </div>

                  {/* Demais usuários */}
                  {outrosUsuarios.map((u) => {
                    const checked = draftPessoasSelecionadas.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        onClick={() => toggleDraftPessoa(u.id)}
                        className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0",
                            checked
                              ? "bg-[#010E38] border-[#010E38] text-[#EBB52C]"
                              : "border-slate-300 dark:border-slate-600 bg-white"
                          )}
                        >
                          {checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span className="truncate">
                          {u.full_name || u.email}
                        </span>
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
                  setPapeisAtribuicao(draftPapeisAtribuicao);
                  setPessoasSelecionadas(draftPessoasSelecionadas);
                  setPopoverAtribuicaoOpen(false);
                }}
                className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] hover:underline"
              >
                APLICAR
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* 3. TODAS AS ATIVIDADES (Checkboxes EXIBIR + Radio STATUS - Igual ao Print 3) */}
        <Popover
          open={popoverTiposOpen}
          onOpenChange={(open) => {
            if (open) {
              setDraftExibirTipos(exibirTipos);
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
                exibirTipos.length !== TODAS_ATIVIDADES_TIPOS.length ||
                  statusFiltro !== "todas"
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
            className="w-56 p-0 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg overflow-hidden"
          >
            <div className="p-4 space-y-5">
              {/* EXIBIR (Checkboxes) */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  EXIBIR
                </p>
                <div className="space-y-2">
                  {TODAS_ATIVIDADES_TIPOS.map((tipo) => {
                    const checked = draftExibirTipos.includes(tipo);
                    return (
                      <label
                        key={tipo}
                        onClick={() => toggleDraftTipoExibir(tipo)}
                        className="flex items-center gap-2.5 text-xs text-[#010E38] dark:text-[#F1F4F9] cursor-pointer select-none"
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-[3px] border flex items-center justify-center transition-colors shrink-0",
                            checked
                              ? "bg-[#010E38] border-[#010E38] text-[#EBB52C]"
                              : "border-slate-300 dark:border-slate-600 bg-white"
                          )}
                        >
                          {checked && <Check className="h-3 w-3 stroke-[3]" />}
                        </span>
                        <span>{tipo}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* STATUS (Radio buttons: A concluir, Concluídas, Canceladas, Todas) */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  STATUS
                </p>
                <div className="space-y-2.5">
                  {(
                    [
                      { id: "a_concluir", label: "A concluir" },
                      { id: "concluidas", label: "Concluídas" },
                      { id: "canceladas", label: "Canceladas" },
                      { id: "todas", label: "Todas" },
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
                            "h-4 w-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
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
                  setExibirTipos(draftExibirTipos);
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

        {/* 4. FILTRO PELAS ETIQUETAS CRIADAS (🏷️) */}
        <Popover
          open={popoverEtiquetasOpen}
          onOpenChange={setPopoverEtiquetasOpen}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Filtrar pelas etiquetas criadas"
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
            className="w-64 p-0 bg-white dark:bg-[#010E38] border-[#010E38]/15 shadow-xl rounded-lg overflow-hidden"
          >
            <div className="p-3 space-y-2.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                ETIQUETAS
              </p>
              <div className="relative flex items-center">
                <Input
                  placeholder="Encontrar etiqueta"
                  value={buscaEtiqueta}
                  onChange={(e) => setBuscaEtiqueta(e.target.value)}
                  className="h-8 pr-7 text-xs focus-visible:ring-[#EBB52C]"
                />
                <Search className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEtiquetaFiltro(
                      etiquetaFiltro === "__SEM__" ? null : "__SEM__"
                    );
                    setPopoverEtiquetasOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-left",
                    etiquetaFiltro === "__SEM__" &&
                      "bg-[#F1F4F9] font-bold text-[#010E38]"
                  )}
                >
                  <span className="relative h-3.5 w-3.5 rounded-[2px] border border-red-600 shrink-0 overflow-hidden bg-white">
                    <span className="absolute inset-0 border-t border-red-600 rotate-45 origin-top-left translate-x-[1px]" />
                  </span>
                  <span>Sem etiqueta</span>
                </button>
                {etiquetasFiltradasNoPopover.length === 0 ? (
                  <p className="text-[11px] text-slate-400 px-2 py-2">
                    Nenhuma etiqueta criada. Clique abaixo para criar.
                  </p>
                ) : (
                  etiquetasFiltradasNoPopover.map((et) => (
                    <button
                      key={et.id}
                      type="button"
                      onClick={() => {
                        setEtiquetaFiltro(
                          etiquetaFiltro === et.nome ? null : et.nome
                        );
                        setPopoverEtiquetasOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-xs hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-left",
                        etiquetaFiltro === et.nome &&
                          "bg-[#F1F4F9] font-bold text-[#010E38]"
                      )}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-[2px] shrink-0"
                        style={{ backgroundColor: et.cor }}
                      />
                      <span className="truncate">{et.nome}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-[#010E38]/10 bg-[#F1F4F9]/60 dark:bg-black/20 px-3 py-2.5 text-center">
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

        {/* Badge da Etiqueta selecionada */}
        {etiquetaFiltro && (
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-[#010E38] text-[#EBB52C] text-[11px] font-bold uppercase">
            <Tag className="h-3 w-3" />
            {etiquetaFiltro === "__SEM__" ? "Sem etiqueta" : etiquetaFiltro}
            <button
              type="button"
              onClick={() => setEtiquetaFiltro(null)}
              className="hover:opacity-75"
              title="Remover filtro de etiqueta"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        )}

        {/* 5. FILTRO BUSCAR ESCRITO (Campo de busca visível igual ao solicitado) */}
        <div className="relative flex items-center">
          <Search className="h-3.5 w-3.5 text-[#010E38]/60 dark:text-[#F1F4F9]/60 absolute left-2.5 pointer-events-none" />
          <Input
            placeholder="Buscar na agenda..."
            className="h-8 w-48 sm:w-64 pl-8 pr-7 text-xs rounded-md border-[#010E38]/20 bg-white dark:bg-[#010E38] text-[#010E38] dark:text-[#F1F4F9] placeholder:text-[#010E38]/45 focus-visible:ring-[#EBB52C]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 text-[#010E38]/50 hover:text-[#010E38]"
              title="Limpar busca"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {temFiltrosExtrasAtivos && (
          <button
            type="button"
            onClick={limparTodosFiltros}
            className="text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline ml-1"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* =================================================================== */}
      {/* CONTEÚDO PRINCIPAL EM 2 COLUNAS IGUAL AO ASTREA                     */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Coluna Esquerda (8 colunas): Lista / Grade Horária / Semana / Mês */}
        <Card className="lg:col-span-8 rounded-xl border-[#010E38]/12 bg-white dark:bg-[#010E38] shadow-2xs overflow-hidden">
          {/* Barra de Data do Card: "13 de novembro de 2026 ▾" à esquerda e "HOJE < >" à direita */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10">
            <Popover
              open={calendarioPopoverOpen}
              onOpenChange={setCalendarioPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[15px] font-bold text-[#010E38] dark:text-[#F1F4F9] hover:opacity-80"
                >
                  <span>
                    {visao === "mes"
                      ? format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })
                      : format(selectedDate, "d 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) {
                      setSelectedDate(d);
                      setCalendarioPopoverOpen(false);
                    }
                  }}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(new Date())}
                className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-[#010E38] px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-white/10"
              >
                HOJE
              </button>
              <button
                type="button"
                onClick={() => navegar(-1)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navegar(1)}
                className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                title="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* 0) VISUALIZAÇÃO EM LISTA */}
          {visao === "lista" && (
            <div className="divide-y divide-slate-200/80 dark:divide-white/10 max-h-[calc(100vh-240px)] overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-10 text-center space-y-1">
                  <p className="text-sm font-bold text-[#010E38] dark:text-[#F1F4F9]">
                    Nenhuma atividade encontrada
                  </p>
                  <p className="text-xs text-slate-400">
                    Verifique os filtros selecionados ou adicione uma nova
                    atividade no botão +.
                  </p>
                </div>
              ) : (
                filteredItems
                  .slice()
                  .sort(
                    (a, b) =>
                      a.date.getTime() - b.date.getTime() ||
                      (a.time || "99").localeCompare(b.time || "99")
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedDate(item.date)}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[#F1F4F9]/60 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-24 shrink-0">
                          <p className="font-data text-xs font-bold text-[#010E38] dark:text-[#EBB52C]">
                            {format(item.date, "dd/MM/yyyy")}
                          </p>
                          <p className="font-data text-[11px] text-slate-500">
                            {item.timeLabel || item.time || "Dia todo"}
                          </p>
                        </div>
                        <div className="min-w-0 space-y-1">
                          {item.etiquetas && item.etiquetas.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.etiquetas.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white"
                                  style={{
                                    backgroundColor: obterCorEtiqueta(tag),
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <p
                            className={cn(
                              "text-xs font-bold text-[#010E38] dark:text-[#F1F4F9] truncate",
                              item.concluida && "line-through opacity-60"
                            )}
                          >
                            {item.title}
                          </p>
                          {(item.description || item.location) && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {[item.description, item.location]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {item.status}
                      </Badge>
                    </div>
                  ))
              )}
            </div>
          )}

          {/* 1) VISUALIZAÇÃO POR DIA (GRADE EM HORAS 0:00 A 23:00 IGUAL AO PRINT) */}
          {visao === "dia" && (
            <div className="divide-y divide-slate-200/80 dark:divide-white/10">
              {/* Linha "Dia todo" */}
              <div className="flex min-h-[54px]">
                <div className="w-16 sm:w-20 shrink-0 py-2.5 pr-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 border-r border-slate-200/80 dark:border-white/10 leading-tight select-none">
                  Dia
                  <br />
                  todo
                </div>
                <div
                  onClick={() => {
                    setTipoCriacaoKanban("Tarefas");
                    setIsFormKanbanOpen(true);
                  }}
                  className="flex-1 p-2 flex flex-wrap gap-1.5 items-center hover:bg-[#F1F4F9]/60 dark:hover:bg-white/5 cursor-pointer transition-colors"
                  title="Clique para adicionar atividade para o dia todo"
                >
                  {itensDiaTodo.map((item) => (
                    <div
                      key={item.id}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "px-2.5 py-1 rounded text-xs font-medium flex flex-wrap items-center gap-1.5 shadow-2xs",
                        corBordaItem(item)
                      )}
                    >
                      {item.etiquetas?.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white"
                          style={{ backgroundColor: obterCorEtiqueta(tag) }}
                        >
                          {tag}
                        </span>
                      ))}
                      <span
                        className={cn(
                          "truncate max-w-[280px]",
                          item.concluida && "line-through opacity-60"
                        )}
                      >
                        {item.title}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grade de Horas: 0:00 até 23:00 */}
              <div className="max-h-[calc(100vh-280px)] overflow-y-auto divide-y divide-slate-200/70 dark:divide-white/10">
                {HORAS_DO_DIA.map((hora) => {
                  const itensHora = itensPorHora(hora);
                  return (
                    <div key={hora} className="flex min-h-[48px] group">
                      <div className="w-16 sm:w-20 shrink-0 py-2 pr-3 text-right font-data text-xs text-slate-500 dark:text-slate-400 border-r border-slate-200/80 dark:border-white/10 select-none">
                        {hora}:00
                      </div>
                      <div
                        onClick={() => abrirNovoNaHora(hora)}
                        className="flex-1 px-2.5 py-1.5 hover:bg-[#F1F4F9]/70 dark:hover:bg-white/5 transition-colors cursor-pointer flex flex-col gap-1.5 justify-center"
                        title={`Clique para agendar compromisso às ${String(
                          hora
                        ).padStart(2, "0")}:00`}
                      >
                        {itensHora.map((item) => (
                          <div
                            key={item.id}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-xs flex items-center justify-between gap-2 shadow-2xs",
                              corBordaItem(item)
                            )}
                          >
                            <div className="min-w-0 space-y-0.5">
                              {item.etiquetas && item.etiquetas.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.etiquetas.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white"
                                      style={{
                                        backgroundColor: obterCorEtiqueta(tag),
                                      }}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p
                                className={cn(
                                  "font-bold truncate",
                                  item.concluida && "line-through opacity-60"
                                )}
                              >
                                <span className="font-data mr-1.5">
                                  {item.timeLabel || item.time}
                                </span>
                                {item.title}
                              </p>
                              {(item.description || item.location) && (
                                <p className="text-[11px] opacity-75 truncate">
                                  {[item.description, item.location]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                            {item.type === "evento" &&
                              (item.ownerId === user?.id ||
                                role === "desenvolvedor" ||
                                role === "master") && (
                                <button
                                  type="button"
                                  onClick={() => excluirEvento(item)}
                                  className="text-destructive hover:opacity-75 p-1 shrink-0"
                                  title="Excluir compromisso"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2) VISUALIZAÇÃO POR SEMANA */}
          {visao === "semana" && (
            <div className="p-3 grid grid-cols-1 md:grid-cols-7 gap-2">
              {diasSemana.map((dia) => {
                const itens = itensDoDia(dia);
                return (
                  <div
                    key={dia.toISOString()}
                    className={cn(
                      "rounded-lg border min-h-[140px] md:min-h-[380px] flex flex-col",
                      isToday(dia) && "border-[#EBB52C] ring-1 ring-[#EBB52C]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(dia);
                        trocarVisao("dia");
                      }}
                      className="p-2 border-b text-left hover:bg-[#F1F4F9]"
                    >
                      <p className="text-[11px] font-bold uppercase text-muted-foreground">
                        {format(dia, "EEE", { locale: ptBR })}
                      </p>
                      <p className="font-data text-base font-bold">
                        {format(dia, "dd/MM")}
                      </p>
                    </button>
                    <div className="p-1.5 space-y-1.5 flex-1">
                      {itens.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center pt-4">
                          —
                        </p>
                      )}
                      {itens.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dia);
                            trocarVisao("dia");
                          }}
                          className={cn(
                            "w-full text-left rounded px-2 py-1 text-xs leading-snug",
                            corBordaItem(item)
                          )}
                        >
                          {item.time && (
                            <span className="font-data font-bold">
                              {String(item.time).slice(0, 5)}{" "}
                            </span>
                          )}
                          <span className="line-clamp-2 break-words">
                            {item.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3) VISUALIZAÇÃO POR MÊS */}
          {visao === "mes" && (
            <div className="border-t overflow-hidden">
              <div className="grid grid-cols-7 bg-[#F1F4F9] dark:bg-white/5 text-xs font-bold uppercase text-[#010E38] dark:text-[#EBB52C]">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                  <div key={d} className="p-2.5 text-center">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {diasMes.map((dia) => {
                  const itens = itensDoDia(dia);
                  const foraDoMes = !isSameMonth(dia, selectedDate);
                  return (
                    <button
                      key={dia.toISOString()}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dia);
                        trocarVisao("dia");
                      }}
                      className={cn(
                        "min-h-[72px] sm:min-h-[110px] border-t border-l p-1.5 text-left align-top hover:bg-[#F1F4F9]/60 transition-colors flex flex-col",
                        foraDoMes && "bg-muted/20 text-muted-foreground/50"
                      )}
                    >
                      <span
                        className={cn(
                          "font-data text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full mb-1",
                          isToday(dia) && "bg-[#010E38] text-[#EBB52C]"
                        )}
                      >
                        {format(dia, "d")}
                      </span>
                      <div className="hidden sm:flex flex-col gap-0.5 w-full">
                        {itens.slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className={cn(
                              "truncate rounded px-1.5 py-0.5 text-[10.5px] leading-tight",
                              corBordaItem(item)
                            )}
                          >
                            {item.time
                              ? `${String(item.time).slice(0, 5)} `
                              : ""}
                            {item.title}
                          </span>
                        ))}
                        {itens.length > 3 && (
                          <span className="text-[10px] font-bold text-muted-foreground px-1">
                            +{itens.length - 3} mais
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Coluna Direita (4 colunas): Card de Resumo do Dia igual ao Astrea */}
        <Card className="lg:col-span-4 rounded-xl border-[#010E38]/12 bg-white dark:bg-[#010E38] shadow-2xs">
          {selectedDateItems.length === 0 ? (
            <>
              <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-white/10">
                <CardTitle className="text-[15px] font-bold text-[#010E38] dark:text-[#F1F4F9]">
                  Nenhuma atividade
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <p className="text-xs text-slate-400 dark:text-slate-400">
                  Nenhuma atividade encontrada. Verifique os filtros
                  selecionados.
                </p>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="px-5 py-4 border-b border-slate-100 dark:border-white/10">
                <CardTitle className="text-[15px] font-bold text-[#010E38] dark:text-[#F1F4F9] flex items-center justify-between">
                  <span>
                    Atividades de{" "}
                    {format(selectedDate, "dd/MM", { locale: ptBR })}
                  </span>
                  <span className="font-data text-xs bg-[#010E38] text-[#EBB52C] px-2 py-0.5 rounded-full">
                    {selectedDateItems.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto">
                {selectedDateItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-lg border shadow-2xs space-y-1.5",
                      corBordaItem(item)
                    )}
                  >
                    {item.etiquetas && item.etiquetas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.etiquetas.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-white"
                            style={{ backgroundColor: obterCorEtiqueta(tag) }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.type === "audiencia" ? (
                          <Briefcase className="w-4 h-4 shrink-0 text-[#010E38] dark:text-[#EBB52C]" />
                        ) : item.type === "evento" ? (
                          <CalendarDays className="w-4 h-4 shrink-0 text-[#00A859]" />
                        ) : (
                          <CheckCircle className="w-4 h-4 shrink-0 text-[#010E38]" />
                        )}
                        <h4
                          className={cn(
                            "font-bold text-xs leading-snug break-words",
                            item.concluida && "line-through opacity-60"
                          )}
                        >
                          {item.title}
                        </h4>
                      </div>
                      {item.type === "evento" &&
                        (item.ownerId === user?.id ||
                          role === "desenvolvedor" ||
                          role === "master") && (
                          <button
                            type="button"
                            onClick={() => excluirEvento(item)}
                            className="text-destructive hover:opacity-75 p-0.5 shrink-0"
                            title="Excluir compromisso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>

                    {item.description && (
                      <p className="text-[11px] opacity-80">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                      {item.time ? (
                        <span className="font-data font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timeLabel || item.time}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold opacity-70">
                          Dia todo
                        </span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1 opacity-80">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                      {item.ownerName && (
                        <span className="flex items-center gap-1 opacity-75 ml-auto">
                          {item.ownerId === user?.id ? (
                            <UserIcon className="w-3 h-3" />
                          ) : (
                            <Lock className="w-3 h-3" />
                          )}
                          {item.ownerName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Modal de agendamento rápido ao clicar em uma linha de hora (ex: 9:00) */}
      <Dialog open={isEventoOpen} onOpenChange={setIsEventoOpen}>
        <DialogContent className="mx-4 max-w-md border-l-[10px] border-l-[#00A859]">
          <DialogHeader>
            <DialogTitle className="font-bold text-[#010E38] dark:text-[#F1F4F9]">
              Adicionar compromisso na Agenda
            </DialogTitle>
            <DialogDescription className="font-data text-xs">
              Data: {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold">Título *</Label>
              <Input
                value={novoEvento.titulo}
                onChange={(e) =>
                  setNovoEvento({ ...novoEvento, titulo: e.target.value })
                }
                placeholder="Ex: Reunião com cliente"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Início</Label>
                <Input
                  type="time"
                  value={novoEvento.hora_inicio}
                  onChange={(e) =>
                    setNovoEvento({
                      ...novoEvento,
                      hora_inicio: e.target.value,
                    })
                  }
                  className="font-data"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Fim</Label>
                <Input
                  type="time"
                  value={novoEvento.hora_fim}
                  onChange={(e) =>
                    setNovoEvento({ ...novoEvento, hora_fim: e.target.value })
                  }
                  className="font-data"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Fuso horário</Label>
              <Select
                value={novoEvento.fuso}
                onValueChange={(v) => setNovoEvento({ ...novoEvento, fuso: v })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUSOS.map((f) => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      {f.nome} (UTC{f.offset}) — {f.estados}
                      {f.id === FUSO_ESCRITORIO ? " · escritório" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Etiquetas</Label>
              {etiquetas.length === 0 ? (
                <p className="text-[11px] text-slate-400">
                  Nenhuma etiqueta criada.{" "}
                  <button
                    type="button"
                    onClick={() => setModalGerenciarEtiquetas(true)}
                    className="font-bold text-[#010E38] underline"
                  >
                    Criar etiqueta
                  </button>
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {etiquetas.map((et) => {
                    const ativa = novoEvento.etiquetas.includes(et.nome);
                    return (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() =>
                          setNovoEvento((prev) => ({
                            ...prev,
                            etiquetas: ativa
                              ? prev.etiquetas.filter((x) => x !== et.nome)
                              : [...prev.etiquetas, et.nome],
                          }))
                        }
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition-all",
                          ativa
                            ? "text-white ring-2 ring-[#010E38]/30"
                            : "bg-white text-[#010E38] border-slate-200 opacity-75 hover:opacity-100"
                        )}
                        style={
                          ativa ? { backgroundColor: et.cor, borderColor: et.cor } : undefined
                        }
                      >
                        {et.nome}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Local</Label>
              <Input
                value={novoEvento.local}
                onChange={(e) =>
                  setNovoEvento({ ...novoEvento, local: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Observações</Label>
              <Textarea
                value={novoEvento.descricao}
                onChange={(e) =>
                  setNovoEvento({ ...novoEvento, descricao: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEventoOpen(false)}>
              CANCELAR
            </Button>
            <Button
              onClick={salvarEvento}
              className="bg-[#EBB52C] text-[#010E38] font-bold hover:bg-[#EBB52C]/90"
            >
              SALVAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Gerenciar Etiquetas na Agenda */}
      <Dialog
        open={modalGerenciarEtiquetas}
        onOpenChange={setModalGerenciarEtiquetas}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
              Gerenciar Etiquetas
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarNovaEtiqueta} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#010E38]/75 dark:text-[#F1F4F9]/75">
                Nova etiqueta
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: URGENTE, AUDIÊNCIA..."
                  value={novaEtiquetaNome}
                  onChange={(e) => setNovaEtiquetaNome(e.target.value)}
                  className="h-9 text-xs uppercase font-bold"
                />
                <Button
                  type="submit"
                  className="h-9 bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 font-bold text-xs px-4"
                >
                  Criar
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              {CORES_ETIQUETAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setNovaEtiquetaCor(cor)}
                  className={cn(
                    "h-6 w-6 rounded-md transition-transform",
                    novaEtiquetaCor === cor &&
                      "scale-110 ring-2 ring-[#010E38] ring-offset-2"
                  )}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </form>

          <div className="border-t pt-3 mt-2 space-y-1.5 max-h-60 overflow-y-auto">
            {etiquetas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                Nenhuma etiqueta cadastrada no momento.
              </p>
            ) : (
              etiquetas.map((et) => (
                <div
                  key={et.id}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#F1F4F9]/60 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-[2px]"
                      style={{ backgroundColor: et.cor }}
                    />
                    <span className="text-xs font-bold text-[#010E38] dark:text-[#F1F4F9]">
                      {et.nome}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removerEtiqueta(et.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Remover etiqueta"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Astrea unificado (Tarefa, Evento, Prazo, Audiência) */}
      <TarefaForm
        isOpen={isFormKanbanOpen}
        onClose={() => setIsFormKanbanOpen(false)}
        onSave={salvarAtividadeKanban}
        tipoInicial={tipoCriacaoKanban}
      />
    </div>
  );
};

export default Agenda;
