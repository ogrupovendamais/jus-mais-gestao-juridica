import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilePlus,
  FileX,
  MoreHorizontal,
  Download,
  FolderPlus,
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  X,
  Search,
  Link as LinkIcon,
  ExternalLink,
  ArrowLeft,
  UploadCloud,
} from "lucide-react";
import { NovaPastaDialog } from "@/components/documentos/NovaPastaDialog";
import { DeleteDocumentoDialog } from "@/components/documentos/DeleteDocumentoDialog";
import { toast } from "sonner";
import { nomeArquivoSeguro } from "@/lib/utils";
import { DocumentoViewer } from "@/components/documentos/DocumentoViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Documento = {
  id: string;
  name: string;
  clienteId: string | null;
  relatedTo: string;
  size: number | null;
  storagePath: string | null;
  googleDriveLink?: string | null;
  categoria?: string | null;
  createdAt: Date;
  isFolder: boolean;
  parentId: string | null;
};

// Ícone Oficial do Google Drive (Vetor SVG colorido)
const GoogleDriveIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#26842a"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

// Ícone Oficial do Google Docs (Vetor SVG colorido)
const GoogleDocsIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M148 0H44C33 0 24 9 24 20v152c0 11 9 20 20 20h104c11 0 20-9 20-20V44L148 0z"/>
    <path fill="#A1C2FA" d="M148 0v44h44L148 0z"/>
    <path fill="#fff" d="M52 80h88v12H52zm0 24h88v12H52zm0 24h60v12H52z"/>
  </svg>
);

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function Documentos() {
  const [searchParams] = useSearchParams();
  const [allDocumentos, setAllDocumentos] = useState<Documento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNovaPastaOpen, setIsNovaPastaOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<Documento | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  // Modos de visão: "inicio" | "novo_documento" | "novo_link" | "novo_padrao"
  const [visao, setVisao] = useState<"inicio" | "novo_documento" | "novo_link" | "novo_padrao">("inicio");

  // Estado da Tela 1: Adicionar documento (arquivo local) - Print 1
  const [arquivoUpload, setArquivoUpload] = useState<File | null>(null);
  const [docDescricao, setDocDescricao] = useState("");
  const [docProcesso, setDocProcesso] = useState("");
  const [docCliente, setDocCliente] = useState("");
  const [docResponsavel, setDocResponsavel] = useState("ALEX F");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado da Tela 2: Adicionar documento (link) - Print 2
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescricao, setLinkDescricao] = useState("");
  const [linkProcesso, setLinkProcesso] = useState("");
  const [linkCliente, setLinkCliente] = useState("");
  const [linkResponsavel, setLinkResponsavel] = useState("ALEX F");

  // Estado da Tela 3 e 4: Adicionar documento padrão - Prints 3 e 4
  const [padraoModelo, setPadraoModelo] = useState("");
  const [padraoProcesso, setPadraoProcesso] = useState("");
  const [padraoCliente, setPadraoCliente] = useState("");
  const [padraoTitulo, setPadraoTitulo] = useState("");
  const [padraoResponsavel, setPadraoResponsavel] = useState("ALEX F");

  // Modais de Integração Google adicionais
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [googleDriveNome, setGoogleDriveNome] = useState("");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [googleDriveClienteId, setGoogleDriveClienteId] = useState("");

  const [isGoogleDocsPadraoOpen, setIsGoogleDocsPadraoOpen] = useState(false);
  const [googleDocsModelo, setGoogleDocsModelo] = useState("procuracao");
  const [googleDocsClienteId, setGoogleDocsClienteId] = useState("");
  const [googleDocsTitulo, setGoogleDocsTitulo] = useState("");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<Documento | null>(null);

  const { user } = useAuth();

  // Carregar documentos e clientes do Supabase
  const fetchDocumentos = async () => {
    try {
      const [clientesRes, docsRes] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase
          .from("documentos")
          .select("*")
          .order("is_folder", { ascending: false })
          .order("nome", { ascending: true }),
      ]);

      if (clientesRes.error) console.error(clientesRes.error);
      if (docsRes.error) throw docsRes.error;

      const clientesData = (clientesRes.data || []) as { id: string; nome: string }[];
      setClientes(clientesData);

      setAllDocumentos(
        (docsRes.data || []).map((d: any) => ({
          id: d.id,
          name: d.nome,
          clienteId: d.cliente_id,
          relatedTo: clientesData.find((c) => c.id === d.cliente_id)?.nome || "-",
          size: d.tamanho,
          storagePath: d.storage_path,
          googleDriveLink: d.google_drive_link,
          categoria: d.categoria,
          createdAt: new Date(d.created_at),
          isFolder: d.is_folder || false,
          parentId: d.parent_id || null,
        }))
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar documentos");
    }
  };

  useEffect(() => {
    fetchDocumentos();
    if (user?.email) {
      const nomeFormatado = user.email.split("@")[0].toUpperCase();
      setDocResponsavel(nomeFormatado);
      setLinkResponsavel(nomeFormatado);
      setPadraoResponsavel(nomeFormatado);
    }
  }, [user]);

  useEffect(() => {
    const fId = searchParams.get("folderId");
    if (fId) {
      setCurrentFolderId(fId);
      setSearchTerm("");
    }
  }, [searchParams]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { id: string | null; name: string }[] = [];
    let current = currentFolderId;
    while (current) {
      const folder = allDocumentos.find((d) => d.id === current);
      if (folder) {
        crumbs.unshift({ id: folder.id, name: folder.name });
        current = folder.parentId;
      } else {
        break;
      }
    }
    crumbs.unshift({ id: null, name: "Início" });
    return crumbs;
  }, [currentFolderId, allDocumentos]);

  const currentFolderFiles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      return allDocumentos.filter(
        (doc) =>
          (doc.name || "").toLowerCase().includes(term) ||
          (doc.relatedTo || "").toLowerCase().includes(term)
      );
    }
    return allDocumentos.filter((doc) => doc.parentId === currentFolderId);
  }, [allDocumentos, currentFolderId, searchTerm]);

  // Salvar Tela 1: Documento Local (Print 1)
  const handleSalvarDocumentoLocal = async () => {
    if (!arquivoUpload) {
      toast.error("Por favor, selecione um documento para carregar.");
      return;
    }
    if (!docDescricao.trim()) {
      toast.error("Informe a descrição do documento.");
      return;
    }
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }

    try {
      const path = `${user.id}/${crypto.randomUUID()}-${nomeArquivoSeguro(arquivoUpload.name)}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, arquivoUpload, { upsert: false });
      if (uploadError) throw uploadError;

      const clienteEncontrado = clientes.find((c) => c.nome.toLowerCase() === docCliente.trim().toLowerCase());

      const { error } = await supabase.from("documentos").insert({
        nome: arquivoUpload.name,
        storage_path: path,
        tamanho: arquivoUpload.size,
        user_id: user.id,
        cliente_id: clienteEncontrado?.id || null,
        parent_id: currentFolderId,
        is_folder: false,
        categoria: docDescricao.trim(),
      } as any);

      if (error) throw error;
      toast.success("Documento carregado com sucesso!");

      setArquivoUpload(null);
      setDocDescricao("");
      setDocProcesso("");
      setDocCliente("");
      setVisao("inicio");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao fazer upload do documento.");
    }
  };

  // Salvar Tela 2: Link (Print 2)
  const handleSalvarLink = async () => {
    if (!linkUrl.trim()) {
      toast.error("Por favor, digite o link.");
      return;
    }
    if (!linkDescricao.trim()) {
      toast.error("Informe a descrição do link.");
      return;
    }
    if (!user?.id) return;

    try {
      const clienteEncontrado = clientes.find((c) => c.nome.toLowerCase() === linkCliente.trim().toLowerCase());
      const nomeFinal = linkDescricao.trim() || "Link Externo";

      const { error } = await supabase.from("documentos").insert({
        nome: nomeFinal,
        google_drive_link: linkUrl.trim(),
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: clienteEncontrado?.id || null,
        parent_id: currentFolderId,
        is_folder: false,
        categoria: "Link",
      } as any);

      if (error) throw error;
      toast.success("Link adicionado com sucesso!");

      setLinkUrl("");
      setLinkDescricao("");
      setLinkProcesso("");
      setLinkCliente("");
      setVisao("inicio");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar link.");
    }
  };

  // Continuar Tela 3 e 4: Documento Padrão (Prints 3 e 4)
  const handleContinuarPadrao = async () => {
    if (!padraoModelo || padraoModelo === "Selecione um modelo") {
      toast.error("Selecione um modelo de documento padrão.");
      return;
    }
    if (!padraoCliente.trim()) {
      toast.error("Por favor, informe o cliente.");
      return;
    }
    if (!padraoTitulo.trim()) {
      toast.error("Por favor, informe o título do documento.");
      return;
    }
    if (!user?.id) return;

    try {
      const clienteEncontrado = clientes.find((c) => c.nome.toLowerCase() === padraoCliente.trim().toLowerCase());

      const { error } = await supabase.from("documentos").insert({
        nome: padraoTitulo.trim(),
        categoria: padraoModelo,
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: clienteEncontrado?.id || null,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);

      if (error) throw error;
      toast.success(`Documento "${padraoTitulo}" gerado a partir do modelo ${padraoModelo}!`);

      setPadraoModelo("");
      setPadraoProcesso("");
      setPadraoCliente("");
      setPadraoTitulo("");
      setVisao("inicio");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar documento padrão.");
    }
  };

  // Salvar Arquivo do Google Drive (Modal rápido)
  const handleSalvarGoogleDrive = async () => {
    if (!googleDriveNome.trim()) {
      toast.error("Informe o nome do documento.");
      return;
    }
    if (!googleDriveUrl.trim()) {
      toast.error("Informe o link do Google Drive.");
      return;
    }
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("documentos").insert({
        nome: googleDriveNome.trim(),
        google_drive_link: googleDriveUrl.trim(),
        categoria: "Google Drive",
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: googleDriveClienteId || null,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);
      if (error) throw error;
      toast.success("Arquivo do Google Drive vinculado com sucesso!");
      setGoogleDriveNome("");
      setGoogleDriveUrl("");
      setGoogleDriveClienteId("");
      setIsGoogleDriveModalOpen(false);
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao vincular arquivo do Google Drive.");
    }
  };

  // Criar Documento Padrão do Google (Docs)
  const handleCriarGoogleDocsPadrao = async () => {
    const clienteSelecionado = clientes.find((c) => c.id === googleDocsClienteId);
    const tituloFinal = googleDocsTitulo.trim() || `Minuta - ${googleDocsModelo.toUpperCase()} - ${clienteSelecionado?.nome || "Geral"}`;

    if (!user?.id) return;

    try {
      const googleDocsNewLink = "https://docs.google.com/document/create";

      const { error } = await supabase.from("documentos").insert({
        nome: tituloFinal,
        google_drive_link: googleDocsNewLink,
        categoria: "Google Docs Padrão",
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: googleDocsClienteId || null,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);
      if (error) throw error;

      toast.success("Documento Google Docs criado! Abrindo em nova aba...");
      window.open(googleDocsNewLink, "_blank");

      setGoogleDocsTitulo("");
      setGoogleDocsClienteId("");
      setIsGoogleDocsPadraoOpen(false);
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar documento do Google.");
    }
  };

  const handleNovaPasta = async (data: { nome: string }) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from("documentos").insert({
        nome: data.nome,
        user_id: user.id,
        parent_id: currentFolderId,
        is_folder: true,
        storage_path: `folder-${crypto.randomUUID()}`,
      } as any);
      if (error) throw error;
      toast.success("Pasta criada com sucesso!");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar pasta");
    }
  };

  const confirmDelete = async () => {
    if (!documentoToDelete) {
      setIsDeleteDialogOpen(false);
      return;
    }
    try {
      if (!documentoToDelete.isFolder && documentoToDelete.storagePath) {
        await supabase.storage.from("documentos").remove([documentoToDelete.storagePath]);
      }
      const { error } = await supabase.from("documentos").delete().eq("id", documentoToDelete.id);
      if (error) throw error;
      toast.success(documentoToDelete.isFolder ? "Pasta excluída!" : "Documento excluído!");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir");
    } finally {
      setIsDeleteDialogOpen(false);
      setDocumentoToDelete(null);
    }
  };

  const abrir = (doc: Documento) => {
    if (doc.isFolder) {
      setSearchTerm("");
      setCurrentFolderId(doc.id);
    } else {
      setVisualizando(doc);
    }
  };

  const handleDownload = async (doc: Documento) => {
    if (doc.isFolder) return;
    if (doc.googleDriveLink) {
      window.open(doc.googleDriveLink, "_blank");
      return;
    }
    if (!doc.storagePath) {
      toast.error("Documento não encontrado");
      return;
    }
    try {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.storagePath, 60);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao baixar documento");
    }
  };

  // Botão Dropdown Centralizado com Identidade Oficial JUS+ (#010E38 & #EBB52C)
  const BotaoAdicionarDocumentoDropdown = ({ className = "" }: { className?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${className}`}
        >
          <span>ADICIONAR DOCUMENTO</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#EBB52C] shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white border border-slate-200 shadow-2xl rounded-xl p-1.5 text-[#010E38] z-50">
        <DropdownMenuItem
          onClick={() => setVisao("novo_documento")}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5 text-[#010E38]"
        >
          <FileText className="w-4 h-4 text-[#010E38]" />
          <span>Documento</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setVisao("novo_link")}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5 text-[#010E38]"
        >
          <LinkIcon className="w-4 h-4 text-[#010E38]" />
          <span>Link</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setVisao("novo_padrao")}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5 text-[#010E38]"
        >
          <FilePlus className="w-4 h-4 text-[#010E38]" />
          <span>Documento padrão</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          INTEGRAÇÕES COM O GOOGLE
        </div>

        <DropdownMenuItem
          onClick={() => setIsGoogleDriveModalOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5 text-[#010E38]"
        >
          <GoogleDriveIcon />
          <span>Arquivo do Google Drive</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setIsGoogleDocsPadraoOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5 text-[#010E38]"
        >
          <GoogleDocsIcon />
          <span>Documento padrão do Google</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-5 overflow-x-hidden">
      {/* ============================================================
          TELA 1: ADICIONAR DOCUMENTO (ARQUIVO LOCAL) - PRINT 1
          ============================================================ */}
      {visao === "novo_documento" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 max-w-4xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setVisao("inicio")}
              className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
              Adicionar documento
            </h2>
          </div>

          <div className="space-y-5">
            {/* Documentos* (Área Tracejada Responsiva) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Documentos<span className="text-red-500">*</span>
              </Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArquivoUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-[#010E38] rounded-xl py-6 sm:py-8 px-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50/40 hover:bg-[#010E38]/[0.02] text-center"
              >
                {arquivoUpload ? (
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm text-[#010E38] font-bold">
                    <FileText className="w-5 h-5 text-[#010E38] shrink-0" />
                    <span className="break-all">{arquivoUpload.name}</span>
                    <span className="text-xs font-normal text-slate-500">
                      ({formatBytes(arquivoUpload.size)})
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <UploadCloud className="w-6 h-6 text-[#010E38]/70 sm:hidden" />
                    <span className="text-xs sm:text-sm font-bold text-[#010E38]">
                      Carregar documento
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Descrição* com contador de 499 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#010E38]">
                Descrição<span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Digite uma descrição"
                rows={4}
                maxLength={500}
                value={docDescricao}
                onChange={(e) => setDocDescricao(e.target.value)}
                className="text-sm bg-white border-slate-200 focus:border-[#010E38] resize-none"
              />
              <p className="text-[11px] text-slate-400 font-mono">
                {500 - docDescricao.length}
              </p>
            </div>

            {/* Linha 2 Colunas: Processo, caso ou atendimento | Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Processo, caso ou atendimento
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Encontre processo, caso ou atendimento"
                    value={docProcesso}
                    onChange={(e) => setDocProcesso(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Cliente
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Digite o nome do cliente"
                    value={docCliente}
                    onChange={(e) => setDocCliente(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Responsável* */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Responsável<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={docResponsavel}
                  onChange={(e) => setDocResponsavel(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Rodapé Responsivo: Cancelar | SALVAR */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVisao("inicio")}
                className="w-full sm:w-auto text-xs font-bold uppercase text-slate-600 hover:text-[#010E38] py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarDocumentoLocal}
                className="w-full sm:w-auto bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-7 py-2.5 rounded-lg shadow-sm transition-all text-center"
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TELA 2: ADICIONAR DOCUMENTO (LINK) - PRINT 2
          ============================================================ */}
      {visao === "novo_link" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 max-w-4xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setVisao("inicio")}
              className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
              Adicionar documento
            </h2>
          </div>

          <div className="space-y-5">
            {/* Link* */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Link<span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Digite um link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-10 text-sm bg-white border-slate-200 focus:border-[#010E38]"
              />
            </div>

            {/* Descrição* com contador de 499 */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#010E38]">
                Descrição<span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Digite uma descrição"
                rows={4}
                maxLength={500}
                value={linkDescricao}
                onChange={(e) => setLinkDescricao(e.target.value)}
                className="text-sm bg-white border-slate-200 focus:border-[#010E38] resize-none"
              />
              <p className="text-[11px] text-slate-400 font-mono">
                {500 - linkDescricao.length}
              </p>
            </div>

            {/* Linha 2 Colunas: Processo, caso ou atendimento | Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Processo, caso ou atendimento
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Encontre processo, caso ou atendimento"
                    value={linkProcesso}
                    onChange={(e) => setLinkProcesso(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Cliente
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Digite o nome do cliente"
                    value={linkCliente}
                    onChange={(e) => setLinkCliente(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Responsável* */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Responsável<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={linkResponsavel}
                  onChange={(e) => setLinkResponsavel(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Rodapé Responsivo: Cancelar | SALVAR */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVisao("inicio")}
                className="w-full sm:w-auto text-xs font-bold uppercase text-slate-600 hover:text-[#010E38] py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarLink}
                className="w-full sm:w-auto bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-7 py-2.5 rounded-lg shadow-sm transition-all text-center"
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TELA 3 E 4: ADICIONAR DOCUMENTO PADRÃO - PRINTS 3 E 4
          ============================================================ */}
      {visao === "novo_padrao" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 max-w-4xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <button
              type="button"
              onClick={() => setVisao("inicio")}
              className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
              Adicionar documento padrão
            </h2>
          </div>

          <div className="space-y-5">
            {/* Documento* (Select com modelos) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Documento<span className="text-red-500">*</span>
              </Label>
              <Select value={padraoModelo} onValueChange={setPadraoModelo}>
                <SelectTrigger className="h-10 text-sm bg-white border-slate-200 focus:border-[#010E38]">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="Selecione um modelo">Selecione um modelo</SelectItem>
                  <SelectItem value="Contrato de Honorários PF">Contrato de Honorários PF</SelectItem>
                  <SelectItem value="Contrato de Honorários PJ">Contrato de Honorários PJ</SelectItem>
                  <SelectItem value="Procuração PF">Procuração PF</SelectItem>
                  <SelectItem value="Procuração PJ">Procuração PJ</SelectItem>
                  <SelectItem value="Declaração de Hipossuficiência">Declaração de Hipossuficiência</SelectItem>
                  <SelectItem value="Notificação Extrajudicial">Notificação Extrajudicial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 2 Colunas: Processo, caso ou atendimento | Cliente* */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Processo, caso ou atendimento
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Encontre um processo, caso ou atendimento"
                    value={padraoProcesso}
                    onChange={(e) => setPadraoProcesso(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Cliente<span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Digite o nome do cliente"
                    value={padraoCliente}
                    onChange={(e) => setPadraoCliente(e.target.value)}
                    className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Título* */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Título<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Digite um título"
                  value={padraoTitulo}
                  onChange={(e) => setPadraoTitulo(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Responsável* */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Responsável<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={padraoResponsavel}
                  onChange={(e) => setPadraoResponsavel(e.target.value)}
                  className="h-10 text-sm bg-white border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* Rodapé Responsivo: CANCELAR | CONTINUAR */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVisao("inicio")}
                className="w-full sm:w-auto text-xs font-bold uppercase text-slate-600 hover:text-[#010E38] py-2.5 px-4 rounded-lg hover:bg-slate-100 transition-colors text-center"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleContinuarPadrao}
                className="w-full sm:w-auto bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-7 py-2.5 rounded-lg shadow-sm transition-all text-center"
              >
                CONTINUAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TELA PRINCIPAL: ONBOARDING OU TABELA/CARDS DE DOCUMENTOS
          ============================================================ */}
      {visao === "inicio" && (
        <div className="space-y-5">
          {/* Topo Responsivo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 rounded-xl border border-slate-200/80 shadow-sm">
            <div>
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest bg-[#EBB52C] text-[#010E38] px-2.5 py-0.5 rounded mb-1.5">
                GESTÃO ELETRÔNICA DE ARQUIVOS
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#010E38] tracking-tight">
                Documentos
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Central de documentos, modelos jurídicos e integração Google Drive.
              </p>
            </div>

            {allDocumentos.length > 0 && (
              <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
                <button
                  type="button"
                  onClick={() => setIsNovaPastaOpen(true)}
                  className="bg-white hover:bg-slate-50 text-[#010E38] border border-slate-300 font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-[#EBB52C] shrink-0" />
                  <span>Nova Pasta</span>
                </button>
                <BotaoAdicionarDocumentoDropdown className="w-full sm:w-auto" />
              </div>
            )}
          </div>

          {allDocumentos.length === 0 && !searchTerm.trim() ? (
            <div className="min-h-[480px] sm:min-h-[540px] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-10 sm:py-14 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              {/* Ilustração Oficial com Paleta JUS+ Navy & Gold */}
              <div className="relative mb-6 max-w-xs sm:max-w-sm w-full flex items-center justify-center">
                <svg
                  className="w-52 sm:w-64 h-36 sm:h-44 drop-shadow-sm"
                  viewBox="0 0 320 200"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="20" y="150" width="280" height="4" rx="2" fill="#CBD5E1" />
                  <rect x="235" y="105" width="45" height="45" rx="3" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
                  <rect x="242" y="117" width="31" height="4" rx="1" fill="#010E38" />
                  <rect x="242" y="132" width="31" height="4" rx="1" fill="#EBB52C" />
                  <rect x="45" y="125" width="55" height="25" rx="2" fill="#010E38" stroke="#010E38" strokeWidth="1.5" />
                  <path d="M40 150H105L100 152H45L40 150Z" fill="#475569" />
                  <rect x="52" y="130" width="41" height="15" rx="1" fill="#EBB52C" fillOpacity="0.25" />
                  <circle cx="160" cy="50" r="28" fill="#010E38" fillOpacity="0.06" />
                  <rect x="148" y="36" width="24" height="30" rx="2" fill="#010E38" />
                  <path d="M153 43H167M153 49H167M153 55H163" stroke="#EBB52C" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="188" cy="88" r="14" fill="#010E38" />
                  <circle cx="190" cy="94" r="8" fill="#D97706" />
                  <path d="M170 120C170 110 178 106 190 106C202 106 210 110 210 120V150H170V120Z" fill="#010E38" />
                  <path d="M174 125L155 136M206 125L215 138" stroke="#010E38" strokeWidth="5" strokeLinecap="round" />
                  <rect x="210" y="130" width="16" height="20" rx="1" fill="#FFFFFF" stroke="#EBB52C" strokeWidth="1.5" />
                  <line x1="213" y1="135" x2="223" y2="135" stroke="#010E38" strokeWidth="1" />
                  <line x1="213" y1="139" x2="223" y2="139" stroke="#010E38" strokeWidth="1" />
                </svg>
              </div>

              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#010E38] tracking-tight max-w-lg">
                Crie, padronize e gerencie seus documentos
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
                Carregue diferentes tipos de arquivos, crie seus próprios modelos de documentos e encontre tudo rapidamente usando os filtros de busca.
              </p>

              <div className="mt-6 flex flex-col items-center gap-3 w-full max-w-xs">
                <BotaoAdicionarDocumentoDropdown className="w-full sm:w-auto px-7 py-3 text-xs sm:text-sm" />

                <button
                  type="button"
                  onClick={() => toast.info("Você pode carregar arquivos locais, conectar pastas do Google Drive ou usar minutas automáticas.")}
                  className="text-xs text-[#010E38] hover:underline font-semibold pt-1 flex items-center gap-1"
                >
                  <span>Saiba mais sobre documentos</span>
                </button>
              </div>
            </div>
          ) : (
            <Card className="border border-slate-200/80 shadow-sm overflow-hidden rounded-xl bg-white">
              <CardHeader className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 space-y-3">
                {/* Breadcrumb Responsivo */}
                <div className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap pb-1 w-full min-w-0">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.id || 'root'} className="flex items-center text-xs font-semibold text-slate-600">
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 mx-1 shrink-0" />}
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setCurrentFolderId(crumb.id);
                        }}
                        className="hover:underline hover:text-[#010E38] flex items-center gap-1"
                      >
                        {crumb.id === null ? <Home className="h-3.5 w-3.5 text-[#010E38]" /> : null}
                        <span>{crumb.name}</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Busca Responsiva */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Pesquisar pasta ou documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 pl-9 pr-8 text-xs bg-white border-slate-200 focus:border-[#010E38]"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {/* VISÃO DESKTOP E TABLET (TABELA) */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#010E38]/[0.03] border-b border-slate-200">
                      <TableRow className="text-[11px] font-bold text-[#010E38] uppercase tracking-wider">
                        <TableHead className="py-3 px-4 text-left">NOME</TableHead>
                        <TableHead className="py-3 px-4 text-left">RELACIONADO A</TableHead>
                        <TableHead className="py-3 px-4 text-center w-36">ORIGEM / TIPO</TableHead>
                        <TableHead className="py-3 px-4 text-center w-28">TAMANHO</TableHead>
                        <TableHead className="py-3 px-4 text-center w-28">DATA</TableHead>
                        <TableHead className="py-3 px-4 text-center w-12"></TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 text-xs">
                      {currentFolderFiles.length > 0 ? (
                        currentFolderFiles.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            onClick={() => abrir(doc)}
                          >
                            <TableCell className="py-3.5 px-4 font-semibold text-[#010E38]">
                              <div className="flex items-center gap-2.5">
                                {doc.isFolder ? (
                                  <FolderIcon className="w-4 h-4 text-[#EBB52C] fill-[#EBB52C]/30 shrink-0" />
                                ) : doc.googleDriveLink ? (
                                  <GoogleDriveIcon />
                                ) : (
                                  <FileText className="w-4 h-4 text-[#010E38] shrink-0" />
                                )}
                                <span className="hover:underline truncate max-w-xs lg:max-w-md">{doc.name}</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-slate-600">
                              {doc.relatedTo}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center">
                              {doc.isFolder ? (
                                <Badge className="text-[10px] bg-[#EBB52C]/20 text-[#010E38] border border-[#EBB52C]/50 font-bold">
                                  PASTA
                                </Badge>
                              ) : doc.googleDriveLink ? (
                                <Badge variant="outline" className="text-[10px] text-[#010E38] bg-slate-50 border-slate-200 font-bold inline-flex items-center gap-1">
                                  <GoogleDriveIcon />
                                  <span>DRIVE / LINK</span>
                                </Badge>
                              ) : (
                                <Badge className="text-[10px] bg-[#010E38] text-[#EBB52C] font-bold">
                                  ARQUIVO
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                              {doc.isFolder ? "-" : formatBytes(doc.size || 0)}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                              {doc.createdAt.toLocaleDateString("pt-BR")}
                            </TableCell>

                            <TableCell className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-xl rounded-lg py-1">
                                  {!doc.isFolder && (
                                    <DropdownMenuItem
                                      onClick={() => handleDownload(doc)}
                                      className="text-xs py-2 px-3 cursor-pointer text-[#010E38] hover:bg-slate-50 flex items-center gap-2 font-medium"
                                    >
                                      {doc.googleDriveLink ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                      <span>{doc.googleDriveLink ? "Abrir Link / Drive" : "Baixar arquivo"}</span>
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator className="my-1 bg-slate-100" />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDocumentoToDelete(doc);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-xs py-2 px-3 cursor-pointer text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                                  >
                                    <FileX className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                            Nenhum documento encontrado nesta pasta.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* VISÃO MOBILE (CARDS RESPONSIVOS) */}
                <div className="md:hidden divide-y divide-slate-100">
                  {currentFolderFiles.length > 0 ? (
                    currentFolderFiles.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => abrir(doc)}
                        className="p-4 hover:bg-slate-50/80 active:bg-slate-100 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-[#010E38]/5 flex items-center justify-center shrink-0 mt-0.5">
                            {doc.isFolder ? (
                              <FolderIcon className="w-5 h-5 text-[#EBB52C] fill-[#EBB52C]/30" />
                            ) : doc.googleDriveLink ? (
                              <GoogleDriveIcon />
                            ) : (
                              <FileText className="w-5 h-5 text-[#010E38]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-bold text-[#010E38] break-words leading-snug">
                              {doc.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              Cliente: <span className="font-medium text-slate-700">{doc.relatedTo}</span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {doc.isFolder ? (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#EBB52C]/20 text-[#010E38]">
                                  PASTA
                                </span>
                              ) : doc.googleDriveLink ? (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  DRIVE / LINK
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#010E38] text-[#EBB52C]">
                                  ARQUIVO
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {doc.createdAt.toLocaleDateString("pt-BR")}
                              </span>
                              {!doc.isFolder && doc.size ? (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  · {formatBytes(doc.size)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-xl rounded-lg py-1">
                              {!doc.isFolder && (
                                <DropdownMenuItem
                                  onClick={() => handleDownload(doc)}
                                  className="text-xs py-2 px-3 cursor-pointer text-[#010E38] flex items-center gap-2 font-medium"
                                >
                                  {doc.googleDriveLink ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                  <span>{doc.googleDriveLink ? "Abrir Link / Drive" : "Baixar arquivo"}</span>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="my-1 bg-slate-100" />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDocumentoToDelete(doc);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-xs py-2 px-3 cursor-pointer text-red-600 font-medium flex items-center gap-2"
                              >
                                <FileX className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhum documento encontrado nesta pasta.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================
          MODAIS ADICIONAIS: GOOGLE DRIVE & GOOGLE DOCS
          ============================================================ */}
      <Dialog open={isGoogleDriveModalOpen} onOpenChange={setIsGoogleDriveModalOpen}>
        <DialogContent className="w-[95vw] max-w-md bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base sm:text-lg font-bold text-[#010E38] flex items-center gap-2">
              <GoogleDriveIcon />
              <span>Vincular Arquivo do Google Drive</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione links de arquivos ou pastas compartilhadas do Google Drive ao processo ou cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">Nome do arquivo no Google Drive*</Label>
              <Input
                placeholder="Ex: Petição Inicial, Laudo Pericial, Pasta de Provas"
                value={googleDriveNome}
                onChange={(e) => setGoogleDriveNome(e.target.value)}
                className="text-xs bg-white border-slate-200 focus:border-[#010E38]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">Link de Compartilhamento do Google Drive*</Label>
              <Input
                placeholder="https://drive.google.com/file/d/..."
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                className="text-xs bg-white border-slate-200 focus:border-[#010E38]"
              />
              <p className="text-[11px] text-slate-400">
                Dica: No Google Drive, clique com botão direito no arquivo &gt; <strong>Compartilhar</strong> &gt; <strong>Copiar link</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">Cliente relacionado</Label>
              <Select value={googleDriveClienteId} onValueChange={setGoogleDriveClienteId}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione um cliente (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md max-h-56">
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGoogleDriveModalOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-[#010E38] px-3 py-2 text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarGoogleDrive}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow-sm text-center"
              >
                VINCULAR DRIVE
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGoogleDocsPadraoOpen} onOpenChange={setIsGoogleDocsPadraoOpen}>
        <DialogContent className="w-[95vw] max-w-md bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base sm:text-lg font-bold text-[#010E38] flex items-center gap-2">
              <GoogleDocsIcon />
              <span>Criar Documento Padrão do Google</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gere um novo documento Google Docs a partir dos modelos padrão do escritório.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">Modelo de Minuta Jurídica</Label>
              <Select value={googleDocsModelo} onValueChange={setGoogleDocsModelo}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="procuracao">Procuração Ad Judicia</SelectItem>
                  <SelectItem value="contrato_honorarios">Contrato de Prestação de Serviços Advocatícios</SelectItem>
                  <SelectItem value="declaracao_hipossuficiencia">Declaração de Hipossuficiência (Justiça Gratuita)</SelectItem>
                  <SelectItem value="notificacao_extrajudicial">Notificação Extrajudicial</SelectItem>
                  <SelectItem value="recibo_honorarios">Recibo de Quitação de Honorários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">Cliente</Label>
              <Select value={googleDocsClienteId} onValueChange={setGoogleDocsClienteId}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md max-h-56">
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">Título personalizado (opcional)</Label>
              <Input
                placeholder="Ex: Procuração - João da Silva"
                value={googleDocsTitulo}
                onChange={(e) => setGoogleDocsTitulo(e.target.value)}
                className="text-xs bg-white border-slate-200 focus:border-[#010E38]"
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGoogleDocsPadraoOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-[#010E38] px-3 py-2 text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarGoogleDocsPadrao}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
              >
                <GoogleDocsIcon />
                <span>CRIAR NO GOOGLE DOCS</span>
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <NovaPastaDialog
        isOpen={isNovaPastaOpen}
        onClose={() => setIsNovaPastaOpen(false)}
        onSubmit={handleNovaPasta}
      />
      <DeleteDocumentoDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        documentoName={documentoToDelete?.name || ""}
        isFolder={documentoToDelete?.isFolder || false}
      />
      <DocumentoViewer
        doc={visualizando ? { nome: visualizando.name, storagePath: visualizando.storagePath, googleDriveLink: visualizando.googleDriveLink } : null}
        onClose={() => setVisualizando(null)}
      />
    </div>
  );
}
