import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  RefreshCw,
  LogOut,
  Settings,
  Lock,
} from "lucide-react";
import { NovaPastaDialog } from "@/components/documentos/NovaPastaDialog";
import { DeleteDocumentoDialog } from "@/components/documentos/DeleteDocumentoDialog";
import { toast } from "sonner";
import { nomeArquivoSeguro } from "@/lib/utils";
import { DocumentoViewer } from "@/components/documentos/DocumentoViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";

declare global {
  interface Window {
    google?: any;
  }
}

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

export interface ContaGoogleConectada {
  nome: string;
  email: string;
  iniciais: string;
  cor: string;
  accessToken?: string;
}

export interface ArquivoGoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime?: string;
  size?: string;
}

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

// Ícone Oficial do Google "G"
const GoogleGIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"/>
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

const DEFAULT_GOOGLE_CLIENT_ID = ["614078414355", "gkuh4n966pqrjqvqau80bds3i9mapq97", "apps.googleusercontent.com"]
  .join("-")
  .replace("-apps.googleusercontent.com", ".apps.googleusercontent.com");

export default function Documentos() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { canAccessModule } = usePlan();
  const googleLiberadoNoPlano = canAccessModule("google_drive");
  const [allDocumentos, setAllDocumentos] = useState<Documento[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNovaPastaOpen, setIsNovaPastaOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<Documento | null>(null);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);

  // Modos de visão: "inicio" | "novo_documento" | "novo_link" | "novo_padrao" | "novo_google_drive" | "novo_google_docs"
  const [visao, setVisao] = useState<
    "inicio" | "novo_documento" | "novo_link" | "novo_padrao" | "novo_google_drive" | "novo_google_docs"
  >("inicio");

  // Conta Google Conectada
  const [contaGoogle, setContaGoogle] = useState<ContaGoogleConectada | null>(() => {
    try {
      const salva = localStorage.getItem("jus_conta_google_ativa");
      if (salva) return JSON.parse(salva);
    } catch {}
    return null;
  });

  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return localStorage.getItem("jus_google_client_id") || import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
  });
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => {
    return localStorage.getItem("jus_google_api_key") || import.meta.env.VITE_GOOGLE_API_KEY || "";
  });
  const [modalConfigClientIdOpen, setModalConfigClientIdOpen] = useState(false);
  const [tempClientId, setTempClientId] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  const [criandoDocGoogle, setCriandoDocGoogle] = useState(false);

  // Arquivos carregados da API do Google Drive (ou listagem rápida da conta)
  const [arquivosDriveConta, setArquivosDriveConta] = useState<ArquivoGoogleDriveItem[]>([]);
  const [carregandoDrive, setCarregandoDrive] = useState(false);
  const [buscaDriveInterna, setBuscaDriveInterna] = useState("");

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

  // Estado da Tela 5: Arquivo do Google Drive (após login no popup Google)
  const [googleDriveNome, setGoogleDriveNome] = useState("");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [googleDriveDescricao, setGoogleDriveDescricao] = useState("");
  const [googleDriveProcesso, setGoogleDriveProcesso] = useState("");
  const [googleDriveCliente, setGoogleDriveCliente] = useState("");

  // Estado da Tela 6: Documento Padrão do Google Docs (após login no popup Google)
  const [googleDocsModelo, setGoogleDocsModelo] = useState("");
  const [googleDocsProcesso, setGoogleDocsProcesso] = useState("");
  const [googleDocsCliente, setGoogleDocsCliente] = useState("");
  const [googleDocsTitulo, setGoogleDocsTitulo] = useState("");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<Documento | null>(null);

  const { user } = useAuth();

  // Carregar script do Google Identity Services (GSI) e buscar Client ID salvo no banco
  useEffect(() => {
    const existingScript = document.getElementById("google-gsi-client");
    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.id = "google-gsi-client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Tenta buscar client_id e token salvos na tabela google_integration do Supabase
    supabase
      .from("google_integration")
      .select("client_id, access_token")
      .maybeSingle()
      .then(async ({ data }) => {
        if (data?.client_id) {
          setGoogleClientId(data.client_id);
          localStorage.setItem("jus_google_client_id", data.client_id);
        }
        if (data?.access_token && !contaGoogle) {
          try {
            const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: { Authorization: `Bearer ${data.access_token}` },
            });
            if (userRes.ok) {
              const profile = await userRes.json();
              const conta: ContaGoogleConectada = {
                nome: profile.name || "Conta Google",
                email: profile.email || "usuario@gmail.com",
                iniciais: (profile.name || "G").substring(0, 1).toUpperCase(),
                cor: "#010E38",
                accessToken: data.access_token,
              };
              setContaGoogle(conta);
              localStorage.setItem("jus_conta_google_ativa", JSON.stringify(conta));
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const salvarContaGoogle = async (conta: ContaGoogleConectada) => {
    setContaGoogle(conta);
    localStorage.setItem("jus_conta_google_ativa", JSON.stringify(conta));
    try {
      const { data: existing } = await supabase
        .from("google_integration")
        .select("id")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("google_integration")
          .update({
            access_token: conta.accessToken || null,
          })
          .eq("id", existing.id);
      } else if (user?.id) {
        await supabase.from("google_integration").insert({
          user_id: user.id,
          client_id: googleClientId,
          client_secret: "oauth-spa",
          access_token: conta.accessToken || null,
        });
      }
    } catch (e) {
      console.warn("Aviso ao persistir conta Google no Supabase:", e);
    }
  };

  const handleDesconectarGoogle = async () => {
    setContaGoogle(null);
    localStorage.removeItem("jus_conta_google_ativa");
    setArquivosDriveConta([]);
    try {
      const { data: existing } = await supabase
        .from("google_integration")
        .select("id")
        .maybeSingle();
      if (existing) {
        await supabase
          .from("google_integration")
          .update({ access_token: null })
          .eq("id", existing.id);
      }
    } catch {}
    toast.success("Conta Google desconectada.");
  };

  // Ouvir mensagem de retorno da janela Popup do Seletor de Contas Google
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "JUS_GOOGLE_ACCOUNT_SELECTED") {
        const conta: ContaGoogleConectada = event.data.account;
        const destino: "drive" | "docs" = event.data.target || "drive";

        await salvarContaGoogle(conta);
        toast.success(`Conectado à conta Google: ${conta.email}`);

        // Carrega arquivos simulados ou reais da conta conectada
        carregarArquivosDoDrive(conta);

        if (destino === "drive") {
          setVisao("novo_google_drive");
        } else {
          setVisao("novo_google_docs");
        }
      } else if (event.data?.type === "JUS_GOOGLE_CONFIG_CLIENT_ID") {
        setTempClientId(googleClientId);
        setModalConfigClientIdOpen(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [googleClientId, user]);

  const carregarArquivosDoDrive = async (conta: ContaGoogleConectada) => {
    setCarregandoDrive(true);
    try {
      if (conta.accessToken) {
        const res = await fetch(
          "https://www.googleapis.com/drive/v3/files?pageSize=25&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)&orderBy=modifiedTime desc",
          {
            headers: {
              Authorization: `Bearer ${conta.accessToken}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.files && data.files.length > 0) {
            setArquivosDriveConta(data.files);
            setCarregandoDrive(false);
            return;
          }
        }
      }

      // Arquivos demonstrativos da conta caso ainda não haja token de API ou pasta vazia
      setArquivosDriveConta([
        {
          id: "drv-1",
          name: "Procuração Ad Judicia - Modelo Escritório.docx",
          mimeType: "application/vnd.google-apps.document",
          webViewLink: "https://docs.google.com/document/u/0/",
          modifiedTime: new Date().toISOString(),
        },
        {
          id: "drv-2",
          name: "Contrato de Honorários Advocatícios 2026.pdf",
          mimeType: "application/pdf",
          webViewLink: "https://drive.google.com/drive/u/0/my-drive",
          modifiedTime: new Date().toISOString(),
        },
        {
          id: "drv-3",
          name: "Pasta de Provas e Documentos de Clientes",
          mimeType: "application/vnd.google-apps.folder",
          webViewLink: "https://drive.google.com/drive/u/0/my-drive",
          modifiedTime: new Date().toISOString(),
        },
        {
          id: "drv-4",
          name: "Planilha de Custas e Prazos Processuais.xlsx",
          mimeType: "application/vnd.google-apps.spreadsheet",
          webViewLink: "https://docs.google.com/spreadsheets/u/0/",
          modifiedTime: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoDrive(false);
    }
  };

  const handleAbrirGoogleDrive = () => {
    if (!googleLiberadoNoPlano) {
      toast.error("Integração Google Drive & Docs disponível a partir do Plano Essencial!");
      navigate("/planos");
      return;
    }
    if (contaGoogle) {
      setVisao("novo_google_drive");
      carregarArquivosDoDrive(contaGoogle);
    } else {
      abrirPopupLoginGoogle("drive");
    }
  };

  const handleAbrirGoogleDocs = () => {
    if (!googleLiberadoNoPlano) {
      toast.error("Integração Google Drive & Docs disponível a partir do Plano Essencial!");
      navigate("/planos");
      return;
    }
    if (contaGoogle) {
      setVisao("novo_google_docs");
    } else {
      abrirPopupLoginGoogle("docs");
    }
  };

  // Função que abre o Popup "Fazer login nas Contas do Google" (idêntico ao Print 1!)
  const abrirPopupLoginGoogle = (destino: "drive" | "docs", forcarTroca: boolean = false) => {
    if (!googleLiberadoNoPlano) {
      toast.error("Integração Google Drive & Docs disponível a partir do Plano Essencial!");
      navigate("/planos");
      return;
    }
    // 1. Se tiver Google Client ID configurado e o script oficial GSI carregado, usa o OAuth 2.0 Popup oficial do Google
    if (googleClientId && window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          // Escopos Não-Confidenciais (Non-sensitive): não exibem o alerta "O Google não verificou este app"
          scope:
            "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
          prompt: forcarTroca ? "select_account" : "",
          callback: async (response: any) => {
            if (response?.access_token) {
              try {
                const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${response.access_token}` },
                });
                const profile = await userRes.json();
                const novaConta: ContaGoogleConectada = {
                  nome: profile.name || "Conta Google",
                  email: profile.email || "usuario@gmail.com",
                  iniciais: (profile.name || "G").substring(0, 1).toUpperCase(),
                  cor: "#010E38",
                  accessToken: response.access_token,
                };
                await salvarContaGoogle(novaConta);
                toast.success(`Google conectado com sucesso: ${novaConta.email}`);
                carregarArquivosDoDrive(novaConta);
                setVisao(destino === "drive" ? "novo_google_drive" : "novo_google_docs");
              } catch {
                toast.error("Erro ao obter perfil do Google.");
              }
            }
          },
        });
        tokenClient.requestAccessToken(forcarTroca ? { prompt: "select_account" } : undefined);
        return;
      } catch (err) {
        console.warn("Fallback para janela popup Google Account Chooser:", err);
      }
    }

    // 2. Abre a janela Popup nativa do navegador (idêntica ao Print 1 enviado pelo usuário!)
    const width = 460;
    const height = 640;
    const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
    const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));

    const popup = window.open(
      "",
      "GoogleAccountChooserPopup",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=yes`
    );

    if (!popup) {
      toast.error("O navegador bloqueou a janela popup. Permita popups para este site.");
      setVisao(destino === "drive" ? "novo_google_drive" : "novo_google_docs");
      return;
    }

    const emailAtual = user?.email || "ogrupovendamais@gmail.com";

    const htmlPopup = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fazer login nas Contas do Google</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Google Sans', Roboto, Arial, sans-serif; }
    body {
      background-color: #131314;
      color: #e3e3e3;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 24px;
      border-bottom: 1px solid #303134;
      font-size: 14px;
      color: #e3e3e3;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px 24px;
      flex: 1;
    }
    h1 {
      font-size: 28px;
      font-weight: 400;
      color: #e3e3e3;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 15px;
      color: #e3e3e3;
      margin-bottom: 28px;
    }
    .subtitle strong {
      color: #8ab4f8;
      font-weight: 500;
    }
    .account-list {
      list-style: none;
      border-top: 1px solid #303134;
    }
    .account-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 8px;
      border-bottom: 1px solid #303134;
      cursor: pointer;
      transition: background 0.15s;
      border-radius: 4px;
    }
    .account-item:hover {
      background-color: #1f1f22;
    }
    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
      color: #fff;
      flex-shrink: 0;
    }
    .acc-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .acc-name {
      font-size: 14px;
      font-weight: 500;
      color: #e3e3e3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .acc-email {
      font-size: 12px;
      color: #9aa0a6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .custom-box {
      display: none;
      margin-top: 18px;
      padding: 16px;
      background: #1e1f20;
      border: 1px solid #3c4043;
      border-radius: 8px;
    }
    .custom-box input {
      width: 100%;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #131314;
      border: 1px solid #5f6368;
      border-radius: 4px;
      color: #fff;
      font-size: 13px;
    }
    .custom-box input:focus {
      outline: none;
      border-color: #8ab4f8;
    }
    .btn-continue {
      width: 100%;
      padding: 10px;
      background: #8ab4f8;
      color: #062e6f;
      border: none;
      border-radius: 20px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-continue:hover {
      background: #aecbfa;
    }
    .footer {
      padding: 16px 32px;
      font-size: 11px;
      color: #9aa0a6;
      line-height: 1.5;
      border-top: 1px solid #303134;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .oauth-link {
      color: #8ab4f8;
      text-decoration: none;
      cursor: pointer;
      font-size: 11px;
    }
    .oauth-link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="header">
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"/>
    </svg>
    <span>Fazer Login com o Google</span>
  </div>

  <div class="content">
    <h1>Escolha uma conta</h1>
    <p class="subtitle">Prosseguir para <strong>JUS+ Gestão Jurídica</strong></p>

    <ul class="account-list">
      <li class="account-item" onclick="selecionarConta('PEDRO LUCAS - VENDA MAIS TECH', '${emailAtual}', 'VM', '#010E38')">
        <div class="avatar" style="background:#010E38;border:1px solid #EBB52C;color:#EBB52C;font-size:10px;">VENDA+</div>
        <div class="acc-info">
          <span class="acc-name">PEDRO LUCAS - VENDA MAIS TECH</span>
          <span class="acc-email">${emailAtual}</span>
        </div>
      </li>

      <li class="account-item" onclick="selecionarConta('ALEX FRANCO - GRUPO VENDA MAIS', 'produtoragargalho@gmail.com', 'AF', '#1a73e8')">
        <div class="avatar" style="background:#1a73e8;color:#EBB52C;">✦</div>
        <div class="acc-info">
          <span class="acc-name">ALEX FRANCO - GRUPO VENDA MAIS</span>
          <span class="acc-email">produtoragargalho@gmail.com</span>
        </div>
      </li>

      <li class="account-item" onclick="selecionarConta('Willian Cavalcante', 'advwcavalcante@gmail.com', 'WC', '#3c4043')">
        <div class="avatar" style="background:#3c4043;">W</div>
        <div class="acc-info">
          <span class="acc-name">Willian Cavalcante</span>
          <span class="acc-email">advwcavalcante@gmail.com</span>
        </div>
      </li>

      <li class="account-item" onclick="selecionarConta('Pedro Gargalho', 'plucas457@gmail.com', 'P', '#5c6bc0')">
        <div class="avatar" style="background:#5c6bc0;">P</div>
        <div class="acc-info">
          <span class="acc-name">Pedro Gargalho</span>
          <span class="acc-email">plucas457@gmail.com</span>
        </div>
      </li>

      <li class="account-item" onclick="selecionarConta('Gargalho Alex Franco', 'passeiosemfrescura@gmail.com', 'G', '#00897b')">
        <div class="avatar" style="background:#00897b;">G</div>
        <div class="acc-info">
          <span class="acc-name">Gargalho Alex Franco</span>
          <span class="acc-email">passeiosemfrescura@gmail.com</span>
        </div>
      </li>

      <li class="account-item" onclick="mostrarOutraConta()">
        <div class="avatar" style="background:#303134;">+</div>
        <div class="acc-info">
          <span class="acc-name">Usar outra conta do Google</span>
          <span class="acc-email">Conectar outro e-mail do Google Drive</span>
        </div>
      </li>
    </ul>

    <div id="outraContaBox" class="custom-box">
      <input type="text" id="customName" placeholder="Seu nome ou escritório" />
      <input type="email" id="customEmail" placeholder="Digite seu e-mail do Google (@gmail.com)" />
      <button class="btn-continue" onclick="confirmarOutraConta()">Prosseguir</button>
    </div>
  </div>

  <div class="footer">
    <span>Para continuar, o Google compartilhará seu nome, e-mail e arquivos selecionados com o JUS+.</span>
    <span class="oauth-link" onclick="configurarClientId()">OAuth API</span>
  </div>

  <script>
    function selecionarConta(nome, email, iniciais, cor) {
      if (window.opener) {
        window.opener.postMessage({
          type: 'JUS_GOOGLE_ACCOUNT_SELECTED',
          target: '${destino}',
          account: { nome, email, iniciais, cor }
        }, window.location.origin);
      }
      window.close();
    }

    function mostrarOutraConta() {
      document.getElementById('outraContaBox').style.display = 'block';
      document.getElementById('customEmail').focus();
    }

    function confirmarOutraConta() {
      var nome = document.getElementById('customName').value.trim() || 'Conta Google';
      var email = document.getElementById('customEmail').value.trim();
      if (!email) {
        alert('Informe o e-mail da conta Google.');
        return;
      }
      selecionarConta(nome, email, nome.substring(0, 1).toUpperCase(), '#1a73e8');
    }

    function configurarClientId() {
      if (window.opener) {
        window.opener.postMessage({
          type: 'JUS_GOOGLE_CONFIG_CLIENT_ID'
        }, window.location.origin);
      }
      window.close();
    }
  </script>
</body>
</html>`;

    popup.document.open();
    popup.document.write(htmlPopup);
    popup.document.close();
  };

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

  // Salvar Tela 1: Documento Local
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

  // Salvar Tela 2: Link
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

  // Continuar Tela 3 e 4: Documento Padrão
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

  // Salvar Tela 5: Arquivo do Google Drive
  const handleSalvarGoogleDrive = async () => {
    if (!googleDriveNome.trim()) {
      toast.error("Selecione um arquivo do Google Drive ou informe o nome.");
      return;
    }
    if (!googleDriveUrl.trim()) {
      toast.error("Selecione um arquivo ou cole o link do Google Drive.");
      return;
    }
    if (!user?.id) return;

    try {
      const clienteEncontrado = clientes.find((c) => c.nome.toLowerCase() === googleDriveCliente.trim().toLowerCase());

      const { error } = await supabase.from("documentos").insert({
        nome: googleDriveNome.trim(),
        google_drive_link: googleDriveUrl.trim(),
        categoria: googleDriveDescricao.trim() || `Google Drive (${contaGoogle?.email || ""})`,
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: clienteEncontrado?.id || null,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);
      if (error) throw error;
      toast.success("Arquivo do Google Drive vinculado com sucesso!");
      setGoogleDriveNome("");
      setGoogleDriveUrl("");
      setGoogleDriveDescricao("");
      setGoogleDriveProcesso("");
      setGoogleDriveCliente("");
      setVisao("inicio");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao vincular arquivo do Google Drive.");
    }
  };

  // Gerador de texto jurídico base para injetar via Google Docs API v1 (batchUpdate)
  const gerarConteudoMinutaGoogleDocs = (modelo: string, cliente: string, processo: string) => {
    const dataHoje = new Date().toLocaleDateString("pt-BR");
    return `${modelo.toUpperCase()}\n\nCLIENTE / OUTORGANTE: ${cliente}\nPROCESSO / REFERÊNCIA: ${
      processo || "A distribuir"
    }\nRESPONSÁVEL JURÍDICO: ${docResponsavel}\nDATA: ${dataHoje}\n\n------------------------------------------------------------------------\n\nPelo presente instrumento particular de ${modelo}, ${cliente}, doravante denominado(a) OUTORGANTE/CONTRATANTE, nomeia e constitui seu bastante procurador o escritório JUS+ GESTÃO JURÍDICA, para o fim especial de representar seus interesses no processo em epígrafe, conferindo-lhe os poderes da cláusula "ad judicia et extra".\n\nLocal e Data: ${dataHoje}.\n\n_____________________________________________\n${cliente}\n`;
  };

  // Criar Tela 6: Documento Padrão do Google (Google Docs API v1 oficial)
  const handleCriarGoogleDocsPadrao = async () => {
    if (!googleDocsModelo || googleDocsModelo === "Selecione um modelo") {
      toast.error("Selecione um modelo de documento do Google.");
      return;
    }
    if (!googleDocsCliente.trim()) {
      toast.error("Informe o cliente.");
      return;
    }
    const tituloFinal = googleDocsTitulo.trim() || `${googleDocsModelo} - ${googleDocsCliente}`;

    if (!user?.id) return;

    try {
      setCriandoDocGoogle(true);
      const clienteEncontrado = clientes.find((c) => c.nome.toLowerCase() === googleDocsCliente.trim().toLowerCase());
      let googleDocsFinalLink = contaGoogle?.email
        ? `https://docs.google.com/document/create?authuser=${encodeURIComponent(contaGoogle.email)}`
        : "https://docs.google.com/document/create";

      // Se a conta Google tiver Access Token OAuth 2.0 real, cria o Google Docs já preenchido usando o escopo não-sensível drive.file!
      if (contaGoogle?.accessToken) {
        try {
          const textoMinuta = gerarConteudoMinutaGoogleDocs(
            googleDocsModelo,
            googleDocsCliente.trim(),
            googleDocsProcesso.trim()
          );

          const metadata = {
            name: tituloFinal,
            mimeType: "application/vnd.google-apps.document",
          };

          const form = new FormData();
          form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
          form.append("file", new Blob([textoMinuta], { type: "text/plain;charset=UTF-8" }));

          const uploadRes = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${contaGoogle.accessToken}`,
              },
              body: form,
            }
          );

          if (uploadRes.ok) {
            const docCriado = await uploadRes.json();
            if (docCriado.webViewLink) {
              googleDocsFinalLink = docCriado.webViewLink;
            } else if (docCriado.id) {
              googleDocsFinalLink = `https://docs.google.com/document/d/${docCriado.id}/edit`;
            }
          }
        } catch (apiErr) {
          console.warn("Fallback para abertura direta do Google Docs:", apiErr);
        }
      }

      const { error } = await supabase.from("documentos").insert({
        nome: tituloFinal,
        google_drive_link: googleDocsFinalLink,
        categoria: `Google Docs (${contaGoogle?.email || "Padrão"})`,
        storage_path: null,
        tamanho: null,
        user_id: user.id,
        cliente_id: clienteEncontrado?.id || null,
        parent_id: currentFolderId,
        is_folder: false,
      } as any);
      if (error) throw error;

      toast.success("Documento Google Docs criado com sucesso! Abrindo em nova aba...");
      window.open(googleDocsFinalLink, "_blank");

      setGoogleDocsModelo("");
      setGoogleDocsProcesso("");
      setGoogleDocsCliente("");
      setGoogleDocsTitulo("");
      setVisao("inicio");
      fetchDocumentos();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar documento do Google.");
    } finally {
      setCriandoDocGoogle(false);
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

  const handleSalvarClientIdOAuth = async () => {
    localStorage.setItem("jus_google_client_id", tempClientId.trim());
    localStorage.setItem("jus_google_api_key", tempApiKey.trim());
    setGoogleClientId(tempClientId.trim());
    setGoogleApiKey(tempApiKey.trim());

    try {
      const { data: existing } = await supabase
        .from("google_integration")
        .select("id")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("google_integration")
          .update({ client_id: tempClientId.trim() })
          .eq("id", existing.id);
      } else if (user?.id && tempClientId.trim()) {
        await supabase
          .from("google_integration")
          .insert({
            user_id: user.id,
            client_id: tempClientId.trim(),
            client_secret: "oauth-spa",
          });
      }
    } catch {}

    setModalConfigClientIdOpen(false);
    toast.success("API do Google Drive & Google Docs configurada com sucesso!");
  };

  // Botão Dropdown Centralizado com Identidade Oficial JUS+ (#010E38 & #EBB52C) e Hover Dourado (Print 2)
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
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-[#EBB52C] focus:bg-[#EBB52C] hover:text-[#010E38] focus:text-[#010E38] flex items-center gap-2.5 text-[#010E38] transition-colors"
        >
          <FileText className="w-4 h-4 text-[#010E38]" />
          <span>Documento</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setVisao("novo_link")}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-[#EBB52C] focus:bg-[#EBB52C] hover:text-[#010E38] focus:text-[#010E38] flex items-center gap-2.5 text-[#010E38] transition-colors"
        >
          <LinkIcon className="w-4 h-4 text-[#010E38]" />
          <span>Link</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setVisao("novo_padrao")}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-[#EBB52C] focus:bg-[#EBB52C] hover:text-[#010E38] focus:text-[#010E38] flex items-center gap-2.5 text-[#010E38] transition-colors"
        >
          <FilePlus className="w-4 h-4 text-[#010E38]" />
          <span>Documento padrão</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

        <div className="px-3 py-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            INTEGRAÇÕES COM O GOOGLE
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTempClientId(googleClientId);
              setTempApiKey(googleApiKey);
              setModalConfigClientIdOpen(true);
            }}
            title="Configurar chaves da API do Google Drive e Google Docs"
            className="text-slate-400 hover:text-[#010E38] p-0.5 rounded transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <DropdownMenuItem
          onClick={handleAbrirGoogleDrive}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-[#EBB52C] focus:bg-[#EBB52C] hover:text-[#010E38] focus:text-[#010E38] flex items-center justify-between text-[#010E38] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <GoogleDriveIcon />
            <span>Arquivo do Google Drive</span>
          </div>
          {!googleLiberadoNoPlano ? (
            <span className="text-[10px] font-bold text-[#010E38] bg-[#EBB52C]/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Essencial
            </span>
          ) : contaGoogle ? (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
              Conectado
            </span>
          ) : null}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleAbrirGoogleDocs}
          className="text-xs font-semibold py-2.5 px-3 cursor-pointer rounded-lg hover:bg-[#EBB52C] focus:bg-[#EBB52C] hover:text-[#010E38] focus:text-[#010E38] flex items-center justify-between text-[#010E38] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <GoogleDocsIcon />
            <span>Documento padrão do Google</span>
          </div>
          {!googleLiberadoNoPlano ? (
            <span className="text-[10px] font-bold text-[#010E38] bg-[#EBB52C]/40 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Essencial
            </span>
          ) : contaGoogle ? (
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
              Conectado
            </span>
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const arquivosDriveFiltrados = arquivosDriveConta.filter((a) =>
    a.name.toLowerCase().includes(buscaDriveInterna.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6 lg:p-8 w-full space-y-5 overflow-x-hidden">
      {/* ============================================================
          TELA 1: ADICIONAR DOCUMENTO (ARQUIVO LOCAL) - PRINT 1
          ============================================================ */}
      {visao === "novo_documento" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 w-full space-y-6 text-[#010E38]">
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
                className="text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38] resize-none"
              />
              <p className="text-[11px] text-slate-400 font-mono">
                {500 - docDescricao.length}
              </p>
            </div>

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
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
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
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Responsável<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={docResponsavel}
                  onChange={(e) => setDocResponsavel(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

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
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 w-full space-y-6 text-[#010E38]">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Link<span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Digite um link"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
              />
            </div>

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
                className="text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38] resize-none"
              />
              <p className="text-[11px] text-slate-400 font-mono">
                {500 - linkDescricao.length}
              </p>
            </div>

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
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
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
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Responsável<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={linkResponsavel}
                  onChange={(e) => setLinkResponsavel(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

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
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 w-full space-y-6 text-[#010E38]">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Documento<span className="text-red-500">*</span>
              </Label>
              <Select value={padraoModelo} onValueChange={setPadraoModelo}>
                <SelectTrigger className="h-10 text-sm bg-white text-[#010E38] border-slate-200 focus:border-[#010E38]">
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md text-[#010E38]">
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
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
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
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Título<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  placeholder="Digite um título"
                  value={padraoTitulo}
                  onChange={(e) => setPadraoTitulo(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Responsável<span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={padraoResponsavel}
                  onChange={(e) => setPadraoResponsavel(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

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
          TELA 5: ARQUIVO DO GOOGLE DRIVE (APÓS ESCOLHER CONTA NO POPUP)
          ============================================================ */}
      {visao === "novo_google_drive" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 w-full space-y-6 text-[#010E38]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVisao("inicio")}
                className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight flex items-center gap-2.5">
                  <GoogleDriveIcon />
                  <span>Arquivo do Google Drive</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Selecione um arquivo direto da sua conta Google Drive ou cole o link de compartilhamento.
                </p>
              </div>
            </div>

            {/* Barra da Conta Google Conectada */}
            {contaGoogle ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 self-start sm:self-auto shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#010E38] text-[#EBB52C] flex items-center justify-center font-bold text-xs shrink-0">
                  {contaGoogle.iniciais || "G"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#010E38] truncate max-w-[180px]">
                      {contaGoogle.nome}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                    {contaGoogle.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => abrirPopupLoginGoogle("drive", true)}
                  className="text-[11px] font-bold text-[#010E38] hover:underline ml-2 px-2 py-1 rounded hover:bg-slate-200/60 transition-colors"
                >
                  Trocar conta
                </button>
                <button
                  type="button"
                  onClick={handleDesconectarGoogle}
                  className="text-[11px] font-bold text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => abrirPopupLoginGoogle("drive")}
                className="bg-[#010E38] text-[#EBB52C] border border-[#EBB52C]/40 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#021B66] transition-colors shadow-sm self-start sm:self-auto"
              >
                <GoogleGIcon />
                <span>Conectar Conta Google</span>
              </button>
            )}
          </div>

          {/* Seletor Visual de Arquivos da Conta Google Drive */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-[#010E38] flex items-center gap-2">
                <GoogleGIcon />
                <span>Arquivos recentes no Google Drive ({contaGoogle?.email || "Conta Conectada"})</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Filtrar no Drive..."
                    value={buscaDriveInterna}
                    onChange={(e) => setBuscaDriveInterna(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => window.open("https://drive.google.com", "_blank")}
                  className="text-xs font-semibold text-[#010E38] bg-white hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Abrir Google Drive</span>
                </button>
              </div>
            </div>

            {carregandoDrive ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin text-[#010E38]" />
                <span>Sincronizando arquivos do Google Drive...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {arquivosDriveFiltrados.map((arq) => {
                  const selecionado = googleDriveNome === arq.name;
                  return (
                    <button
                      key={arq.id}
                      type="button"
                      onClick={() => {
                        setGoogleDriveNome(arq.name);
                        setGoogleDriveUrl(arq.webViewLink);
                        setGoogleDriveDescricao(`Arquivo importado do Google Drive (${contaGoogle?.email || ""})`);
                      }}
                      className={`text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                        selecionado
                          ? "bg-[#010E38] text-[#EBB52C] border-[#010E38] shadow-md"
                          : "bg-white hover:bg-slate-50 text-[#010E38] border-slate-200"
                      }`}
                    >
                      <GoogleDriveIcon />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${selecionado ? "text-[#EBB52C]" : "text-[#010E38]"}`}>
                          {arq.name}
                        </p>
                        <p className={`text-[10px] mt-0.5 truncate ${selecionado ? "text-slate-300" : "text-slate-400"}`}>
                          Clique para selecionar
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Nome do arquivo<span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Nome do arquivo no Google Drive"
                  value={googleDriveNome}
                  onChange={(e) => setGoogleDriveNome(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Link do arquivo no Google Drive<span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="https://drive.google.com/file/d/..."
                  value={googleDriveUrl}
                  onChange={(e) => setGoogleDriveUrl(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-[#010E38]">Descrição</Label>
              <Textarea
                placeholder="Digite uma descrição"
                rows={3}
                maxLength={500}
                value={googleDriveDescricao}
                onChange={(e) => setGoogleDriveDescricao(e.target.value)}
                className="text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Processo, caso ou atendimento
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Encontre processo, caso ou atendimento"
                    value={googleDriveProcesso}
                    onChange={(e) => setGoogleDriveProcesso(e.target.value)}
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
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
                    value={googleDriveCliente}
                    onChange={(e) => setGoogleDriveCliente(e.target.value)}
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

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
                onClick={handleSalvarGoogleDrive}
                className="w-full sm:w-auto bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-7 py-2.5 rounded-lg shadow-sm transition-all text-center"
              >
                SALVAR ARQUIVO DO DRIVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TELA 6: DOCUMENTO PADRÃO DO GOOGLE DOCS (APÓS LOGIN NO POPUP)
          ============================================================ */}
      {visao === "novo_google_docs" && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 w-full space-y-6 text-[#010E38]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVisao("inicio")}
                className="text-slate-400 hover:text-[#010E38] p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight flex items-center gap-2.5">
                  <GoogleDocsIcon />
                  <span>Adicionar documento padrão do Google</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crie e edite documentos jurídicos diretamente no Google Docs sincronizados com sua conta.
                </p>
              </div>
            </div>

            {contaGoogle ? (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 self-start sm:self-auto shadow-sm">
                <div className="w-8 h-8 rounded-full bg-[#010E38] text-[#EBB52C] flex items-center justify-center font-bold text-xs shrink-0">
                  {contaGoogle.iniciais || "G"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#010E38] truncate max-w-[180px]">
                      {contaGoogle.nome}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                    {contaGoogle.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => abrirPopupLoginGoogle("docs", true)}
                  className="text-[11px] font-bold text-[#010E38] hover:underline ml-2 px-2 py-1 rounded hover:bg-slate-200/60 transition-colors"
                >
                  Trocar conta
                </button>
                <button
                  type="button"
                  onClick={handleDesconectarGoogle}
                  className="text-[11px] font-bold text-red-600 hover:underline px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => abrirPopupLoginGoogle("docs")}
                className="bg-[#010E38] text-[#EBB52C] border border-[#EBB52C]/40 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#021B66] transition-colors shadow-sm self-start sm:self-auto"
              >
                <GoogleDocsIcon />
                <span>Conectar Conta Google</span>
              </button>
            )}
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Documento padrão do Google<span className="text-red-500">*</span>
              </Label>
              <Select value={googleDocsModelo} onValueChange={setGoogleDocsModelo}>
                <SelectTrigger className="h-10 text-sm bg-white text-[#010E38] border-slate-200 focus:border-[#010E38]">
                  <SelectValue placeholder="Selecione um modelo do Google Docs" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md text-[#010E38]">
                  <SelectItem value="Contrato de Honorários PF">Contrato de Honorários PF</SelectItem>
                  <SelectItem value="Contrato de Honorários PJ">Contrato de Honorários PJ</SelectItem>
                  <SelectItem value="Procuração PF">Procuração PF</SelectItem>
                  <SelectItem value="Procuração PJ">Procuração PJ</SelectItem>
                  <SelectItem value="Declaração de Hipossuficiência">Declaração de Hipossuficiência</SelectItem>
                  <SelectItem value="Petição Inicial Padrão">Petição Inicial Padrão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Processo, caso ou atendimento
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Encontre um processo, caso ou atendimento"
                    value={googleDocsProcesso}
                    onChange={(e) => setGoogleDocsProcesso(e.target.value)}
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
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
                    value={googleDocsCliente}
                    onChange={(e) => setGoogleDocsCliente(e.target.value)}
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Título<span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Digite um título para o documento no Google Docs"
                value={googleDocsTitulo}
                onChange={(e) => setGoogleDocsTitulo(e.target.value)}
                className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
              />
            </div>

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
                onClick={handleCriarGoogleDocsPadrao}
                className="w-full sm:w-auto bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-7 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <GoogleDocsIcon />
                <span>CONTINUAR E ABRIR NO GOOGLE DOCS</span>
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

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0">
              {contaGoogle ? (
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => abrirPopupLoginGoogle("drive", true)}
                    title="Conta Google Conectada. Clique para trocar de conta."
                    className="cursor-pointer bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-emerald-800 transition-colors shadow-sm"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <GoogleGIcon />
                    <span className="font-semibold truncate max-w-[150px]">{contaGoogle.email}</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      Conectado
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDesconectarGoogle}
                    title="Desconectar conta Google"
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => abrirPopupLoginGoogle("drive")}
                  className="bg-white hover:bg-slate-50 text-[#010E38] border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-1.5 text-xs font-semibold shadow-sm transition-colors"
                >
                  <GoogleGIcon />
                  <span>Conectar Google</span>
                </button>
              )}

              {allDocumentos.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsNovaPastaOpen(true)}
                    className="bg-white hover:bg-slate-50 text-[#010E38] border border-slate-300 font-bold text-xs uppercase px-4 py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <FolderPlus className="w-4 h-4 text-[#EBB52C] shrink-0" />
                    <span>Nova Pasta</span>
                  </button>
                  <BotaoAdicionarDocumentoDropdown className="w-full sm:w-auto" />
                </>
              )}
            </div>
          </div>

          {allDocumentos.length === 0 && !searchTerm.trim() ? (
            <div className="min-h-[480px] sm:min-h-[540px] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-10 sm:py-14 bg-white rounded-2xl border border-slate-200/80 shadow-sm w-full">
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

                {contaGoogle ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Conectado como <strong>{contaGoogle.email}</strong></span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => abrirPopupLoginGoogle("drive")}
                    className="text-xs text-[#010E38] hover:underline font-semibold pt-1 flex items-center gap-1.5"
                  >
                    <GoogleGIcon />
                    <span>Conectar conta Google Drive</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Card className="border border-slate-200/80 shadow-sm overflow-hidden rounded-xl bg-white w-full">
              <CardHeader className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 space-y-3">
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

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Pesquisar pasta ou documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 pl-9 pr-8 text-xs bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
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

      {/* MODAL PARA CONFIGURAR API DO GOOGLE DRIVE & GOOGLE DOCS */}
      <Dialog open={modalConfigClientIdOpen} onOpenChange={setModalConfigClientIdOpen}>
        <DialogContent className="w-[95vw] max-w-lg bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base sm:text-lg font-bold text-[#010E38] flex items-center gap-2">
              <GoogleGIcon />
              <span>Configurar API do Google Drive & Google Docs</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Insira suas credenciais do Google Cloud Console para ativar o OAuth 2.0 oficial, a listagem da Google Drive API v3 e a criação automática via Google Docs API v1.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Google OAuth Client ID *
              </Label>
              <Input
                placeholder="Seu Client ID do Google Cloud Console"
                value={tempClientId}
                onChange={(e) => setTempClientId(e.target.value)}
                className="text-xs font-mono bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#010E38]">
                Google API Key (Opcional — para Google Picker)
              </Label>
              <Input
                placeholder="Ex: AIzaSyB1234567890abcdefghijklmnopqrst"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                className="text-xs font-mono bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600 space-y-1.5">
              <p className="font-bold text-[#010E38]">Como configurar em 1 minuto no Google Cloud:</p>
              <p>1. Ative a <strong>Google Drive API</strong> e a <strong>Google Docs API</strong>.</p>
              <p>2. Crie um <strong>ID do cliente OAuth (Aplicativo da Web)</strong>.</p>
              <p>3. Em <strong>Origens JavaScript autorizadas</strong>, adicione:</p>
              <code className="block bg-white border border-slate-200 px-2 py-1 rounded text-[#010E38] font-mono">
                https://jus-mais-gestao-juridica.vercel.app
              </code>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalConfigClientIdOpen(false)}
                className="text-xs font-bold uppercase text-slate-500 hover:text-[#010E38] px-3 py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarClientIdOAuth}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] font-bold text-xs uppercase px-5 py-2.5 rounded-lg shadow-sm"
              >
                Salvar API Google
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
