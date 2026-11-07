/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  GitBranch,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  User,
  UserPen,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { nomeUsuario, useUsuarios } from "@/lib/nichos";
import type { Tarefa } from "@/pages/Tarefas";
import {
  aplicarWorkflowEmAtividade,
  useWorkflows,
} from "@/lib/workflows";
import { extrairMetadadosDescricao } from "@/lib/etiquetas";

type Recado = {
  id: string;
  user_id: string;
  texto: string;
  created_at: string;
};

type WorkflowAplicadoItem = {
  workflowId: string;
  workflowTitulo: string;
  idsTarefasGeradas: string[];
};

// Tarefa aberta por inteiro: descrição completa + workflows vinculados + recados
export function TarefaDetalhes({
  tarefa,
  onClose,
  onEdit,
  onStatusChange,
}: {
  tarefa: Tarefa | null;
  onClose: () => void;
  onEdit: (t: Tarefa) => void;
  onStatusChange: (t: Tarefa, status: Tarefa["status"]) => void;
}) {
  const { user, role } = useAuth();
  const isAdmin = role === "master" || role === "desenvolvedor";
  const usuarios = useUsuarios();
  const { workflows } = useWorkflows();

  const [recados, setRecados] = useState<Recado[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Estado para Adicionar Workflows no card da atividade
  const [seletorWorkflowAberto, setSeletorWorkflowAberto] = useState(false);
  const [workflowSelecionadoId, setWorkflowSelecionadoId] =
    useState<string>("");
  const [adicionandoWf, setAdicionandoWf] = useState(false);
  const [workflowsAplicados, setWorkflowsAplicados] = useState<
    WorkflowAplicadoItem[]
  >([]);
  const [confirmarExclusaoWfId, setConfirmarExclusaoWfId] = useState<
    string | null
  >(null);

  const navigate = useNavigate();

  const carregar = async (id: string) => {
    const { data, error } = await supabase
      .from("tarefa_comentarios" as never)
      .select("id, user_id, texto, created_at")
      .eq("tarefa_id", id)
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    setRecados(((data as any) || []) as Recado[]);
  };

  useEffect(() => {
    setTexto("");
    setRecados([]);
    setSeletorWorkflowAberto(false);
    setWorkflowSelecionadoId("");
    setConfirmarExclusaoWfId(null);
    if (tarefa) {
      carregar(tarefa.id);
      try {
        const raw = localStorage.getItem(
          `jusmais_wf_aplicados_${tarefa.id}`
        );
        setWorkflowsAplicados(raw ? JSON.parse(raw) : []);
      } catch {
        setWorkflowsAplicados([]);
      }
    } else {
      setWorkflowsAplicados([]);
    }
  }, [tarefa]);

  const salvarWorkflowsAplicadosLocal = (
    tarefaId: string,
    lista: WorkflowAplicadoItem[]
  ) => {
    setWorkflowsAplicados(lista);
    try {
      localStorage.setItem(
        `jusmais_wf_aplicados_${tarefaId}`,
        JSON.stringify(lista)
      );
    } catch {
      /* ignore */
    }
  };

  const handleAdicionarWorkflow = async () => {
    if (!tarefa || !user || !workflowSelecionadoId) {
      toast.error("Selecione um workflow para adicionar");
      return;
    }
    const wf = workflows.find((w) => w.id === workflowSelecionadoId);
    if (!wf) return;

    try {
      setAdicionandoWf(true);
      const meta = extrairMetadadosDescricao(tarefa.descricao);
      const usuarioAtual = usuarios.find((u) => u.id === user.id);
      const idsGerados = await aplicarWorkflowEmAtividade(wf, {
        dataBase: tarefa.dataConclusao,
        userId: user.id,
        userName: usuarioAtual?.full_name || "Grupo Venda+",
        processoCaso: meta.processoCaso || tarefa.clienteNome,
        clienteId: tarefa.clienteId || null,
      });

      const novoRegistro: WorkflowAplicadoItem = {
        workflowId: wf.id,
        workflowTitulo: wf.titulo,
        idsTarefasGeradas: idsGerados,
      };
      salvarWorkflowsAplicadosLocal(tarefa.id, [
        ...workflowsAplicados,
        novoRegistro,
      ]);
      setSeletorWorkflowAberto(false);
      setWorkflowSelecionadoId("");
      toast.success(
        `Workflow "${wf.titulo}" adicionado! ${idsGerados.length} atividade(s) criada(s).`
      );
    } catch (err: any) {
      toast.error("Erro ao adicionar workflow", {
        description: err?.message,
      });
    } finally {
      setAdicionandoWf(false);
    }
  };

  const handleRemoverWorkflowAplicado = async (item: WorkflowAplicadoItem) => {
    if (!tarefa) return;
    try {
      if (item.idsTarefasGeradas.length > 0) {
        await supabase
          .from("tarefas")
          .delete()
          .in("id", item.idsTarefasGeradas);
      }
      const novaLista = workflowsAplicados.filter(
        (w) => w.workflowId !== item.workflowId
      );
      salvarWorkflowsAplicadosLocal(tarefa.id, novaLista);
      setConfirmarExclusaoWfId(null);
      toast.success(`Workflow "${item.workflowTitulo}" removido.`);
    } catch (err: any) {
      toast.error("Erro ao remover workflow", { description: err?.message });
    }
  };

  const enviar = async () => {
    if (!tarefa || !user || !texto.trim()) return;
    setEnviando(true);
    const { error } = await supabase
      .from("tarefa_comentarios" as never)
      .insert({
        tarefa_id: tarefa.id,
        user_id: user.id,
        texto: texto.trim(),
      } as never);
    setEnviando(false);
    if (error) {
      toast.error("Erro ao deixar recado", { description: error.message });
      return;
    }
    setTexto("");
    carregar(tarefa.id);
  };

  const apagar = async (r: Recado) => {
    const { error } = await supabase
      .from("tarefa_comentarios" as never)
      .delete()
      .eq("id", r.id);
    if (error)
      toast.error("Erro ao apagar recado", { description: error.message });
    else if (tarefa) carregar(tarefa.id);
  };

  const autor = tarefa
    ? nomeUsuario(usuarios, tarefa.autorId) ||
      (tarefa.autorId === user?.id ? "Você" : "—")
    : "";
  const podeAlterarStatus =
    !!tarefa &&
    (tarefa.autorId === user?.id ||
      tarefa.responsavelId === user?.id ||
      isAdmin);

  return (
    <Sheet open={!!tarefa} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {tarefa && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>Tarefa</SheetTitle>
              <SheetDescription className="sr-only">
                Detalhes e recados da tarefa
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-5 py-4">
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed rounded-md border bg-muted/20 p-3">
                {tarefa.descricao || "(sem descrição)"}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />{" "}
                  {format(tarefa.dataConclusao, "dd/MM/yyyy", { locale: ptBR })}
                </div>
                <div>
                  <Badge variant="outline">
                    Prioridade {tarefa.prioridade}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" /> Responsável:{" "}
                  {tarefa.responsavel || "—"}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserPen className="h-4 w-4" /> Lançada por: {autor}
                </div>
              </div>

              {tarefa.propostaId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    navigate("/financeiro");
                  }}
                >
                  <HandCoins className="h-4 w-4 mr-1" /> Abrir a proposta na
                  Esteira de Honorários (Financeiro)
                </Button>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={tarefa.status}
                  onValueChange={(v) =>
                    onStatusChange(tarefa, v as Tarefa["status"])
                  }
                  disabled={!podeAlterarStatus}
                >
                  <SelectTrigger className="w-44 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">A Fazer</SelectItem>
                    <SelectItem value="Em Andamento">Em Elaboração</SelectItem>
                    <SelectItem value="Em Revisão">Em Revisão</SelectItem>
                    <SelectItem value="Concluída">Protocolado</SelectItem>
                  </SelectContent>
                </Select>
                {(tarefa.autorId === user?.id || isAdmin) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(tarefa)}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Editar tarefa
                  </Button>
                )}
              </div>

              {/* =========================================================== */}
              {/* SEÇÃO DE WORKFLOWS VINCULADOS (Como no guia do Astrea)       */}
              {/* =========================================================== */}
              <div className="space-y-2.5 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5" /> Workflows
                  </h4>
                  {!seletorWorkflowAberto && (
                    <button
                      type="button"
                      onClick={() => setSeletorWorkflowAberto(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar workflows
                    </button>
                  )}
                </div>

                {workflowsAplicados.length > 0 && (
                  <div className="space-y-1.5">
                    {workflowsAplicados.map((item) => (
                      <div
                        key={item.workflowId}
                        className="flex items-center justify-between gap-2 rounded-md border bg-[#F1F4F9]/60 dark:bg-white/5 px-3 py-2 text-xs"
                      >
                        <span className="font-bold text-[#010E38] dark:text-[#F1F4F9]">
                          {item.workflowTitulo}
                        </span>
                        {confirmarExclusaoWfId === item.workflowId ? (
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setConfirmarExclusaoWfId(null)}
                              className="h-6 px-2 text-[11px]"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleRemoverWorkflowAplicado(item)
                              }
                              className="h-6 px-2 text-[11px] font-bold"
                            >
                              Excluir
                            </Button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmarExclusaoWfId(item.workflowId)
                            }
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="Remover workflow"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {seletorWorkflowAberto && (
                  <div className="rounded-lg border p-3 space-y-2.5 bg-[#F1F4F9]/40 dark:bg-white/5">
                    {workflows.length === 0 ? (
                      <div className="text-xs text-slate-500 space-y-2">
                        <p>Nenhum workflow criado no escritório ainda.</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onClose();
                            navigate("/workflows");
                          }}
                          className="h-7 text-xs font-bold"
                        >
                          Ir para Workflows
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Select
                          value={workflowSelecionadoId}
                          onValueChange={setWorkflowSelecionadoId}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-[#010E38]">
                            <SelectValue placeholder="Selecione um workflow..." />
                          </SelectTrigger>
                          <SelectContent>
                            {workflows.map((wf) => (
                              <SelectItem
                                key={wf.id}
                                value={wf.id}
                                className="text-xs"
                              >
                                {wf.titulo} ({wf.atividades.length} atividades)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSeletorWorkflowAberto(false)}
                            className="h-7 text-xs"
                          >
                            Cancelar
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!workflowSelecionadoId || adicionandoWf}
                            onClick={handleAdicionarWorkflow}
                            className="h-7 bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 text-xs font-bold"
                          >
                            {adicionandoWf ? "Adicionando..." : "Adicionar"}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Recados (
                  {recados.length})
                </h4>
                {recados.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum recado ainda.
                  </p>
                )}
                <div className="space-y-2">
                  {recados.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-md border p-2.5 text-sm bg-background"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold">
                          {r.user_id === user?.id
                            ? "Você"
                            : nomeUsuario(usuarios, r.user_id) || "Usuário"}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), {
                            locale: ptBR,
                            addSuffix: true,
                          })}
                          {(r.user_id === user?.id || isAdmin) && (
                            <button
                              onClick={() => apagar(r)}
                              className="text-destructive hover:opacity-70"
                              title="Apagar recado"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap break-words">
                        {r.texto}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Textarea
                    rows={3}
                    placeholder="Deixe um recado ou mais informações..."
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                        enviar();
                    }}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={enviar}
                      disabled={enviando || !texto.trim()}
                    >
                      <Send className="h-4 w-4 mr-1" /> Enviar recado
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
