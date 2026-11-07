import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag, Search, Plus, Check, Info, GitBranch, Trash2 } from "lucide-react";
import { aplicarWorkflowEmAtividade, useWorkflows } from "@/lib/workflows";
import { cn, formatDateForDatabase } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tarefa } from "@/pages/Tarefas";
import { useUsuarios } from "@/lib/nichos";
import {
  extrairMetadadosDescricao,
  isCorClara,
  useEtiquetasKanban,
  type TipoAtividadeKanban,
} from "@/lib/etiquetas";
import { toast } from "sonner";

type TarefaFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    descricao: string;
    dataConclusao: Date | string;
    prioridade: "Baixa" | "Média" | "Alta";
    status: "Pendente" | "Em Andamento" | "Em Revisão" | "Concluída";
    responsavel: string;
    responsavelId?: string | null;
    clienteId?: string | null;
  }) => void;
  tarefa?: Tarefa;
  tipoInicial?: TipoAtividadeKanban;
};

type OpcaoProcessoCaso = {
  id: string;
  label: string;
  clienteId?: string | null;
};

export function TarefaForm({
  isOpen,
  onClose,
  onSave,
  tarefa,
  tipoInicial = "Tarefas",
}: TarefaFormProps) {
  const usuarios = useUsuarios();
  const { user } = useAuth();
  const { etiquetas: catalogoEtiquetas, adicionarEtiqueta } = useEtiquetasKanban();

  const [tipo, setTipo] = useState<TipoAtividadeKanban>(tipoInicial);
  const [tituloOuDescricao, setTituloOuDescricao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [dataStr, setDataStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [dataAteStr, setDataAteStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFim, setHoraFim] = useState("10:00");
  const [diaInteiro, setDiaInteiro] = useState(false);
  const [recorrenciaAtiva, setRecorrenciaAtiva] = useState(false);
  const [recorrenciaTexto, setRecorrenciaTexto] = useState("Semanalmente");

  const [listaTarefas, setListaTarefas] = useState("Lista de tarefas");
  const [listasDisponiveis, setListasDisponiveis] = useState<string[]>([
    "Lista de tarefas",
    "Rotina Contencioso",
    "Rotina Consultivo",
    "Financeiro / Honorários",
  ]);
  const [criandoNovaLista, setCriandoNovaLista] = useState(false);
  const [novaListaNome, setNovaListaNome] = useState("");

  const [processoBusca, setProcessoBusca] = useState("");
  const [clienteIdVinculado, setClienteIdVinculado] = useState<string | null>(null);
  const [mostrarSugestoesProc, setMostrarSugestoesProc] = useState(false);
  const [opcoesProcessos, setOpcoesProcessos] = useState<OpcaoProcessoCaso[]>([]);

  const [responsavelId, setResponsavelId] = useState<string>("");
  const [envolvidosExtras, setEnvolvidosExtras] = useState<string[]>([]);
  const [mostrarEnvolverMais, setMostrarEnvolverMais] = useState(false);

  const [prioridade, setPrioridade] = useState<"Baixa" | "Média" | "Alta">("Baixa");
  const [quadroKanban, setQuadroKanban] = useState("Kanban Padrão");
  const [statusColuna, setStatusColuna] = useState<Tarefa["status"]>("Pendente");

  // Campos extras de Evento / Prazo / Audiência
  const [enderecoLocal, setEnderecoLocal] = useState("");
  const [modalidade, setModalidade] = useState("");
  const [alertaValor, setAlertaValor] = useState("0");
  const [alertaUnidade, setAlertaUnidade] = useState("Hora(s) antes");
  const [emailsExternos, setEmailsExternos] = useState("");
  const [mostrarConfigEmail, setMostrarConfigEmail] = useState(false);
  const [forum, setForum] = useState("");
  const [salaForum, setSalaForum] = useState("");

  // Etiquetas
  const [etiquetasSelecionadas, setEtiquetasSelecionadas] = useState<string[]>([]);
  const [novaTagNome, setNovaTagNome] = useState("");
  const [novaTagCor, setNovaTagCor] = useState("#010E38");
  const { workflows } = useWorkflows();
  const [mostrarSeletorWorkflow, setMostrarSeletorWorkflow] = useState(false);
  const [workflowSelecionadoForm, setWorkflowSelecionadoForm] = useState<string>("");
  const [workflowsAdicionadosNoForm, setWorkflowsAdicionadosNoForm] = useState<string[]>([]);

  useEffect(() => {
    const carregarProcessosEClientes = async () => {
      const [{ data: procs }, { data: cls }] = await Promise.all([
        supabase.from("processos").select("id, numero, tipo, cliente_id").limit(100),
        supabase.from("clientes").select("id, nome").limit(100),
      ]);
      const mapaClientes: Record<string, string> = {};
      (cls || []).forEach((c: any) => {
        mapaClientes[c.id] = c.nome;
      });
      const lista: OpcaoProcessoCaso[] = [];
      (procs || []).forEach((p: any) => {
        const nomeCli = mapaClientes[p.cliente_id] || "";
        lista.push({
          id: `proc-${p.id}`,
          label: nomeCli ? `${nomeCli} - ${p.numero || p.tipo}` : `${p.numero || p.tipo}`,
          clienteId: p.cliente_id || null,
        });
      });
      (cls || []).forEach((c: any) => {
        lista.push({
          id: `cli-${c.id}`,
          label: `${c.nome}`,
          clienteId: c.id,
        });
      });
      setOpcoesProcessos(lista);
    };
    if (isOpen) carregarProcessosEClientes();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (tarefa) {
      const meta = extrairMetadadosDescricao(tarefa.descricao);
      setTipo(meta.tipoAtividade);
      setEtiquetasSelecionadas(meta.etiquetas);
      setProcessoBusca(meta.processoCaso || tarefa.clienteNome || "");
      const partesObs = meta.textoLimpo.split("\nObs: ");
      setTituloOuDescricao(partesObs[0] || "");
      setObservacoes(partesObs.slice(1).join("\nObs: ") || "");
      setDataStr(formatDateForDatabase(tarefa.dataConclusao));
      setDataAteStr(formatDateForDatabase(tarefa.dataConclusao));
      setPrioridade(tarefa.prioridade || "Baixa");
      setStatusColuna(tarefa.status || "Pendente");
      setResponsavelId(tarefa.responsavelId || user?.id || "");
    } else {
      setTipo(tipoInicial);
      setTituloOuDescricao("");
      setObservacoes("");
      const hojeFmt = format(new Date(), "yyyy-MM-dd");
      setDataStr(hojeFmt);
      setDataAteStr(hojeFmt);
      setHoraInicio("09:00");
      setHoraFim("10:00");
      setDiaInteiro(false);
      setRecorrenciaAtiva(false);
      setProcessoBusca("");
      setClienteIdVinculado(null);
      setResponsavelId(user?.id || (usuarios[0]?.id ?? ""));
      setEnvolvidosExtras([]);
      setMostrarEnvolverMais(false);
      setPrioridade(tipoInicial === "Prazos" ? "Alta" : "Baixa");
      setStatusColuna("Pendente");
      setEnderecoLocal("");
      setModalidade("");
      setAlertaValor("0");
      setAlertaUnidade(tipoInicial === "Prazos" ? "Dia(s) antes" : "Hora(s) antes");
      setEmailsExternos("");
      setMostrarConfigEmail(false);
      setForum("");
      setSalaForum("");
      setEtiquetasSelecionadas([]);
      setMostrarSeletorWorkflow(false);
      setWorkflowSelecionadoForm("");
      setWorkflowsAdicionadosNoForm([]);
    }
  }, [isOpen, tarefa, tipoInicial, user, usuarios]);

  const sugestoesFiltradas = useMemo(() => {
    const q = processoBusca.trim().toLowerCase();
    if (!q) return opcoesProcessos.slice(0, 8);
    return opcoesProcessos.filter((o) => o.label.toLowerCase().includes(q)).slice(0, 8);
  }, [opcoesProcessos, processoBusca]);

  const dataSelecionadaObj = useMemo(() => {
    if (!dataStr) return new Date();
    const d = new Date(dataStr + "T00:00:00");
    return isNaN(d.getTime()) ? new Date() : d;
  }, [dataStr]);

  const toggleEtiqueta = (nome: string) => {
    setEtiquetasSelecionadas((prev) =>
      prev.includes(nome) ? prev.filter((x) => x !== nome) : [...prev, nome]
    );
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloOuDescricao.trim()) {
      toast.error("Preencha o título / descrição obrigatória.");
      return;
    }
    if (!dataStr) {
      toast.error("Selecione a data.");
      return;
    }

    const respUser = usuarios.find((u) => u.id === responsavelId);
    const nomeResp = respUser
      ? respUser.full_name || respUser.email || "Grupo Venda+"
      : "Grupo Venda+";

    const prefixos: string[] = [];
    if (tipo === "Eventos") prefixos.push("[TIPO:EVENTO]");
    else if (tipo === "Prazos") prefixos.push("[TIPO:PRAZO]");
    else if (tipo === "Audiências") prefixos.push("[TIPO:AUDIÊNCIA]");
    else prefixos.push("[TIPO:TAREFA]");

    if (processoBusca.trim()) {
      prefixos.push(`[PROC:${processoBusca.trim()}]`);
    }

    etiquetasSelecionadas.forEach((et) => prefixos.push(`[${et}]`));

    const detalhesExtras: string[] = [];
    if (tipo === "Eventos" && !diaInteiro && horaInicio) {
      detalhesExtras.push(`(${horaInicio}${horaFim ? ` - ${horaFim}` : ""})`);
    }
    if (tipo === "Audiências") {
      if (horaInicio) detalhesExtras.push(`(${horaInicio}${horaFim ? ` às ${horaFim}` : ""})`);
      if (forum.trim()) detalhesExtras.push(`Fórum: ${forum.trim()}`);
      if (salaForum.trim()) detalhesExtras.push(`Sala: ${salaForum.trim()}`);
    }
    if (enderecoLocal.trim()) {
      detalhesExtras.push(`Local: ${enderecoLocal.trim()}`);
    }
    if (modalidade) {
      detalhesExtras.push(`Modalidade: ${modalidade}`);
    }

    let corpo = tituloOuDescricao.trim();
    if (detalhesExtras.length > 0) {
      corpo += ` · ${detalhesExtras.join(" · ")}`;
    }
    if (observacoes.trim()) {
      corpo += `\nObs: ${observacoes.trim()}`;
    }

    const descricaoFinal = `${prefixos.join(" ")} ${corpo}`.trim();

    onSave({
      id: tarefa?.id,
      descricao: descricaoFinal,
      dataConclusao: dataStr,
      prioridade: tipo === "Prazos" ? "Alta" : prioridade,
      status: statusColuna,
      responsavel: nomeResp,
      responsavelId: responsavelId || user?.id || null,
      clienteId: clienteIdVinculado,
    });

    if (user && workflowsAdicionadosNoForm.length > 0) {
      const baseDt = new Date(dataStr + "T00:00:00");
      workflowsAdicionadosNoForm.forEach((wfId) => {
        const wf = workflows.find((w) => w.id === wfId);
        if (wf) {
          aplicarWorkflowEmAtividade(wf, {
            dataBase: isNaN(baseDt.getTime()) ? new Date() : baseDt,
            userId: user.id,
            userName: nomeResp,
            processoCaso: processoBusca.trim() || undefined,
            clienteId: clienteIdVinculado,
          }).catch(() => {});
        }
      });
    }
  };

  // Cor da barra lateral esquerda do modal conforme os 4 prints do Astrea
  const corBordaModal =
    tipo === "Eventos"
      ? "border-l-[10px] border-l-[#00A859]"
      : tipo === "Prazos"
      ? "border-l-[10px] border-l-[#E53935]"
      : tipo === "Audiências"
      ? "border-l-[10px] border-l-[#EBB52C]"
      : "border-l-[10px] border-l-[#010E38]";

  const tituloModal = tarefa
    ? `Editar ${
        tipo === "Eventos"
          ? "evento"
          : tipo === "Prazos"
          ? "prazo"
          : tipo === "Audiências"
          ? "audiência"
          : "tarefa"
      }`
    : tipo === "Eventos"
    ? "Adicionar evento"
    : tipo === "Prazos"
    ? "Adicionar prazo"
    : tipo === "Audiências"
    ? "Adicionar audiência"
    : "Adicionar tarefa";

  // Componente reutilizável de busca de Processo / Caso / Atendimento
  const renderCampoProcesso = (obrigatorio = false, labelTexto = "Processo, caso ou atendimento") => (
    <div className="relative space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
        {labelTexto}
        {obrigatorio && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Input
          placeholder="Encontre um processo, caso ou atendimento"
          value={processoBusca}
          onFocus={() => setMostrarSugestoesProc(true)}
          onBlur={() => setTimeout(() => setMostrarSugestoesProc(false), 180)}
          onChange={(e) => {
            setProcessoBusca(e.target.value);
            setMostrarSugestoesProc(true);
          }}
          className="h-9 pr-8 text-xs border-slate-300 focus-visible:ring-[#010E38]"
        />
        <Search className="h-4 w-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
      </div>
      {mostrarSugestoesProc && sugestoesFiltradas.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-[62px] rounded-md border bg-white dark:bg-[#010E38] shadow-lg max-h-44 overflow-y-auto py-1">
          {sugestoesFiltradas.map((op) => (
            <button
              key={op.id}
              type="button"
              onMouseDown={() => {
                setProcessoBusca(op.label);
                setClienteIdVinculado(op.clienteId || null);
                setMostrarSugestoesProc(false);
              }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F1F4F9] dark:hover:bg-white/10 truncate block"
            >
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Componente reutilizável de Responsável
  const renderCampoResponsavel = () => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
        Responsável<span className="text-red-500">*</span>
      </label>
      <Select value={responsavelId || undefined} onValueChange={setResponsavelId}>
        <SelectTrigger className="h-9 text-xs border-slate-300">
          <SelectValue placeholder="Grupo Venda+" />
        </SelectTrigger>
        <SelectContent>
          {usuarios.map((u) => (
            <SelectItem key={u.id} value={u.id} className="text-xs">
              {u.full_name || u.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => setMostrarEnvolverMais((v) => !v)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline pt-0.5"
      >
        <Plus className="h-3 w-3" /> Envolver mais pessoas
      </button>
      {mostrarEnvolverMais && (
        <div className="pt-1 flex flex-wrap gap-1.5">
          {usuarios
            .filter((u) => u.id !== responsavelId)
            .map((u) => {
              const ativo = envolvidosExtras.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() =>
                    setEnvolvidosExtras((prev) =>
                      prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id]
                    )
                  }
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors",
                    ativo
                      ? "bg-[#010E38] text-[#EBB52C] border-[#010E38]"
                      : "bg-[#F1F4F9] text-[#010E38] border-slate-300"
                  )}
                >
                  {u.full_name || u.email}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );

  // Quadro do Kanban + Coluna do Kanban
  const renderQuadroEColuna = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
          Quadro do Kanban<span className="text-red-500">*</span>
        </label>
        <Select value={quadroKanban} onValueChange={setQuadroKanban}>
          <SelectTrigger className="h-9 text-xs border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Kanban Padrão" className="text-xs">
              Kanban Padrão
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
          Coluna do Kanban<span className="text-red-500">*</span>
        </label>
        <Select
          value={statusColuna}
          onValueChange={(v) => setStatusColuna(v as Tarefa["status"])}
        >
          <SelectTrigger className="h-9 text-xs border-slate-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pendente" className="text-xs">
              A Fazer
            </SelectItem>
            <SelectItem value="Em Andamento" className="text-xs">
              Em Elaboração
            </SelectItem>
            <SelectItem value="Em Revisão" className="text-xs">
              Em Revisão
            </SelectItem>
            <SelectItem value="Concluída" className="text-xs">
              Protocolado
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Mini-calendário "VER COMPROMISSOS" dos modais de Prazo e Audiência (Screenshots 3 e 4)
  const renderBlocoVerCompromissos = () => {
    const mesCurto = format(dataSelecionadaObj, "MMM", { locale: ptBR }).replace(".", "");
    const diaNum = format(dataSelecionadaObj, "d", { locale: ptBR });
    const diaSemana = format(dataSelecionadaObj, "EEEE", { locale: ptBR });
    const dataExtenso = format(dataSelecionadaObj, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

    return (
      <div className="space-y-3 pt-1">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
          VER COMPROMISSOS
        </p>
        <div className="flex items-center gap-3.5">
          <div className="w-16 rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden text-center shrink-0">
            <div className="bg-[#010E38] text-[#EBB52C] text-[10px] font-bold uppercase py-0.5">
              {mesCurto}
            </div>
            <div className="py-1">
              <p className="font-data text-lg font-bold text-[#010E38] leading-tight">
                {diaNum}
              </p>
              <p className="text-[10px] text-slate-500 truncate px-1">{diaSemana}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#010E38] dark:text-[#F1F4F9]">
              {diaSemana}
            </p>
            <p className="text-xs font-bold text-[#010E38] dark:text-[#F1F4F9]">
              {dataExtenso}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          "mx-4 sm:max-w-[580px] max-h-[92vh] overflow-y-auto p-6 rounded-xl bg-white dark:bg-[#010E38]",
          corBordaModal
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <form onSubmit={salvar} className="space-y-4">
          {/* Cabeçalho com Título à esquerda e ADICIONAR ETIQUETA à direita */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <h2 className="text-xl font-bold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
              {tituloModal}
            </h2>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#010E38] dark:text-slate-300"
                >
                  <Tag className="h-3.5 w-3.5" />
                  ADICIONAR ETIQUETA
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 space-y-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                  Etiquetas
                </p>
                {catalogoEtiquetas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma etiqueta cadastrada. Crie uma abaixo:
                  </p>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {catalogoEtiquetas.map((et) => {
                      const ativa = etiquetasSelecionadas.includes(et.nome);
                      return (
                        <button
                          key={et.id}
                          type="button"
                          onClick={() => toggleEtiqueta(et.nome)}
                          className={cn(
                            "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-muted",
                            ativa && "bg-muted font-bold"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="h-3 w-3 rounded-[2px] shrink-0"
                              style={{ backgroundColor: et.cor }}
                            />
                            <span className="truncate">{et.nome}</span>
                          </div>
                          {ativa && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-2 border-t">
                  <input
                    type="color"
                    value={novaTagCor}
                    onChange={(e) => setNovaTagCor(e.target.value)}
                    className="h-7 w-8 rounded border cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <Input
                    placeholder="Nova etiqueta..."
                    value={novaTagNome}
                    onChange={(e) => setNovaTagNome(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!novaTagNome.trim()) return;
                      const nome = novaTagNome.trim();
                      adicionarEtiqueta(nome, novaTagCor);
                      setEtiquetasSelecionadas((prev) =>
                        prev.includes(nome) ? prev : [...prev, nome]
                      );
                      setNovaTagNome("");
                    }}
                    className="h-7 px-2 bg-[#EBB52C] text-[#010E38] font-bold text-xs"
                  >
                    +
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {etiquetasSelecionadas.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {etiquetasSelecionadas.map((nome) => {
                const et = catalogoEtiquetas.find((e) => e.nome === nome);
                const bg = et?.cor || "#010E38";
                const text =
                  et && (et.textoEscuro || isCorClara(et.cor)) ? "#010E38" : "#FFFFFF";
                return (
                  <span
                    key={nome}
                    style={{ backgroundColor: bg, color: text }}
                    onClick={() => toggleEtiqueta(nome)}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {nome} ×
                  </span>
                );
              })}
            </div>
          )}

          {/* =============================================================== */}
          {/* 1. LAYOUT MODAL: ADICIONAR TAREFA (Screenshot 1)                */}
          {/* =============================================================== */}
          {tipo === "Tarefas" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Descrição da tarefa<span className="text-red-500">*</span>
                </label>
                <Textarea
                  rows={3}
                  placeholder="Digite a descrição da tarefa"
                  value={tituloOuDescricao}
                  onChange={(e) => setTituloOuDescricao(e.target.value)}
                  className="text-xs border-slate-300 focus-visible:ring-[#010E38]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    Data <Info className="h-3.5 w-3.5 text-[#010E38] dark:text-[#EBB52C]" />
                  </label>
                  <Input
                    type="date"
                    value={dataStr}
                    onChange={(e) => setDataStr(e.target.value)}
                    className="h-9 text-xs border-slate-300 font-data"
                  />
                  <button
                    type="button"
                    onClick={() => setRecorrenciaAtiva((r) => !r)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline pt-0.5"
                  >
                    <Plus className="h-3 w-3" /> Adicionar recorrência
                  </button>
                  {recorrenciaAtiva && (
                    <Select value={recorrenciaTexto} onValueChange={setRecorrenciaTexto}>
                      <SelectTrigger className="h-7 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diariamente">Diariamente</SelectItem>
                        <SelectItem value="Semanalmente">Semanalmente</SelectItem>
                        <SelectItem value="Mensalmente">Mensalmente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Lista de tarefas<span className="text-red-500">*</span>
                  </label>
                  <Select value={listaTarefas} onValueChange={setListaTarefas}>
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {listasDisponiveis.map((l) => (
                        <SelectItem key={l} value={l} className="text-xs">
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setCriandoNovaLista((c) => !c)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline pt-0.5"
                  >
                    Criar nova lista
                  </button>
                  {criandoNovaLista && (
                    <div className="flex items-center gap-1 pt-1">
                      <Input
                        placeholder="Nome da lista..."
                        value={novaListaNome}
                        onChange={(e) => setNovaListaNome(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          if (!novaListaNome.trim()) return;
                          const n = novaListaNome.trim();
                          setListasDisponiveis((prev) => [...prev, n]);
                          setListaTarefas(n);
                          setNovaListaNome("");
                          setCriandoNovaLista(false);
                        }}
                        className="h-7 px-2 bg-[#010E38] text-[#EBB52C] text-xs font-bold"
                      >
                        OK
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {renderCampoProcesso(false, "Processo, caso ou atendimento")}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderCampoResponsavel()}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Prioridade<span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={prioridade}
                    onValueChange={(v) => setPrioridade(v as "Baixa" | "Média" | "Alta")}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa" className="text-xs">
                        Baixa
                      </SelectItem>
                      <SelectItem value="Média" className="text-xs">
                        Média
                      </SelectItem>
                      <SelectItem value="Alta" className="text-xs">
                        Alta
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {renderQuadroEColuna()}
            </>
          )}

          {/* =============================================================== */}
          {/* 2. LAYOUT MODAL: ADICIONAR EVENTO (Screenshot 2)                */}
          {/* =============================================================== */}
          {tipo === "Eventos" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Título do evento<span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Digite o título do evento"
                  value={tituloOuDescricao}
                  onChange={(e) => setTituloOuDescricao(e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  De<span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    type="date"
                    value={dataStr}
                    onChange={(e) => setDataStr(e.target.value)}
                    className="col-span-2 h-9 text-xs border-slate-300 font-data"
                  />
                  {!diaInteiro && (
                    <Input
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Até<span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {!diaInteiro && (
                    <Input
                      type="time"
                      value={horaFim}
                      onChange={(e) => setHoraFim(e.target.value)}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                  )}
                  <Input
                    type="date"
                    value={dataAteStr}
                    onChange={(e) => setDataAteStr(e.target.value)}
                    className={cn(
                      "h-9 text-xs border-slate-300 font-data",
                      diaInteiro ? "col-span-3" : "col-span-2"
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={diaInteiro}
                      onChange={(e) => setDiaInteiro(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Dia inteiro
                  </label>
                  <button
                    type="button"
                    onClick={() => setRecorrenciaAtiva((r) => !r)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline w-fit"
                  >
                    <Plus className="h-3 w-3" /> Adicionar recorrência
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Endereço ou local
                  </label>
                  <Input
                    value={enderecoLocal}
                    onChange={(e) => setEnderecoLocal(e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Modalidade
                  </label>
                  <Select value={modalidade} onValueChange={setModalidade}>
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presencial" className="text-xs">
                        Presencial
                      </SelectItem>
                      <SelectItem value="Online / Videoconferência" className="text-xs">
                        Online / Videoconferência
                      </SelectItem>
                      <SelectItem value="Híbrido" className="text-xs">
                        Híbrido
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Alertas internos de antecedência
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={alertaValor}
                      onChange={(e) => setAlertaValor(e.target.value)}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                    <div className="col-span-2">
                      <Select value={alertaUnidade} onValueChange={setAlertaUnidade}>
                        <SelectTrigger className="h-9 text-xs border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Minuto(s) antes" className="text-xs">
                            Minuto(s) antes
                          </SelectItem>
                          <SelectItem value="Hora(s) antes" className="text-xs">
                            Hora(s) antes
                          </SelectItem>
                          <SelectItem value="Dia(s) antes" className="text-xs">
                            Dia(s) antes
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {renderCampoResponsavel()}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Resumo para pessoas externas
                </p>
                <p className="text-[11px] text-slate-500">E-mails externos</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarConfigEmail((m) => !m)}
                  className="h-8 text-[11px] font-bold uppercase tracking-wider border-slate-300"
                >
                  CONFIGURAR E-MAIL
                </Button>
                {mostrarConfigEmail && (
                  <Input
                    placeholder="cliente@email.com, parceiro@email.com"
                    value={emailsExternos}
                    onChange={(e) => setEmailsExternos(e.target.value)}
                    className="h-8 text-xs mt-1.5"
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Observações
                </label>
                <Textarea
                  rows={3}
                  placeholder="Digite observações sobre o evento"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-xs border-slate-300"
                />
              </div>

              {renderCampoProcesso(false, "Processo, caso ou atendimento")}
              {renderQuadroEColuna()}
            </>
          )}

          {/* =============================================================== */}
          {/* 3. LAYOUT MODAL: ADICIONAR PRAZO (Screenshot 3)                 */}
          {/* =============================================================== */}
          {tipo === "Prazos" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Título do prazo<span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Digite o título do prazo"
                  value={tituloOuDescricao}
                  onChange={(e) => setTituloOuDescricao(e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Data limite<span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dataStr}
                    onChange={(e) => setDataStr(e.target.value)}
                    className="h-9 text-xs border-slate-300 font-data"
                  />
                </div>
                <div className="sm:col-span-2">
                  {renderCampoProcesso(true, "Processo ou caso")}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Alerta
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={alertaValor}
                      onChange={(e) => setAlertaValor(e.target.value)}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                    <div className="col-span-2">
                      <Select value={alertaUnidade} onValueChange={setAlertaUnidade}>
                        <SelectTrigger className="h-9 text-xs border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Dia(s) antes" className="text-xs">
                            Dia(s) antes
                          </SelectItem>
                          <SelectItem value="Hora(s) antes" className="text-xs">
                            Hora(s) antes
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {renderCampoResponsavel()}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Observações
                </label>
                <Textarea
                  rows={3}
                  placeholder="Digite observações sobre o prazo"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-xs border-slate-300"
                />
              </div>

              {renderQuadroEColuna()}
              {renderBlocoVerCompromissos()}
            </>
          )}

          {/* =============================================================== */}
          {/* 4. LAYOUT MODAL: ADICIONAR AUDIÊNCIA (Screenshot 4)             */}
          {/* =============================================================== */}
          {tipo === "Audiências" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Título da audiência<span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Digite o título da audiência"
                  value={tituloOuDescricao}
                  onChange={(e) => setTituloOuDescricao(e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Data<span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <Input
                    type="date"
                    value={dataStr}
                    onChange={(e) => setDataStr(e.target.value)}
                    className="sm:col-span-2 h-9 text-xs border-slate-300 font-data"
                  />
                  <Input
                    type="time"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className="h-9 text-xs border-slate-300 font-data"
                  />
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Até</span>
                    <Input
                      type="time"
                      value={horaFim}
                      onChange={(e) => setHoraFim(e.target.value)}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Alertas internos de antecedência
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={alertaValor}
                      onChange={(e) => setAlertaValor(e.target.value)}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                    <div className="col-span-2">
                      <Select value={alertaUnidade} onValueChange={setAlertaUnidade}>
                        <SelectTrigger className="h-9 text-xs border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hora(s) antes" className="text-xs">
                            Hora(s) antes
                          </SelectItem>
                          <SelectItem value="Dia(s) antes" className="text-xs">
                            Dia(s) antes
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Fórum
                  </label>
                  <Input
                    value={forum}
                    onChange={(e) => setForum(e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Sala do fórum
                  </label>
                  <Input
                    value={salaForum}
                    onChange={(e) => setSalaForum(e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Endereço ou local
                  </label>
                  <Input
                    value={enderecoLocal}
                    onChange={(e) => setEnderecoLocal(e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Modalidade
                  </label>
                  <Select value={modalidade} onValueChange={setModalidade}>
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Presencial" className="text-xs">
                        Presencial
                      </SelectItem>
                      <SelectItem value="Virtual / Online" className="text-xs">
                        Virtual / Online
                      </SelectItem>
                      <SelectItem value="Híbrida" className="text-xs">
                        Híbrida
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  {renderCampoProcesso(true, "Processo")}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                  Observações
                </label>
                <Textarea
                  rows={3}
                  placeholder="Digite observações sobre a audiência"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="text-xs border-slate-300"
                />
              </div>

              {renderCampoResponsavel()}
              {renderQuadroEColuna()}
              {renderBlocoVerCompromissos()}
            </>
          )}

          {/* Seção "Adicionar workflows" na parte inferior do card da atividade (igual ao guia Astrea) */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMostrarSeletorWorkflow((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline"
              >
                <GitBranch className="h-3.5 w-3.5" />
                Adicionar workflows
              </button>
            </div>

            {workflowsAdicionadosNoForm.length > 0 && (
              <div className="space-y-1">
                {workflowsAdicionadosNoForm.map((wfId) => {
                  const wf = workflows.find((w) => w.id === wfId);
                  if (!wf) return null;
                  return (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between rounded-md border bg-[#F1F4F9]/70 dark:bg-white/5 px-3 py-1.5 text-xs"
                    >
                      <span className="font-bold text-[#010E38] dark:text-[#F1F4F9]">
                        {wf.titulo} ({wf.atividades.length} atividades)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkflowsAdicionadosNoForm((prev) =>
                            prev.filter((id) => id !== wf.id)
                          )
                        }
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Remover workflow"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {mostrarSeletorWorkflow && (
              <div className="rounded-lg border p-2.5 bg-[#F1F4F9]/50 dark:bg-white/5 space-y-2">
                {workflows.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Nenhum workflow criado ainda no módulo Workflows.
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={workflowSelecionadoForm}
                      onValueChange={setWorkflowSelecionadoForm}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1 bg-white dark:bg-[#010E38]">
                        <SelectValue placeholder="Selecione um workflow..." />
                      </SelectTrigger>
                      <SelectContent>
                        {workflows.map((wf) => (
                          <SelectItem key={wf.id} value={wf.id} className="text-xs">
                            {wf.titulo} ({wf.atividades.length} atividades)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!workflowSelecionadoForm}
                      onClick={() => {
                        if (!workflowSelecionadoForm) return;
                        setWorkflowsAdicionadosNoForm((prev) =>
                          prev.includes(workflowSelecionadoForm)
                            ? prev
                            : [...prev, workflowSelecionadoForm]
                        );
                        setWorkflowSelecionadoForm("");
                        setMostrarSeletorWorkflow(false);
                      }}
                      className="h-8 bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 text-xs font-bold px-3"
                    >
                      Adicionar
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rodapé CANCELAR / SALVAR igual aos prints */}
          <div className="flex items-center justify-end gap-5 pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-[#010E38] dark:text-slate-300"
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] bg-[#EBB52C] hover:bg-[#EBB52C]/90 dark:bg-transparent px-4 py-2 rounded-md shadow-2xs"
            >
              SALVAR
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
