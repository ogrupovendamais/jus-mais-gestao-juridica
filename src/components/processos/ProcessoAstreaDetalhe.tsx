/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Star,
  Tag,
  MoreVertical,
  Plus,
  Scale,
  Sparkles,
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  FolderOpen,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Building2,
  ExternalLink,
  Rss,
  Trash2,
  Edit,
  MessageSquare,
  CheckSquare,
  Cloud,
  Layers,
  ChevronRight,
  Folder,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ProcessoExtraAstrea,
  lerMetadadosAstreaProcessos,
  salvarMetadadoAstreaProcesso,
  formatarNumeroCnj,
} from "@/lib/oabSync";

export interface HistoricoItemAstrea {
  id: string;
  data: string; // YYYY-MM-DD
  titulo: string;
  descricao?: string;
  linkDocumento?: string;
  tribunal?: string;
}

export interface ProcessoAstreaDetalheProps {
  processo: any;
  onVoltar: () => void;
  onEditar?: (proc: any) => void;
  onExcluir?: (proc: any) => void;
}

export const ProcessoAstreaDetalhe: React.FC<ProcessoAstreaDetalheProps> = ({
  processo,
  onVoltar,
  onEditar,
  onExcluir,
}) => {
  const { user } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<"resumo" | "atividades" | "historico">("resumo");
  const [subAbaAtividades, setSubAbaAtividades] = useState<"aberta" | "concluida">("aberta");
  const [expandirMaisPartes, setExpandirMaisPartes] = useState(false);
  const [expandirHistoricoCompleto, setExpandirHistoricoCompleto] = useState(false);

  // Metadados estendidos Astrea
  const [metaAstrea, setMetaAstrea] = useState<ProcessoExtraAstrea>(() => {
    const todos = lerMetadadosAstreaProcessos();
    const cnj = formatarNumeroCnj(processo?.numero || "0010509-93.2026.5.15.0047");
    return (
      todos[processo?.id] ||
      todos[cnj] || {
        processoId: processo?.id,
        numeroCnj: cnj,
        tituloPartes:
          processo?.assunto_principal ||
          (processo?.cliente
            ? `${processo.cliente} x ${processo?.parteContraria || "Souza Lima Seguranca Patrimonial Ltda."}`
            : "Admilson De Almeida Carvalho x Souza Lima Seguranca Patrimonial Ltda."),
        poloAtivo: processo?.cliente || "Admilson De Almeida Carvalho",
        poloPassivo: processo?.parteContraria || "Souza Lima Seguranca Patrimonial Ltda.",
        reusExtras: ["Klingele Paper Nova Campina Ltda."],
        advogadosAutor: ["Josiel Pereira Machado Silva", "Pedro Augusto Gil De Carvalho"],
        acaoClasse: processo?.assunto || "Acao Trabalhista - Rito Ordinario",
        foroVara: processo?.instancia || "Con2 - Sorocaba Con2 - Sorocaba",
        juizo: "Con2 - Sorocaba Con2 - Sorocaba",
        ultimaMovData: processo?.data_inicio || "2026-11-07",
        dataDistribuicao: "2026-05-12",
        dataCriacao: "2026-11-07",
        etiquetas: [],
        favorito: false,
        monitoradoRss: true,
      }
    );
  });

  // Banner Honorários
  const [honorarioFechado, setHonorarioFechado] = useState(false);

  // Nova Tarefa Rápida
  const [tipoAtividade, setTipoAtividade] = useState("Tarefa");
  const [descAtividade, setDescAtividade] = useState("");
  const [salvandoAtividade, setSalvandoAtividade] = useState(false);
  const [tarefasDoProcesso, setTarefasDoProcesso] = useState<any[]>([]);

  // Carregar tarefas vinculadas a este processo
  const carregarTarefas = useCallback(async () => {
    if (!processo?.id) return;
    try {
      const { data } = await supabase
        .from("tarefas")
        .select("*")
        .or(`processo_id.eq.${processo.id},descricao.ilike.%${processo.numero || metaAstrea.numeroCnj}%`)
        .order("created_at", { ascending: false });
      setTarefasDoProcesso(data || []);
    } catch {
      // ignore
    }
  }, [processo?.id, processo?.numero, metaAstrea.numeroCnj]);

  useEffect(() => {
    carregarTarefas();
  }, [carregarTarefas]);

  // Lista de advogados do autor
  const advogadosAutor = useMemo(() => {
    if (metaAstrea.advogadosAutor && metaAstrea.advogadosAutor.length > 0) {
      return metaAstrea.advogadosAutor;
    }
    const resp = processo?.responsavel;
    if (resp && resp !== "—" && resp !== "Advogado Titular") {
      const parts = resp.split(/[\/,]/).map((s: string) => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts;
    }
    return ["Josiel Pereira Machado Silva", "Pedro Augusto Gil De Carvalho"];
  }, [metaAstrea.advogadosAutor, processo?.responsavel]);

  // Lista de réus
  const reusLista = useMemo(() => {
    const list: string[] = [];
    if (metaAstrea.poloPassivo) list.push(metaAstrea.poloPassivo);
    else if (processo?.parteContraria) list.push(processo.parteContraria);
    else list.push("Souza Lima Seguranca Patrimonial Ltda.");

    if (metaAstrea.reusExtras && metaAstrea.reusExtras.length > 0) {
      metaAstrea.reusExtras.forEach((r) => {
        if (!list.includes(r)) list.push(r);
      });
    } else if (list.length === 1) {
      list.push("Klingele Paper Nova Campina Ltda.");
    }
    return list;
  }, [metaAstrea.poloPassivo, metaAstrea.reusExtras, processo?.parteContraria]);

  // Histórico de publicações e andamentos do processo
  const historicoAndamentos: HistoricoItemAstrea[] = useMemo(() => {
    if (metaAstrea.historicoCompleto && metaAstrea.historicoCompleto.length > 0) {
      return metaAstrea.historicoCompleto;
    }
    const passivo = reusLista[0] || "KLINGELE PAPER NOVA CAMPINA LTDA.";
    const passivo2 = reusLista[1] || "SOUZA LIMA SEGURANCA PATRIMONIAL LTDA.";
    const ativo = metaAstrea.poloAtivo || processo?.cliente || "ADMILSON DE ALMEIDA CARVALHO";

    return [
      {
        id: "mov-1",
        data: "2026-11-07",
        titulo: `Expedido(a) intimação a(o) ${passivo.toUpperCase()}`,
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-2",
        data: "2026-11-07",
        titulo: `Expedido(a) intimação a(o) ${passivo2.toUpperCase()}`,
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-3",
        data: "2026-11-07",
        titulo: `Expedido(a) intimação a(o) ${ativo.toUpperCase()}`,
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-4",
        data: "2026-11-07",
        titulo: `Recebido(s) o(s) Recurso Ordinário de ${ativo.toUpperCase()} sem efeito suspensivo`,
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-5",
        data: "2026-11-07",
        titulo: "Decisão",
        linkDocumento: "https://docs.aurum.com.br/TRT1",
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-6",
        data: "2026-11-06",
        titulo: "Conclusos os autos para decisão de admissibilidade do recurso a MARCELO SCHMIDT SIMOES",
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-7",
        data: "2026-11-06",
        titulo: `Decorrido o prazo de ${passivo.toUpperCase()} em 05/11/2026`,
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-8",
        data: "2026-11-06",
        titulo: `Decorrido o prazo de ${passivo2.toUpperCase()} em 05/11/2026`,
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-9",
        data: "2026-10-30",
        titulo: "Juntada a petição de Recurso Ordinário",
        tribunal: metaAstrea.siglaTribunal || "TRT15",
      },
      {
        id: "mov-10",
        data: "2026-10-21",
        titulo: "Publicado(a) o(a) intimação em 22/10/2026",
        tribunal: "DJEN",
      },
    ];
  }, [metaAstrea, processo, reusLista]);

  const toggleFavorito = () => {
    const novo = !metaAstrea.favorito;
    const atualizado = salvarMetadadoAstreaProcesso(processo?.id || "temp", {
      ...metaAstrea,
      favorito: novo,
    });
    setMetaAstrea(atualizado);
    toast.success(novo ? "Processo marcado como importante (☆)" : "Destaque removido");
  };

  const toggleMonitoramentoRss = () => {
    const novo = !metaAstrea.monitoradoRss;
    const atualizado = salvarMetadadoAstreaProcesso(processo?.id || "temp", {
      ...metaAstrea,
      monitoradoRss: novo,
    });
    setMetaAstrea(atualizado);
    toast.success(
      novo
        ? "Monitoramento automático CNJ/OAB ativado"
        : "Monitoramento automático pausado"
    );
  };

  const handleCriarTarefaRapida = async () => {
    if (!descAtividade.trim()) {
      toast.error("Informe a descrição da tarefa.");
      return;
    }
    if (!user?.id) return;

    setSalvandoAtividade(true);
    try {
      const { error } = await supabase.from("tarefas").insert({
        titulo: descAtividade.trim(),
        descricao: `[TIPO:${tipoAtividade.toUpperCase()}] [PROC:${processo?.numero || metaAstrea.numeroCnj}] ${descAtividade.trim()}`,
        status: "Pendente",
        prioridade: "Média",
        processo_id: processo?.id || null,
        user_id: user.id,
        data_limite: new Date().toISOString().slice(0, 10),
      } as any);

      if (error) throw error;
      toast.success(`${tipoAtividade} criada com sucesso para este processo!`);
      setDescAtividade("");
      carregarTarefas();
    } catch (err: any) {
      toast.error("Erro ao criar tarefa rápida", { description: err?.message });
    } finally {
      setSalvandoAtividade(false);
    }
  };

  const formatarDataBr = (iso?: string) => {
    if (!iso) return "—";
    try {
      const clean = String(iso).slice(0, 10);
      return format(new Date(clean + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  const valorFormatado = useMemo(() => {
    if (processo?.valor_causa != null) {
      return Number(processo.valor_causa).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
    }
    if (processo?.valor) return processo.valor;
    return "R$ 140.193,91";
  }, [processo]);

  const tarefasAbertas = tarefasDoProcesso.filter((t) => t.status !== "Concluída");
  const tarefasConcluidas = tarefasDoProcesso.filter((t) => t.status === "Concluída");

  return (
    <div className="min-h-screen bg-[#F1F4F9] text-[#010E38] p-3 sm:p-5 md:p-6 space-y-4 animate-fade-in relative pb-16">
      {/* 1. CABEÇALHO COMPLETO DO PROCESSO (IDÊNTICO AO ASTREA) */}
      <div className="bg-white rounded-lg border border-[#010E38]/12 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Título Principal (Autor x Réu) */}
            <h1 className="text-lg sm:text-xl font-bold text-[#010E38] tracking-tight leading-snug">
              {metaAstrea.tituloPartes ||
                `${metaAstrea.poloAtivo || "Admilson De Almeida Carvalho"} x ${reusLista[0] || "Souza Lima Seguranca Patrimonial Ltda."}`}
            </h1>

            {/* Linha de Metadados Principais */}
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-[#010E38]/80 font-medium">
              <span>Processo</span>
              <span className="font-mono underline text-[#010E38] cursor-pointer hover:text-[#EBB52C] transition-colors">
                {metaAstrea.numeroCnj || processo?.numero || "0010509-93.2026.5.15.0047"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#010E38]/70">
              <p>
                Cliente:{" "}
                <span className="text-[#010E38] font-medium">
                  {metaAstrea.poloAtivo || processo?.cliente || "Admilson De Almeida Carvalho"}
                </span>
              </p>
              <div className="flex items-center gap-1.5">
                <span>Status:</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                  {processo?.status || "Ativo 1º Grau"}
                  <Rss
                    onClick={toggleMonitoramentoRss}
                    className={`w-3.5 h-3.5 cursor-pointer ${
                      metaAstrea.monitoradoRss ? "text-emerald-500 fill-emerald-500" : "text-[#010E38]/30"
                    }`}
                    title="Monitoramento automático CNJ/OAB ativo"
                  />
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#010E38]/60">
              <p>Responsável: <strong className="text-[#010E38]">ALEX F</strong></p>
              <p>Criado por: <strong className="text-[#010E38]">ALEX F</strong></p>
            </div>
          </div>

          {/* Botões Superiores Direitos (Voltar, Estrela, Etiqueta, Menu, +) */}
          <div className="flex items-center gap-1.5 self-start shrink-0">
            <button
              type="button"
              onClick={onVoltar}
              title="Voltar para a lista de processos"
              className="w-8 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFavorito}
              title={metaAstrea.favorito ? "Remover destaque" : "Marcar como importante"}
              className="w-8 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            >
              <Star
                className={`w-4 h-4 ${
                  metaAstrea.favorito ? "text-[#EBB52C] fill-[#EBB52C]" : ""
                }`}
              />
            </button>

            <button
              type="button"
              title="Etiquetas do processo"
              className="w-8 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            >
              <Tag className="w-4 h-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-8 h-8 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-md">
                {onEditar && (
                  <DropdownMenuItem onClick={() => onEditar(processo)} className="text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5 mr-2" />
                    Editar dados
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={toggleMonitoramentoRss} className="text-xs font-semibold">
                  <Rss className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  {metaAstrea.monitoradoRss ? "Pausar monitoramento CNJ" : "Ativar monitoramento CNJ"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {onExcluir && (
                  <DropdownMenuItem
                    onClick={() => onExcluir(processo)}
                    className="text-xs text-red-600 focus:text-red-600 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Excluir processo
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botão + Jus+ Navy / Ouro */}
            <button
              type="button"
              onClick={handleCriarTarefaRapida}
              title="Adicionar atividade rápida"
              className="w-8 h-8 rounded bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 flex items-center justify-center shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 2. ABAS (Resumo | Atividades | Histórico) + Botão Criar Peça */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-6 text-sm font-semibold">
            <button
              type="button"
              onClick={() => setAbaAtiva("resumo")}
              className={`pb-2 border-b-2 transition-all ${
                abaAtiva === "resumo"
                  ? "border-[#EBB52C] text-[#010E38] font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Resumo
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("atividades")}
              className={`pb-2 border-b-2 transition-all ${
                abaAtiva === "atividades"
                  ? "border-[#EBB52C] text-[#010E38] font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Atividades
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("historico")}
              className={`pb-2 border-b-2 transition-all ${
                abaAtiva === "historico"
                  ? "border-[#EBB52C] text-[#010E38] font-black"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Histórico
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs rounded shadow-sm px-3.5 py-1.5 flex items-center gap-1.5 transition-colors"
              onClick={() => toast.info("Módulo Peças Jurídicas: modelos de petições, recursos e contestações prontos para edição.")}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#EBB52C]" />
              <span>Criar peça</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. CARD DE AVISO: HONORÁRIOS REGISTRADOS */}
      {!honorarioFechado && (
        <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">
              Este processo ainda não tem um honorário registrado
            </p>
            <p className="text-xs text-slate-500">
              Registrar agora evita retrabalho e mantém suas previsões financeiras em dia.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase tracking-wide rounded px-4 py-2 transition-colors shadow-sm"
              onClick={() => toast.success("Honorários: registre contratos e parcelas no financeiro.")}
            >
              ADICIONAR HONORÁRIO
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHonorarioFechado(true)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase rounded px-3 py-2"
            >
              LEMBRAR DEPOIS
            </Button>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DAS ABAS */}
      {abaAtiva === "resumo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* COLUNA ESQUERDA (DADOS DO PROCESSO + ÚLTIMOS HISTÓRICOS + RECURSOS + VALORES + APENSOS) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Box: Dados do Processo */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <Folder className="w-4 h-4 text-[#010E38]" />
                <span>Dados do Processo</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Ação</span>
                  <span className="font-medium text-slate-800 text-right">{metaAstrea.acaoClasse || "Acao Trabalhista - Rito Ordinario"}</span>
                </div>
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Número</span>
                  <span className="font-mono text-slate-800 text-right">{metaAstrea.numeroCnj || "0010509-93.2026.5.15.0047"}</span>
                </div>
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Juízo</span>
                  <span className="font-medium text-slate-800 text-right">{metaAstrea.juizo || metaAstrea.foroVara || "Con2 - Sorocaba Con2 - Sorocaba"}</span>
                </div>
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Valor da causa</span>
                  <span className="font-mono text-slate-800 text-right">{valorFormatado}</span>
                </div>
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Val. condenação</span>
                  <span className="font-mono text-slate-800 text-right">R$ 0,00</span>
                </div>
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Distribuído em</span>
                  <span className="font-mono text-slate-800 text-right">
                    {formatarDataBr(processo?.data_inicio || metaAstrea.dataDistribuicao || "2026-05-12")}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pr-2">
                  <span className="text-slate-500">Criado em</span>
                  <span className="font-mono text-slate-800 text-right">
                    {formatarDataBr(processo?.created_at || metaAstrea.dataCriacao || "2026-11-07")}
                  </span>
                </div>
              </div>

              {/* Partes do Processo (Autor, Réu, Advogados) */}
              <div className="border-t border-slate-100 pt-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-slate-500 w-32 shrink-0">Autor</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-slate-800 font-medium">
                      {metaAstrea.poloAtivo || processo?.cliente || "Admilson De Almeida Carvalho"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                      CLIENTE PRINCIPAL
                    </span>
                  </div>
                </div>

                {advogadosAutor.map((adv, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 w-32 shrink-0">Advogado Autor</span>
                    <span className="flex-1 text-slate-800 font-medium">{adv}</span>
                  </div>
                ))}

                {reusLista.map((reu, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 w-32 shrink-0">Réu</span>
                    <span className="flex-1 text-slate-800 font-medium">{reu}</span>
                  </div>
                ))}

                {expandirMaisPartes && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 w-32 shrink-0">Origem</span>
                      <span className="flex-1 text-slate-800">Consulta PJe / Comunica CNJ</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-slate-500 w-32 shrink-0">Tribunal</span>
                      <span className="flex-1 text-slate-800 font-medium">{metaAstrea.siglaTribunal || "TRT 15ª Região"}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandirMaisPartes((prev) => !prev)}
                  className="text-xs font-bold text-[#010E38] hover:text-[#021B66] hover:underline flex items-center gap-1 pt-1 transition-colors"
                >
                  <span>{expandirMaisPartes ? "VER MENOS ▴" : "VER MAIS ▾"}</span>
                </button>
              </div>
            </div>

            {/* Box: Últimos Históricos */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                  <FileText className="w-4 h-4 text-[#010E38]" />
                  <span>Últimos históricos</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toast.info("Adicionar novo histórico manual")}
                    className="text-slate-400 hover:text-[#010E38]"
                    title="Adicionar histórico"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva("historico")}
                    className="text-slate-400 hover:text-[#010E38]"
                    title="Expandir históricos"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {historicoAndamentos.slice(0, 5).map((hist) => (
                  <div key={hist.id} className="py-2.5 flex items-start gap-3">
                    <span className="font-mono text-slate-500 shrink-0 mt-0.5">
                      {formatarDataBr(hist.data)}
                    </span>
                    <Cloud className="w-4 h-4 text-[#010E38]/80 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-slate-800 leading-snug">{hist.titulo}</p>
                      {hist.linkDocumento && (
                        <a
                          href={hist.linkDocumento}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-[#010E38] hover:text-[#021B66] hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>{hist.linkDocumento}</span>
                          <ExternalLink className="w-3 h-3 text-[#010E38]" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAbaAtiva("historico")}
                  className="text-xs font-bold text-[#010E38] hover:text-[#021B66] hover:underline flex items-center gap-1 transition-colors"
                >
                  <span>VER TODOS</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Box: Recursos e desdobramentos */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <Building2 className="w-4 h-4 text-[#010E38]" />
                <span>Recursos e desdobramentos</span>
              </div>
              <div className="py-2 px-3 rounded border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800">
                  1º Grau - {metaAstrea.acaoClasse || "Acao Trabalhista - Rito Ordinario"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  ATIVO <Rss className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                </span>
              </div>
            </div>

            {/* Box: Valores */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <DollarSign className="w-4 h-4 text-[#EBB52C]" />
                <span>Valores</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs border-b border-slate-100 pb-2 text-slate-500 font-medium">
                <span>Matérias</span>
                <span>Val. Original</span>
                <span>Val. Corrigido</span>
                <span>Provisão</span>
                <span>Prov. corrigida</span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs font-mono text-slate-800 font-medium">
                <span className="font-sans">Total</span>
                <span>R$ 0,00</span>
                <span>R$ 0,00</span>
                <span>R$ 0,00</span>
                <span>R$ 0,00</span>
              </div>
            </div>

            {/* Box: Apensos */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <FolderOpen className="w-4 h-4 text-[#010E38]" />
                <span>Apensos</span>
              </div>
              <p className="text-xs text-slate-500">
                Este processo não possui apensos e não está apensado a outro.
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA (PRÓXIMAS ATIVIDADES + DOCUMENTOS + ATENDIMENTOS + HONORÁRIOS + DESPESAS + TIMESHEET) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Box: Próximas Atividades (Formulário Rápido de Tarefas) */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                  <CheckSquare className="w-4 h-4 text-[#010E38]" />
                  <span>Próximas atividades</span>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info("Opções de atividades")}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 uppercase flex items-center gap-1"
                >
                  <span>ADICIONAR</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-medium">Tipo de atividade*</Label>
                  <Select value={tipoAtividade} onValueChange={setTipoAtividade}>
                    <SelectTrigger className="text-xs border-slate-200 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-md">
                      <SelectItem value="Tarefa">Tarefa</SelectItem>
                      <SelectItem value="Prazo">Prazo</SelectItem>
                      <SelectItem value="Audiência">Audiência</SelectItem>
                      <SelectItem value="Evento">Evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-600 font-medium">Descrição da tarefa*</Label>
                  <Input
                    placeholder="Descrição da tarefa"
                    value={descAtividade}
                    onChange={(e) => setDescAtividade(e.target.value)}
                    className="text-xs border-slate-200 bg-white"
                  />
                </div>

                <Button
                  type="button"
                  disabled={salvandoAtividade || !descAtividade.trim()}
                  onClick={handleCriarTarefaRapida}
                  className="w-full bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase tracking-wider rounded py-2 transition-colors shadow-sm"
                >
                  ADICIONAR TAREFA
                </Button>
              </div>
            </div>

            {/* Box: Documentos */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <FileText className="w-4 h-4 text-[#010E38]" />
                <span>Documentos</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ainda sem documentos neste processo.
                <br />
                Aqui você cadastra contratos, recibos e comprovantes.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Clique na aba Documentos ou arraste arquivos para anexar.")}
                className="text-xs font-bold text-[#010E38] hover:text-[#021B66] hover:underline pt-1 flex items-center gap-1 transition-colors"
              >
                <span>ADICIONAR DOCUMENTOS</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            {/* Box: Atendimentos */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <MessageSquare className="w-4 h-4 text-[#010E38]" />
                <span>Atendimentos</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ainda sem atendimentos neste processo.
                <br />
                Aqui você registra conversas e reuniões com o cliente.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Abra o menu Atendimentos para registrar uma nova reunião ou atendimento.")}
                className="text-xs font-bold text-[#010E38] hover:text-[#021B66] hover:underline pt-1 block transition-colors"
              >
                ADICIONAR ATENDIMENTOS
              </button>
            </div>

            {/* Box: Honorários */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <DollarSign className="w-4 h-4 text-[#EBB52C]" />
                <span>Honorários</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Faturado</span>
                  <span className="font-mono text-slate-800">R$ 0,00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>A faturar</span>
                  <span className="font-mono text-slate-800">R$ 0,00</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5 text-slate-800 font-medium">
                  <span>Total lançado</span>
                  <span className="font-mono">R$ 0,00</span>
                </div>
              </div>
            </div>

            {/* Box: Despesas */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <FolderOpen className="w-4 h-4 text-[#010E38]" />
                <span>Despesas</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Reembolsado</span>
                  <span className="font-mono text-slate-800">R$ 0,00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>A reembolsar</span>
                  <span className="font-mono text-slate-800">R$ 0,00</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5 text-slate-800 font-medium">
                  <span>Total lançado</span>
                  <span className="font-mono">R$ 0,00</span>
                </div>
              </div>
            </div>

            {/* Box: Timesheet */}
            <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#010E38]">
                <Clock className="w-4 h-4 text-[#010E38]" />
                <span>Timesheet</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Faturado</span>
                  <span className="font-mono">0min</span>
                  <span className="font-mono text-slate-800">R$ 0,00</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>A faturar</span>
                  <span className="font-mono">0min</span>
                  <span className="font-mono text-slate-800">R$ 0,00</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-1.5 text-slate-800 font-medium">
                  <span>Total lançado</span>
                  <span className="font-mono">0min</span>
                  <span className="font-mono">R$ 0,00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA ATIVIDADES (IDÊNTICA AO ASTREA - SCREENSHOT 7) */}
      {abaAtiva === "atividades" && (
        <div className="space-y-4">
          {/* Card aviso honorário se não fechado */}
          {!honorarioFechado && (
            <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800">
                  Este processo ainda não tem um honorário registrado
                </p>
                <p className="text-xs text-slate-500">
                  Registrar agora evita retrabalho e mantém suas previsões financeiras em dia.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase tracking-wide rounded px-4 py-2 transition-colors shadow-sm"
                  onClick={() => toast.success("Honorários: registre contratos e parcelas no financeiro.")}
                >
                  ADICIONAR HONORÁRIO
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHonorarioFechado(true)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase rounded px-3 py-2"
                >
                  LEMBRAR DEPOIS
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-6 text-xs font-bold border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => setSubAbaAtividades("aberta")}
                className={`transition-colors pb-1 ${
                  subAbaAtividades === "aberta"
                    ? "text-[#010E38] border-b-2 border-[#EBB52C] font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tarefasAbertas.length} ABERTA
              </button>
              <button
                type="button"
                onClick={() => setSubAbaAtividades("concluida")}
                className={`transition-colors pb-1 ${
                  subAbaAtividades === "concluida"
                    ? "text-[#010E38] border-b-2 border-[#EBB52C] font-black"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tarefasConcluidas.length} CONCLUÍDA
              </button>
            </div>

            {subAbaAtividades === "aberta" && tarefasAbertas.length === 0 ? (
              <div className="space-y-4 py-6">
                <p className="text-xs text-slate-500">
                  Não há atividades em aberto neste processo.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCriarTarefaRapida}
                  className="border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase rounded px-3 py-1.5 flex items-center gap-1.5"
                >
                  <span>ADICIONAR ATIVIDADE</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : subAbaAtividades === "concluida" && tarefasConcluidas.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhuma atividade concluída neste processo ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {(subAbaAtividades === "aberta" ? tarefasAbertas : tarefasConcluidas).map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">{t.titulo}</p>
                      <p className="text-[11px] text-slate-500">{t.descricao}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. ABA HISTÓRICO COMPLETO */}
      {abaAtiva === "historico" && (
        <div className="space-y-4">
          {/* Card aviso honorário se não fechado */}
          {!honorarioFechado && (
            <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800">
                  Este processo ainda não tem um honorário registrado
                </p>
                <p className="text-xs text-slate-500">
                  Registrar agora evita retrabalho e mantém suas previsões financeiras em dia.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase tracking-wide rounded px-4 py-2 transition-colors shadow-sm"
                  onClick={() => toast.success("Honorários: registre contratos e parcelas no financeiro.")}
                >
                  ADICIONAR HONORÁRIO
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHonorarioFechado(true)}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase rounded px-3 py-2"
                >
                  LEMBRAR DEPOIS
                </Button>
              </div>
            </div>
          )}

          {/* Card Resumo do Desdobramento no Topo do Histórico */}
          <div className="bg-white rounded-lg border border-slate-200/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-slate-400" />
                <h2 className="text-sm font-bold text-slate-800">
                  1º Grau - {metaAstrea.acaoClasse || "Acao Trabalhista - Rito Ordinario"}
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                  ATIVO <Rss className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div>
                <p>
                  Número:{" "}
                  <span className="font-mono text-slate-800 font-medium">
                    {metaAstrea.numeroCnj || "0010509-93.2026.5.15.0047"}
                  </span>
                </p>
                <p className="mt-1">
                  Juízo:{" "}
                  <span className="text-slate-800 font-medium">
                    {metaAstrea.juizo || metaAstrea.foroVara || "Con2 - Sorocaba Con2 - Sorocaba"}
                  </span>
                </p>
                <p className="mt-1">
                  Autor:{" "}
                  <span className="text-slate-800 font-medium">
                    {metaAstrea.poloAtivo || processo?.cliente || "Admilson De Almeida Carvalho"}
                  </span>
                </p>
              </div>
              <div>
                <p>
                  Advogado Autor:{" "}
                  <span className="text-slate-800 font-medium">{advogadosAutor[0]}</span>
                </p>
                <p className="mt-1">
                  Distribuído em:{" "}
                  <span className="font-mono text-slate-800">
                    {formatarDataBr(processo?.data_inicio || metaAstrea.dataDistribuicao || "2026-05-12")}
                  </span>
                </p>
              </div>
            </div>

            {/* Timeline Completa de Andamentos */}
            <div className="divide-y divide-slate-100 text-xs pt-3 border-t border-slate-100">
              {historicoAndamentos.map((hist) => (
                <div key={hist.id} className="py-3 flex items-start gap-4">
                  <span className="font-mono text-slate-500 w-24 shrink-0 pt-0.5">
                    {formatarDataBr(hist.data)}
                  </span>
                  <Cloud className="w-4 h-4 text-[#010E38]/80 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-0.5">
                    <p className="text-slate-800 leading-snug">{hist.titulo}</p>
                    {hist.linkDocumento && (
                      <a
                        href={hist.linkDocumento}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-[#010E38] hover:text-[#021B66] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>{hist.linkDocumento}</span>
                        <ExternalLink className="w-3 h-3 text-[#010E38]" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setExpandirHistoricoCompleto((p) => !p)}
                className="text-xs font-bold text-[#010E38] hover:text-[#021B66] hover:underline inline-flex items-center gap-1 uppercase transition-colors"
              >
                <span>VER TODOS</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER OFICIAL JUS+ GESTÃO JURÍDICA */}
      <div className="text-center text-xs text-slate-500 pt-6">
        © Copyright 2026 - JUS+ Gestão Jurídica · Venda+ Tech - Versão 2.02
      </div>

      {/* FLOATING ACTION CHAT BUBBLE (JUS+ BRANDING) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => toast.info("Central de Ajuda e Suporte JUS+ Gestão Jurídica")}
          className="w-12 h-12 rounded-full bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
          title="Fale conosco / Ajuda"
        >
          <MessageSquare className="w-5 h-5 fill-[#EBB52C] text-[#010E38]" />
        </button>
      </div>
    </div>
  );
};
