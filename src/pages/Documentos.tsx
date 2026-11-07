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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Home,
  Upload,
  FileText,
  Eye,
  X,
  Search
} from "lucide-react";
import { DocumentoForm } from "@/components/documentos/DocumentoForm";
import { NovaPastaDialog } from "@/components/documentos/NovaPastaDialog";
import { DeleteDocumentoDialog } from "@/components/documentos/DeleteDocumentoDialog";
import { ModelosManagerDialog } from "@/components/documentos/ModelosManagerDialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Se vier folderId na URL (ex: /documentos?folderId=xyz), navega direto para aquela pasta
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

  // Caminho da pasta pai para exibir quando estiver em modo de busca
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

      // Herda o cliente_nicho_id da pasta atual se existir
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

  // documento aberto no visualizador
  const [visualizando, setVisualizando] = useState<Documento | null>(null);

  // Ao clicar em uma pasta, limpamos a pesquisa e entramos nela diretamente
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

  const currentPathName = breadcrumbs.map(b => b.name).join(" > ");

  return (
    <div className="p-3 sm:p-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Arquivos</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Gerencie pastas e documentos do escritório.
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-muted/30 p-2 rounded-md border">
            <div className="flex items-center space-x-1 overflow-x-auto whitespace-nowrap pb-1 w-full min-w-0">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id || 'root'} className="flex items-center text-sm">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentFolderId(crumb.id);
                    }}
                    className="hover:underline hover:text-primary flex items-center font-medium"
                  >
                    {crumb.id === null ? <Home className="h-4 w-4 mr-1" /> : null}
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full flex-wrap">
              <div className="relative w-full sm:w-72 sm:mr-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar pasta ou arquivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-7 text-xs sm:text-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1"
                    title="Limpar pesquisa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {canManageModelos && (
                <Button variant="outline" className="hidden sm:flex h-8" onClick={() => setIsModelosOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Modelos de Documentos
                </Button>
              )}
              <Button onClick={() => setIsNovaPastaOpen(true)} variant="outline" className="hidden sm:flex h-8">
                <FolderPlus className="w-4 h-4 mr-2" />
                Nova Pasta
              </Button>
              <Button onClick={() => setIsFormOpen(true)} className="h-8">
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Fazer Upload</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>

            {searchTerm.trim() && (
              <div className="flex items-center justify-between text-xs bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-md mt-1">
                <span>
                  Resultados da busca por <strong>"{searchTerm}"</strong>: {currentFolderFiles.length} item(ns). 
                  Clique em qualquer pasta para abri-la diretamente.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="h-6 text-xs underline font-semibold p-0 ml-2"
                >
                  Limpar busca
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  {searchTerm.trim() && <TableHead>Localização (Pasta)</TableHead>}
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentFolderFiles.length > 0 ? (
                  currentFolderFiles.map((doc) => (
                    <TableRow 
                      key={doc.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors" 
                      onClick={() => abrir(doc)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {doc.isFolder ? (
                            <FolderIcon className="h-5 w-5 text-yellow-500 fill-yellow-500/20 shrink-0" />
                          ) : (
                            <FileIcon className="h-5 w-5 text-blue-500 fill-blue-500/20 shrink-0" />
                          )}
                          <span className="hover:underline font-medium" title={doc.isFolder ? "Clique para abrir a pasta" : "Clique para visualizar"}>
                            {doc.name}
                          </span>
                        </div>
                      </TableCell>
                      {searchTerm.trim() && (
                        <TableCell className="text-xs text-muted-foreground">
                          {getParentPath(doc)}
                        </TableCell>
                      )}
                      <TableCell>{doc.isFolder ? "-" : formatBytes(doc.size || 0)}</TableCell>
                      <TableCell>{doc.createdAt.toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {doc.isFolder ? (
                              <DropdownMenuItem onClick={() => abrir(doc)}>
                                <FolderIcon className="mr-2 h-4 w-4" /> Abrir Pasta
                              </DropdownMenuItem>
                            ) : (
                              <>
                                <DropdownMenuItem onClick={() => setVisualizando(doc)}>
                                  <Eye className="mr-2 h-4 w-4" /> Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                  <Download className="mr-2 h-4 w-4" /> Baixar
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive">
                              <FileX className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={searchTerm.trim() ? 5 : 4} className="text-center h-24">
                      {searchTerm ? (
                        <span>
                          Nenhum arquivo ou pasta encontrado para "<strong>{searchTerm}</strong>".{" "}
                          <button className="underline text-primary" onClick={() => setSearchTerm("")}>
                            Limpar busca
                          </button>
                        </span>
                      ) : currentFolderId ? (
                        <span>
                          Esta pasta está vazia. Use <strong>Fazer Upload</strong> para anexar arquivos aqui, ou{" "}
                          <button 
                            className="underline text-primary font-medium" 
                            onClick={() => {
                              setSearchTerm("");
                              setCurrentFolderId(breadcrumbs[breadcrumbs.length - 2]?.id ?? null);
                            }}
                          >
                            voltar à pasta anterior
                          </button>.
                        </span>
                      ) : (
                        "Nenhum item encontrado."
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-3">
            {currentFolderFiles.length > 0 ? (
              currentFolderFiles.map((doc) => (
                <Card 
                  key={doc.id} 
                  className="p-3 cursor-pointer hover:bg-muted/30 transition-colors" 
                  onClick={() => abrir(doc)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {doc.isFolder ? (
                        <FolderIcon className="h-8 w-8 text-yellow-500 fill-yellow-500/20 shrink-0" />
                      ) : (
                        <FileIcon className="h-8 w-8 text-blue-500 fill-blue-500/20 shrink-0" />
                      )}
                      <div className="min-w-0 truncate">
                        <h3 className="font-medium text-sm leading-tight truncate">{doc.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.isFolder ? "Pasta" : formatBytes(doc.size || 0)} • {doc.createdAt.toLocaleDateString("pt-BR")}
                        </p>
                        {searchTerm.trim() && (
                          <p className="text-[11px] text-primary/80 truncate mt-0.5">
                            📁 {getParentPath(doc)}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0 shrink-0" 
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        {doc.isFolder ? (
                          <DropdownMenuItem onClick={() => abrir(doc)}>
                            <FolderIcon className="mr-2 h-4 w-4" /> Abrir Pasta
                          </DropdownMenuItem>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={() => setVisualizando(doc)}>
                              <Eye className="mr-2 h-4 w-4" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload(doc)}>
                              <Download className="mr-2 h-4 w-4" /> Baixar
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive">
                          <FileX className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                {searchTerm ? (
                  <span>
                    Nenhum item encontrado para "<strong>{searchTerm}</strong>".{" "}
                    <button className="underline text-primary" onClick={() => setSearchTerm("")}>
                      Limpar busca
                    </button>
                  </span>
                ) : (
                  "Nenhum item nesta pasta."
                )}
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DocumentoForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddDocumento}
        clientes={clientes}
      />

      <NovaPastaDialog
        isOpen={isNovaPastaOpen}
        onClose={() => setIsNovaPastaOpen(false)}
        onSubmit={handleNovaPasta}
        currentPath={currentPathName}
      />

      <DeleteDocumentoDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
      />

      <ModelosManagerDialog
        open={isModelosOpen}
        onOpenChange={setIsModelosOpen}
      />

      <DocumentoViewer
        doc={visualizando ? { nome: visualizando.name, storagePath: visualizando.storagePath, googleDriveLink: visualizando.googleDriveLink } : null}
        onClose={() => setVisualizando(null)}
        onDownload={() => visualizando && handleDownload(visualizando)}
      />
    </div>
  );
}
