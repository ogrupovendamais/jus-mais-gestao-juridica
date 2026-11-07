import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Folder as FolderIcon, File as FileIcon, Download, MoreHorizontal, Eye, ExternalLink } from "lucide-react";
import { DocumentoViewer } from "@/components/documentos/DocumentoViewer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function MiniDrive({ clienteId }: { clienteId: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visualizando, setVisualizando] = useState<any | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documentos")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("is_folder", { ascending: false })
      .order("nome", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (clienteId) {
      loadFiles();
    }
  }, [clienteId]);

  const handleDownload = async (doc: any) => {
    if (doc.is_folder) return;
    if (doc.google_drive_link) {
      window.open(doc.google_drive_link, "_blank");
      return;
    }
    if (!doc.storage_path) return;
    
    try {
      const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.storage_path, 60);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (e) {
      toast.error("Erro ao baixar documento");
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando arquivos...</div>;

  return (
    <div className="space-y-2 mt-2 max-h-64 overflow-y-auto pr-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">Arquivos e Pastas do Cliente</span>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs text-primary hover:underline p-0" 
          onClick={() => navigate("/documentos")}
        >
          <ExternalLink className="h-3 w-3 mr-1" /> Abrir no Drive
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground bg-muted/20 p-4 text-center rounded border border-dashed">
          Nenhum arquivo encontrado para este cliente. Acesse a aba Documentos para fazer upload.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {items.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-2 text-sm bg-muted/10 rounded border hover:bg-muted/30 transition-colors">
              <div 
                className="flex items-center gap-2 truncate pr-2 cursor-pointer"
                onClick={() => {
                  if (doc.is_folder) {
                    navigate(`/documentos?folderId=${doc.id}`);
                  } else {
                    setVisualizando(doc);
                  }
                }}
              >
                {doc.is_folder ? <FolderIcon className="h-4 w-4 text-yellow-500 shrink-0" /> : <FileIcon className="h-4 w-4 text-blue-500 shrink-0" />}
                <span 
                  className="truncate hover:underline text-xs sm:text-sm font-medium" 
                  title={doc.is_folder ? `Abrir pasta ${doc.nome}` : "Visualizar"}
                >
                  {doc.nome}
                </span>
              </div>
              <div className="shrink-0 flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-6 w-6 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {doc.is_folder ? (
                      <DropdownMenuItem onClick={() => navigate(`/documentos?folderId=${doc.id}`)}>
                        <FolderIcon className="mr-2 h-4 w-4" /> Abrir Pasta
                      </DropdownMenuItem>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => setVisualizando(doc)}><Eye className="mr-2 h-4 w-4" /> Visualizar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(doc)}><Download className="mr-2 h-4 w-4" /> Baixar</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
      <DocumentoViewer
        doc={visualizando ? { nome: visualizando.nome, storagePath: visualizando.storage_path, googleDriveLink: visualizando.google_drive_link } : null}
        onClose={() => setVisualizando(null)}
        onDownload={() => visualizando && handleDownload(visualizando)}
      />
    </div>
  );
}
