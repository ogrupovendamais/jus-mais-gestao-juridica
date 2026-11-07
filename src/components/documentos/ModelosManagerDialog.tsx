import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash, UploadCloud, FileText, Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Template {
  id: string;
  nome: string;
  storage_path: string;
  ativo: boolean;
  created_at?: string;
}

export function ModelosManagerDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("document_templates")
      .select("*")
      .order("ativo", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar modelos.");
    } else {
      setTemplates((data as Template[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const handleUpload = async () => {
    if (!file || !novoNome) {
      toast.error("Preencha o nome e selecione um arquivo .docx");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `modelos/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("templates").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("document_templates").insert({
        nome: novoNome,
        storage_path: filePath,
        ativo: true
      });
      if (dbError) throw dbError;

      toast.success("Modelo adicionado com sucesso!");
      setNovoNome("");
      setFile(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao subir modelo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleAtivo = async (t: Template) => {
    try {
      const novoStatus = !t.ativo;
      const { error } = await supabase.from("document_templates").update({ ativo: novoStatus }).eq("id", t.id);
      if (error) throw error;
      toast.success(novoStatus ? `Modelo "${t.nome}" ativado!` : `Modelo "${t.nome}" desativado!`);
      fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao alterar status: " + err.message);
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Deseja realmente remover o modelo "${t.nome}"?`)) return;
    try {
      const { error } = await supabase.from("document_templates").delete().eq("id", t.id);
      if (error) throw error;
      toast.success("Modelo excluído!");
      fetchTemplates();
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const handleDownload = async (t: Template) => {
    try {
      const { data, error } = await supabase.storage.from("templates").createSignedUrl(t.storage_path, 60);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      toast.error("Erro ao baixar modelo.");
    }
  };

  const activeCount = templates.filter(t => t.ativo).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Modelos de Documentos</DialogTitle>
          <DialogDescription>
            Faça upload de contratos, procurações ou declarações em formato .docx. 
            O sistema substitui as tags automaticamente pelos dados reais do cliente ao clicar em "Gerar documentos".
          </DialogDescription>
        </DialogHeader>

        {activeCount === 0 && !loading && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 p-3 rounded-md text-xs">
            ⚠️ <strong>Atenção:</strong> Não há nenhum modelo ativo no momento. Enquanto não houver modelos ativos (ex: Procuração ou Contrato), o botão <em>"Gerar documentos"</em> na ficha do cliente não terá arquivos para gerar.
          </div>
        )}

        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 text-sm">
          <p className="font-semibold text-primary mb-2 text-xs uppercase tracking-wide">
            Tags disponíveis para usar no seu arquivo Word (.docx):
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-primary/80 font-mono text-xs">
            <div>{"{nome}"}</div>
            <div>{"{cpf}"}</div>
            <div>{"{rg}"}</div>
            <div>{"{estado_civil}"}</div>
            <div>{"{nacionalidade}"}</div>
            <div>{"{profissao}"}</div>
            <div>{"{nome_mae}"}</div>
            <div>{"{nome_pai}"}</div>
            <div>{"{filiacao}"}</div>
            <div>{"{nicho}"}</div>
            <div>{"{email}"}</div>
            <div>{"{telefone}"}</div>
            <div>{"{logradouro}"}</div>
            <div>{"{numero}"}</div>
            <div>{"{bairro}"}</div>
            <div>{"{cidade}"}</div>
            <div>{"{uf}"}</div>
            <div>{"{endereco}"}</div>
          </div>
          <p className="text-muted-foreground text-xs mt-3">
            💡 Escreva a tag no Word exatamente como acima (com as chaves). Na geração, o ERP troca pelo dado do cliente.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end bg-muted/40 p-3 rounded-lg border">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Nome do Modelo</Label>
              <Input 
                value={novoNome} 
                onChange={e => setNovoNome(e.target.value)} 
                placeholder="Ex: Procuração Geral ou Contrato" 
                className="h-8 text-xs"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Arquivo (.docx)</Label>
              <Input 
                type="file" 
                accept=".docx" 
                onChange={e => setFile(e.target.files?.[0] || null)} 
                className="h-8 text-xs cursor-pointer"
              />
            </div>
            <Button onClick={handleUpload} disabled={uploading} size="sm" className="h-8">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-1.5" />}
              Subir
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="w-[100px] text-center">Status</TableHead>
                  <TableHead className="w-[120px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                      Nenhum modelo cadastrado. Envie um arquivo .docx acima.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium">{t.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={`cursor-pointer text-[11px] ${t.ativo ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/10" : "text-muted-foreground"}`}
                          onClick={() => handleToggleAtivo(t)}
                          title="Clique para alternar Ativo / Inativo"
                        >
                          {t.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleDownload(t)}
                            title="Baixar arquivo modelo"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" 
                            onClick={() => handleDelete(t)}
                            title="Excluir modelo"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
