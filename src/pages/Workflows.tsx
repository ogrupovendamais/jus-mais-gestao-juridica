import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock,
  Plus,
  ChevronUp,
  ChevronDown,
  Pencil,
  MoreVertical,
  Calendar,
  User,
  ArrowDownCircle,
  ArrowUpCircle,
  MinusCircle,
  Copy,
  Trash2,
  GitBranch,
  Play,
  Tag,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUsuarios } from "@/lib/nichos";
import { useEtiquetasKanban } from "@/lib/etiquetas";
import {
  useWorkflows,
  formatarRegraDataWorkflow,
  formatarResponsavelWorkflow,
  aplicarWorkflowEmAtividade,
  type Workflow,
  type WorkflowAtividade,
  type RegraDataWorkflow,
  type ResponsavelWorkflowTipo,
} from "@/lib/workflows";
import { toast } from "sonner";
import { format } from "date-fns";

const Workflows = () => {
  const { user, role } = useAuth();
  const usuarios = useUsuarios();
  const { etiquetas, obterCorEtiqueta } = useEtiquetasKanban();
  const { workflows, salvarWorkflow, excluirWorkflow, duplicarWorkflow } =
    useWorkflows();

  // Administradores (master e desenvolvedor) podem criar, editar e excluir workflows
  const isAdmin = role === "master" || role === "desenvolvedor";

  // IDs de workflows expandidos no acordeão
  const [expandidos, setExpandidos] = useState<string[]>([]);

  // Modo de criação / edição de Workflow (Passo 2, 3 e 4 do guia Astrea)
  const [modoEditor, setModoEditor] = useState(false);
  const [workflowEditandoId, setWorkflowEditandoId] = useState<string | null>(
    null
  );
  const [wfTitulo, setWfTitulo] = useState("");
  const [wfDescricao, setWfDescricao] = useState("");
  const [wfAtividades, setWfAtividades] = useState<WorkflowAtividade[]>([]);

  // Formulário de Atividade dentro do Editor (Passo 3 do guia Astrea)
  const [formAtividadeAberto, setFormAtividadeAberto] = useState(true);
  const [ativEditandoId, setAtivEditandoId] = useState<string | null>(null);
  const [ativTitulo, setAtivTitulo] = useState("");
  const [ativRegraData, setAtivRegraData] =
    useState<RegraDataWorkflow>("data_atividade");
  const [ativDiasOffset, setAtivDiasOffset] = useState<number>(1);
  const [ativPrioridade, setAtivPrioridade] = useState<
    "Baixa" | "Média" | "Alta"
  >("Baixa");
  const [ativResponsavelSelect, setAtivResponsavelSelect] =
    useState<string>("nao_selecionado");
  const [ativEtiquetas, setAtivEtiquetas] = useState<string[]>([]);
  const [criarOutra, setCriarOutra] = useState(true);

  // Modal para Aplicar Workflow diretamente em tarefas/prazos
  const [workflowParaAplicar, setWorkflowParaAplicar] =
    useState<Workflow | null>(null);
  const [dataBaseAplicacao, setDataBaseAplicacao] = useState(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [processoAplicacao, setProcessoAplicacao] = useState("");
  const [aplicando, setAplicando] = useState(false);

  // Modal de confirmação de exclusão
  const [workflowParaExcluir, setWorkflowParaExcluir] =
    useState<Workflow | null>(null);

  const toggleExpandir = (id: string) => {
    setExpandidos((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const resetFormAtividade = () => {
    setAtivEditandoId(null);
    setAtivTitulo("");
    setAtivRegraData("data_atividade");
    setAtivDiasOffset(1);
    setAtivPrioridade("Baixa");
    setAtivResponsavelSelect("nao_selecionado");
    setAtivEtiquetas([]);
  };

  const abrirNovoWorkflow = () => {
    if (!isAdmin) {
      toast.error(
        "Apenas administradores do escritório podem criar e editar os workflows."
      );
      return;
    }
    setWorkflowEditandoId(null);
    setWfTitulo("");
    setWfDescricao("");
    setWfAtividades([]);
    resetFormAtividade();
    setFormAtividadeAberto(true);
    setModoEditor(true);
  };

  const abrirEdicaoWorkflow = (wf: Workflow) => {
    if (!isAdmin) {
      toast.error(
        "Apenas administradores do escritório podem criar e editar os workflows."
      );
      return;
    }
    setWorkflowEditandoId(wf.id);
    setWfTitulo(wf.titulo);
    setWfDescricao(wf.descricao || "");
    setWfAtividades(wf.atividades);
    resetFormAtividade();
    setFormAtividadeAberto(true);
    setModoEditor(true);
  };

  const carregarAtividadeNoForm = (ativ: WorkflowAtividade) => {
    setAtivEditandoId(ativ.id);
    setAtivTitulo(ativ.titulo);
    setAtivRegraData(ativ.regraData);
    setAtivDiasOffset(ativ.diasOffset || 1);
    setAtivPrioridade(ativ.prioridade);
    if (ativ.responsavelTipo === "usuario" && ativ.responsavelId) {
      setAtivResponsavelSelect(`user:${ativ.responsavelId}`);
    } else {
      setAtivResponsavelSelect(ativ.responsavelTipo);
    }
    setAtivEtiquetas(ativ.etiquetas || []);
    setFormAtividadeAberto(true);
  };

  const handleSalvarAtividadeNoDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ativTitulo.trim()) {
      toast.error("Informe o título da atividade");
      return;
    }

    let responsavelTipo: ResponsavelWorkflowTipo = "nao_selecionado";
    let responsavelId: string | null = null;
    let responsavelNome: string | undefined = undefined;

    if (ativResponsavelSelect === "criador") {
      responsavelTipo = "criador";
    } else if (ativResponsavelSelect.startsWith("user:")) {
      responsavelTipo = "usuario";
      responsavelId = ativResponsavelSelect.replace("user:", "");
      const u = usuarios.find((x) => x.id === responsavelId);
      responsavelNome = u?.full_name || u?.email || "Responsável";
    }

    const novaAtiv: WorkflowAtividade = {
      id:
        ativEditandoId ||
        `wf-ativ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: ativTitulo.trim(),
      regraData: ativRegraData,
      diasOffset:
        ativRegraData === "data_atividade"
          ? 0
          : Math.max(1, Number(ativDiasOffset) || 1),
      responsavelTipo,
      responsavelId,
      responsavelNome,
      prioridade: ativPrioridade,
      etiquetas: ativEtiquetas,
    };

    setWfAtividades((prev) => {
      if (ativEditandoId) {
        return prev.map((item) =>
          item.id === ativEditandoId ? novaAtiv : item
        );
      }
      return [...prev, novaAtiv];
    });

    toast.success(
      ativEditandoId
        ? "Atividade atualizada no workflow"
        : "Atividade adicionada ao workflow"
    );

    resetFormAtividade();
    if (!criarOutra && !ativEditandoId) {
      setFormAtividadeAberto(false);
    }
  };

  const duplicarAtividadeDraft = (ativ: WorkflowAtividade) => {
    const copia: WorkflowAtividade = {
      ...ativ,
      id: `wf-ativ-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      titulo: `${ativ.titulo} (Cópia)`,
    };
    setWfAtividades((prev) => [...prev, copia]);
    toast.success("Atividade duplicada!");
  };

  const removerAtividadeDraft = (id: string) => {
    setWfAtividades((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSalvarWorkflowFinal = () => {
    if (!wfTitulo.trim()) {
      toast.error("Informe um título para o workflow");
      return;
    }
    if (wfAtividades.length === 0) {
      toast.error("Adicione pelo menos 1 atividade ao workflow antes de salvar");
      return;
    }

    const novoId =
      workflowEditandoId ||
      `wf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const wfFinal: Workflow = {
      id: novoId,
      titulo: wfTitulo.trim().toUpperCase(),
      descricao: wfDescricao.trim() || undefined,
      atividades: wfAtividades,
      criadoEm: new Date().toISOString(),
    };

    salvarWorkflow(wfFinal);
    setExpandidos((prev) => (prev.includes(novoId) ? prev : [novoId, ...prev]));
    setModoEditor(false);
    toast.success("Workflow salvo com sucesso!");
  };

  const confirmarAplicacaoWorkflow = async () => {
    if (!workflowParaAplicar || !user) return;
    try {
      setAplicando(true);
      const dataBase = new Date(dataBaseAplicacao + "T00:00:00");
      const usuarioAtual = usuarios.find((u) => u.id === user.id);
      const idsCriados = await aplicarWorkflowEmAtividade(workflowParaAplicar, {
        dataBase: isNaN(dataBase.getTime()) ? new Date() : dataBase,
        userId: user.id,
        userName: usuarioAtual?.full_name || "Grupo Venda+",
        processoCaso: processoAplicacao.trim() || undefined,
      });
      toast.success(
        `Workflow "${workflowParaAplicar.titulo}" aplicado! ${idsCriados.length} atividade(s) criada(s) no Kanban e na Agenda.`
      );
      setWorkflowParaAplicar(null);
      setProcessoAplicacao("");
    } catch (err: any) {
      toast.error("Erro ao aplicar workflow", {
        description: err?.message || "Tente novamente",
      });
    } finally {
      setAplicando(false);
    }
  };

  const renderIconePrioridade = (prioridade: "Baixa" | "Média" | "Alta") => {
    if (prioridade === "Alta") {
      return (
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <ArrowUpCircle className="h-3.5 w-3.5 text-white fill-[#E53935]" />
          <span>Prioridade alta</span>
        </span>
      );
    }
    if (prioridade === "Média") {
      return (
        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
          <MinusCircle className="h-3.5 w-3.5 text-white fill-[#EBB52C]" />
          <span>Prioridade média</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
        <ArrowDownCircle className="h-3.5 w-3.5 text-white fill-slate-500" />
        <span>Prioridade baixa</span>
      </span>
    );
  };

  // ============================================================================
  // TELA DE CRIAÇÃO / EDIÇÃO DE WORKFLOW (Passos 2, 3 e 4 do Astrea)
  // ============================================================================
  if (modoEditor) {
    return (
      <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setModoEditor(false)}
              className="h-8 w-8 text-[#010E38] dark:text-[#F1F4F9]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
              {workflowEditandoId ? "Editar workflow" : "Criar workflow"}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModoEditor(false)}
              className="h-9 text-xs font-bold uppercase tracking-wider"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarWorkflowFinal}
              className="h-9 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider px-5"
            >
              Salvar workflow
            </Button>
          </div>
        </div>

        {/* Passo 2: Título e Descrição do Workflow */}
        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#010E38] p-5 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                Título do workflow *
              </label>
              <Input
                placeholder="Ex: APRESENTAÇÃO DE CÁLCULOS, AUDIÊNCIA INICIAL..."
                value={wfTitulo}
                onChange={(e) => setWfTitulo(e.target.value)}
                className="h-9 text-xs font-bold uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                Descrição (opcional)
              </label>
              <Input
                placeholder="Indique em quais situações este workflow deve ser utilizado"
                value={wfDescricao}
                onChange={(e) => setWfDescricao(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Passo 3: Lado Esquerdo (Formulário da Atividade) + Lado Direito (Lista de Atividades do Workflow) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Coluna Esquerda (5 cols): Configurar Atividade */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#010E38] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                {ativEditandoId ? "Editar atividade" : "Adicionar atividade"}
              </h2>
              {!formAtividadeAberto && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setFormAtividadeAberto(true)}
                  className="h-7 text-xs bg-[#EBB52C] text-[#010E38] font-bold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar atividade
                </Button>
              )}
            </div>

            {formAtividadeAberto && (
              <form
                onSubmit={handleSalvarAtividadeNoDraft}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Título da tarefa *
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Ex: Fazer petição de apresentação de cálculos"
                    value={ativTitulo}
                    onChange={(e) => setAtivTitulo(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                    Data da tarefa *
                  </label>
                  <Select
                    value={ativRegraData}
                    onValueChange={(v) =>
                      setAtivRegraData(v as RegraDataWorkflow)
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="data_atividade" className="text-xs">
                        Mesma data da atividade principal
                      </SelectItem>
                      <SelectItem
                        value="dias_uteis_criacao"
                        className="text-xs"
                      >
                        + Dias úteis da data de criação
                      </SelectItem>
                      <SelectItem
                        value="dias_uteis_atividade"
                        className="text-xs"
                      >
                        + Dias úteis da data da atividade
                      </SelectItem>
                      <SelectItem
                        value="dias_corridos_criacao"
                        className="text-xs"
                      >
                        + Dias corridos da data de criação
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {ativRegraData !== "data_atividade" && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-bold text-[#010E38] dark:text-[#EBB52C]">
                        Prazo relativo (+ dias):
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={ativDiasOffset}
                        onChange={(e) =>
                          setAtivDiasOffset(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="h-8 w-24 text-xs font-data"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                      Prioridade da tarefa
                    </label>
                    <Select
                      value={ativPrioridade}
                      onValueChange={(v) =>
                        setAtivPrioridade(v as "Baixa" | "Média" | "Alta")
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixa" className="text-xs">
                          Prioridade baixa
                        </SelectItem>
                        <SelectItem value="Média" className="text-xs">
                          Prioridade média
                        </SelectItem>
                        <SelectItem value="Alta" className="text-xs">
                          Prioridade alta
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                      Responsável pela tarefa
                    </label>
                    <Select
                      value={ativResponsavelSelect}
                      onValueChange={setAtivResponsavelSelect}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="nao_selecionado"
                          className="text-xs"
                        >
                          Não selecionado
                        </SelectItem>
                        <SelectItem value="criador" className="text-xs">
                          Criador da tarefa
                        </SelectItem>
                        {usuarios.map((u) => (
                          <SelectItem
                            key={u.id}
                            value={`user:${u.id}`}
                            className="text-xs"
                          >
                            {u.full_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Etiquetas da tarefa */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Etiquetas da tarefa
                  </label>
                  {etiquetas.length === 0 ? (
                    <p className="text-[11px] text-slate-400">
                      Nenhuma etiqueta criada no escritório.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {etiquetas.map((et) => {
                        const selecionada = ativEtiquetas.includes(et.nome);
                        return (
                          <button
                            key={et.id}
                            type="button"
                            onClick={() =>
                              setAtivEtiquetas((prev) =>
                                selecionada
                                  ? prev.filter((x) => x !== et.nome)
                                  : [...prev, et.nome]
                              )
                            }
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold uppercase border transition-all",
                              selecionada
                                ? "text-white ring-2 ring-[#010E38]/30"
                                : "bg-white text-[#010E38] border-slate-200 opacity-75 hover:opacity-100"
                            )}
                            style={
                              selecionada
                                ? {
                                    backgroundColor: et.cor,
                                    borderColor: et.cor,
                                  }
                                : undefined
                            }
                          >
                            {et.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {!ativEditandoId && (
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1 select-none">
                    <input
                      type="checkbox"
                      checked={criarOutra}
                      onChange={(e) => setCriarOutra(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span>
                      Criar outra (adicionar novo rascunho após salvar)
                    </span>
                  </label>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  {ativEditandoId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetFormAtividade}
                      className="h-8 text-xs"
                    >
                      Cancelar edição
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-bold text-xs px-4"
                  >
                    Salvar
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Coluna Direita (7 cols): Sequência de Atividades do Workflow (visual idêntico ao print) */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#010E38] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                Atividades deste workflow ({wfAtividades.length})
              </h2>
            </div>

            {wfAtividades.length === 0 ? (
              <div className="rounded-xl bg-[#F1F4F9]/70 dark:bg-white/5 p-8 text-center space-y-1">
                <p className="text-xs font-bold text-[#010E38] dark:text-[#F1F4F9]">
                  Nenhuma atividade adicionada ainda
                </p>
                <p className="text-[11px] text-slate-500">
                  Preencha os campos ao lado e clique em &quot;Salvar&quot; para
                  montar a sequência do seu workflow.
                </p>
              </div>
            ) : (
              <div className="rounded-xl bg-[#F1F4F9]/80 dark:bg-white/5 p-3.5 space-y-2.5">
                {wfAtividades.map((ativ) => (
                  <div
                    key={ativ.id}
                    className="rounded-lg bg-white dark:bg-[#010E38] border border-slate-200/80 dark:border-white/10 px-4 py-3 shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="border-l-[3px] border-l-[#010E38] dark:border-l-[#EBB52C] pl-3 space-y-1.5 min-w-0 flex-1">
                      {ativ.etiquetas && ativ.etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {ativ.etiquetas.map((tag) => (
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
                      <p className="text-xs font-semibold text-slate-800 dark:text-[#F1F4F9] break-words">
                        {ativ.titulo}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatarRegraDataWorkflow(ativ)}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatarResponsavelWorkflow(ativ)}</span>
                        </span>
                        {renderIconePrioridade(ativ.prioridade)}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700"
                          title="Opções da atividade"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem
                          onClick={() => carregarAtividadeNoForm(ativ)}
                          className="text-xs cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => duplicarAtividadeDraft(ativ)}
                          className="text-xs cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => removerAtividadeDraft(ativ.id)}
                          className="text-xs cursor-pointer text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PÁGINA INICIAL DO MÓDULO WORKFLOWS (IDÊNTICA À FOTO DO ASTREA)
  // ============================================================================
  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Cabeçalho: "Workflows" à esquerda e "+ NOVO WORKFLOW" no canto superior direito */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
          Workflows
        </h1>

        <button
          type="button"
          onClick={abrirNovoWorkflow}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-colors",
            isAdmin
              ? "border-[#010E38]/15 bg-[#F1F4F9] hover:bg-[#010E38] text-[#010E38] hover:text-[#EBB52C]"
              : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          NOVO WORKFLOW
        </button>
      </div>

      {/* Faixa informativa de permissão igual à da foto */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-[#F1F4F9] dark:bg-white/5 text-slate-500 dark:text-slate-300 text-xs">
        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          Apenas administradores do escritório podem criar e editar os
          workflows.
        </span>
      </div>

      {/* Lista de Workflows (vazia inicialmente conforme "crie sem nada") */}
      {workflows.length === 0 ? (
        <div className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#010E38] py-16 px-6 text-center space-y-4 shadow-2xs">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F1F4F9] dark:bg-white/10 flex items-center justify-center text-[#010E38] dark:text-[#EBB52C]">
            <GitBranch className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-base font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
              Nenhum workflow criado ainda
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
              Organize e automatize as rotinas do seu escritório criando fluxos
              de atividades personalizados para tarefas, eventos, prazos e
              audiências.
            </p>
          </div>
          {isAdmin && (
            <div className="pt-1">
              <Button
                type="button"
                onClick={abrirNovoWorkflow}
                className="bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] font-extrabold text-xs uppercase tracking-wider px-5 h-9"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Criar workflow
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => {
            const aberto = expandidos.includes(wf.id);
            return (
              <div
                key={wf.id}
                className="rounded-xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#010E38] shadow-2xs overflow-hidden"
              >
                {/* Linha do cabeçalho do Workflow igual à foto */}
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    type="button"
                    onClick={() => toggleExpandir(wf.id)}
                    className="flex items-center gap-3.5 text-left min-w-0 flex-1 group"
                  >
                    {aberto ? (
                      <ChevronUp className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-300 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs sm:text-[13px] font-semibold uppercase tracking-wide text-slate-800 dark:text-[#F1F4F9] group-hover:text-[#010E38] dark:group-hover:text-[#EBB52C]">
                        {wf.titulo}
                      </span>
                      {wf.descricao && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {wf.descricao}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Ícones da direita: Lápis (Editar) e 3 Pontos (Duplicar / Excluir / Aplicar) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => abrirEdicaoWorkflow(wf)}
                      disabled={!isAdmin}
                      title="Editar workflow"
                      className={cn(
                        "p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors",
                        isAdmin
                          ? "text-slate-500 hover:text-[#010E38] dark:text-slate-300"
                          : "text-slate-300 cursor-not-allowed"
                      )}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          title="Mais opções"
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-[#010E38] dark:text-slate-300 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={() => {
                            setWorkflowParaAplicar(wf);
                            setDataBaseAplicacao(
                              format(new Date(), "yyyy-MM-dd")
                            );
                          }}
                          className="text-xs cursor-pointer font-semibold text-[#010E38] dark:text-[#EBB52C]"
                        >
                          <Play className="h-3.5 w-3.5 mr-2" /> Aplicar workflow
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                duplicarWorkflow(wf.id);
                                toast.success("Workflow duplicado!");
                              }}
                              className="text-xs cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 mr-2" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setWorkflowParaExcluir(wf)}
                              className="text-xs cursor-pointer text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Corpo expandido idêntico ao container cinza-claro da foto */}
                {aberto && (
                  <div className="px-5 pb-5">
                    <div className="rounded-xl bg-[#F1F4F9]/80 dark:bg-white/5 p-3.5 space-y-2.5">
                      {wf.atividades.map((ativ) => (
                        <div
                          key={ativ.id}
                          className="rounded-lg bg-white dark:bg-[#010E38] border border-slate-200/80 dark:border-white/10 px-4 py-3 shadow-2xs"
                        >
                          <div className="border-l-[3px] border-l-[#010E38] dark:border-l-[#EBB52C] pl-3 space-y-1.5">
                            {ativ.etiquetas && ativ.etiquetas.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {ativ.etiquetas.map((tag) => (
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
                            <p className="text-xs font-semibold text-slate-800 dark:text-[#F1F4F9]">
                              {ativ.titulo}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                <span>{formatarRegraDataWorkflow(ativ)}</span>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3.5 w-3.5 text-slate-500" />
                                <span>
                                  {formatarResponsavelWorkflow(ativ)}
                                </span>
                              </span>
                              {renderIconePrioridade(ativ.prioridade)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Aplicar Workflow e gerar atividades automaticamente */}
      <Dialog
        open={!!workflowParaAplicar}
        onOpenChange={(o) => !o && setWorkflowParaAplicar(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-[#010E38] dark:text-[#F1F4F9]">
              Aplicar workflow
            </DialogTitle>
            <DialogDescription className="text-xs">
              Todas as{" "}
              <strong>{workflowParaAplicar?.atividades.length || 0}</strong>{" "}
              atividades do fluxo{" "}
              <strong>{workflowParaAplicar?.titulo}</strong> serão criadas
              automaticamente com as datas calculadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold">
                Data base da atividade *
              </label>
              <Input
                type="date"
                value={dataBaseAplicacao}
                onChange={(e) => setDataBaseAplicacao(e.target.value)}
                className="h-9 text-xs font-data"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold">
                Processo, caso ou cliente (opcional)
              </label>
              <Input
                placeholder="Vincular processo ou cliente às atividades geradas"
                value={processoAplicacao}
                onChange={(e) => setProcessoAplicacao(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setWorkflowParaAplicar(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAplicacaoWorkflow}
              disabled={aplicando}
              className="bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 font-bold text-xs"
            >
              {aplicando ? "Gerando atividades..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para excluir Workflow */}
      <Dialog
        open={!!workflowParaExcluir}
        onOpenChange={(o) => !o && setWorkflowParaExcluir(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-[#010E38] dark:text-[#F1F4F9]">
              Excluir workflow
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja excluir o workflow{" "}
              <strong>{workflowParaExcluir?.titulo}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setWorkflowParaExcluir(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (workflowParaExcluir) {
                  excluirWorkflow(workflowParaExcluir.id);
                  toast.success("Workflow excluído.");
                  setWorkflowParaExcluir(null);
                }
              }}
              className="text-xs font-bold"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Workflows;
