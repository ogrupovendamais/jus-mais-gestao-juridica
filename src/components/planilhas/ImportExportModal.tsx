import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { STATUS_INICIAL, STATUS_PROCESSO } from "@/lib/statusProcesso";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

type TargetTable = "clientes" | "processos" | "financeiro";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TargetTable;
  onSuccess?: () => void;
}

interface ValidationResult {
  row: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  status: "success" | "warning" | "error";
}

const TEMPLATES: Record<TargetTable, { filename: string; content: string; headers: string[] }> = {
  clientes: {
    filename: "modelo_clientes.csv",
    headers: ["nome", "filiacao", "email", "telefone", "endereco", "status", "logradouro", "numero", "bairro", "referencia", "cidade", "uf", "data_inicio_relacionamento", "cnh", "data_nascimento", "estado_civil", "rg", "cpf", "chave_pix", "instituicao_financeira"],
    content: "nome;filiacao;email;telefone;endereco;status;logradouro;numero;bairro;referencia;cidade;uf;data_inicio_relacionamento;cnh;data_nascimento;estado_civil;rg;cpf;chave_pix;instituicao_financeira\nPedro Silva;Maria Silva;pedro@email.com;(11) 99999-9999;Av. Paulista, 1000 - São Paulo;Ativo;Av. Paulista;1000;Bela Vista;Apto 101;São Paulo;SP;2026-01-01;12345678901;1990-05-15;Casado(a);12.345.678-9;123.456.789-00;11999999999;Nubank\n",
  },
  processos: {
    filename: "modelo_processos.csv",
    headers: ["numero", "assunto", "status", "data_inicio", "data_limite", "prioridade", "responsavel", "valor_causa", "instancia", "cliente_email"],
    content: "numero;assunto;status;data_inicio;data_limite;prioridade;responsavel;valor_causa;instancia;cliente_email\n5001234-56.2026.8.26.0100;Divórcio Consensual;Em Andamento;2026-01-15;2026-12-31;Média;Dr. Carlos Silva;50000.00;1ª Instância;pedro@email.com\n0009876-54.2026.4.01.3400;Ação Previdenciária;Aguardando;2026-02-10;;Alta;Dra. Ana Costa;15000.00;Justiça Federal;maria@email.com\n",
  },
  financeiro: {
    filename: "modelo_financeiro.csv",
    headers: ["descricao", "valor", "data_vencimento", "data_pagamento", "status", "cliente_email", "tipo_lancamento", "pct_cliente", "pct_parceiro", "pct_parceiro2", "pct_parceiro3", "pct_reserva", "valor_sucumbencia", "instituicao_financeira", "depositante", "data_fato_gerador", "forma_recebimento", "caixa_box"],
    content: "descricao;valor;data_vencimento;data_pagamento;status;cliente_email;tipo_lancamento;pct_cliente;pct_parceiro;pct_parceiro2;pct_parceiro3;pct_reserva;valor_sucumbencia;instituicao_financeira;depositante;data_fato_gerador;forma_recebimento;caixa_box\nHodorários Advocatícios;5000.00;2026-07-10;2026-07-09;Pago;pedro@email.com;Receita;;;;;;;;;;;\nAcordo Trabalhista 1/2;6000.00;2026-07-24;;Pendente;maria@email.com;Acordo;60;20;0;0;5;0;Nubank;Empresa XPTO;2026-06-20;PIX;Caixa 01\n",
  },
};

const TABLE_NAMES: Record<TargetTable, string> = {
  clientes: "Clientes",
  processos: "Processos",
  financeiro: "Financeiro (Lançamentos)",
};

export function ImportExportModal({ isOpen, onClose, table, onSuccess }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "export">("import");
  const [dragging, setDragging] = useState(false);
  const [parsedData, setParsedData] = useState<ValidationResult[]>([]);
  const [clientsMap, setClientsMap] = useState<Record<string, string>>({}); // email -> id
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportDataPreview, setExportDataPreview] = useState<Record<string, unknown> []>([]);
  const { toast } = useToast();

  // Load clients map to resolve email to id for processes/finance
  useEffect(() => {
    if (!isOpen) return;
    const fetchClients = async () => {
      const { data } = await supabase.from("clientes").select("id, email");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((c) => {
          if (c.email) map[c.email.toLowerCase().trim()] = c.id;
        });
        setClientsMap(map);
      }
    };
    fetchClients();
  }, [table, isOpen]);

  // Load preview data for export
  useEffect(() => {
    if (!isOpen) return;
    const fetchExportPreview = async () => {
      setLoading(true);
      let query;
      if (table === "clientes") {
        query = supabase.from("clientes").select("nome, email, telefone, status, data_registro").limit(3);
      } else if (table === "processos") {
        query = supabase.from("processos").select("numero, assunto, status, prioridade, valor_causa").limit(3);
      } else {
        query = supabase.from("financeiro_lancamentos").select("descricao, valor, data_vencimento, status").limit(3);
      }

      const { data } = await query;
      setExportDataPreview(data || []);
      setLoading(false);
    };
    fetchExportPreview();
  }, [table, isOpen]);

  const handleDownloadTemplate = () => {
    const template = TEMPLATES[table];
    const blob = new Blob([template.content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", template.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return;

    // Detect separator (comma or semicolon)
    const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM se houver
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    const separator = semicolons >= commas ? ";" : ",";

    const headers = headerLine.split(separator).map(h => h.trim().toLowerCase().replace(/["']/g, ""));
    const template = TEMPLATES[table];

    // Check if headers match template
    const missingHeaders = template.headers.filter(h => !headers.includes(h) && h !== "cliente_email");
    if (missingHeaders.length > 0) {
      toast({
        title: "Erro de Cabeçalho",
        description: `Cabeçalhos inválidos. Faltando: ${missingHeaders.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const splitCsvLine = (line: string, separator: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result;
    };

    const results: ValidationResult[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      const values = splitCsvLine(currentLine, separator).map(v => v.trim().replace(/^["']|["']$/g, ""));
      if (values.length <= 1 && values[0] === "") continue;

      const rowData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rowData[header] = values[index] || "";
      });

      // Validations
      const errors: string[] = [];
      const warnings: string[] = [];

      if (table === "clientes") {
        if (rowData.nome === "") errors.push("Nome é obrigatório.");
        if (rowData.email && !/\S+@\S+\.\S+/.test(rowData.email)) {
          warnings.push(`E-mail em formato inválido ou vazio ignorado ("${rowData.email}").`);
          rowData.email = "";
        }
        if (rowData.status && !["Ativo", "Inativo"].includes(rowData.status)) {
          warnings.push("Status inválido (deve ser Ativo ou Inativo). Definindo como Ativo.");
        }
      } else if (table === "processos") {
        if (!rowData.numero) errors.push("Número do processo é obrigatório.");
        if (!rowData.assunto) errors.push("Assunto é obrigatório.");
        if (rowData.valor_causa && isNaN(Number(rowData.valor_causa))) {
          errors.push("Valor da causa deve ser um número.");
        }
        if (rowData.data_inicio && isNaN(Date.parse(rowData.data_inicio))) {
          errors.push("Data de início em formato inválido (use AAAA-MM-DD).");
        }
        if (rowData.cliente_email) {
          const clientEmail = rowData.cliente_email.toLowerCase().trim();
          if (!clientsMap[clientEmail]) {
            errors.push(`Cliente com email ${rowData.cliente_email} não encontrado.`);
          } else {
            rowData.cliente_id = clientsMap[clientEmail];
          }
        } else {
          errors.push("Email do cliente associado é obrigatório.");
        }
      } else if (table === "financeiro") {
        if (!rowData.descricao) errors.push("Descrição é obrigatória.");
        if (!rowData.valor || isNaN(Number(rowData.valor))) {
          errors.push("Valor é obrigatório e deve ser numérico.");
        }
        if (rowData.data_vencimento && isNaN(Date.parse(rowData.data_vencimento))) {
          errors.push("Data de vencimento inválida (use AAAA-MM-DD).");
        }
        if (rowData.status && !["Pago", "Pendente"].includes(rowData.status)) {
          warnings.push("Status inválido (deve ser Pago ou Pendente). Definindo como Pendente.");
        }
        if (rowData.cliente_email) {
          const clientEmail = rowData.cliente_email.toLowerCase().trim();
          if (!clientsMap[clientEmail]) {
            errors.push(`Cliente com email ${rowData.cliente_email} não encontrado.`);
          } else {
            rowData.cliente_id = clientsMap[clientEmail];
          }
        } else {
          errors.push("Email do cliente associado é obrigatório.");
        }
      }

      const status = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "success";

      results.push({
        row: i + 1,
        data: rowData,
        errors,
        warnings,
        status,
      });
    }

    setParsedData(results);
    toast({
      title: "Planilha Carregada",
      description: `${results.length} linhas lidas com sucesso. Revise as validações abaixo.`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Arquivo Inválido",
        description: "Apenas arquivos .csv são suportados no momento.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleImportData = async () => {
    const readyToImport = parsedData.filter(r => r.status !== "error");
    if (readyToImport.length === 0) {
      toast({
        title: "Erro de Importação",
        description: "Não existem linhas válidas prontas para importar.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      setImporting(false);
      return;
    }

    try {
      if (table === "clientes") {
        const payload = readyToImport.map(r => ({
          user_id: uid,
          nome: r.data.nome,
          email: r.data.email || null,
          telefone: r.data.telefone || null,
          endereco: r.data.endereco || null,
          logradouro: r.data.logradouro || null,
          numero: r.data.numero || null,
          bairro: r.data.bairro || null,
          referencia: r.data.referencia || null,
          cidade: r.data.cidade || null,
          uf: r.data.uf || null,
          data_inicio_relacionamento: r.data.data_inicio_relacionamento || null,
          cnh: r.data.cnh || null,
          data_nascimento: r.data.data_nascimento || null,
          estado_civil: r.data.estado_civil || null,
          rg: r.data.rg || null,
          cpf: r.data.cpf || null,
          filiacao: r.data.filiacao || null,
          chave_pix: r.data.chave_pix || null,
          instituicao_financeira: r.data.instituicao_financeira || null,
          status: (r.data.status === "Inativo" ? "Inativo" : "Ativo") as "Ativo" | "Inativo",
        }));

        // Insere um a um para pular CPF/CNPJ já cadastrados sem abortar a importação
        const duplicados: string[] = [];
        for (const row of payload) {
          const { error } = await supabase.from("clientes").insert(row);
          if (error?.code === "23505") {
            duplicados.push(row.nome);
          } else if (error) {
            throw error;
          }
        }
        if (duplicados.length > 0) {
          toast({
            title: `${duplicados.length} cliente(s) ignorado(s)`,
            description: `CPF/CNPJ já cadastrado: ${duplicados.slice(0, 5).join(", ")}${duplicados.length > 5 ? "..." : ""}. Use "Novo Cliente" para abrir um nicho nesses cadastros.`,
          });
        }
      } else if (table === "processos") {
        const payload = readyToImport.map(r => ({
          user_id: uid,
          cliente_id: r.data.cliente_id,
          numero: r.data.numero,
          assunto: r.data.assunto,
          status: ((STATUS_PROCESSO as readonly string[]).includes(r.data.status) ? r.data.status : STATUS_INICIAL) as any,
          data_inicio: r.data.data_inicio || new Date().toISOString().split("T")[0],
          data_limite: r.data.data_limite || null,
          prioridade: (["Alta", "Baixa"].includes(r.data.prioridade) ? r.data.prioridade : "Média") as "Alta" | "Média" | "Baixa",
          responsavel: r.data.responsavel || null,
          valor_causa: r.data.valor_causa ? Number(r.data.valor_causa) : null,
          instancia: r.data.instancia || null,
        }));

        const { error } = await supabase.from("processos").insert(payload);
        if (error) throw error;
      } else if (table === "financeiro") {
        const payload = readyToImport.map(r => {
          const tipoLanc = (["Receita", "Despesa", "Acordo"].includes(r.data.tipo_lancamento) ? r.data.tipo_lancamento : "Receita") as "Receita" | "Despesa" | "Acordo";
          const isAcordo = tipoLanc === "Acordo";
          
          const pctCliente = r.data.pct_cliente ? Number(r.data.pct_cliente) : 60;
          const pctParceiro = r.data.pct_parceiro ? Number(r.data.pct_parceiro) : 20;
          const pctParceiro2 = r.data.pct_parceiro2 ? Number(r.data.pct_parceiro2) : 0;
          const pctParceiro3 = r.data.pct_parceiro3 ? Number(r.data.pct_parceiro3) : 0;
          const pctReserva = r.data.pct_reserva ? Number(r.data.pct_reserva) : 5;
          const valorSucumbencia = r.data.valor_sucumbencia ? Number(r.data.valor_sucumbencia) : 0;
          
          const val = Number(r.data.valor);
          
          const calcValCliente = isAcordo ? val * (pctCliente / 100) : null;
          const calcValEscritorio = isAcordo ? val - (calcValCliente || 0) : null;
          const calcValParceiro = isAcordo ? (calcValEscritorio || 0) * (pctParceiro / 100) : null;
          const calcValParceiro2 = isAcordo ? (calcValEscritorio || 0) * (pctParceiro2 / 100) : null;
          const calcValParceiro3 = isAcordo ? (calcValEscritorio || 0) * (pctParceiro3 / 100) : null;
          const calcValReserva = isAcordo ? (calcValEscritorio || 0) * (pctReserva / 100) : null;

          return {
            user_id: uid,
            cliente_id: r.data.cliente_id,
            descricao: r.data.descricao,
            valor: val,
            data_vencimento: r.data.data_vencimento || new Date().toISOString().split("T")[0],
            data_pagamento: r.data.data_pagamento || null,
            status: (r.data.status === "Pago" ? "Pago" : "Pendente") as "Pago" | "Pendente",
            tipo_lancamento: tipoLanc,
            status_cliente: isAcordo ? "Pendente" : null,
            status_parceiro: isAcordo ? "Pendente" : null,
            valor_cliente: calcValCliente,
            valor_escritorio: calcValEscritorio,
            valor_parceiro: calcValParceiro,
            valor_parceiro2: calcValParceiro2,
            valor_parceiro3: calcValParceiro3,
            valor_reserva: calcValReserva,
            pct_parceiro2: isAcordo ? pctParceiro2 : null,
            pct_parceiro3: isAcordo ? pctParceiro3 : null,
            pct_reserva: isAcordo ? pctReserva : null,
            valor_sucumbencia: isAcordo ? valorSucumbencia : null,
            instituicao_financeira: r.data.instituicao_financeira || null,
            depositante: r.data.depositante || null,
            data_fato_gerador: r.data.data_fato_gerador || null,
            forma_recebimento: r.data.forma_recebimento || null,
            caixa_box: r.data.caixa_box || null,
          };
        });

        const { error } = await supabase.from("financeiro_lancamentos").insert(payload);
        if (error) throw error;
      }

      toast({
        title: "Sucesso!",
        description: `${readyToImport.length} registros inseridos com sucesso na base de dados!`,
      });
      setParsedData([]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMsg = "Erro desconhecido ao salvar dados.";
      if (err?.message) {
        errorMsg = err.message;
        if (err.details) errorMsg += ` (${err.details})`;
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      toast({
        title: "Erro na Inserção",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    let query;
    let filename = "";

    if (table === "clientes") {
      query = supabase.from("clientes").select("nome, filiacao, email, telefone, endereco, status, data_registro, logradouro, numero, bairro, referencia, cidade, uf, data_inicio_relacionamento, cnh, data_nascimento, estado_civil, rg, cpf, chave_pix, instituicao_financeira");
      filename = "clientes_exportados.csv";
    } else if (table === "processos") {
      query = supabase.from("processos").select("numero, assunto, status, data_inicio, prioridade, responsavel, valor_causa, instancia");
      filename = "processos_exportados.csv";
    } else {
      query = supabase.from("financeiro_lancamentos").select("descricao, valor, data_vencimento, data_pagamento, status");
      filename = "financeiro_exportado.csv";
    }

    const { data, error } = await query;
    if (error) {
      toast({
        title: "Erro de Exportação",
        description: "Erro ao consultar banco de dados para exportação.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      toast({
        title: "Sem registros",
        description: "Não existem registros cadastrados para exportar.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Build CSV Content
    const headers = Object.keys(data[0]);
    let csvContent = headers.join(";") + "\n";

    data.forEach((row: Record<string, unknown>) => {
      const values = headers.map(header => {
        const val = row[header];
        if (val === null || val === undefined) return "";
        const valStr = String(val).replace(/"/g, '""');
        if (valStr.includes(";") || valStr.includes("\n") || valStr.includes(",")) {
          return `"${valStr}"`;
        }
        return valStr;
      });
      csvContent += values.join(";") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setLoading(false);
    toast({
      title: "Exportado!",
      description: `Planilha ${filename} baixada com ${data.length} registros.`,
    });
    onClose();
  };

  const handleReset = () => {
    setParsedData([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleReset}>
      <DialogContent className="max-w-4xl bg-background/95 backdrop-blur-xl border border-border/20 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif text-foreground flex items-center gap-2">
            <span className="text-primary">📊</span> Planilhas (Excel/CSV) &mdash; {TABLE_NAMES[table]}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Importe em lote ou faça downloads rápidos dos registros desta tabela.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full mt-2">
          <TabsList className="grid w-full max-w-xs grid-cols-2 bg-muted/20 border border-border/10 p-1 rounded-lg mb-4">
            <TabsTrigger value="import" className="py-2 transition-all text-xs">Importar</TabsTrigger>
            <TabsTrigger value="export" className="py-2 transition-all text-xs">Exportar</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1 border-border/20 bg-background/40">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-bold font-serif">1. Planilha Modelo</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Use o nosso modelo padrão para organizar os dados e evitar erros de importação.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="w-full border-primary/20 hover:border-primary/50 text-[11px] h-9"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar Modelo CSV
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-border/20 bg-background/40">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-bold font-serif">2. Upload do Arquivo CSV</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-lg p-6 text-center transition-all duration-300 ${
                      dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-background/20"
                    }`}
                  >
                    <input
                      type="file"
                      id="modal-file-upload"
                      className="hidden"
                      accept=".csv"
                      onChange={handleFileUpload}
                    />
                    <label htmlFor="modal-file-upload" className="cursor-pointer block space-y-3">
                      <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Upload className="h-4 w-4 text-[#EBB52C]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Arraste seu arquivo .csv aqui, ou clique para navegar</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Apenas arquivos formatados em CSV (; ou ,) são aceitos.</p>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {parsedData.length > 0 && (
              <Card className="border-border/20 bg-background/40">
                <CardHeader className="p-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold font-serif">Validação dos Dados</CardTitle>
                    <CardDescription className="text-[10px]">Confira os erros abaixo antes de salvar.</CardDescription>
                  </div>
                  <Button onClick={handleImportData} disabled={importing} size="sm" className="bg-primary hover:bg-primary/95 text-xs text-primary-foreground font-semibold px-4 h-9">
                    {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                    Confirmar ({parsedData.filter(r => r.status !== "error").length} linhas)
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0 overflow-x-auto max-h-[30vh]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border/30 text-muted-foreground font-bold bg-muted/10">
                        <th className="py-2 px-2 text-center w-12">Linha</th>
                        <th className="py-2 px-2">Conteúdo</th>
                        <th className="py-2 px-2 text-center w-20">Status</th>
                        <th className="py-2 px-2">Detalhamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                      {parsedData.map((row) => (
                        <tr key={row.row} className="hover:bg-muted/5">
                          <td className="py-2 px-2 text-center font-mono text-[10px] text-muted-foreground">{row.row}</td>
                          <td className="py-2 px-2">
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {Object.entries(row.data)
                                .filter(([k]) => k !== "cliente_id")
                                .slice(0, 3)
                                .map(([key, val]) => (
                                  <span key={key} className="bg-muted/30 border border-border/15 px-1.5 py-0.5 rounded text-muted-foreground">
                                    <strong className="text-foreground/80">{key}:</strong> {String(val)}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center">
                            {row.status === "success" && <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0">OK</Badge>}
                            {row.status === "warning" && <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-2 py-0">Aviso</Badge>}
                            {row.status === "error" && <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-500 border-red-500/20 px-2 py-0">Erro</Badge>}
                          </td>
                          <td className="py-2 px-2 text-[10px]">
                            {row.errors.length > 0 && <span className="text-red-500 font-semibold">{row.errors.join(" | ")}</span>}
                            {row.warnings.length > 0 && <span className="text-yellow-500">{row.warnings.join(" | ")}</span>}
                            {row.errors.length === 0 && row.warnings.length === 0 && <span className="text-muted-foreground italic">Pronto</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1 border-border/20 bg-background/40">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-bold font-serif">Baixar Planilha Completa</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Clique abaixo para exportar e baixar todos os registros desta tabela no formato CSV compatível com Excel.
                  </p>
                  <Button
                    onClick={handleExportData}
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/95 text-xs text-primary-foreground font-semibold h-9"
                  >
                    {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                    Exportar Registros
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 border-border/20 bg-background/40">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-bold font-serif">Pré-visualização dos Dados</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 overflow-x-auto">
                  {loading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : exportDataPreview.length > 0 ? (
                    <table className="w-full text-[10px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/30 text-muted-foreground bg-muted/10 font-mono text-[9px] uppercase tracking-wider">
                          {Object.keys(exportDataPreview[0]).map((h) => (
                            <th key={h} className="py-2 px-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exportDataPreview.map((row, idx) => (
                          <tr key={idx} className="border-b border-border/20 hover:bg-muted/5">
                            {Object.values(row).map((val: unknown, colIdx) => (
                              <td key={colIdx} className="py-2 px-3 text-muted-foreground max-w-xs truncate">
                                {val === null || val === undefined ? (
                                  <span className="italic text-muted-foreground/30">nulo</span>
                                ) : (
                                  String(val)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground italic">Nenhum registro encontrado nesta tabela.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
