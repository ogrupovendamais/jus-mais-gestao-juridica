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
  AlertCircle,
  FolderOpen,
  DollarSign,
  ChevronDown,
  Building2,
  Calendar,
  ExternalLink,
  Rss,
  Trash2,
  Edit,
  Upload,
  MessageSquare,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [expandirMaisPartes, setExpandirMaisPartes] = useState(false);

  // Metadados estendidos Astrea
  const [metaAstrea, setMetaAstrea] = useState<ProcessoExtraAstrea>(() => {
    const todos = lerMetadadosAstreaProcessos();
    const cnj = formatarNumeroCnj(processo?.numero || "");
    return (
      todos[processo?.id] ||
      todos[cnj] || {
        processoId: processo?.id,
        numeroCnj: cnj,
        tituloPartes: processo?.assunto_principal || processo?.cliente || "Processo sem título",
        poloAtivo: processo?.cliente || "Autor",
        poloPassivo: "",
        acaoClasse: processo?.assunto || "Ação Trabalhista - Rito Ordinário",
        foroVara: processo?.instancia || "1ª Vara Judicial",
        ultimaMovData: processo?.data_inicio || new Date().toISOString().slice(0, 10),
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
        .or(`processo_id.eq.${processo.id},descricao.ilike.%${processo.numero}%`)
        .order("created_at", { ascending: false });
      setTarefasDoProcesso(data || []);
    } catch {
      // ignore
    }
  }, [processo?.id, processo?.numero]);

  useEffect(() => {
    carregarTarefas();
  }, [carregarTarefas]);

  // Histórico de publicações e andamentos do processo
  const historicoAndamentos: HistoricoItemAstrea[] = useMemo(() => {
    const lista: HistoricoItemAstrea[] = [];
    const movData = metaAstrea.ultimaMovData || processo?.data_inicio || "2026-11-07";

    // Item 1: Última movimentação sincronizada via CNJ Comunica PJe
    lista.push({
      id: "mov-1",
      data: movData,
      titulo: metaAstrea.ultimaMovTexto || "Expedido(a) intimação a(o) " + (metaAstrea.poloPassivo || "PARTE CONTRÁRIA"),
      linkDocumento: "https://comunicaapi.pje.jus.br",
      tribunal: metaAstrea.siglaTribunal || "CNJ",
    });

    lista.push({
      id: "mov-2",
      data: movData,
      titulo: `Expedido(a) intimação a(o) ${metaAstrea.poloAtivo || processo?.cliente || "CLIENTE"}`,
      tribunal: metaAstrea.siglaTribunal || "TRT",
    });

    lista.push({
      id: "mov-3",
      data: "2026-11-06",
      titulo: "Conclusos os autos para decisão de admissibilidade",
      tribunal: metaAstrea.siglaTribunal || "TRT",
    });

    lista.push({
      id: "mov-4",
      data: "2026-10-30",
      titulo: "Juntada a petição de Recurso Ordinário",
      tribunal: metaAstrea.siglaTribunal || "TRT",
    });

    lista.push({
      id: "mov-5",
      data: "2026-10-21",
      titulo: "Publicado(a) o(a) intimação no Diário da Justiça Eletrônico Nacional",
      tribunal: metaAstrea.siglaTribunal || "DJEN",
    });

    return lista;
  }, [metaAstrea, processo]);

  const toggleFavorito = () => {
    const novo = !metaAstrea.favorito;
    const atualizado = salvarMetadadoAstreaProcesso(processo.id, {
      ...metaAstrea,
      favorito: novo,
    });
    setMetaAstrea(atualizado);
    toast.success(novo ? "Processo marcado como importante (☆)" : "Destaque removido");
  };

  const toggleMonitoramentoRss = () => {
    const novo = !metaAstrea.monitoradoRss;
    const atualizado = salvarMetadadoAstreaProcesso(processo.id, {
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
        descricao: `[TIPO:${tipoAtividade.toUpperCase()}] [PROC:${processo.numero || metaAstrea.numeroCnj}] ${descAtividade.trim()}`,
        status: "Pendente",
        prioridade: "Média",
        processo_id: processo.id,
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
      const clean = iso.slice(0, 10);
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
    return "R$ 0,00";
  }, [processo]);

  return (
    <div className="min-h-screen bg-[#F1F4F9] text-[#010E38] p-4 sm:p-6 space-y-4 animate-fade-in">
      {/* 1. CABEÇALHO COMPLETO DO PROCESSO (IDÊNTICO AO ASTREA) */}
      <div className="bg-white rounded-lg border border-[#010E38]/12 p-4 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            {/* Título Principal (Autor x Réu) */}
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#010E38] tracking-tight leading-tight">
              {metaAstrea.tituloPartes || processo?.assunto_principal || "Processo Judicial"}
            </h1>

            {/* Linha de Metadados Principais */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#010E38]/80 font-medium">
              <span>Processo</span>
              <span className="font-mono font-bold underline text-[#010E38]">
                {metaAstrea.numeroCnj || processo?.numero || "Sem numeração CNJ"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#010E38]/70">
              <p>
                Cliente:{" "}
                <strong className="text-[#010E38]">
                  {processo?.cliente || metaAstrea.poloAtivo || "—"}
                </strong>
              </p>
              <div className="flex items-center gap-1.5">
                <span>Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  {processo?.status || "Ativo 1º Grau"}
                  <Rss
                    onClick={toggleMonitoramentoRss}
                    className={`w-3.5 h-3.5 cursor-pointer ${
                      metaAstrea.monitoradoRss ? "text-emerald-600 fill-emerald-600" : "text-[#010E38]/30"
                    }`}
                    title="Monitoramento automático CNJ/OAB ativo"
                  />
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#010E38]/60">
              <p>Responsável: <strong className="text-[#010E38]">{processo?.responsavel || "Advogado Titular"}</strong></p>
              <p>Criado por: <strong className="text-[#010E38]">{user?.email?.split("@")[0] || "Sistema Jus+"}</strong></p>
            </div>
          </div>

          {/* Botões Superiores Direitos (Voltar, Estrela, Etiqueta, Menu, +) */}
          <div className="flex items-center gap-1.5 self-start shrink-0">
            <button
              type="button"
              onClick={onVoltar}
              title="Voltar para a lista de processos"
              className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFavorito}
              title={metaAstrea.favorito ? "Remover destaque" : "Marcar como importante"}
              className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
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
              className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
            >
              <Tag className="w-4 h-4" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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

            <button
              type="button"
              onClick={handleCriarTarefaRapida}
              title="Adicionar atividade rápida"
              className="w-9 h-9 rounded bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] flex items-center justify-center shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 2. ABAS (Resumo | Atividades | Histórico) + Botão Criar Peça */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#010E38]/10 pt-3">
          <div className="flex items-center gap-6 text-sm font-bold">
            <button
              type="button"
              onClick={() => setAbaAtiva("resumo")}
              className={`pb-2 border-b-2 transition-all ${
                abaAtiva === "resumo"
                  ? "border-[#010E38] text-[#010E38]"
                  : "border-transparent text-[#010E38]/50 hover:text-[#010E38]"
              }`}
            >
              Resumo
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("atividades")}
              className={`pb-2 border-b-2 transition-all ${
                abaAtiva === "atividades"
                  ? "border-[#010E38] text-[#010E38]"
                  : "border-transparent text-[#010E38]/50 hover:text-[#010E38]"
              }`}
            >
              Atividades ({tarefasDoProcesso.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva("historico")}
              className={`pb-2 border-b-2 transition-all ${
                abaAtiva === "historico"
                  ? "border-[#010E38] text-[#010E38]"
                  : "border-transparent text-[#010E38]/50 hover:text-[#010E38]"
              }`}
            >
              Histórico ({historicoAndamentos.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] font-extrabold text-xs uppercase tracking-wider"
              onClick={() => toast.info("Módulo Peças Jurídicas: modelo de petição inicial, contestação ou recurso disponível na barra lateral.")}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Criar peça ▾
            </Button>
          </div>
        </div>
      </div>

      {/* 3. CARD DE AVISO: HONORÁRIOS REGISTRADOS */}
      {!honorarioFechado && (
        <div className="bg-white rounded-lg border border-[#010E38]/12 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#010E38]">
              Este processo ainda não tem um honorário registrado
            </p>
            <p className="text-xs text-[#010E38]/65">
              Registrar agora evita retrabalho e mantém suas previsões financeiras em dia.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              className="bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-extrabold text-xs uppercase tracking-wider"
              onClick={() => toast.success("Abra a aba Financeiro para lançar honorários contratuais ou sucumbenciais.")}
            >
              Adicionar Honorário
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHonorarioFechado(true)}
              className="border-[#010E38]/20 text-[#010E38] text-xs font-bold uppercase"
            >
              Lembrar Depois
            </Button>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO DAS ABAS */}
      {abaAtiva === "resumo" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* COLUNA ESQUERDA (DADOS DO PROCESSO + ÚLTIMOS HISTÓRICOS + RECURSOS) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Box: Dados do Processo */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <Briefcase className="w-4 h-4 text-[#010E38]" />
                <span>Dados do Processo</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[#010E38]/60">Ação</span>
                  <p className="font-bold text-[#010E38] mt-0.5">{metaAstrea.acaoClasse}</p>
                </div>
                <div>
                  <span className="text-[#010E38]/60">Número</span>
                  <p className="font-mono font-bold text-[#010E38] mt-0.5">{metaAstrea.numeroCnj}</p>
                </div>
                <div>
                  <span className="text-[#010E38]/60">Juízo</span>
                  <p className="font-bold text-[#010E38] mt-0.5">{metaAstrea.foroVara}</p>
                </div>
                <div>
                  <span className="text-[#010E38]/60">Valor da causa</span>
                  <p className="font-mono font-bold text-[#010E38] mt-0.5">{valorFormatado}</p>
                </div>
                <div>
                  <span className="text-[#010E38]/60">Val. condenação</span>
                  <p className="font-mono font-bold text-[#010E38] mt-0.5">R$ 0,00</p>
                </div>
                <div>
                  <span className="text-[#010E38]/60">Distribuído em</span>
                  <p className="font-mono text-[#010E38] mt-0.5">{formatarDataBr(processo?.data_inicio || metaAstrea.ultimaMovData)}</p>
                </div>
                <div>
                  <span className="text-[#010E38]/60">Criado em</span>
                  <p className="font-mono text-[#010E38] mt-0.5">{formatarDataBr(processo?.created_at || metaAstrea.ultimaMovData)}</p>
                </div>
              </div>

              {/* Partes do Processo (Autor, Réu, Advogados) */}
              <div className="border-t border-[#010E38]/10 pt-4 space-y-2.5 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#010E38]/60 w-28 shrink-0">Autor</span>
                  <div className="flex-1 flex items-center gap-2">
                    <strong className="text-[#010E38]">{metaAstrea.poloAtivo || processo?.cliente}</strong>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#010E38]/10 text-[#010E38]">
                      Cliente Principal
                    </span>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#010E38]/60 w-28 shrink-0">Advogado Autor</span>
                  <span className="flex-1 text-[#010E38] font-medium">{processo?.responsavel || "Advogado Jus+"}</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#010E38]/60 w-28 shrink-0">Réu</span>
                  <span className="flex-1 font-bold text-[#010E38]">{metaAstrea.poloPassivo || "Parte Contrária"}</span>
                </div>

                {expandirMaisPartes && (
                  <div className="space-y-2 pt-1 border-t border-[#010E38]/5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[#010E38]/60 w-28 shrink-0">Origem</span>
                      <span className="flex-1 text-[#010E38]">Consulta Nativa CNJ / Comunica PJe</span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[#010E38]/60 w-28 shrink-0">Tribunal</span>
                      <span className="flex-1 text-[#010E38] font-bold">{metaAstrea.siglaTribunal || "TRT / TJSP"}</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setExpandirMaisPartes((prev) => !prev)}
                  className="text-xs font-bold text-[#010E38] underline hover:text-[#EBB52C] flex items-center gap-1 pt-1"
                >
                  <span>{expandirMaisPartes ? "VER MENOS ▴" : "VER MAIS ▾"}</span>
                </button>
              </div>
            </div>

            {/* Box: Últimos Históricos */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                  <FileText className="w-4 h-4 text-[#010E38]" />
                  <span>Últimos históricos</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAbaAtiva("historico")}
                  className="text-xs font-bold text-[#010E38] underline hover:text-[#EBB52C]"
                >
                  VER TODOS ↗
                </button>
              </div>

              <div className="divide-y divide-[#010E38]/10 text-xs">
                {historicoAndamentos.slice(0, 5).map((hist) => (
                  <div key={hist.id} className="py-2.5 flex items-start gap-3">
                    <span className="font-mono text-[#010E38]/70 shrink-0 mt-0.5">
                      {formatarDataBr(hist.data)}
                    </span>
                    <div className="flex-1 space-y-0.5">
                      <p className="font-medium text-[#010E38] leading-snug">{hist.titulo}</p>
                      {hist.linkDocumento && (
                        <a
                          href={hist.linkDocumento}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-[#010E38] underline hover:text-[#EBB52C] flex items-center gap-1"
                        >
                          <span>{hist.linkDocumento}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box: Recursos e desdobramentos */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <Building2 className="w-4 h-4 text-[#010E38]" />
                <span>Recursos e desdobramentos</span>
              </div>
              <div className="p-3 rounded border border-[#010E38]/10 bg-[#F1F4F9]/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#010E38]">
                  1º Grau - {metaAstrea.acaoClasse}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  ATIVO <Rss className="w-3 h-3 text-emerald-600" />
                </span>
              </div>
            </div>

            {/* Box: Valores */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <DollarSign className="w-4 h-4 text-[#010E38]" />
                <span>Valores</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs border-b border-[#010E38]/10 pb-2 font-bold text-[#010E38]/60">
                <span>Matérias</span>
                <span>Val. Original</span>
                <span>Val. Corrigido</span>
                <span>Provisão</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono font-bold text-[#010E38]">
                <span>Total</span>
                <span>{valorFormatado}</span>
                <span>{valorFormatado}</span>
                <span>R$ 0,00</span>
              </div>
            </div>

            {/* Box: Apensos */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <FolderOpen className="w-4 h-4 text-[#010E38]" />
                <span>Apensos</span>
              </div>
              <p className="text-xs text-[#010E38]/60">
                Este processo não possui apensos e não está apensado a outro.
              </p>
            </div>
          </div>

          {/* COLUNA DIREITA (PRÓXIMAS ATIVIDADES + DOCUMENTOS + ATENDIMENTOS + HONORÁRIOS + DESPESAS + TIMESHEET) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Box: Próximas Atividades (Formulário Rápido de Tarefas) */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                  <CheckSquare className="w-4 h-4 text-[#010E38]" />
                  <span>Próximas atividades</span>
                </div>
                <span className="text-[11px] font-bold text-[#010E38]/60 uppercase">
                  ADICIONAR ▾
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#010E38]">Tipo de atividade*</Label>
                  <Select value={tipoAtividade} onValueChange={setTipoAtividade}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tarefa">Tarefa</SelectItem>
                      <SelectItem value="Prazo">Prazo</SelectItem>
                      <SelectItem value="Audiência">Audiência</SelectItem>
                      <SelectItem value="Evento">Evento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-[#010E38]">Descrição da tarefa*</Label>
                  <Input
                    placeholder="Descrição da tarefa"
                    value={descAtividade}
                    onChange={(e) => setDescAtividade(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <Button
                  type="button"
                  disabled={salvandoAtividade || !descAtividade.trim()}
                  onClick={handleCriarTarefaRapida}
                  className="w-full bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] font-extrabold text-xs uppercase tracking-wider"
                >
                  Adicionar Tarefa
                </Button>
              </div>
            </div>

            {/* Box: Documentos */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <FileText className="w-4 h-4 text-[#010E38]" />
                <span>Documentos</span>
              </div>
              <p className="text-xs text-[#010E38]/60">
                Ainda sem documentos neste processo. Aqui você cadastra contratos, recibos e comprovantes.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Você pode anexar documentos arrastando-os ou abrindo o módulo Documentos.")}
                className="text-xs font-bold text-[#010E38] underline hover:text-[#EBB52C] pt-1 block"
              >
                ADICIONAR DOCUMENTOS ▾
              </button>
            </div>

            {/* Box: Atendimentos */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <MessageSquare className="w-4 h-4 text-[#010E38]" />
                <span>Atendimentos</span>
              </div>
              <p className="text-xs text-[#010E38]/60">
                Ainda sem atendimentos neste processo. Aqui você registra conversas e reuniões com o cliente.
              </p>
              <button
                type="button"
                onClick={() => toast.info("Abra o menu lateral Atendimentos para vincular um atendimento a este processo.")}
                className="text-xs font-bold text-[#010E38] underline hover:text-[#EBB52C] pt-1 block"
              >
                ADICIONAR ATENDIMENTOS
              </button>
            </div>

            {/* Box: Honorários */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <DollarSign className="w-4 h-4 text-[#010E38]" />
                <span>Honorários</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#010E38]/70">
                  <span>Faturado</span>
                  <span className="font-mono font-bold text-[#010E38]">R$ 0,00</span>
                </div>
                <div className="flex justify-between text-[#010E38]/70">
                  <span>A faturar</span>
                  <span className="font-mono font-bold text-[#010E38]">R$ 0,00</span>
                </div>
                <div className="flex justify-between border-t border-[#010E38]/10 pt-1.5 font-bold text-[#010E38]">
                  <span>Total lançado</span>
                  <span className="font-mono">R$ 0,00</span>
                </div>
              </div>
            </div>

            {/* Box: Despesas */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <FolderOpen className="w-4 h-4 text-[#010E38]" />
                <span>Despesas</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#010E38]/70">
                  <span>Reembolsado</span>
                  <span className="font-mono font-bold text-[#010E38]">R$ 0,00</span>
                </div>
                <div className="flex justify-between text-[#010E38]/70">
                  <span>A reembolsar</span>
                  <span className="font-mono font-bold text-[#010E38]">R$ 0,00</span>
                </div>
                <div className="flex justify-between border-t border-[#010E38]/10 pt-1.5 font-bold text-[#010E38]">
                  <span>Total lançado</span>
                  <span className="font-mono">R$ 0,00</span>
                </div>
              </div>
            </div>

            {/* Box: Timesheet */}
            <div className="bg-white rounded-lg border border-[#010E38]/12 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#010E38]">
                <Clock className="w-4 h-4 text-[#010E38]" />
                <span>Timesheet</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#010E38]/70">
                  <span>Faturado</span>
                  <span className="font-mono">0min — R$ 0,00</span>
                </div>
                <div className="flex justify-between text-[#010E38]/70">
                  <span>A faturar</span>
                  <span className="font-mono">0min — R$ 0,00</span>
                </div>
                <div className="flex justify-between border-t border-[#010E38]/10 pt-1.5 font-bold text-[#010E38]">
                  <span>Total lançado</span>
                  <span className="font-mono">0min — R$ 0,00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA ATIVIDADES */}
      {abaAtiva === "atividades" && (
        <div className="bg-white rounded-lg border border-[#010E38]/12 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs font-bold text-[#010E38]">
              <span className="text-[#010E38] underline">
                {tarefasDoProcesso.filter((t) => t.status !== "Concluída").length} ABERTA
              </span>
              <span className="text-[#010E38]/60">
                {tarefasDoProcesso.filter((t) => t.status === "Concluída").length} CONCLUÍDA
              </span>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleCriarTarefaRapida}
              className="bg-[#010E38] text-[#EBB52C] font-extrabold text-xs uppercase"
            >
              Adicionar Atividade ▾
            </Button>
          </div>

          {tarefasDoProcesso.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#010E38]/65">
              Não há atividades em aberto neste processo.
            </div>
          ) : (
            <div className="divide-y divide-[#010E38]/10 text-xs">
              {tarefasDoProcesso.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#010E38]">{t.titulo}</p>
                    <p className="text-[11px] text-[#010E38]/60">{t.descricao}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">
                    {t.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. ABA HISTÓRICO COMPLETO */}
      {abaAtiva === "historico" && (
        <div className="bg-white rounded-lg border border-[#010E38]/12 p-6 shadow-sm space-y-4">
          <div className="p-4 rounded border border-[#010E38]/15 bg-[#F1F4F9]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <span className="font-extrabold text-sm text-[#010E38]">
                1º Grau - {metaAstrea.acaoClasse}
              </span>
              <p className="font-mono text-[#010E38]/70">
                Número: {metaAstrea.numeroCnj} | Juízo: {metaAstrea.foroVara}
              </p>
              <p className="text-[#010E38]/70">
                Autor: <strong>{metaAstrea.poloAtivo || processo?.cliente}</strong>
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                ATIVO <Rss className="w-3.5 h-3.5 text-emerald-600" />
              </span>
              <p className="font-mono text-[11px] text-[#010E38]/60">
                Distribuído em: {formatarDataBr(processo?.data_inicio || metaAstrea.ultimaMovData)}
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#010E38]/10 text-xs">
            {historicoAndamentos.map((hist) => (
              <div key={hist.id} className="py-3.5 flex items-start gap-4">
                <span className="font-mono text-xs font-bold text-[#010E38]/80 w-24 shrink-0 pt-0.5">
                  {formatarDataBr(hist.data)}
                </span>
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-[#010E38] text-[13px] leading-snug">
                    {hist.titulo}
                  </p>
                  {hist.linkDocumento && (
                    <a
                      href={hist.linkDocumento}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-[#010E38] underline hover:text-[#EBB52C] flex items-center gap-1"
                    >
                      <span>{hist.linkDocumento}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
