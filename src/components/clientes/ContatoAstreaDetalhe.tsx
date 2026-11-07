/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Camera,
  ChevronDown,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder as FolderIcon,
  ListFilter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RotateCw,
  Rss,
  Scale,
  Search,
  Star,
  Tag,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { formatarDocumento, nomeUsuario } from "@/lib/nichos";
import { useEtiquetasKanban } from "@/lib/etiquetas";
import { extrairDadosAstreaDeCliente } from "@/components/clientes/ContatoAstreaForm";
import { ClienteNichos } from "@/components/clientes/ClienteNichos";
import { ClienteAnotacoes } from "@/components/clientes/ClienteAnotacoes";
import { AtendimentosView } from "@/components/atendimentos/AtendimentosView";
import { DocumentoViewer } from "@/components/documentos/DocumentoViewer";
import { useAuth } from "@/hooks/useAuth";

type DbCliente = Tables<"clientes">;

export type AbaDetalheContato =
  | "cadastro"
  | "documentos"
  | "atendimentos"
  | "processos"
  | "notificacoes";

interface NotificacaoContato {
  id: string;
  tipo: string;
  email: string;
  ultimoEnvio: string;
}

const STORAGE_NOTIFICACOES_KEY = "jusmais_contatos_notificacoes_v1";
const STORAGE_FOTOS_KEY = "jusmais_contatos_fotos_v1";

interface ContatoAstreaDetalheProps {
  cliente: DbCliente;
  etiquetas: string[];
  usuarios: any[];
  onVoltar: () => void;
  onEdit: (cliente: DbCliente) => void;
  onDelete: (clienteId: string) => void;
  onRefresh: () => void;
  onGerarProposta?: (clienteId: string) => void;
}

export function ContatoAstreaDetalhe({
  cliente,
  etiquetas,
  usuarios,
  onVoltar,
  onEdit,
  onDelete,
  onRefresh,
  onGerarProposta,
}: ContatoAstreaDetalheProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { obterCorEtiqueta } = useEtiquetasKanban();

  const [abaAtiva, setAbaAtiva] = useState<AbaDetalheContato>("cadastro");
  const meta = useMemo(() => extrairDadosAstreaDeCliente(cliente), [cliente]);
  const isPJ = meta.tipoPessoa === "pj";

  // Foto de perfil local/customizável
  const fileFotoRef = useRef<HTMLInputElement | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_FOTOS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map[cliente.id] || null;
    } catch {
      return null;
    }
  });

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFotoUrl(dataUrl);
      try {
        const raw = localStorage.getItem(STORAGE_FOTOS_KEY);
        const map = raw ? JSON.parse(raw) : {};
        map[cliente.id] = dataUrl;
        localStorage.setItem(STORAGE_FOTOS_KEY, JSON.stringify(map));
        toast.success("Foto do perfil atualizada!");
      } catch {
        // ignore quota errors
      }
    };
    reader.readAsDataURL(file);
  };

  // =========================================================================
  // ABA 2: DOCUMENTOS
  // =========================================================================
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [buscaDoc, setBuscaDoc] = useState("");
  const [docVisualizando, setDocVisualizando] = useState<any | null>(null);
  const fileUploadRef = useRef<HTMLInputElement | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const carregarDocumentos = async () => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from("documentos")
        .select("*")
        .eq("cliente_id", cliente.id)
        .order("is_folder", { ascending: false })
        .order("updated_at", { ascending: false });
      if (!error) {
        setDocumentos(data || []);
      }
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (abaAtiva === "documentos") {
      carregarDocumentos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, cliente.id]);

  const documentosFiltrados = useMemo(() => {
    const q = buscaDoc.trim().toLowerCase();
    if (!q) return documentos;
    return documentos.filter((d) =>
      (d.nome || "").toLowerCase().includes(q)
    );
  }, [documentos, buscaDoc]);

  const handleUploadDocumentoCliente = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingDoc(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const safePath = `clientes/${cliente.id}/${Date.now()}_${file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      )}`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(safePath, file);
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from("documentos").insert({
        nome: file.name,
        tipo: ext,
        tamanho: file.size,
        storage_path: safePath,
        cliente_id: cliente.id,
        user_id: user.id,
        is_folder: false,
      } as any);
      if (dbErr) throw dbErr;

      toast.success("Documento adicionado com sucesso!");
      await carregarDocumentos();
    } catch (err: any) {
      toast.error("Erro ao enviar documento", {
        description: err?.message || "Verifique as permissões de armazenamento.",
      });
    } finally {
      setUploadingDoc(false);
      if (fileUploadRef.current) fileUploadRef.current.value = "";
    }
  };

  const handleDownloadDoc = async (doc: any) => {
    if (doc.is_folder) {
      navigate(`/documentos?folderId=${doc.id}`);
      return;
    }
    if (doc.google_drive_link) {
      window.open(doc.google_drive_link, "_blank");
      return;
    }
    if (!doc.storage_path) return;
    try {
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(doc.storage_path, 60);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Erro ao baixar documento");
    }
  };

  const handleExcluirDoc = async (docId: string) => {
    const { error } = await supabase.from("documentos").delete().eq("id", docId);
    if (error) {
      toast.error("Erro ao excluir documento");
      return;
    }
    toast.success("Documento removido");
    carregarDocumentos();
  };

  // =========================================================================
  // ABA 3: ATENDIMENTOS
  // =========================================================================
  const [temAtendimentos, setTemAtendimentos] = useState(false);
  const [mostrarPainelAtendimento, setMostrarPainelAtendimento] =
    useState(false);

  const verificarAtendimentos = async () => {
    const { count } = await supabase
      .from("cliente_anotacoes" as never)
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", cliente.id);
    const possui = (count || 0) > 0;
    setTemAtendimentos(possui);
    if (possui) setMostrarPainelAtendimento(true);
  };

  useEffect(() => {
    if (abaAtiva === "atendimentos") {
      verificarAtendimentos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, cliente.id]);

  // =========================================================================
  // ABA 4: PROCESSOS
  // =========================================================================
  const [processos, setProcessos] = useState<any[]>([]);
  const [loadingProcessos, setLoadingProcessos] = useState(false);
  const [buscaProcesso, setBuscaProcesso] = useState("");
  const [filtroStatusProcesso, setFiltroStatusProcesso] = useState<
    "ativos" | "todos" | "encerrados"
  >("ativos");
  const [favoritosProcessos, setFavoritosProcessos] = useState<string[]>([]);

  const carregarProcessos = async () => {
    setLoadingProcessos(true);
    try {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .order("updated_at", { ascending: false });

      if (!error && data) {
        const nomeLimpo = (cliente.nome || "").trim().toLowerCase();
        const vinculados = data.filter(
          (p: any) =>
            p.cliente_id === cliente.id ||
            (nomeLimpo &&
              (p.cliente || "").trim().toLowerCase().includes(nomeLimpo))
        );
        setProcessos(vinculados);
      }
    } finally {
      setLoadingProcessos(false);
    }
  };

  useEffect(() => {
    if (abaAtiva === "processos") {
      carregarProcessos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abaAtiva, cliente.id]);

  const processosFiltrados = useMemo(() => {
    return processos.filter((p) => {
      const statusStr = (p.status || "").toLowerCase();
      const isEncerrado =
        statusStr.includes("arquivado") ||
        statusStr.includes("encerrado") ||
        statusStr.includes("finalizado") ||
        statusStr.includes("baixado");

      if (filtroStatusProcesso === "ativos" && isEncerrado) return false;
      if (filtroStatusProcesso === "encerrados" && !isEncerrado) return false;

      const q = buscaProcesso.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.numero || "").toLowerCase().includes(q) ||
        (p.cliente || "").toLowerCase().includes(q) ||
        (p.assunto || "").toLowerCase().includes(q) ||
        (p.vara || "").toLowerCase().includes(q) ||
        (p.comarca || "").toLowerCase().includes(q)
      );
    });
  }, [processos, buscaProcesso, filtroStatusProcesso]);

  // =========================================================================
  // ABA 5: NOTIFICAÇÕES
  // =========================================================================
  const [notificacoes, setNotificacoes] = useState<NotificacaoContato[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIFICACOES_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map[cliente.id] || [];
    } catch {
      return [];
    }
  });
  const [modalNotificacaoOpen, setModalNotificacaoOpen] = useState(false);
  const [novaNotifTipo, setNovaNotifTipo] = useState(
    "Movimentações processuais"
  );
  const [novaNotifEmail, setNovaNotifEmail] = useState(
    cliente.email || meta.emails[0]?.endereco || ""
  );

  const salvarNotificacoes = (lista: NotificacaoContato[]) => {
    setNotificacoes(lista);
    try {
      const raw = localStorage.getItem(STORAGE_NOTIFICACOES_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[cliente.id] = lista;
      localStorage.setItem(STORAGE_NOTIFICACOES_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  };

  const handleAdicionarNotificacao = () => {
    if (!novaNotifEmail.trim()) {
      toast.error("Informe um e-mail para receber a notificação.");
      return;
    }
    const nova: NotificacaoContato = {
      id: `${Date.now()}`,
      tipo: novaNotifTipo,
      email: novaNotifEmail.trim(),
      ultimoEnvio: "Ainda não enviado",
    };
    salvarNotificacoes([...notificacoes, nova]);
    setModalNotificacaoOpen(false);
    toast.success("Notificação configurada para este contato!");
  };

  const handleRemoverNotificacao = (id: string) => {
    salvarNotificacoes(notificacoes.filter((n) => n.id !== id));
  };

  // =========================================================================
  // HELPERS DE FORMATAÇÃO DA ABA CADASTRO
  // =========================================================================
  const dataCriacaoFormatada = useMemo(() => {
    if (!cliente.created_at) return "";
    try {
      return format(new Date(cliente.created_at), "dd/MM/yyyy", {
        locale: ptBR,
      });
    } catch {
      return "";
    }
  }, [cliente.created_at]);

  const dataNascimentoFormatada = useMemo(() => {
    if (cliente.data_nascimento) {
      try {
        return new Date(cliente.data_nascimento).toLocaleDateString("pt-BR", {
          timeZone: "UTC",
        });
      } catch {
        // ignore
      }
    }
    if (meta.nascDia && meta.nascMes && meta.nascAno) {
      return `${meta.nascDia}/${meta.nascMes}/${meta.nascAno}`;
    }
    return "";
  }, [cliente.data_nascimento, meta.nascDia, meta.nascMes, meta.nascAno]);

  const todasEtiquetas = useMemo(() => {
    return Array.from(new Set([...(etiquetas || []), ...(meta.etiquetas || [])]));
  }, [etiquetas, meta.etiquetas]);

  const telefonesPreenchidos = useMemo(
    () => meta.telefones.filter((t) => t.numero.trim()),
    [meta.telefones]
  );
  const emailsPreenchidos = useMemo(
    () => meta.emails.filter((e) => e.endereco.trim()),
    [meta.emails]
  );
  const sitesPreenchidos = useMemo(
    () => meta.sites.filter((s) => s.url.trim()),
    [meta.sites]
  );
  const enderecosPreenchidos = useMemo(
    () =>
      meta.enderecos.filter(
        (end) =>
          end.rua.trim() ||
          end.cep.trim() ||
          end.cidade.trim() ||
          end.bairro.trim()
      ),
    [meta.enderecos]
  );

  // Componente de Linha Padrão Astrea (Label à esquerda alinhado à direita + Valor à direita)
  const LinhaCadastro = ({
    label,
    children,
  }: {
    label: string;
    children?: React.ReactNode;
  }) => (
    <div className="flex items-start gap-8 py-1.5 min-h-[26px]">
      <div className="w-44 shrink-0 text-right text-[11px] font-normal uppercase tracking-wide text-slate-500 dark:text-slate-400 select-none pt-0.5">
        {label}
      </div>
      <div className="flex-1 text-xs text-slate-800 dark:text-slate-100 break-words">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white dark:bg-[#010E38] px-4 sm:px-8 py-5 flex flex-col justify-between">
      <div>
        {/* ================================================================= */}
        {/* TOPO DO CLIENTE (IGUAL AOS 5 PRINTS DO ASTREA)                    */}
        {/* ================================================================= */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start justify-between w-full max-w-3xl gap-4">
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F1F4F9] leading-snug">
                {cliente.nome || "(Sem nome)"}
              </h1>
              {dataCriacaoFormatada && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Criado em {dataCriacaoFormatada}
                </p>
              )}
              <div className="mt-2">
                <span className="inline-block px-2 py-0.5 rounded-xs bg-slate-200/80 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  TIPO: {(meta.perfil || "CONTATO").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Ícones Lápis (Editar) e Lixeira (Excluir) alinhados como no print */}
            <div className="flex items-center gap-2.5 pt-0.5">
              <button
                type="button"
                title="Editar contato"
                onClick={() => onEdit(cliente)}
                className="text-slate-500 hover:text-[#010E38] dark:hover:text-[#EBB52C] transition-colors p-1"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="Excluir contato"
                onClick={() => onDelete(cliente.id)}
                className="text-slate-500 hover:text-red-600 transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Link "Voltar" no canto superior direito */}
          <button
            type="button"
            onClick={onVoltar}
            className="text-xs font-medium text-slate-500 hover:text-[#010E38] dark:hover:text-[#EBB52C] transition-colors shrink-0 pt-0.5"
          >
            Voltar
          </button>
        </div>

        {/* ================================================================= */}
        {/* BARRA DE 5 ABAS: Cadastro | Documentos | Atendimentos | Processos | Notificações */}
        {/* ================================================================= */}
        <div className="border-b border-slate-200 dark:border-white/10 mb-6 flex items-center gap-6 overflow-x-auto max-w-xl">
          {(
            [
              { id: "cadastro", label: "Cadastro" },
              { id: "documentos", label: "Documentos" },
              { id: "atendimentos", label: "Atendimentos" },
              { id: "processos", label: "Processos" },
              { id: "notificacoes", label: "Notificações" },
            ] as { id: AbaDetalheContato; label: string }[]
          ).map((tab) => {
            const ativo = abaAtiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbaAtiva(tab.id)}
                className={cn(
                  "pb-2.5 text-xs whitespace-nowrap border-b-2 transition-colors",
                  ativo
                    ? "border-[#EBB52C] text-[#010E38] dark:border-[#EBB52C] dark:text-[#EBB52C] font-extrabold"
                    : "border-transparent text-slate-500 hover:text-[#010E38] dark:text-slate-400 dark:hover:text-white font-medium"
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================================================================= */}
        {/* CONTEÚDO DA ABA 1: CADASTRO (Print 1)                             */}
        {/* ================================================================= */}
        {abaAtiva === "cadastro" && (
          <div className="max-w-3xl space-y-0">
            {/* Bloco 1: FOTO DO PERFIL */}
            <div className="py-4">
              <div className="flex items-center gap-8">
                <div className="w-44 shrink-0 text-right text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  FOTO DO PERFIL
                </div>
                <div>
                  <input
                    ref={fileFotoRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFotoUpload}
                  />
                  <button
                    type="button"
                    onClick={() => fileFotoRef.current?.click()}
                    title="Clique para alterar a foto do perfil"
                    className="h-14 w-14 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200/80 flex items-center justify-center overflow-hidden border border-slate-200/70 transition-colors"
                  >
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt={cliente.nome}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-6 w-6 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Bloco 2: APELIDO / NOME FANTASIA, NASCIMENTO, ESTADO CIVIL, ETIQUETAS */}
            <div className="border-t border-slate-200 dark:border-white/10 py-4 space-y-1">
              <LinhaCadastro label={isPJ && meta.nomeFantasia ? "NOME FANTASIA" : "APELIDO"}>
                {meta.nomeFantasia || meta.apelido || cliente.nome || ""}
              </LinhaCadastro>
              {isPJ && meta.contatoPJ && (
                <LinhaCadastro label="CONTATO">{meta.contatoPJ}</LinhaCadastro>
              )}
              {isPJ && meta.cargoPJ && (
                <LinhaCadastro label="CARGO">{meta.cargoPJ}</LinhaCadastro>
              )}
              {meta.codigo && (
                <LinhaCadastro label="CÓDIGO">
                  <span className="font-data">{meta.codigo}</span>
                </LinhaCadastro>
              )}
              <LinhaCadastro label="NASCIMENTO">
                {dataNascimentoFormatada}
              </LinhaCadastro>
              <LinhaCadastro label="ESTADO CIVIL">
                {cliente.estado_civil || meta.estadoCivil || ""}
              </LinhaCadastro>
              <LinhaCadastro label="ETIQUETAS">
                {todasEtiquetas.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {todasEtiquetas.map((tag) => (
                      <span
                        key={tag}
                        style={{ backgroundColor: obterCorEtiqueta(tag) }}
                        className="inline-flex items-center px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </LinhaCadastro>
            </div>

            {/* Bloco 3: Contatos (Telefone, Email, Site, Endereço) ou linhas divisórias estilo Astrea */}
            <div className="border-t border-slate-200 dark:border-white/10 py-2.5">
              {telefonesPreenchidos.length > 0 ||
              emailsPreenchidos.length > 0 ||
              sitesPreenchidos.length > 0 ? (
                <div className="space-y-1 py-1">
                  {telefonesPreenchidos.length > 0 && (
                    <LinhaCadastro label="TELEFONE">
                      <div className="space-y-0.5 font-data">
                        {telefonesPreenchidos.map((t, i) => (
                          <div key={i}>
                            {t.numero}
                            {t.tipo && (
                              <span className="ml-1.5 text-[10px] uppercase text-slate-400 font-sans">
                                {t.tipo}
                              </span>
                            )}
                            {t.operadora && (
                              <span className="ml-1.5 text-[10px] text-slate-400 font-sans">
                                ({t.operadora})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </LinhaCadastro>
                  )}
                  {emailsPreenchidos.length > 0 && (
                    <LinhaCadastro label="EMAIL">
                      <div className="space-y-0.5">
                        {emailsPreenchidos.map((e, i) => (
                          <div key={i}>
                            {e.endereco}
                            {e.tipo && (
                              <span className="ml-1.5 text-[10px] uppercase text-slate-400">
                                {e.tipo}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </LinhaCadastro>
                  )}
                  {sitesPreenchidos.length > 0 && (
                    <LinhaCadastro label="SITE">
                      <div className="space-y-0.5">
                        {sitesPreenchidos.map((s, i) => (
                          <div key={i}>{s.url}</div>
                        ))}
                      </div>
                    </LinhaCadastro>
                  )}
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 py-2.5">
              {enderecosPreenchidos.length > 0 ? (
                <div className="space-y-1 py-1">
                  {enderecosPreenchidos.map((end, i) => (
                    <LinhaCadastro
                      key={i}
                      label={end.tipo ? `ENDEREÇO (${end.tipo})` : "ENDEREÇO"}
                    >
                      {[
                        end.rua,
                        end.numero && `nº ${end.numero}`,
                        end.complemento,
                        end.bairro,
                        end.cidade &&
                          `${end.cidade}${end.estado ? ` - ${end.estado}` : ""}`,
                        end.cep && `CEP ${end.cep}`,
                        end.pais,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </LinhaCadastro>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Bloco 4: DOCUMENTAÇÃO */}
            <div className="border-t border-slate-200 dark:border-white/10 py-4 space-y-1">
              {isPJ && (meta.cnpj || meta.inscricaoEstadual || meta.inscricaoMunicipal) && (
                <>
                  <LinhaCadastro label="CNPJ">
                    <span className="font-data">
                      {formatarDocumento(meta.cnpj || (cliente as any).cpf || "")}
                    </span>
                  </LinhaCadastro>
                  <LinhaCadastro label="INSCRIÇÃO ESTADUAL">
                    <span className="font-data">{meta.inscricaoEstadual || ""}</span>
                  </LinhaCadastro>
                  <LinhaCadastro label="INSCRIÇÃO MUNICIPAL">
                    <span className="font-data">{meta.inscricaoMunicipal || ""}</span>
                  </LinhaCadastro>
                  <LinhaCadastro label="OPTANTE SIMPLES NACIONAL">
                    {meta.optanteSimplesNacional === "sim" ? "Sim" : "Não"}
                  </LinhaCadastro>
                </>
              )}
              <LinhaCadastro label="CPF">
                <span className="font-data">
                  {!isPJ
                    ? formatarDocumento((cliente as any).cpf || meta.cpf || "")
                    : formatarDocumento(meta.cpf || "")}
                </span>
              </LinhaCadastro>
              <LinhaCadastro label="RG">
                {!isPJ ? cliente.rg || meta.rg || "" : meta.rg || ""}
              </LinhaCadastro>
              <LinhaCadastro label="CTPS">{meta.ctps || ""}</LinhaCadastro>
              <LinhaCadastro label="PIS">
                <span className="font-data">{meta.pis || ""}</span>
              </LinhaCadastro>
              <LinhaCadastro label="TÍTULO DE ELEITOR">
                {meta.tituloEleitor || ""}
              </LinhaCadastro>
              <LinhaCadastro label="CNH">
                {!isPJ
                  ? (cliente as any).cnh || meta.cnh || ""
                  : meta.cnh || ""}
              </LinhaCadastro>
              <LinhaCadastro label="PASSAPORTE">
                {meta.passaporte || ""}
              </LinhaCadastro>
              <LinhaCadastro label="CERTIDÃO RESERVISTA">
                {meta.certidaoReservista || ""}
              </LinhaCadastro>
            </div>

            {/* Bloco 5: ATIVIDADE ECONÔMICA, FILIAÇÃO, NATURALIDADE, NACIONALIDADE, COMENTÁRIOS */}
            <div className="border-t border-slate-200 dark:border-white/10 py-4 space-y-1">
              {meta.profissao && (
                <LinhaCadastro label="PROFISSÃO">{meta.profissao}</LinhaCadastro>
              )}
              {meta.empresa && (
                <LinhaCadastro label="EMPRESA">{meta.empresa}</LinhaCadastro>
              )}
              <LinhaCadastro label="ATIVIDADE ECONOMICA">
                {meta.atividadeEconomica || ""}
              </LinhaCadastro>
              <LinhaCadastro label="NOME DO PAI">
                {(cliente as any).nome_pai || meta.nomePai || ""}
              </LinhaCadastro>
              <LinhaCadastro label="NOME DA MÃE">
                {(cliente as any).nome_mae || meta.nomeMae || ""}
              </LinhaCadastro>
              <LinhaCadastro label="NATURALIDADE">
                {meta.naturalidade || ""}
              </LinhaCadastro>
              <LinhaCadastro label="NACIONALIDADE">
                {meta.nacionalidade || ""}
              </LinhaCadastro>
              <LinhaCadastro label="COMENTÁRIOS">
                <span className="whitespace-pre-wrap">
                  {meta.comentarios || ""}
                </span>
              </LinhaCadastro>
            </div>

            {/* Bloco 6: CONTA BANCÁRIA, BANCO, AGÊNCIA, CONTA, CHAVE PIX */}
            <div className="border-t border-slate-200 dark:border-white/10 py-4 space-y-1">
              <LinhaCadastro label="CONTA BANCÁRIA">
                {meta.banco || meta.agencia || meta.conta
                  ? meta.tipoConta === "poupanca"
                    ? "Conta poupança"
                    : "Conta corrente"
                  : ""}
              </LinhaCadastro>
              <LinhaCadastro label="BANCO">
                {meta.banco || cliente.instituicao_financeira || ""}
              </LinhaCadastro>
              <LinhaCadastro label="AGÊNCIA">
                <span className="font-data">{meta.agencia || ""}</span>
              </LinhaCadastro>
              <LinhaCadastro label="CONTA">
                <span className="font-data">{meta.conta || ""}</span>
              </LinhaCadastro>
              <LinhaCadastro label="CHAVE PIX">
                <span className="font-data">
                  {cliente.chave_pix || meta.pix || ""}
                </span>
              </LinhaCadastro>
            </div>

            {/* Bloco 7: CONTATO FALECIDO? */}
            <div className="border-t border-slate-200 dark:border-white/10 py-4">
              <LinhaCadastro label="CONTATO FALECIDO?">
                <input
                  type="checkbox"
                  checked={Boolean(meta.falecido)}
                  readOnly
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
              </LinhaCadastro>
            </div>

            {/* Bloco 8 (Exclusivo Jus+): Nichos Jurídicos e Responsáveis */}
            <div className="border-t border-slate-200 dark:border-white/10 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#010E38] dark:text-[#EBB52C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    Nichos Jurídicos e Responsáveis (Jus+)
                  </span>
                </div>
                {onGerarProposta && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onGerarProposta(cliente.id)}
                    className="h-7 text-[11px] font-semibold"
                  >
                    Gerar Proposta de Honorários
                  </Button>
                )}
              </div>
              <ClienteNichos
                cliente={cliente}
                usuarios={usuarios}
                onChange={onRefresh}
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ABA 2: DOCUMENTOS (Print 2)                           */}
        {/* ================================================================= */}
        {abaAtiva === "documentos" && (
          <div className="space-y-4">
            <input
              ref={fileUploadRef}
              type="file"
              className="hidden"
              onChange={handleUploadDocumentoCliente}
            />

            {/* Cabeçalho: "Documentos" à esquerda e botão "ADICIONAR DOCUMENTO ▾" à direita */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium text-slate-800 dark:text-[#F1F4F9]">
                Documentos
              </h2>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    disabled={uploadingDoc}
                    className="h-8 px-4 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-xs flex items-center gap-1.5"
                  >
                    <span>
                      {uploadingDoc ? "ENVIANDO..." : "ADICIONAR DOCUMENTO"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => fileUploadRef.current?.click()}
                    className="text-xs cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    Enviar arquivo do computador
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate("/documentos")}
                    className="text-xs cursor-pointer"
                  >
                    <FolderIcon className="h-3.5 w-3.5 mr-2" />
                    Abrir pasta no Drive do Sistema
                  </DropdownMenuItem>
                  {onGerarProposta && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onGerarProposta(cliente.id)}
                        className="text-xs cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 mr-2" />
                        Gerar Proposta de Honorários
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Barra de busca "Encontre um documento" + botão refresh */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center border border-slate-200 dark:border-white/15 rounded-xs bg-white dark:bg-[#010E38] h-9 overflow-hidden">
                <button
                  type="button"
                  className="h-full px-2.5 bg-slate-100/80 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 text-slate-500"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <input
                  type="text"
                  value={buscaDoc}
                  onChange={(e) => setBuscaDoc(e.target.value)}
                  placeholder="Encontre um documento"
                  className="flex-1 h-full px-3 text-xs bg-transparent outline-hidden placeholder:text-slate-400"
                />
                <div className="px-3 text-slate-500">
                  <Search className="h-4 w-4" />
                </div>
              </div>

              <button
                type="button"
                onClick={carregarDocumentos}
                title="Atualizar documentos"
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <RotateCw
                  className={cn("h-4 w-4", loadingDocs && "animate-spin")}
                />
              </button>
            </div>

            {/* Contador */}
            <div className="text-xs text-slate-500 pt-1">
              {documentosFiltrados.length === 0
                ? "Nenhum documento"
                : `${documentosFiltrados.length} documento(s)`}
            </div>

            {/* Cabeçalho da tabela de Documentos */}
            <div className="border-t border-b border-slate-200 dark:border-white/15 py-2 grid grid-cols-12 gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <div className="col-span-2">ORIGEM</div>
              <div className="col-span-4">DOCUMENTO/DESCRIÇÃO</div>
              <div className="col-span-3">CASO/CLIENTE</div>
              <div className="col-span-2">RESPONSÁVEL</div>
              <div className="col-span-1 text-right">ÚLTIMA EDIÇÃO ▴</div>
            </div>

            {documentosFiltrados.length === 0 ? (
              /* Empty State idêntico ao Print 2 */
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="relative mb-4">
                  <svg
                    width="120"
                    height="96"
                    viewBox="0 0 120 96"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="10"
                      y="18"
                      width="72"
                      height="52"
                      rx="4"
                      fill="#F1F5F9"
                      stroke="#CBD5E1"
                      strokeWidth="1.5"
                    />
                    <circle cx="17" cy="24" r="1.5" fill="#94A3B8" />
                    <circle cx="22" cy="24" r="1.5" fill="#94A3B8" />
                    <circle cx="27" cy="24" r="1.5" fill="#94A3B8" />
                    <rect
                      x="42"
                      y="10"
                      width="44"
                      height="56"
                      rx="3"
                      fill="#BFDBFE"
                      stroke="#60A5FA"
                      strokeWidth="1.5"
                    />
                    <line
                      x1="50"
                      y1="24"
                      x2="78"
                      y2="24"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="50"
                      y1="31"
                      x2="78"
                      y2="31"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="50"
                      y1="38"
                      x2="70"
                      y2="38"
                      stroke="#3B82F6"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="76"
                      cy="52"
                      r="16"
                      fill="#EFF6FF"
                      stroke="#2563EB"
                      strokeWidth="2.5"
                    />
                    <line
                      x1="87"
                      y1="63"
                      x2="104"
                      y2="80"
                      stroke="#475569"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M71 47L81 57M81 47L71 57"
                      stroke="#2563EB"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Nenhum documento encontrado
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Verifique os filtros selecionados.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {documentosFiltrados.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-2.5 grid grid-cols-12 gap-2 items-center text-xs hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="col-span-2 text-slate-500">
                      {doc.is_folder ? "Pasta" : "Contato"}
                    </div>
                    <div
                      className="col-span-4 font-bold text-[#010E38] dark:text-[#EBB52C] hover:underline cursor-pointer flex items-center gap-2 truncate"
                      onClick={() =>
                        doc.is_folder
                          ? navigate(`/documentos?folderId=${doc.id}`)
                          : setDocVisualizando(doc)
                      }
                    >
                      {doc.is_folder ? (
                        <FolderIcon className="h-4 w-4 text-[#EBB52C] shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-[#010E38] dark:text-[#EBB52C] shrink-0" />
                      )}
                      <span className="truncate">{doc.nome}</span>
                    </div>
                    <div className="col-span-3 truncate text-slate-700 dark:text-slate-300">
                      {cliente.nome}
                    </div>
                    <div className="col-span-2 truncate text-slate-600 dark:text-slate-400">
                      {nomeUsuario(usuarios, doc.user_id) || "Escritório"}
                    </div>
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <span className="font-data text-[11px] text-slate-500">
                        {doc.updated_at
                          ? format(new Date(doc.updated_at), "dd/MM/yyyy")
                          : "-"}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-slate-200/70 text-slate-500"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!doc.is_folder && (
                            <DropdownMenuItem
                              onClick={() => setDocVisualizando(doc)}
                              className="text-xs cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDownloadDoc(doc)}
                            className="text-xs cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 mr-2" />
                            Baixar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExcluirDoc(doc.id)}
                            className="text-xs text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <DocumentoViewer
              open={!!docVisualizando}
              onClose={() => setDocVisualizando(null)}
              documento={docVisualizando}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ABA 3: ATENDIMENTOS (Print 3 + Módulo Completo)       */}
        {/* ================================================================= */}
        {abaAtiva === "atendimentos" && (
          <AtendimentosView
            clienteFixo={{ id: cliente.id, nome: cliente.nome }}
          />
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ABA 4: PROCESSOS (Print 4)                            */}
        {/* ================================================================= */}
        {abaAtiva === "processos" && (
          <div className="space-y-4">
            {/* Cabeçalho: "Processos e casos" à esquerda e botões [🖨️] [📄] [🔄] [+] à direita */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-medium text-slate-800 dark:text-[#F1F4F9]">
                Processos e casos
              </h2>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Imprimir lista de processos"
                  className="h-8 w-8 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/processos")}
                  title="Exportar / Planilhas"
                  className="h-8 w-8 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={carregarProcessos}
                  title="Atualizar processos"
                  className="h-8 w-8 rounded border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 flex items-center justify-center text-slate-600 dark:text-slate-300"
                >
                  <RotateCw
                    className={cn(
                      "h-4 w-4",
                      loadingProcessos && "animate-spin"
                    )}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/processos")}
                  title="Adicionar processo ou caso"
                  className="h-8 w-8 rounded bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] flex items-center justify-center shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Barra de filtro: [▾] | Digite algo para pesquisar 🔍 | [🏷️] | [ATIVOS ▾] */}
            <div className="flex items-center max-w-xl border border-slate-200 dark:border-white/15 rounded-xs bg-white dark:bg-[#010E38] h-9 overflow-hidden">
              <button
                type="button"
                className="h-full px-2.5 bg-slate-100/80 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 text-slate-500"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <input
                type="text"
                value={buscaProcesso}
                onChange={(e) => setBuscaProcesso(e.target.value)}
                placeholder="Digite algo para pesquisar"
                className="flex-1 h-full px-3 text-xs bg-transparent outline-hidden placeholder:text-slate-400"
              />
              <div className="px-2.5 text-slate-500 border-r border-slate-200 dark:border-white/10 h-full flex items-center">
                <Search className="h-3.5 w-3.5" />
              </div>
              <button
                type="button"
                className="h-full px-2.5 bg-slate-100/80 dark:bg-white/5 border-r border-slate-200 dark:border-white/10 text-slate-600"
                title="Filtrar por etiqueta"
              >
                <Tag className="h-3.5 w-3.5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-full px-3 bg-slate-100/80 dark:bg-white/5 text-[11px] font-bold uppercase text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <span>
                      {filtroStatusProcesso === "ativos"
                        ? "ATIVOS"
                        : filtroStatusProcesso === "encerrados"
                        ? "ENCERRADOS"
                        : "TODOS"}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setFiltroStatusProcesso("ativos")}
                    className="text-xs cursor-pointer"
                  >
                    Ativos
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFiltroStatusProcesso("encerrados")}
                    className="text-xs cursor-pointer"
                  >
                    Encerrados / Arquivados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFiltroStatusProcesso("todos")}
                    className="text-xs cursor-pointer"
                  >
                    Todos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Contador: "1 de 1 processos e casos" */}
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
              <ListFilter className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {processosFiltrados.length} de {processos.length} processos e
                casos
              </span>
            </div>

            {/* Card/Tabela de Processos igual ao Print 4 */}
            <div className="rounded-md border border-slate-200 dark:border-white/15 bg-white dark:bg-[#010E38] overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300">
                    <th className="py-3 pl-4 pr-2 w-24">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300"
                      />
                    </th>
                    <th className="py-3 px-3">TÍTULO</th>
                    <th className="py-3 px-3">CLIENTE / PASTA</th>
                    <th className="py-3 px-3">AÇÃO / FORO</th>
                    <th className="py-3 pl-3 pr-4">ÚLT. MOV ⬆️</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-white/10 text-xs">
                  {processosFiltrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-slate-400 text-xs"
                      >
                        Nenhum processo ou caso vinculado a este contato.
                      </td>
                    </tr>
                  ) : (
                    processosFiltrados.map((proc) => {
                      const fav = favoritosProcessos.includes(proc.id);
                      const dataMov = proc.updated_at || proc.created_at;
                      return (
                        <tr
                          key={proc.id}
                          onClick={() => navigate("/processos")}
                          className="hover:bg-slate-50/80 dark:hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <td
                            className="py-3.5 pl-4 pr-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-slate-300"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFavoritosProcessos((prev) =>
                                    prev.includes(proc.id)
                                      ? prev.filter((id) => id !== proc.id)
                                      : [...prev, proc.id]
                                  )
                                }
                                className="text-slate-400 hover:text-amber-500"
                              >
                                <Star
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    fav && "fill-amber-400 text-amber-400"
                                  )}
                                />
                              </button>
                              <Rss className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-800 dark:text-[#F1F4F9]">
                              {proc.cliente || cliente.nome}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span>{proc.status || "Processo ativo"}</span>
                              {proc.numero && (
                                <>
                                  <span className="text-slate-300">|</span>
                                  <span className="font-data underline text-slate-600 dark:text-slate-300">
                                    {proc.numero}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-slate-700 dark:text-slate-200">
                            {cliente.nome}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="text-slate-800 dark:text-slate-100">
                              {proc.assunto ||
                                proc.tipo_acao ||
                                proc.nicho ||
                                "Ação Judicial"}
                            </div>
                            {(proc.vara || proc.comarca || proc.tribunal) && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {[proc.vara, proc.comarca, proc.tribunal]
                                  .filter(Boolean)
                                  .join(" - ")}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 pl-3 pr-4 font-data text-slate-700 dark:text-slate-300">
                            {dataMov
                              ? format(new Date(dataMov), "dd/MM/yyyy")
                              : "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CONTEÚDO DA ABA 5: NOTIFICAÇÕES (Print 5)                         */}
        {/* ================================================================= */}
        {abaAtiva === "notificacoes" && (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Button
                type="button"
                onClick={() => {
                  setNovaNotifEmail(
                    cliente.email || meta.emails[0]?.endereco || ""
                  );
                  setModalNotificacaoOpen(true);
                }}
                className="h-8 px-5 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-[11px] font-extrabold uppercase tracking-wider rounded-full shadow-xs"
              >
                ADICIONAR
              </Button>
            </div>

            <div className="border-t border-b border-slate-200 dark:border-white/15 py-2 grid grid-cols-12 gap-4 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <div className="col-span-4">TIPO</div>
              <div className="col-span-5">EMAIL</div>
              <div className="col-span-3 flex items-center justify-between">
                <span>ÚLTIMO ENVIO</span>
              </div>
            </div>

            {notificacoes.length > 0 && (
              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {notificacoes.map((n) => (
                  <div
                    key={n.id}
                    className="py-2.5 grid grid-cols-12 gap-4 items-center text-xs"
                  >
                    <div className="col-span-4 font-medium text-slate-800 dark:text-slate-100">
                      {n.tipo}
                    </div>
                    <div className="col-span-5 text-slate-600 dark:text-slate-300">
                      {n.email}
                    </div>
                    <div className="col-span-3 flex items-center justify-between text-slate-500">
                      <span>{n.ultimoEnvio}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverNotificacao(n.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Remover notificação"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog
              open={modalNotificacaoOpen}
              onOpenChange={setModalNotificacaoOpen}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold">
                    Adicionar notificação ao contato
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de notificação</Label>
                    <Select
                      value={novaNotifTipo}
                      onValueChange={setNovaNotifTipo}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="Movimentações processuais"
                          className="text-xs"
                        >
                          Movimentações processuais
                        </SelectItem>
                        <SelectItem
                          value="Andamentos e publicações"
                          className="text-xs"
                        >
                          Andamentos e publicações
                        </SelectItem>
                        <SelectItem
                          value="Lembrete de audiências e eventos"
                          className="text-xs"
                        >
                          Lembrete de audiências e eventos
                        </SelectItem>
                        <SelectItem
                          value="Faturas e financeiro"
                          className="text-xs"
                        >
                          Faturas e financeiro
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">E-mail do destinatário</Label>
                    <Input
                      type="email"
                      value={novaNotifEmail}
                      onChange={(e) => setNovaNotifEmail(e.target.value)}
                      placeholder="Digite o e-mail do contato"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setModalNotificacaoOpen(false)}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAdicionarNotificacao}
                    className="bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider"
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Rodapé discreto igual aos prints */}
      <div className="pt-12 pb-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        © copyright 2026 - Jus+ (Venda+ Tech) - Versão 2.02
      </div>
    </div>
  );
}
