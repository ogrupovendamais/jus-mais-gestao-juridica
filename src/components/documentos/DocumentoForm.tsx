import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
  // PDFs
  "application/pdf",
  
  // Imagens
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/webp",
  "image/svg+xml",
  "image/tiff",
  
  // Documentos Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  
  // Planilhas Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  
  // Planilhas LibreOffice/OpenOffice
  "application/vnd.oasis.opendocument.spreadsheet",
  
  // CSV
  "text/csv",
  
  // Áudio
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/aac",
  "audio/flac",
  "audio/m4a",
  "audio/wma",
  
  // JSON e XML
  "application/json",
  "text/json",
  "application/xml",
  "text/xml",
  
  // Texto
  "text/plain",
  
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  
  // Outros formatos comuns
  "application/rtf",
  "application/zip",
  "application/x-rar-compressed",
];

const formSchema = z.object({
  clienteId: z.string().optional().or(z.literal('')),
  file: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, "É necessário selecionar um arquivo.")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      `O tamanho máximo do arquivo é 10MB.`
    )
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Tipo de arquivo não suportado."
    ),
});

type DocumentoFormValues = z.infer<typeof formSchema>;

type DocumentoFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { clienteId: string; file: File; categoria: string }) => void;
  clientes: { id: string; nome: string }[];
};

export function DocumentoForm({
  isOpen,
  onClose,
  onSubmit,
  clientes,
}: DocumentoFormProps) {
  const form = useForm<DocumentoFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clienteId: "",
      file: undefined,
    },
  });

  const fileRef = form.register("file");

  const handleSubmit = (values: DocumentoFormValues) => {
    const file = values.file[0];
    onSubmit({
      clienteId: values.clienteId,
      file,
      categoria: values.categoria || "",
    });
    form.reset();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="mx-4 max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Adicionar Documento
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Anexe um novo documento. Preencha os detalhes abaixo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="clienteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Relacionado a
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Arquivo</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      {...fileRef} 
                      className="text-sm" 
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.tiff,.doc,.docx,.xls,.xlsx,.ods,.csv,.mp3,.wav,.ogg,.aac,.flac,.m4a,.wma,.json,.xml,.txt,.ppt,.pptx,.rtf,.zip,.rar"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: PDF, imagens, áudio, planilhas, documentos, JSON, XML e outros. Máximo 10MB.
                  </p>
                </FormItem>
              )}
            />
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  form.reset();
                  onClose();
                }}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" className="w-full sm:w-auto">
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
