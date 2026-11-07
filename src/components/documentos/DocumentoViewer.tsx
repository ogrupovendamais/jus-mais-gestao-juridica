import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, FileX, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type DocVisualizavel = {
  nome: string;
  storagePath?: string | null;
  googleDriveLink?: string | null;
};

type Tipo = "pdf" | "imagem" | "docx" | "texto" | "outro";

const tipoDoArquivo = (nome: string): Tipo => {
  const ext = nome.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "imagem";
  if (ext === "docx") return "docx";
  if (["txt", "csv", "md", "json", "xml"].includes(ext)) return "texto";
  return "outro";
};

const MIME: Record<string, string> = { pdf: "application/pdf", imagem: "", docx: "", texto: "text/plain;charset=utf-8", outro: "" };

// Visualiza o documento dentro do sistema (sem enviar o arquivo a serviços externos)
export function DocumentoViewer({
  doc,
  onClose,
  onDownload,
}: {
  doc: DocVisualizavel | null;
  onClose: () => void;
  onDownload: () => void;
}) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);
  const tipo = doc ? tipoDoArquivo(doc.nome) : "outro";

  useEffect(() => {
    let urlCriada: string | null = null;
    let cancelado = false;
    setErro(null);
    setUrl(null);
    setTexto(null);
    if (!doc || doc.googleDriveLink || !doc.storagePath || tipo === "outro") return;

    (async () => {
      setCarregando(true);
      try {
        const { data: blob, error } = await supabase.storage.from("documentos").download(doc.storagePath!);
        if (error || !blob) throw error || new Error("Arquivo não encontrado");
        if (cancelado) return;
        if (tipo === "docx") {
          const { renderAsync } = await import("docx-preview");
          // espera o container existir no diálogo
          await new Promise((r) => setTimeout(r, 0));
          if (docxRef.current) {
            docxRef.current.innerHTML = "";
            await renderAsync(blob, docxRef.current, undefined, {
              className: "docx",
              inWrapper: true,
              ignoreLastRenderedPageBreak: true,
            });
          }
        } else if (tipo === "texto") {
          setTexto(await blob.text());
        } else {
          const b = MIME[tipo] ? new Blob([blob], { type: MIME[tipo] }) : blob;
          urlCriada = URL.createObjectURL(b);
          setUrl(urlCriada);
        }
      } catch (e: unknown) {
        console.error(e);
        if (!cancelado) setErro("Não foi possível abrir este arquivo aqui. Use \"Baixar\".");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
      if (urlCriada) URL.revokeObjectURL(urlCriada);
    };
  }, [doc, tipo]);

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-4 gap-3">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0 pr-8">
          <div className="min-w-0">
            <DialogTitle className="truncate text-base">{doc?.nome}</DialogTitle>
            <DialogDescription className="text-xs">Visualização do documento</DialogDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            {url && tipo === "pdf" && (
              <Button variant="outline" size="sm" onClick={() => window.open(url, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-1" /> Nova aba
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-1" /> Baixar
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 rounded-md border bg-muted/20 overflow-auto relative">
          {carregando && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {doc?.googleDriveLink && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-sm">
              <p>Este documento está no Google Drive.</p>
              <Button onClick={() => window.open(doc.googleDriveLink!, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-1" /> Abrir no Google Drive
              </Button>
            </div>
          )}

          {erro && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileX className="h-10 w-10" />
              <p>{erro}</p>
            </div>
          )}

          {!doc?.googleDriveLink && tipo === "outro" && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              <FileX className="h-10 w-10" />
              <p>A pré-visualização deste tipo de arquivo não está disponível. Use "Baixar" para abrir no computador.</p>
            </div>
          )}

          {url && tipo === "pdf" && <iframe src={url} title={doc?.nome} className="w-full h-full bg-white" />}
          {url && tipo === "imagem" && (
            <div className="h-full flex items-center justify-center p-2">
              <img src={url} alt={doc?.nome} className="max-w-full max-h-full object-contain" />
            </div>
          )}
          {texto !== null && <pre className="p-4 text-xs whitespace-pre-wrap break-words">{texto}</pre>}
          {tipo === "docx" && !doc?.googleDriveLink && (
            <div ref={docxRef} className="docx-visualizacao bg-white text-black min-h-full" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// arquivos que abrem dentro do sistema
export const podeVisualizar = (nome: string) => tipoDoArquivo(nome) !== "outro";
