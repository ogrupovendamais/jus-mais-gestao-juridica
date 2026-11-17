import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calendar,
  User,
  Download,
  HardDrive,
  FolderPlus,
  Folder as FolderIcon,
  File as FileIcon,
  ChevronRight,
  ChevronDown,
  Home,
  Upload,
  FileText,
  Eye,
  X,
  Search,
  Link as LinkIcon,
  ExternalLink,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { DocumentoForm } from "@/components/documentos/DocumentoForm";
import { NovaPastaDialog } from "@/components/documentos/NovaPastaDialog";
import { DeleteDocumentoDialog } from "@/components/documentos/DeleteDocumentoDialog";
import { ModelosManagerDialog } from "@/components/documentos/ModelosManagerDialog";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [allDocumentos, setAllDocumentos] = useState<Documento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isModelosOpen, setIsModelosOpen] = useState(false);
  const [isNovaPastaOpen, setIsNovaPastaOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<Documento | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  // Modais de Integração Google & Link
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkNome, setLinkNome] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkClienteId, setLinkClienteId] = useState("");

  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState(false);
  const [googleDriveNome, setGoogleDriveNome] = useState("");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [googleDriveClienteId, setGoogleDriveClienteId] = useState("");

  const [isGoogleDocsPadraoOpen, setIsGoogleDocsPadraoOpen] = useState(false);
  const [googleDocsModelo, setGoogleDocsModelo] = useState("procuracao");
  const [googleDocsClienteId, setGoogleDocsClienteId] = useState("");
  const [googleDocsTitulo, setGoogleDocsTitulo] = useState("");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const { user, role, classificacao } = useAuth();
  const canManageModelos = role === "master" || role === "desenvolvedor" || classificacao === "assistente_financeiro";

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
  }, []);

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

  const getParentPath = (doc: Documento): string => {
    if (!doc.parentId) return "Início";
    const parts: string[] = [];
    let curId: string | null = doc.parentId;
    while (curId) {
      const f = allDocumentos.find((d) => d.id === curId);
      if (f) {
        parts.unshift(f.name);
        curId = f.parentId;
      } else {
        break;
      }
    }
    return parts.join(" > ") || "Início";
  };

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

  const handleAddDocumento = async (data: { clienteId: string; file: File; categoria: string }) => {
    if (!user?.id) {
      toast.error("Usuário não autenticado");
      return;
    }
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${nomeArquivoSeguro(data.file.name)}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, data.file, { upsert: false });
      if (uploadError) throw uploadError;

      let nichoId: string | null = null;
      if (currentFolderId) {
        const { data: curFolder } = await supabase.from("documentos").select("cliente_nicho_id").eq("id", currentFolderId).maybeSingle();
        nichoId = curFolder?.cliente_nicho_id || null;
      }

      const { error } = await supabase.from("documentos").insert({
        nome: data.file.name,
        storage_path: path,
        tamanho: data.file.size,
        user_id: user.id,
        cliente_id: data.clienteId || null,
        cliente_nicho_id: nichoId,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);
      if (error) throw error;
      toast.success("Documento adicionado com sucesso!");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao fazer upload do documento");
    }
  };

  // Salvar Link Externo
  const handleSalvarLink = async () => {
    if (!linkNome.trim()) {
      toast.error("Informe o nome do documento/link.");
      return;
    }
    if (!linkUrl.trim()) {
      toast.error("Informe a URL do link.");
      return;
    }
    if (!user?.id) return;

    try {
      const { error } = await supabase.from("documentos").insert({
        nome: linkNome.trim(),
        google_drive_link: linkUrl.trim(),
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: linkClienteId || null,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);
      if (error) throw error;
      toast.success("Link adicionado com sucesso!");
      setLinkNome("");
      setLinkUrl("");
      setLinkClienteId("");
      setIsLinkModalOpen(false);
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar link.");
    }
  };

  // Salvar Arquivo do Google Drive
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

  // Criar Documento Padrão do Google
  const handleCriarGoogleDocsPadrao = async () => {
    const clienteSelecionado = clientes.find((c) => c.id === googleDocsClienteId);
    const tituloFinal = googleDocsTitulo.trim() || `Minuta - ${googleDocsModelo.toUpperCase()} - ${clienteSelecionado?.nome || "Geral"}`;

    if (!user?.id) return;

    try {
      // Cria link direto para novo documento no Google Docs
      // Google Docs suporta https://docs.new ou criação via link parametrizado
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
      let nichoId: string | null = null;
      if (currentFolderId) {
        const { data: curFolder } = await supabase.from("documentos").select("cliente_nicho_id").eq("id", currentFolderId).maybeSingle();
        nichoId = curFolder?.cliente_nicho_id || null;
      }

      const { error } = await supabase.from("documentos").insert({
        nome: data.nome,
        user_id: user.id,
        parent_id: currentFolderId,
        cliente_nicho_id: nichoId,
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

  const handleDelete = (doc: Documento) => {
    setDocumentoToDelete(doc);
    setIsDeleteDialogOpen(true);
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

  const [visualizando, setVisualizando] = useState<Documento | null>(null);

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

  // Botão Dropdown Centralizado e Reutilizável (Fiel ao Astrea)
  const BotaoAdicionarDocumentoDropdown = ({ className = "" }: { className?: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-md flex items-center justify-center gap-2 transition-all ${className}`}
        >
          <span>ADICIONAR DOCUMENTO</span>
          <ChevronDown className="w-3.5 h-3.5 text-[#EBB52C]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 bg-white border border-slate-200 shadow-2xl rounded-xl p-1.5 text-[#010E38] z-50">
        <DropdownMenuItem
          onClick={() => setIsFormOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Documento</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setIsLinkModalOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
        >
          <LinkIcon className="w-4 h-4 text-slate-500" />
          <span>Link</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setIsModelosOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
        >
          <FilePlus className="w-4 h-4 text-slate-500" />
          <span>Documento padrão</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

        {/* SEÇÃO GOOGLE (PRINT OFICIAL DO ASTREA) */}
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          INTEGRAÇÕES COM O GOOGLE
        </div>

        <DropdownMenuItem
          onClick={() => setIsGoogleDriveModalOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
        >
          <GoogleDriveIcon />
          <span>Arquivo do Google Drive</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setIsGoogleDocsPadraoOpen(true)}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-slate-50 flex items-center gap-2.5"
        >
          <GoogleDocsIcon />
          <span>Documento padrão do Google</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* ============================================================
          CABEÇALHO OFICIAL: TÍTULO DOCUMENTOS
          ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#010E38] tracking-tight">
          Documentos
        </h1>

        {/* Quando já houver itens, botão fica visível no topo direito */}
        {allDocumentos.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsNovaPastaOpen(true)}
              className="h-10 text-xs font-bold uppercase border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <FolderPlus className="w-4 h-4 mr-1.5 text-amber-500" />
              <span>Nova Pasta</span>
            </Button>
            <BotaoAdicionarDocumentoDropdown />
          </div>
        )}
      </div>

      {/* ============================================================
          ESTADO VAZIO / ONBOARDING (PRINT OFICIAL DO ASTREA)
          ============================================================ */}
      {allDocumentos.length === 0 && !searchTerm.trim() ? (
        <div className="min-h-[580px] flex flex-col items-center justify-center text-center px-4 py-12 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Ilustração Oficial Amigável */}
          <div className="relative mb-6 max-w-sm w-full flex items-center justify-center">
            <svg
              className="w-64 h-44 drop-shadow-sm"
              viewBox="0 0 320 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Mesa / Chão */}
              <rect x="20" y="150" width="280" height="4" rx="2" fill="#E2E8F0" />
              {/* Arquivo / Gaveteiro */}
              <rect x="235" y="105" width="45" height="45" rx="3" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
              <rect x="242" y="117" width="31" height="4" rx="1" fill="#94A3B8" />
              <rect x="242" y="132" width="31" height="4" rx="1" fill="#94A3B8" />
              {/* Laptop na mesa */}
              <rect x="45" y="125" width="55" height="25" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
              <path d="M40 150H105L100 152H45L40 150Z" fill="#64748B" />
              <rect x="52" y="130" width="41" height="15" rx="1" fill="#38BDF8" fillOpacity="0.3" />
              {/* Documento Flutuando com Badge azul */}
              <circle cx="160" cy="50" r="28" fill="#F0F9FF" />
              <rect x="148" y="36" width="24" height="30" rx="2" fill="#38BDF8" />
              <path d="M153 43H167M153 49H167M153 55H163" stroke="white" strokeWidth="2" strokeLinecap="round" />
              {/* Personagem estilizado Astrea */}
              <circle cx="188" cy="88" r="14" fill="#0F172A" />
              <path d="M188 84C183 84 179 88 179 93C179 98 183 100 188 100C193 100 197 97 197 93C197 88 193 84 188 84Z" fill="#1E293B" />
              <circle cx="190" cy="94" r="8" fill="#B45309" />
              <path d="M170 120C170 110 178 106 190 106C202 106 210 110 210 120V150H170V120Z" fill="#93C5FD" />
              <path d="M174 125L155 136M206 125L215 138" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />
              {/* Folha de papel segurada */}
              <rect x="210" y="130" width="16" height="20" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
              <line x1="213" y1="135" x2="223" y2="135" stroke="#94A3B8" strokeWidth="1" />
              <line x1="213" y1="139" x2="223" y2="139" stroke="#94A3B8" strokeWidth="1" />
            </svg>
          </div>

          {/* Título de Onboarding */}
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight max-w-lg">
            Crie, padronize e gerencie seus documentos
          </h2>

          {/* Subtítulo com texto exato do Astrea */}
          <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
            Carregue diferentes tipos de arquivos, crie seus próprios modelos de documentos e encontre tudo rapidamente usando os filtros de busca.
          </p>

          {/* Botão Dropdown Principal */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <BotaoAdicionarDocumentoDropdown className="px-7 py-3 text-sm" />

            <button
              type="button"
              onClick={() => toast.info("Você pode carregar arquivos locais, conectar pastas do Google Drive ou usar minutas automáticas.")}
              className="text-xs text-[#0284c7] hover:underline hover:text-[#0369a1] font-medium pt-1"
            >
              Saiba mais sobre documentos
            </button>
          </div>
        </div>
      ) : (
        /* ============================================================
            VISÃO COM ARQUIVOS / PASTAS / TABELA
            ============================================================ */
        <Card className="border border-slate-200/80 shadow-sm overflow-hidden">
          <CardHeader className="p-4 sm:p-5 bg-slate-50/50 border-b border-slate-100">
            {/* Breadcrumb de navegação */}
            <div className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap pb-1 w-full min-w-0">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id || 'root'} className="flex items-center text-xs font-semibold text-slate-600">
                  {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 mx-1" />}
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentFolderId(crumb.id);
                    }}
                    className="hover:underline hover:text-[#010E38] flex items-center gap-1"
                  >
                    {crumb.id === null ? <Home className="h-3.5 w-3.5" /> : null}
                    <span>{crumb.name}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Barra de Busca e Filtros */}
            <div className="flex items-center gap-2 pt-2">
              <div className="relative flex-1 max-w-md">
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
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead className="py-3 px-4 text-left">NOME</TableHead>
                  <TableHead className="py-3 px-4 text-left">RELACIONADO A</TableHead>
                  <TableHead className="py-3 px-4 text-center w-32">ORIGEM / TIPO</TableHead>
                  <TableHead className="py-3 px-4 text-center w-32">TAMANHO</TableHead>
                  <TableHead className="py-3 px-4 text-center w-32">DATA</TableHead>
                  <TableHead className="py-3 px-4 text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100 text-xs">
                {currentFolderFiles.length > 0 ? (
                  currentFolderFiles.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => abrir(doc)}
                    >
                      <TableCell className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {doc.isFolder ? (
                            <FolderIcon className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                          ) : doc.googleDriveLink ? (
                            <GoogleDriveIcon />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          )}
                          <span className="hover:underline">{doc.name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3 px-4 text-slate-600">
                        {doc.relatedTo}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-center">
                        {doc.isFolder ? (
                          <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-200 font-bold">PASTA</Badge>
                        ) : doc.googleDriveLink ? (
                          <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-50 border-blue-200 font-bold flex items-center gap-1 justify-center">
                            <GoogleDriveIcon />
                            <span>DRIVE</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-600 bg-slate-50 border-slate-200 font-bold">ARQUIVO</Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-center text-slate-500">
                        {doc.isFolder ? "-" : formatBytes(doc.size || 0)}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-center text-slate-500">
                        {doc.createdAt.toLocaleDateString("pt-BR")}
                      </TableCell>

                      <TableCell className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 shadow-xl rounded-lg py-1">
                            {!doc.isFolder && (
                              <DropdownMenuItem
                                onClick={() => handleDownload(doc)}
                                className="text-xs py-2 px-3 cursor-pointer text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                {doc.googleDriveLink ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                                <span>{doc.googleDriveLink ? "Abrir no Google Drive" : "Baixar arquivo"}</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                            <DropdownMenuItem
                              onClick={() => handleDelete(doc)}
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
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          MODAL 1: UPLOAD DE DOCUMENTO LOCAL
          ============================================================ */}
      <DocumentoForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddDocumento}
        clientes={clientes}
      />

      {/* ============================================================
          MODAL 2: ADICIONAR LINK EXTERNO
          ============================================================ */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              <span>Adicionar Link</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Vincule um link de arquivo externo (OneDrive, Dropbox, portal jurídico, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nome do documento*</Label>
              <Input
                placeholder="Ex: Contrato de Prestação, Certidão, etc."
                value={linkNome}
                onChange={(e) => setLinkNome(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">URL / Link completo*</Label>
              <Input
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Relacionado a (Cliente)</Label>
              <Select value={linkClienteId} onValueChange={setLinkClienteId}>
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

            <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-slate-800 px-3 py-2"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleSalvarLink}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-bold text-xs uppercase px-5 py-2 rounded shadow-sm"
              >
                SALVAR LINK
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL 3: ARQUIVO DO GOOGLE DRIVE (OFICIAL)
          ============================================================ */}
      <Dialog open={isGoogleDriveModalOpen} onOpenChange={setIsGoogleDriveModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <GoogleDriveIcon />
              <span>Vincular Arquivo do Google Drive</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Adicione links de arquivos ou pastas compartilhadas do Google Drive ao processo ou cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nome do arquivo no Google Drive*</Label>
              <Input
                placeholder="Ex: Petição Inicial, Laudo Pericial, Pasta de Provas"
                value={googleDriveNome}
                onChange={(e) => setGoogleDriveNome(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Link de Compartilhamento do Google Drive*</Label>
              <Input
                placeholder="https://drive.google.com/file/d/..."
                value={googleDriveUrl}
                onChange={(e) => setGoogleDriveUrl(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
              <p className="text-[11px] text-slate-400">
                Dica: No Google Drive, clique com botão direito no arquivo &gt; <strong>Compartilhar</strong> &gt; <strong>Copiar link</strong>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Cliente relacionado</Label>
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

            <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGoogleDriveModalOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-slate-800 px-3 py-2"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleSalvarGoogleDrive}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-bold text-xs uppercase px-5 py-2 rounded shadow-sm"
              >
                VINCULAR DRIVE
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL 4: DOCUMENTO PADRÃO DO GOOGLE (GOOGLE DOCS)
          ============================================================ */}
      <Dialog open={isGoogleDocsPadraoOpen} onOpenChange={setIsGoogleDocsPadraoOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38] flex items-center gap-2">
              <GoogleDocsIcon />
              <span>Criar Documento Padrão do Google</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gere um novo documento Google Docs a partir dos modelos padrão do escritório.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Modelo de Minuta Jurídica</Label>
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
              <Label className="text-xs font-semibold text-slate-700">Cliente</Label>
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
              <Label className="text-xs font-semibold text-slate-700">Título personalizado (opcional)</Label>
              <Input
                placeholder="Ex: Procuração - João da Silva"
                value={googleDocsTitulo}
                onChange={(e) => setGoogleDocsTitulo(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsGoogleDocsPadraoOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-slate-800 px-3 py-2"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleCriarGoogleDocsPadrao}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-bold text-xs uppercase px-5 py-2 rounded shadow-sm flex items-center gap-1.5"
              >
                <GoogleDocsIcon />
                <span>CRIAR NO GOOGLE DOCS</span>
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* OUTROS DIALOGS (PASTA, MODELOS, DELETE, VIEWER) */}
      <NovaPastaDialog
        isOpen={isNovaPastaOpen}
        onClose={() => setIsNovaPastaOpen(false)}
        onSubmit={handleNovaPasta}
      />
      <ModelosManagerDialog
        isOpen={isModelosOpen}
        onClose={() => setIsModelosOpen(false)}
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
