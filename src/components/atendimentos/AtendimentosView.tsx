/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  FolderOpen,
  Link2,
  ListTodo,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  RotateCw,
  Search,
  Send,
  Tag,
  Trash2,
  Upload,
  User as UserIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { CORES_ETIQUETAS, useEtiquetasKanban } from "@/lib/etiquetas";
import { nomeUsuario, useUsuarios } from "@/lib/nichos";
import {
  type AtendimentoAstrea,
  type RegistroAtendimento,
  type StatusAtendimento,
  formatarTituloAtendimentoComData,
  listarAtendimentosAstrea,
  obterIniciaisNome,
} from "@/lib/atendimentos";
import { ClienteAnotacoes } from "@/components/clientes/ClienteAnotacoes";

interface AtendimentosViewProps {
  /** Se informado, exibe apenas os atendimentos deste cliente (usado dentro da ficha do cliente) */
  clienteFixo?: { id: string; nome: string } | null;
  onVoltar?: () => void;
}

export function AtendimentosView({
  clienteFixo = null,
  onVoltar,
}: AtendimentosViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const usuarios = useUsuarios();
  const {
    etiquetas: catalogoEtiquetas,
    adicionarEtiqueta,
    removerEtiqueta,
    obterCorEtiqueta,
  } = useEtiquetasKanban();

  const [atendimentos, setAtendimentos] = useState<AtendimentoAstrea[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientesLista, setClientesLista] = useState<
    { id: string; nome: string }[]
  >([]);
  const [processosLista, setProcessosLista] = useState<
    { id: string; numero: string | null; cliente: string | null; assunto: string | null }[]
  >([]);

  // Filtros estilo Astrea
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<
    "em_andamento" | "fechado" | "todos"
  >("em_andamento");
  const [filtroPeriodo, setFiltroPeriodo] = useState<
    "todos" | "hoje" | "7d" | "30d"
  >("todos");
  const [ordenacaoRecente, setOrdenacaoRecente] = useState(true);
  const [etiquetasFiltro, setEtiquetasFiltro] = useState<string[]>([]);

  // Gerenciador de etiquetas popover
  const [buscaTag, setBuscaTag] = useState("");
  const [modalGerenciarTags, setModalGerenciarTags] = useState(false);
  const [novaTagNome, setNovaTagNome] = useState("");
  const [novaTagCor, setNovaTagCor] = useState(CORES_ETIQUETAS[0]);

  // Atendimento selecionado (tela interna do atendimento)
  const [atendimentoAberto, setAtendimentoAberto] =
    useState<AtendimentoAstrea | null>(null);
  const [abaDetalhe, setAbaDetalhe] = useState<
    "registros" | "tarefas" | "documentos" | "questionario"
  >("registros");

  // Tela Criar / Editar Atendimento (Full-Page igual ao print do Astrea)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [editandoAtendimento, setEditandoAtendimento] =
    useState<AtendimentoAstrea | null>(null);
  const [formClientesRows, setFormClientesRows] = useState<
    { clienteId: string; busca: string }[]
  >([
    {
      clienteId: clienteFixo?.id || "",
      busca: clienteFixo?.nome || "",
    },
  ]);
  const [dropdownClienteAtivoIdx, setDropdownClienteAtivoIdx] = useState<
    number | null
  >(null);
  const [formAssunto, setFormAssunto] = useState("");
  const [formTexto, setFormTexto] = useState("");
  const [formEtiquetas, setFormEtiquetas] = useState<string[]>([]);
  const [formProcessoId, setFormProcessoId] = useState<string>("__nenhum");
  const [formAtendimentoVinculadoId, setFormAtendimentoVinculadoId] =
    useState<string>("__nenhum");
  const [buscaVinculo, setBuscaVinculo] = useState("");
  const [dropdownVinculoAberto, setDropdownVinculoAberto] = useState(false);
  const [formStatus, setFormStatus] =
    useState<StatusAtendimento>("em_andamento");
  const [salvandoForm, setSalvandoForm] = useState(false);

  // Novo registro dentro do atendimento aberto
  const [novoRegistroTexto, setNovoRegistroTexto] = useState("");
  const [salvandoRegistro, setSalvandoRegistro] = useState(false);

  // Tarefas vinculadas ao atendimento aberto
  const [tarefasVinculadas, setTarefasVinculadas] = useState<any[]>([]);
  const [modalNovaTarefaOpen, setModalNovaTarefaOpen] = useState(false);
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState("");
  const [novaTarefaData, setNovaTarefaData] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [novaTarefaPrioridade, setNovaTarefaPrioridade] = useState("media");
  const [novaTarefaResponsavel, setNovaTarefaResponsavel] = useState("");
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);

  // Documentos vinculados ao atendimento aberto
  const [docsVinculados, setDocsVinculados] = useState<any[]>([]);
  const fileAtendimentoRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);

  // Questionário no modo clienteFixo
  const [mostrarQuestionarioCliente, setMostrarQuestionarioCliente] =
    useState(false);

  const carregarTudo = async () => {
    setLoading(true);
    try {
      const [listaAtend, { data: clis }, { data: procs }] = await Promise.all([
        listarAtendimentosAstrea(clienteFixo?.id),
        supabase
          .from("clientes")
          .select("id, nome")
          .order("nome", { ascending: true }),
        supabase
          .from("processos")
          .select("id, numero, cliente, assunto")
          .order("updated_at", { ascending: false }),
      ]);

      setAtendimentos(listaAtend);
      setClientesLista((clis as any[]) || []);
      setProcessosLista((procs as any[]) || []);

      if (atendimentoAberto) {
        const atualizado = listaAtend.find(
          (a) => a.id === atendimentoAberto.id
        );
        if (atualizado) setAtendimentoAberto(atualizado);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteFixo?.id]);

  // Carrega tarefas e documentos quando um atendimento é aberto
  const carregarExtrasDoAtendimento = async (at: AtendimentoAstrea) => {
    const [{ data: tData }, { data: dData }] = await Promise.all([
      supabase
        .from("tarefas")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("documentos")
        .select("*")
        .eq("cliente_id", at.cliente_id)
        .order("updated_at", { ascending: false }),
    ]);

    const tIds = new Set(at.tarefas_ids || []);
    const tarefasDoAtendimento = ((tData as any[]) || []).filter(
      (t) =>
        tIds.has(t.id) ||
        (t.descricao || "").includes(`[ATENDIMENTO:${at.id}]`)
    );
    setTarefasVinculadas(tarefasDoAtendimento);
    setDocsVinculados((dData as any[]) || []);
  };

  useEffect(() => {
    if (atendimentoAberto) {
      carregarExtrasDoAtendimento(atendimentoAberto);
    }
  }, [atendimentoAberto]);

  const abrirModalNovoAtendimento = () => {
    setEditandoAtendimento(null);
    setFormClientesRows([
      {
        clienteId: clienteFixo?.id || "",
        busca: clienteFixo?.nome || "",
      },
    ]);
    setDropdownClienteAtivoIdx(null);
    setFormAssunto("");
    setFormTexto("");
    setFormEtiquetas([]);
    setFormProcessoId("__nenhum");
    setFormAtendimentoVinculadoId("__nenhum");
    setBuscaVinculo("");
    setDropdownVinculoAberto(false);
    setFormStatus("em_andamento");
    setModalFormOpen(true);
  };

  const abrirModalEditarAtendimento = (at: AtendimentoAstrea) => {
    setEditandoAtendimento(at);
    setFormClientesRows([
      {
        clienteId: at.cliente_id,
        busca: at.cliente_nome || "",
      },
    ]);
    setDropdownClienteAtivoIdx(null);
    setFormAssunto(at.assunto);
    const ultimo = at.registros[at.registros.length - 1];
    setFormTexto(ultimo?.texto || "");
    setFormEtiquetas(at.etiquetas || []);
    setFormProcessoId(at.processo_id || "__nenhum");
    setFormAtendimentoVinculadoId(at.atendimento_vinculado_id || "__nenhum");
    setBuscaVinculo(at.processo_titulo || "");
    setDropdownVinculoAberto(false);
    setFormStatus(at.status);
    setModalFormOpen(true);
  };

  const handleSalvarAtendimento = async () => {
    // Resolve clientes selecionados ou digitados
    const clientesResolvidos = formClientesRows
      .map((row) => {
        if (row.clienteId) {
          const c = clientesLista.find((x) => x.id === row.clienteId);
          return c || { id: row.clienteId, nome: row.busca.trim() };
        }
        const q = row.busca.trim().toLowerCase();
        if (!q) return null;
        const match = clientesLista.find((x) => x.nome.toLowerCase() === q);
        return match || null;
      })
      .filter(Boolean) as { id: string; nome: string }[];

    const cid = clienteFixo?.id || clientesResolvidos[0]?.id || "";
    if (!cid) {
      toast.error("Selecione um cliente válido na lista para o atendimento.");
      return;
    }
    if (!formAssunto.trim()) {
      toast.error("Informe o assunto do atendimento.");
      return;
    }
    if (!formTexto.trim()) {
      toast.error("Digite o 1º Registro do atendimento.");
      return;
    }
    if (!user) return;

    setSalvandoForm(true);
    try {
      const autorNome =
        nomeUsuario(usuarios, user.id) ||
        user.email ||
        "Advogado(a)";
      const autorIniciais = obterIniciaisNome(autorNome);
      const procObj = processosLista.find((p) => p.id === formProcessoId);
      const procTitulo =
        procObj
          ? `${procObj.numero ? `${procObj.numero} - ` : ""}${
              procObj.cliente || procObj.assunto || "Processo"
            }`
          : buscaVinculo.trim() || null;

      const nomesTodosClientes =
        clientesResolvidos.map((c) => c.nome).join(", ") ||
        clienteFixo?.nome ||
        "Cliente";

      if (editandoAtendimento) {
        const registrosAtuais = [...(editandoAtendimento.registros || [])];
        if (registrosAtuais.length > 0) {
          registrosAtuais[registrosAtuais.length - 1] = {
            ...registrosAtuais[registrosAtuais.length - 1],
            texto: formTexto.trim(),
          };
        } else {
          registrosAtuais.push({
            id: `${Date.now()}`,
            texto: formTexto.trim(),
            autor_id: user.id,
            autor_nome: autorNome,
            autor_iniciais: autorIniciais,
            criado_em: new Date().toISOString(),
          });
        }

        const metaJson = {
          __astrea_atendimento: true,
          cliente_nome: nomesTodosClientes,
          status: formStatus,
          etiquetas: formEtiquetas,
          processo_id:
            formProcessoId !== "__nenhum" ? formProcessoId : null,
          processo_titulo: procTitulo,
          atendimento_vinculado_id:
            formAtendimentoVinculadoId !== "__nenhum"
              ? formAtendimentoVinculadoId
              : null,
          tarefas_ids: editandoAtendimento.tarefas_ids || [],
          documentos_ids: editandoAtendimento.documentos_ids || [],
          registros: registrosAtuais,
        };

        const { error } = await supabase
          .from("cliente_anotacoes" as never)
          .update({
            cliente_id: cid,
            titulo: formAssunto.trim(),
            conteudo: formTexto.trim(),
            respostas: metaJson,
          } as never)
          .eq("id", editandoAtendimento.id);

        if (error) throw error;
        toast.success("Atendimento atualizado com sucesso!");
      } else {
        const primeiroRegistro: RegistroAtendimento = {
          id: `${Date.now()}`,
          texto: formTexto.trim(),
          autor_id: user.id,
          autor_nome: autorNome,
          autor_iniciais: autorIniciais,
          criado_em: new Date().toISOString(),
        };

        const metaJson = {
          __astrea_atendimento: true,
          cliente_nome: nomesTodosClientes,
          status: formStatus,
          etiquetas: formEtiquetas,
          processo_id:
            formProcessoId !== "__nenhum" ? formProcessoId : null,
          processo_titulo: procTitulo,
          atendimento_vinculado_id:
            formAtendimentoVinculadoId !== "__nenhum"
              ? formAtendimentoVinculadoId
              : null,
          tarefas_ids: [],
          documentos_ids: [],
          registros: [primeiroRegistro],
        };

        const { error } = await supabase
          .from("cliente_anotacoes" as never)
          .insert({
            cliente_id: cid,
            tipo: "nota",
            titulo: formAssunto.trim(),
            conteudo: formTexto.trim(),
            respostas: metaJson,
            importante: false,
            user_id: user.id,
          } as never);

        if (error) throw error;
        toast.success("Atendimento registrado com sucesso!");
      }

      setModalFormOpen(false);
      await carregarTudo();
    } catch (e: any) {
      toast.error("Erro ao salvar atendimento", {
        description: e?.message || "Tente novamente.",
      });
    } finally {
      setSalvandoForm(false);
    }
  };

  // Incluir novo registro (conversa / consideração de outro sócio ou advogado)
  const handleAdicionarNovoRegistro = async () => {
    if (!atendimentoAberto || !novoRegistroTexto.trim() || !user) return;
    setSalvandoRegistro(true);
    try {
      const autorNome =
        nomeUsuario(usuarios, user.id) || user.email || "Advogado(a)";
      const autorIniciais = obterIniciaisNome(autorNome);

      const novoReg: RegistroAtendimento = {
        id: `${Date.now()}`,
        texto: novoRegistroTexto.trim(),
        autor_id: user.id,
        autor_nome: autorNome,
        autor_iniciais: autorIniciais,
        criado_em: new Date().toISOString(),
      };

      const novosRegistros = [...(atendimentoAberto.registros || []), novoReg];
      const metaJson = {
        __astrea_atendimento: true,
        cliente_nome: atendimentoAberto.cliente_nome,
        status: atendimentoAberto.status,
        etiquetas: atendimentoAberto.etiquetas,
        processo_id: atendimentoAberto.processo_id,
        processo_titulo: atendimentoAberto.processo_titulo,
        atendimento_vinculado_id: atendimentoAberto.atendimento_vinculado_id,
        tarefas_ids: atendimentoAberto.tarefas_ids,
        documentos_ids: atendimentoAberto.documentos_ids,
        registros: novosRegistros,
      };

      const { error } = await supabase
        .from("cliente_anotacoes" as never)
        .update({
          conteudo: novoReg.texto,
          respostas: metaJson,
        } as never)
        .eq("id", atendimentoAberto.id);

      if (error) throw error;
      setNovoRegistroTexto("");
      toast.success("Novo registro adicionado ao atendimento!");
      await carregarTudo();
    } catch (e: any) {
      toast.error("Erro ao incluir registro", { description: e?.message });
    } finally {
      setSalvandoRegistro(false);
    }
  };

  // Alternar status Em andamento / Fechado
  const handleAlternarStatusAtendimento = async (
    at: AtendimentoAstrea,
    novoStatus: StatusAtendimento
  ) => {
    const metaJson = {
      __astrea_atendimento: true,
      cliente_nome: at.cliente_nome,
      status: novoStatus,
      etiquetas: at.etiquetas,
      processo_id: at.processo_id,
      processo_titulo: at.processo_titulo,
      atendimento_vinculado_id: at.atendimento_vinculado_id,
      tarefas_ids: at.tarefas_ids,
      documentos_ids: at.documentos_ids,
      registros: at.registros,
    };

    const { error } = await supabase
      .from("cliente_anotacoes" as never)
      .update({ respostas: metaJson } as never)
      .eq("id", at.id);

    if (error) {
      toast.error("Erro ao alterar status do atendimento");
      return;
    }
    toast.success(
      novoStatus === "fechado"
        ? "Atendimento marcado como Fechado!"
        : "Atendimento reaberto (Em andamento)!"
    );
    await carregarTudo();
  };

  const handleExcluirAtendimento = async (id: string) => {
    const { error } = await supabase
      .from("cliente_anotacoes" as never)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erro ao excluir atendimento", {
        description: error.message,
      });
      return;
    }
    toast.success("Atendimento excluído");
    if (atendimentoAberto?.id === id) {
      setAtendimentoAberto(null);
    }
    await carregarTudo();
  };

  // Criar tarefa vinculada ao atendimento
  const handleCriarTarefaVinculada = async () => {
    if (!atendimentoAberto || !novaTarefaTitulo.trim() || !user) return;
    setSalvandoTarefa(true);
    try {
      const respNome =
        usuarios.find((u) => u.id === novaTarefaResponsavel)?.full_name ||
        nomeUsuario(usuarios, user.id) ||
        "Escritório";

      const { data: novaT, error: tErr } = await supabase
        .from("tarefas")
        .insert({
          titulo: novaTarefaTitulo.trim(),
          descricao: `Tarefa criada a partir do atendimento "${atendimentoAberto.assunto}" do cliente ${atendimentoAberto.cliente_nome}. [ATENDIMENTO:${atendimentoAberto.id}]`,
          data_vencimento: novaTarefaData || null,
          prioridade: novaTarefaPrioridade,
          status: "pendente",
          categoria: "Tarefa",
          responsavel: respNome,
          user_id: user.id,
        } as any)
        .select()
        .single();

      if (tErr) throw tErr;

      if (novaT) {
        const novosIds = [
          ...(atendimentoAberto.tarefas_ids || []),
          (novaT as any).id,
        ];
        const metaJson = {
          __astrea_atendimento: true,
          cliente_nome: atendimentoAberto.cliente_nome,
          status: atendimentoAberto.status,
          etiquetas: atendimentoAberto.etiquetas,
          processo_id: atendimentoAberto.processo_id,
          processo_titulo: atendimentoAberto.processo_titulo,
          atendimento_vinculado_id: atendimentoAberto.atendimento_vinculado_id,
          tarefas_ids: novosIds,
          documentos_ids: atendimentoAberto.documentos_ids,
          registros: atendimentoAberto.registros,
        };
        await supabase
          .from("cliente_anotacoes" as never)
          .update({ respostas: metaJson } as never)
          .eq("id", atendimentoAberto.id);
      }

      setNovaTarefaTitulo("");
      setModalNovaTarefaOpen(false);
      toast.success("Tarefa delegada e vinculada ao atendimento!");
      await carregarTudo();
      if (atendimentoAberto) {
        await carregarExtrasDoAtendimento(atendimentoAberto);
      }
    } catch (e: any) {
      toast.error("Erro ao criar tarefa", { description: e?.message });
    } finally {
      setSalvandoTarefa(false);
    }
  };

  const handleToggleConcluirTarefa = async (tarefa: any) => {
    const novoStatus =
      tarefa.status === "concluida" ? "pendente" : "concluida";
    const { error } = await supabase
      .from("tarefas")
      .update({ status: novoStatus })
      .eq("id", tarefa.id);
    if (!error && atendimentoAberto) {
      toast.success(
        novoStatus === "concluida"
          ? "Tarefa marcada como concluída!"
          : "Tarefa reaberta!"
      );
      await carregarExtrasDoAtendimento(atendimentoAberto);
    }
  };

  // Upload de documento dentro do atendimento
  const handleAnexarDocumentoAtendimento = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !atendimentoAberto || !user) return;
    setUploadingAnexo(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const safePath = `clientes/${atendimentoAberto.cliente_id}/${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(safePath, file);
      if (upErr) throw upErr;

      const { data: docCriado, error: dbErr } = await supabase
        .from("documentos")
        .insert({
          nome: file.name,
          tipo: ext,
          tamanho: file.size,
          storage_path: safePath,
          cliente_id: atendimentoAberto.cliente_id,
          user_id: user.id,
          is_folder: false,
        } as any)
        .select()
        .single();
      if (dbErr) throw dbErr;

      if (docCriado) {
        const novosDocIds = [
          ...(atendimentoAberto.documentos_ids || []),
          (docCriado as any).id,
        ];
        const metaJson = {
          __astrea_atendimento: true,
          cliente_nome: atendimentoAberto.cliente_nome,
          status: atendimentoAberto.status,
          etiquetas: atendimentoAberto.etiquetas,
          processo_id: atendimentoAberto.processo_id,
          processo_titulo: atendimentoAberto.processo_titulo,
          atendimento_vinculado_id: atendimentoAberto.atendimento_vinculado_id,
          tarefas_ids: atendimentoAberto.tarefas_ids,
          documentos_ids: novosDocIds,
          registros: atendimentoAberto.registros,
        };
        await supabase
          .from("cliente_anotacoes" as never)
          .update({ respostas: metaJson } as never)
          .eq("id", atendimentoAberto.id);
      }

      toast.success("Documento anexado ao atendimento!");
      await carregarTudo();
      await carregarExtrasDoAtendimento(atendimentoAberto);
    } catch (err: any) {
      toast.error("Erro ao anexar documento", { description: err?.message });
    } finally {
      setUploadingAnexo(false);
      if (fileAtendimentoRef.current) fileAtendimentoRef.current.value = "";
    }
  };

  // Filtragem dos atendimentos
  const atendimentosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const agora = new Date();

    const lista = atendimentos.filter((at) => {
      if (filtroStatus !== "todos" && at.status !== filtroStatus) {
        return false;
      }

      if (filtroPeriodo !== "todos") {
        const dataCriacao = new Date(at.created_at);
        if (
          filtroPeriodo === "hoje" &&
          format(dataCriacao, "yyyy-MM-dd") !== format(agora, "yyyy-MM-dd")
        ) {
          return false;
        }
        if (filtroPeriodo === "7d" && dataCriacao < subDays(agora, 7)) {
          return false;
        }
        if (filtroPeriodo === "30d" && dataCriacao < subDays(agora, 30)) {
          return false;
        }
      }

      if (etiquetasFiltro.length > 0) {
        const possui = etiquetasFiltro.some((t) => at.etiquetas.includes(t));
        if (!possui) return false;
      }

      if (!q) return true;
      const ultimoTexto =
        at.registros[at.registros.length - 1]?.texto?.toLowerCase() || "";
      return (
        at.assunto.toLowerCase().includes(q) ||
        at.cliente_nome.toLowerCase().includes(q) ||
        ultimoTexto.includes(q) ||
        (at.processo_titulo || "").toLowerCase().includes(q)
      );
    });

    return lista.sort((a, b) => {
      const tA = new Date(a.updated_at || a.created_at).getTime();
      const tB = new Date(b.updated_at || b.created_at).getTime();
      return ordenacaoRecente ? tB - tA : tA - tB;
    });
  }, [
    atendimentos,
    busca,
    filtroStatus,
    filtroPeriodo,
    etiquetasFiltro,
    ordenacaoRecente,
  ]);

  const tagsCatalogoFiltradas = useMemo(() => {
    const q = buscaTag.trim().toLowerCase();
    if (!q) return catalogoEtiquetas;
    return catalogoEtiquetas.filter((e) => e.nome.toLowerCase().includes(q));
  }, [catalogoEtiquetas, buscaTag]);

  // =========================================================================
  // TELA DE DETALHE DO ATENDIMENTO SELECIONADO
  // =========================================================================
  if (atendimentoAberto) {
    return (
      <div className="space-y-5">
        <input
          ref={fileAtendimentoRef}
          type="file"
          className="hidden"
          onChange={handleAnexarDocumentoAtendimento}
        />

        {/* Cabeçalho do Atendimento Aberto */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#010E38]/15 dark:border-white/10 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
                {formatarTituloAtendimentoComData(
                  atendimentoAberto.assunto,
                  atendimentoAberto.created_at
                )}
              </h2>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-xs text-[10px] font-extrabold uppercase tracking-wider",
                  atendimentoAberto.status === "em_andamento"
                    ? "bg-[#010E38] text-[#EBB52C]"
                    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                )}
              >
                {atendimentoAberto.status === "em_andamento"
                  ? "EM ANDAMENTO"
                  : "FECHADO"}
              </span>
              {atendimentoAberto.etiquetas.map((et) => (
                <span
                  key={et}
                  style={{ backgroundColor: obterCorEtiqueta(et) }}
                  className="px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase text-white"
                >
                  {et}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#010E38]/80 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <UserIcon className="h-3.5 w-3.5 text-[#010E38] fill-[#010E38] dark:text-[#EBB52C] dark:fill-[#EBB52C]" />
                {atendimentoAberto.cliente_nome}
              </span>
              {atendimentoAberto.processo_titulo && (
                <button
                  type="button"
                  onClick={() => navigate("/processos")}
                  className="inline-flex items-center gap-1 font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline"
                >
                  <Briefcase className="h-3.5 w-3.5 text-[#EBB52C]" />
                  <span>Processo: {atendimentoAberto.processo_titulo}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {atendimentoAberto.status === "em_andamento" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAlternarStatusAtendimento(
                    atendimentoAberto,
                    "fechado"
                  )
                }
                className="h-8 text-xs font-bold text-[#010E38] border-[#010E38]/25 hover:bg-[#F1F4F9]"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-[#EBB52C]" />
                Fechar atendimento
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  handleAlternarStatusAtendimento(
                    atendimentoAberto,
                    "em_andamento"
                  )
                }
                className="h-8 text-xs font-bold"
              >
                Reabrir atendimento
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => abrirModalEditarAtendimento(atendimentoAberto)}
              className="h-8 text-xs font-bold border-[#010E38]/20 text-[#010E38] dark:text-[#F1F4F9]"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAtendimentoAberto(null)}
              className="h-8 text-xs font-bold text-[#010E38] dark:text-[#EBB52C]"
            >
              Voltar para Atendimentos
            </Button>
          </div>
        </div>

        {/* Sub-abas do Atendimento: Registros e Conversas | Tarefas Delegadas | Documentos Anexados | Questionário Inicial */}
        <div className="border-b border-[#010E38]/15 dark:border-white/10 flex items-center gap-6 overflow-x-auto">
          {(
            [
              {
                id: "registros",
                label: `Registros e Conversas (${atendimentoAberto.registros.length})`,
              },
              {
                id: "tarefas",
                label: `Tarefas do Atendimento (${tarefasVinculadas.length})`,
              },
              {
                id: "documentos",
                label: `Documentos (${docsVinculados.length})`,
              },
              {
                id: "questionario",
                label: "Questionário Inicial (Jus+)",
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAbaDetalhe(tab.id)}
              className={cn(
                "pb-2.5 text-xs whitespace-nowrap border-b-2 transition-colors",
                abaDetalhe === tab.id
                  ? "border-[#EBB52C] text-[#010E38] dark:text-[#EBB52C] font-extrabold"
                  : "border-transparent text-slate-500 hover:text-[#010E38] font-medium"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SUB-ABA 1: REGISTROS E CONVERSAS */}
        {abaDetalhe === "registros" && (
          <div className="space-y-5 max-w-4xl">
            {/* Caixa para adicionar novo registro ao mesmo atendimento */}
            <div className="rounded-md border border-[#010E38]/15 dark:border-white/15 bg-[#F1F4F9] dark:bg-white/5 p-4 space-y-3">
              <Label className="text-xs font-extrabold uppercase tracking-wide text-[#010E38] dark:text-[#EBB52C] flex items-center gap-1.5">
                <MessageSquarePlus className="h-4 w-4 text-[#EBB52C]" />
                Incluir novo registro neste atendimento
              </Label>
              <Textarea
                value={novoRegistroTexto}
                onChange={(e) => setNovoRegistroTexto(e.target.value)}
                placeholder="Registre novas informações da conversa, considerações de sócios, proposta de honorários, senhas ou retorno do cliente..."
                rows={3}
                className="text-xs bg-white dark:bg-[#010E38] border-[#010E38]/20 focus-visible:ring-[#EBB52C]"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModalNovaTarefaOpen(true)}
                    className="h-8 text-xs font-bold border-[#010E38]/20 text-[#010E38] dark:text-[#F1F4F9]"
                  >
                    <ListTodo className="h-3.5 w-3.5 mr-1.5 text-[#EBB52C]" />
                    Criar tarefa
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileAtendimentoRef.current?.click()}
                    disabled={uploadingAnexo}
                    className="h-8 text-xs font-bold border-[#010E38]/20 text-[#010E38] dark:text-[#F1F4F9]"
                  >
                    <Paperclip className="h-3.5 w-3.5 mr-1.5 text-[#EBB52C]" />
                    {uploadingAnexo ? "Anexando..." : "Anexar documento"}
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={!novoRegistroTexto.trim() || salvandoRegistro}
                  onClick={handleAdicionarNovoRegistro}
                  className="h-8 px-4 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {salvandoRegistro ? "Salvando..." : "Salvar registro"}
                </Button>
              </div>
            </div>

            {/* Lista cronológica reversa de registros */}
            <div className="space-y-3">
              {[...atendimentoAberto.registros]
                .reverse()
                .map((reg, idx) => (
                  <div
                    key={reg.id || idx}
                    className="flex items-start gap-3 rounded-md border border-[#010E38]/15 dark:border-white/10 bg-white dark:bg-[#010E38] p-4 shadow-2xs"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-bold text-[#010E38] dark:text-[#F1F4F9]">
                          {reg.autor_nome}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-[#010E38] text-[#EBB52C]">
                            ÚLTIMO REGISTRO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
                        {reg.texto}
                      </p>
                    </div>

                    <div className="flex flex-col items-center shrink-0 w-16">
                      <div className="h-10 w-10 rounded-full bg-[#010E38] text-[#EBB52C] border-2 border-[#EBB52C]/50 flex items-center justify-center text-xs font-extrabold">
                        {reg.autor_iniciais}
                      </div>
                      <div className="mt-1 text-[10px] font-data text-[#010E38]/70 dark:text-slate-400 text-center leading-tight">
                        <div>
                          {format(new Date(reg.criado_em), "dd/MM/yyyy")}
                        </div>
                        <div>{format(new Date(reg.criado_em), "HH:mm")}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SUB-ABA 2: TAREFAS DO ATENDIMENTO */}
        {abaDetalhe === "tarefas" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Delegue tarefas para a equipe (ex.: enviar proposta de
                honorários, solicitar documentos, elaborar petição inicial) e
                acompanhe a execução.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setModalNovaTarefaOpen(true)}
                className="h-8 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar tarefa
              </Button>
            </div>

            {tarefasVinculadas.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#010E38]/20 bg-[#F1F4F9]/50 p-8 text-center text-xs text-slate-500">
                Nenhuma tarefa associada a este atendimento ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10 rounded-md border border-[#010E38]/15 dark:border-white/15 bg-white dark:bg-[#010E38]">
                {tarefasVinculadas.map((t) => {
                  const concluida = t.status === "concluida";
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleConcluirTarefa(t)}
                          className="text-slate-400 hover:text-emerald-600"
                        >
                          {concluida ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Circle className="h-4 w-4" />
                          )}
                        </button>
                        <div>
                          <p
                            className={cn(
                              "font-bold text-[#010E38] dark:text-slate-100",
                              concluida && "line-through text-slate-400"
                            )}
                          >
                            {t.titulo}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Responsável: {t.responsavel || "Escritório"}
                            {t.data_vencimento &&
                              ` · Prazo: ${format(
                                new Date(`${t.data_vencimento}T12:00:00`),
                                "dd/MM/yyyy"
                              )}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate("/tarefas")}
                        className="h-7 text-[11px] font-bold text-[#010E38] dark:text-[#EBB52C]"
                      >
                        Abrir no Kanban
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 3: DOCUMENTOS ANEXADOS */}
        {abaDetalhe === "documentos" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Documentos recebidos ou anexados durante o atendimento deste
                cliente.
              </p>
              <Button
                type="button"
                size="sm"
                disabled={uploadingAnexo}
                onClick={() => fileAtendimentoRef.current?.click()}
                className="h-8 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {uploadingAnexo ? "Enviando..." : "Anexar documento"}
              </Button>
            </div>

            {docsVinculados.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#010E38]/20 bg-[#F1F4F9]/50 p-8 text-center text-xs text-slate-500">
                Nenhum documento anexado para este cliente ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10 rounded-md border border-[#010E38]/15 dark:border-white/15 bg-white dark:bg-[#010E38]">
                {docsVinculados.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="h-4 w-4 text-[#010E38] dark:text-[#EBB52C] shrink-0" />
                      <span className="font-semibold truncate">{d.nome}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate("/documentos")}
                      className="h-7 text-[11px] font-bold text-[#010E38] dark:text-[#EBB52C]"
                    >
                      Abrir no Drive
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 4: QUESTIONÁRIO INICIAL DO NICHO (JUS+) */}
        {abaDetalhe === "questionario" && (
          <div className="max-w-4xl pt-2">
            <ClienteAnotacoes
              cliente={{
                id: atendimentoAberto.cliente_id,
                nome: atendimentoAberto.cliente_nome,
              }}
            />
          </div>
        )}

        {/* Modal Criar Tarefa no Atendimento */}
        <Dialog
          open={modalNovaTarefaOpen}
          onOpenChange={setModalNovaTarefaOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Adicionar tarefa ao atendimento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Descrição da tarefa*</Label>
                <Input
                  value={novaTarefaTitulo}
                  onChange={(e) => setNovaTarefaTitulo(e.target.value)}
                  placeholder="Ex.: Enviar proposta de honorários por e-mail"
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Data / Prazo</Label>
                  <Input
                    type="date"
                    value={novaTarefaData}
                    onChange={(e) => setNovaTarefaData(e.target.value)}
                    className="h-9 text-xs font-data"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prioridade</Label>
                  <Select
                    value={novaTarefaPrioridade}
                    onValueChange={setNovaTarefaPrioridade}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa" className="text-xs">
                        Baixa
                      </SelectItem>
                      <SelectItem value="media" className="text-xs">
                        Média
                      </SelectItem>
                      <SelectItem value="alta" className="text-xs">
                        Alta / Urgente
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsável (Advogado / Estagiário)</Label>
                <Select
                  value={novaTarefaResponsavel}
                  onValueChange={setNovaTarefaResponsavel}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaTarefaOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!novaTarefaTitulo.trim() || salvandoTarefa}
                onClick={handleCriarTarefaVinculada}
                className="bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider"
              >
                {salvandoTarefa ? "Salvando..." : "Salvar tarefa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // TELA "ADICIONAR ATENDIMENTO" FULL-PAGE (IDENTIDADE JUS+ NAVY & GOLD)
  // =========================================================================
  if (modalFormOpen) {
    const labelCls =
      "block text-xs font-bold text-[#010E38] dark:text-[#F1F4F9] mb-1";
    const inputCls =
      "h-9 w-full rounded border border-[#010E38]/20 dark:border-white/15 bg-white dark:bg-[#010E38] px-3 text-xs text-[#010E38] dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#010E38] focus:ring-1 focus:ring-[#EBB52C]";

    const opcoesVinculoFiltradas = () => {
      const q = buscaVinculo.trim().toLowerCase();
      const itensProc = processosLista.map((p) => ({
        tipo: "processo" as const,
        id: p.id,
        label: `${p.numero ? `${p.numero} — ` : ""}${
          p.cliente || p.assunto || "Processo"
        }`,
      }));
      const itensAtend = atendimentos
        .filter((a) => !editandoAtendimento || a.id !== editandoAtendimento.id)
        .map((a) => ({
          tipo: "atendimento" as const,
          id: a.id,
          label: `Atendimento: ${formatarTituloAtendimentoComData(
            a.assunto,
            a.created_at
          )} (${a.cliente_nome})`,
        }));
      const todos = [...itensProc, ...itensAtend];
      if (!q) return todos.slice(0, 20);
      return todos.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 20);
    };

    return (
      <div className="bg-white dark:bg-[#010E38] min-h-[calc(100vh-90px)] py-4 px-2 sm:px-6">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="h-6 w-1.5 rounded-full bg-[#EBB52C]" />
          <h1 className="text-xl sm:text-[22px] font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
            {editandoAtendimento ? "Editar atendimento" : "Adicionar atendimento"}
          </h1>
        </div>

        <div className="max-w-[640px] sm:ml-10 space-y-4">
          {/* Clientes* + "Adicionar cliente" */}
          <div>
            <label className={labelCls}>
              Clientes<span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {formClientesRows.map((row, idx) => {
                const qCli = row.busca.trim().toLowerCase();
                const sugestoes = qCli
                  ? clientesLista
                      .filter((c) => c.nome.toLowerCase().includes(qCli))
                      .slice(0, 15)
                  : clientesLista.slice(0, 15);

                return (
                  <div key={idx} className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={row.busca}
                        disabled={Boolean(clienteFixo && idx === 0)}
                        onFocus={() => setDropdownClienteAtivoIdx(idx)}
                        onBlur={() =>
                          setTimeout(() => {
                            setDropdownClienteAtivoIdx((atual) =>
                              atual === idx ? null : atual
                            );
                          }, 180)
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormClientesRows((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { clienteId: "", busca: val }
                                : item
                            )
                          );
                          setDropdownClienteAtivoIdx(idx);
                        }}
                        placeholder="Digite o nome do cliente"
                        className={cn(inputCls, "pr-9")}
                      />
                      <Search className="h-4 w-4 text-[#010E38]/60 dark:text-[#EBB52C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

                      {dropdownClienteAtivoIdx === idx && !clienteFixo && (
                        <div className="absolute z-30 left-0 right-0 top-[calc(100%+2px)] rounded border border-[#010E38]/20 dark:border-white/15 bg-white dark:bg-[#010E38] shadow-md max-h-52 overflow-y-auto">
                          {sugestoes.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400">
                              Nenhum cliente encontrado.
                            </div>
                          ) : (
                            sugestoes.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setFormClientesRows((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { clienteId: c.id, busca: c.nome }
                                        : item
                                    )
                                  );
                                  setDropdownClienteAtivoIdx(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-[#010E38] dark:text-slate-200"
                              >
                                {c.nome}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {formClientesRows.length > 1 && !(clienteFixo && idx === 0) && (
                      <button
                        type="button"
                        onClick={() =>
                          setFormClientesRows((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600"
                        title="Remover cliente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                setFormClientesRows((prev) => [
                  ...prev,
                  { clienteId: "", busca: "" },
                ])
              }
              className="mt-1.5 text-[11px] font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Adicionar cliente
            </button>
          </div>

          {/* Assunto* */}
          <div>
            <label className={labelCls}>
              Assunto<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formAssunto}
              onChange={(e) => setFormAssunto(e.target.value)}
              placeholder="Digite um título para o seu atendimento"
              className={inputCls}
            />
          </div>

          {/* Etiqueta */}
          <div>
            <label className={labelCls}>Etiqueta</label>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {formEtiquetas.map((et) => (
                <span
                  key={et}
                  style={{ backgroundColor: obterCorEtiqueta(et) }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase text-white"
                >
                  {et}
                  <button
                    type="button"
                    onClick={() =>
                      setFormEtiquetas((prev) => prev.filter((x) => x !== et))
                    }
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title="Selecionar etiqueta"
                    className="p-1 rounded hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-[#010E38] dark:text-[#EBB52C]"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2">
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {catalogoEtiquetas.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">
                        Nenhuma etiqueta criada.
                      </p>
                    ) : (
                      catalogoEtiquetas.map((et) => {
                        const marcada = formEtiquetas.includes(et.nome);
                        return (
                          <button
                            key={et.id}
                            type="button"
                            onClick={() =>
                              setFormEtiquetas((prev) =>
                                marcada
                                  ? prev.filter((x) => x !== et.nome)
                                  : [...prev, et.nome]
                              )
                            }
                            className="w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-[#F1F4F9]"
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span
                                className="h-2.5 w-2.5 rounded-xs shrink-0"
                                style={{ backgroundColor: et.cor }}
                              />
                              <span className="truncate">{et.nome}</span>
                            </span>
                            {marcada && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="border-t mt-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalGerenciarTags(true)}
                      className="w-full text-center text-[11px] font-extrabold uppercase text-[#010E38] dark:text-[#EBB52C] hover:underline"
                    >
                      GERENCIAR ETIQUETAS
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Processo, caso ou atendimento */}
          <div>
            <label className={labelCls}>Processo, caso ou atendimento</label>
            <div className="relative">
              <input
                type="text"
                value={buscaVinculo}
                onFocus={() => setDropdownVinculoAberto(true)}
                onBlur={() =>
                  setTimeout(() => setDropdownVinculoAberto(false), 180)
                }
                onChange={(e) => {
                  setBuscaVinculo(e.target.value);
                  setFormProcessoId("__nenhum");
                  setFormAtendimentoVinculadoId("__nenhum");
                  setDropdownVinculoAberto(true);
                }}
                placeholder="Encontre processo, caso ou atendimento"
                className={cn(inputCls, "pr-9")}
              />
              <Search className="h-4 w-4 text-[#010E38]/60 dark:text-[#EBB52C] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />

              {dropdownVinculoAberto && (
                <div className="absolute z-30 left-0 right-0 top-[calc(100%+2px)] rounded border border-[#010E38]/20 dark:border-white/15 bg-white dark:bg-[#010E38] shadow-md max-h-52 overflow-y-auto">
                  {opcoesVinculoFiltradas().length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">
                      Nenhum processo, caso ou atendimento encontrado.
                    </div>
                  ) : (
                    opcoesVinculoFiltradas().map((item) => (
                      <button
                        key={`${item.tipo}-${item.id}`}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setBuscaVinculo(item.label);
                          if (item.tipo === "processo") {
                            setFormProcessoId(item.id);
                            setFormAtendimentoVinculadoId("__nenhum");
                          } else {
                            setFormAtendimentoVinculadoId(item.id);
                            setFormProcessoId("__nenhum");
                          }
                          setDropdownVinculoAberto(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#F1F4F9] dark:hover:bg-white/10 text-[#010E38] dark:text-slate-200"
                      >
                        {item.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 1º Registro do atendimento* */}
          <div>
            <label className={labelCls}>
              1º Registro do atendimento<span className="text-red-500">*</span>
            </label>
            <textarea
              value={formTexto}
              onChange={(e) => setFormTexto(e.target.value)}
              placeholder="Insira as anotações referentes ao atendimento"
              rows={7}
              className="w-full rounded border border-[#010E38]/20 dark:border-white/15 bg-white dark:bg-[#010E38] p-3 text-xs text-[#010E38] dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-[#010E38] focus:ring-1 focus:ring-[#EBB52C] resize-y"
            />
          </div>

          {/* Rodapé Cancelar / SALVAR */}
          <div className="flex items-center justify-end gap-5 pt-2">
            <button
              type="button"
              onClick={() => setModalFormOpen(false)}
              className="text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Cancelar
            </button>
            <Button
              type="button"
              disabled={salvandoForm}
              onClick={handleSalvarAtendimento}
              className="h-9 px-6 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs"
            >
              {salvandoForm ? "SALVANDO..." : "SALVAR"}
            </Button>
          </div>
        </div>

        {/* Modal Gerenciar Etiquetas */}
        <Dialog open={modalGerenciarTags} onOpenChange={setModalGerenciarTags}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Gerenciar etiquetas
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">
                  Nova etiqueta
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={novaTagNome}
                    onChange={(e) => setNovaTagNome(e.target.value)}
                    placeholder="Nome da etiqueta (ex.: INSS, Urgente)"
                    className="h-9 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!novaTagNome.trim()) return;
                      adicionarEtiqueta(novaTagNome.trim(), novaTagCor);
                      setNovaTagNome("");
                    }}
                    className="h-9 bg-[#010E38] text-[#EBB52C] text-xs font-bold"
                  >
                    Criar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CORES_ETIQUETAS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovaTagCor(cor)}
                      className={cn(
                        "h-5 w-5 rounded-full border-2 transition-transform",
                        novaTagCor === cor
                          ? "border-[#010E38] scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>

              <div className="border-t pt-3 space-y-1.5 max-h-56 overflow-y-auto">
                {catalogoEtiquetas.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nenhuma etiqueta cadastrada.
                  </p>
                ) : (
                  catalogoEtiquetas.map((et) => (
                    <div
                      key={et.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 dark:bg-white/5 text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-xs"
                          style={{ backgroundColor: et.cor }}
                        />
                        <span className="font-semibold">{et.nome}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removerEtiqueta(et.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // =========================================================================
  // MODO FICHA DO CLIENTE SEM NENHUM ATENDIMENTO AINDA (Empty State Ilustrado Jus+)
  // =========================================================================
  if (clienteFixo && !loading && atendimentos.length === 0 && !mostrarQuestionarioCliente) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
            Atendimentos
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMostrarQuestionarioCliente(true)}
            className="text-xs font-bold text-[#010E38] dark:text-[#EBB52C]"
          >
            Abrir Questionário Inicial (Jus+)
          </Button>
        </div>

        <div className="py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
          <div className="mb-5">
            <svg
              width="220"
              height="140"
              viewBox="0 0 220 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="110" cy="40" r="24" fill="#F1F4F9" />
              <rect
                x="98"
                y="28"
                width="20"
                height="12"
                rx="2"
                fill="#EBB52C"
              />
              <rect
                x="106"
                y="42"
                width="16"
                height="10"
                rx="2"
                fill="#010E38"
              />
              <path d="M52 76H76V116H52L46 82L52 76Z" fill="#010E38" />
              <path d="M144 76H168L174 82L168 116H144V76Z" fill="#010E38" />
              <circle cx="68" cy="64" r="9" fill="#EBB52C" />
              <path
                d="M58 58C58 52 74 52 76 62C76 68 74 74 74 74H58V58Z"
                fill="#010E38"
              />
              <path
                d="M56 80C56 75 78 75 82 84L94 94L88 99L74 92V114H56V80Z"
                fill="#F1F4F9"
                stroke="#CBD5E1"
              />
              <circle cx="150" cy="62" r="9" fill="#78350F" />
              <path
                d="M138 80C138 75 162 75 162 84V114H138V80Z"
                fill="#EBB52C"
              />
              <path d="M114 96H136L140 112H118L114 96Z" fill="#010E38" />
              <rect
                x="54"
                y="112"
                width="112"
                height="8"
                rx="2"
                fill="#CBD5E1"
              />
            </svg>
          </div>

          <h3 className="text-sm font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
            Agilize e organize seus atendimentos
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            Registre conversas com seus clientes, adicione documentos e crie
            atividades de forma descomplicada.
          </p>

          <Button
            type="button"
            onClick={abrirModalNovoAtendimento}
            className="mt-5 h-9 px-6 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs"
          >
            ADICIONAR ATENDIMENTO
          </Button>

          <button
            type="button"
            onClick={() => setMostrarQuestionarioCliente(true)}
            className="mt-4 text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline"
          >
            Abrir Questionário Inicial por Nicho
          </button>
        </div>
      </div>
    );
  }

  if (clienteFixo && mostrarQuestionarioCliente) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
            Questionário Inicial — {clienteFixo.nome}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMostrarQuestionarioCliente(false)}
            className="h-8 text-xs font-bold border-[#010E38]/20 text-[#010E38] dark:text-[#F1F4F9]"
          >
            Voltar para lista de Atendimentos
          </Button>
        </div>
        <ClienteAnotacoes cliente={clienteFixo} />
      </div>
    );
  }

  // =========================================================================
  // LISTAGEM PRINCIPAL DE ATENDIMENTOS (LAYOUT ASTREA COM IDENTIDADE JUS+)
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* Cabeçalho: "Atendimentos" à esquerda | "Voltar" + botão "ADICIONAR" à direita */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
          Atendimentos
        </h1>

        <div className="flex items-center gap-3">
          {clienteFixo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMostrarQuestionarioCliente(true)}
              className="h-9 text-xs font-bold border-[#010E38]/20 text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9]"
            >
              Questionário Inicial (Jus+)
            </Button>
          )}
          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              className="text-xs font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Voltar
            </button>
          )}
          <Button
            type="button"
            onClick={abrirModalNovoAtendimento}
            className="h-9 px-5 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs"
          >
            ADICIONAR
          </Button>
        </div>
      </div>

      {/* Barra de Filtro Unificada: [▾] | Digite um assunto ou cliente 🔍 | [🏷️] | [EM ANDAMENTO] + [🖨️] */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center border border-[#010E38]/20 dark:border-white/15 rounded-xs bg-white dark:bg-[#010E38] h-9 overflow-hidden shadow-2xs">
          {/* Dropdown de Data / Ordem à esquerda [▾] */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Filtrar por data de criação ou ordem"
                className="h-full px-2.5 bg-[#F1F4F9] dark:bg-white/5 border-r border-[#010E38]/15 dark:border-white/10 text-[#010E38] dark:text-[#EBB52C]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem
                onClick={() => setOrdenacaoRecente(true)}
                className={cn(
                  "text-xs cursor-pointer",
                  ordenacaoRecente && "font-bold"
                )}
              >
                Mais recentes primeiro
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setOrdenacaoRecente(false)}
                className={cn(
                  "text-xs cursor-pointer",
                  !ordenacaoRecente && "font-bold"
                )}
              >
                Mais antigos primeiro
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setFiltroPeriodo("todos")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroPeriodo === "todos" && "font-bold"
                )}
              >
                Qualquer data
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFiltroPeriodo("hoje")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroPeriodo === "hoje" && "font-bold"
                )}
              >
                Criados hoje
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFiltroPeriodo("7d")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroPeriodo === "7d" && "font-bold"
                )}
              >
                Últimos 7 dias
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFiltroPeriodo("30d")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroPeriodo === "30d" && "font-bold"
                )}
              >
                Últimos 30 dias
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Input "Digite um assunto ou cliente" */}
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite um assunto ou cliente"
            className="flex-1 h-full px-3 text-xs text-[#010E38] dark:text-[#F1F4F9] bg-transparent outline-hidden placeholder:text-slate-400"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="px-1.5 text-slate-400 hover:text-[#010E38]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="px-2.5 text-[#010E38]/70 dark:text-[#EBB52C] border-r border-[#010E38]/15 dark:border-white/10 h-full flex items-center">
            <Search className="h-3.5 w-3.5" />
          </div>

          {/* Filtro por Etiquetas [🏷️] */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Filtrar por etiqueta"
                className={cn(
                  "h-full px-2.5 bg-[#F1F4F9] dark:bg-white/5 border-r border-[#010E38]/15 dark:border-white/10 flex items-center gap-1 text-[#010E38] dark:text-[#EBB52C]",
                  etiquetasFiltro.length > 0 && "bg-[#010E38] text-[#EBB52C] font-extrabold"
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                {etiquetasFiltro.length > 0 && (
                  <span className="text-[10px] font-data">{etiquetasFiltro.length}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 p-2.5">
              <Input
                value={buscaTag}
                onChange={(e) => setBuscaTag(e.target.value)}
                placeholder="Filtrar etiquetas..."
                className="h-7 text-xs mb-2"
              />
              <div className="max-h-44 overflow-y-auto space-y-1">
                {tagsCatalogoFiltradas.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3">
                    Nenhuma etiqueta criada.
                  </p>
                ) : (
                  tagsCatalogoFiltradas.map((et) => {
                    const sel = etiquetasFiltro.includes(et.nome);
                    return (
                      <button
                        key={et.id}
                        type="button"
                        onClick={() =>
                          setEtiquetasFiltro((prev) =>
                            sel
                              ? prev.filter((x) => x !== et.nome)
                              : [...prev, et.nome]
                          )
                        }
                        className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs hover:bg-[#F1F4F9]"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: et.cor }}
                          />
                          <span className="truncate">{et.nome}</span>
                        </span>
                        {sel && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="border-t mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalGerenciarTags(true)}
                  className="w-full text-center text-[11px] font-extrabold uppercase text-[#010E38] dark:text-[#EBB52C] hover:underline"
                >
                  GERENCIAR ETIQUETAS
                </button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Seletor de Status [EM ANDAMENTO] */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-full px-3.5 bg-[#F1F4F9] dark:bg-white/10 text-[11px] font-extrabold uppercase tracking-wide text-[#010E38] dark:text-[#EBB52C] hover:bg-[#010E38] hover:text-[#EBB52C] transition-colors"
              >
                {filtroStatus === "em_andamento"
                  ? "EM ANDAMENTO"
                  : filtroStatus === "fechado"
                  ? "FECHADOS"
                  : "TODOS"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => setFiltroStatus("em_andamento")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroStatus === "em_andamento" && "font-bold"
                )}
              >
                Em andamento
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFiltroStatus("fechado")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroStatus === "fechado" && "font-bold"
                )}
              >
                Fechados
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFiltroStatus("todos")}
                className={cn(
                  "text-xs cursor-pointer",
                  filtroStatus === "todos" && "font-bold"
                )}
              >
                Todos os atendimentos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Botão de Impressão [🖨️] */}
        <button
          type="button"
          onClick={() => window.print()}
          title="Imprimir atendimentos"
          className="h-9 w-9 flex items-center justify-center rounded border border-[#010E38]/15 bg-white dark:bg-white/5 text-[#010E38] hover:bg-[#010E38] hover:text-[#EBB52C] dark:text-[#EBB52C] transition-colors"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>

      {/* Contador: "Mostrando X de Y atendimento(s)" */}
      <div className="text-xs font-medium text-[#010E38]/70 dark:text-slate-400">
        Mostrando{" "}
        <span className="font-data font-bold text-[#010E38] dark:text-[#EBB52C]">
          {Math.min(30, atendimentosFiltrados.length)}
        </span>{" "}
        de{" "}
        <span className="font-data font-bold text-[#010E38] dark:text-[#EBB52C]">
          {atendimentosFiltrados.length}
        </span>{" "}
        atendimento(s)
      </div>

      {/* Lista de Cards de Atendimento (Layout Astrea com Identidade Jus+) */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Carregando atendimentos...
        </div>
      ) : atendimentosFiltrados.length === 0 ? (
        <div className="rounded-md border border-[#010E38]/15 dark:border-white/15 bg-white dark:bg-[#010E38] py-14 text-center space-y-3">
          <p className="text-sm font-extrabold text-[#010E38] dark:text-[#F1F4F9]">
            Nenhum atendimento encontrado
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Clique em &ldquo;ADICIONAR&rdquo; no canto superior direito para
            registrar o primeiro atendimento, entrevista, senha ou conversa com
            seu cliente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {atendimentosFiltrados.map((at) => {
            const ultimoReg =
              at.registros[at.registros.length - 1] || {
                texto: "",
                autor_iniciais: "US",
                criado_em: at.updated_at || at.created_at,
              };
            const tituloFormatado = formatarTituloAtendimentoComData(
              at.assunto,
              at.created_at
            );

            return (
              <div
                key={at.id}
                onClick={() => {
                  setAtendimentoAberto(at);
                  setAbaDetalhe("registros");
                }}
                className="group rounded-md border border-[#010E38]/15 dark:border-white/15 bg-white dark:bg-[#010E38] px-5 py-4 shadow-2xs hover:border-[#010E38]/40 dark:hover:border-[#EBB52C]/50 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-start justify-between gap-4"
              >
                {/* Lado Esquerdo: Data - Assunto + Badge EM ANDAMENTO + Ícone Pessoa + Nome do Cliente */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-[13px] font-bold text-[#010E38] dark:text-[#EBB52C] group-hover:underline">
                      {tituloFormatado}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-xs text-[9.5px] font-extrabold uppercase tracking-wider",
                        at.status === "em_andamento"
                          ? "bg-[#010E38] text-[#EBB52C]"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      )}
                    >
                      {at.status === "em_andamento"
                        ? "EM ANDAMENTO"
                        : "FECHADO"}
                    </span>
                    {at.etiquetas.map((et) => (
                      <span
                        key={et}
                        style={{ backgroundColor: obterCorEtiqueta(et) }}
                        className="px-1.5 py-0.5 rounded-xs text-[9.5px] font-bold uppercase text-white"
                      >
                        {et}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#010E38]/85 dark:text-[#F1F4F9]">
                    <UserIcon className="h-3.5 w-3.5 text-[#010E38] fill-[#010E38] dark:text-[#EBB52C] dark:fill-[#EBB52C] shrink-0" />
                    <span className="truncate">{at.cliente_nome}</span>
                  </div>

                  {at.processo_titulo && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                      <Briefcase className="h-3 w-3 text-[#EBB52C]" />
                      <span className="truncate">{at.processo_titulo}</span>
                    </div>
                  )}
                </div>

                {/* Lado Direito: ÚLTIMO REGISTRO (Caixa estilo balão + Avatar Navy/Gold com Iniciais + Data/Hora em Space Mono) */}
                <div className="w-full lg:w-[460px] shrink-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] mb-1">
                    ÚLTIMO REGISTRO
                  </div>
                  <div className="flex items-start gap-3">
                    {/* Caixa de texto com pontinha estilo balão apontando para o avatar */}
                    <div className="relative flex-1 rounded-xs border border-[#010E38]/20 dark:border-white/15 bg-[#F1F4F9]/40 dark:bg-white/5 px-3 py-2.5 min-h-[54px] text-xs text-[#010E38] dark:text-slate-200 break-words">
                      <span className="line-clamp-2 whitespace-pre-wrap">
                        {ultimoReg.texto}
                      </span>
                      {/* Triângulo lateral apontando para o avatar */}
                      <span
                        aria-hidden="true"
                        className="hidden sm:block absolute top-4 -right-[6px] h-2.5 w-2.5 rotate-45 border-t border-r border-[#010E38]/20 dark:border-white/15 bg-[#F1F4F9] dark:bg-[#010E38]"
                      />
                    </div>

                    {/* Avatar Navy/Gold com iniciais + Data e Hora abaixo em Space Mono */}
                    <div className="flex flex-col items-center shrink-0 w-16">
                      <div className="h-10 w-10 rounded-full bg-[#010E38] text-[#EBB52C] border-2 border-[#EBB52C]/50 flex items-center justify-center text-xs font-extrabold shadow-2xs">
                        {ultimoReg.autor_iniciais || "US"}
                      </div>
                      <div className="mt-1 text-[10px] font-data font-bold text-[#010E38]/75 dark:text-slate-300 text-center leading-tight">
                        <div>
                          {format(
                            new Date(ultimoReg.criado_em),
                            "dd/MM/yyyy"
                          )}
                        </div>
                        <div>
                          {format(new Date(ultimoReg.criado_em), "HH:mm")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Gerenciar Etiquetas */}
      <Dialog open={modalGerenciarTags} onOpenChange={setModalGerenciarTags}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Gerenciar etiquetas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-slate-500">
                Nova etiqueta
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={novaTagNome}
                  onChange={(e) => setNovaTagNome(e.target.value)}
                  placeholder="Nome da etiqueta (ex.: INSS, Urgente)"
                  className="h-9 text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!novaTagNome.trim()) return;
                    adicionarEtiqueta(novaTagNome.trim(), novaTagCor);
                    setNovaTagNome("");
                  }}
                  className="h-9 bg-[#010E38] text-[#EBB52C] text-xs font-bold"
                >
                  Criar
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CORES_ETIQUETAS.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setNovaTagCor(cor)}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      novaTagCor === cor
                        ? "border-[#010E38] scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>

            <div className="border-t pt-3 space-y-1.5 max-h-56 overflow-y-auto">
              {catalogoEtiquetas.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">
                  Nenhuma etiqueta cadastrada.
                </p>
              ) : (
                catalogoEtiquetas.map((et) => (
                  <div
                    key={et.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 dark:bg-white/5 text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-xs"
                        style={{ backgroundColor: et.cor }}
                      />
                      <span className="font-semibold">{et.nome}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removerEtiqueta(et.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
