import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, HardDrive, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import PizZip from "pizzip";

type ArquivoBackup = {
  arquivo: string;
  tamanho: number;
  em: string;
  documentos: number;
  registros: number;
};

const STORAGE_HISTORICO = "jusmais_backups_historico_v1";

const formatarTamanho = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2).replace(".", ",")} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function paraCsv(linhas: Record<string, unknown>[]): string {
  if (!linhas || linhas.length === 0) return "";
  const colunas = Array.from(
    linhas.reduce((acc, row) => {
      Object.keys(row || {}).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );
  const escapar = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const cabecalho = colunas.map(escapar).join(";");
  const corpo = linhas.map((row) => colunas.map((c) => escapar(row[c])).join(";")).join("\r\n");
  // BOM UTF-8 para abrir direto no Excel com acentuação correta
  return "\uFEFF" + cabecalho + "\r\n" + corpo;
}

type JanelaSalvar = (o: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable: () => Promise<{ write: (d: Blob) => Promise<void>; close: () => Promise<void> }>;
}>;

export function BackupCard() {
  const [historico, setHistorico] = useState<ArquivoBackup[]>([]);
  const [gerando, setGerando] = useState(false);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [ultimoBlob, setUltimoBlob] = useState<{ nome: string; blob: Blob } | null>(null);

  const carregarHistorico = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORICO);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistorico(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

  const montarPacoteBackup = async (): Promise<{
    nomeArquivo: string;
    blob: Blob;
    meta: ArquivoBackup;
  }> => {
    const tabelas = [
      "clientes",
      "cliente_nichos",
      "cliente_anotacoes",
      "processos",
      "audiencias",
      "tarefas",
      "tarefa_comentarios",
      "agenda_eventos",
      "financeiro_lancamentos",
      "honorarios_propostas",
      "documentos",
      "document_templates",
      "message_templates",
      "equipe",
      "profiles",
      "suporte_chamados",
    ] as const;

    const resultados = await Promise.all(
      tabelas.map(async (tabela) => {
        const { data } = await supabase.from(tabela as never).select("*");
        return [tabela, (data as Record<string, unknown>[]) || []] as const;
      })
    );

    const zip = new PizZip();
    const dumpCompleto: Record<string, Record<string, unknown>[]> = {};
    let totalRegistros = 0;
    let totalDocumentos = 0;

    for (const [tabela, dados] of resultados) {
      dumpCompleto[tabela] = dados;
      totalRegistros += dados.length;
      if (tabela === "documentos") totalDocumentos = dados.length;
      zip.file(`planilhas/${tabela}.csv`, paraCsv(dados));
    }

    const agora = new Date();
    const carimbo = agora.toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const nomeArquivo = `backup-jusmais-${carimbo}.zip`;

    zip.file(
      "banco_completo_jusmais.json",
      JSON.stringify(
        {
          sistema: "Jus+ (JusMais) — Venda+ Tech",
          gerado_em: agora.toISOString(),
          total_registros: totalRegistros,
          tabelas: dumpCompleto,
        },
        null,
        2
      )
    );

    zip.file(
      "LEIA-ME.txt",
      [
        "==============================================================",
        "BACKUP COMPLETO — JUS+ (JUSMAIS) | VENDA+ TECH",
        "==============================================================",
        `Data de geração: ${agora.toLocaleString("pt-BR")}`,
        `Total de registros exportados: ${totalRegistros}`,
        `Documentos catalogados: ${totalDocumentos}`,
        "",
        "Conteúdo deste pacote (.zip):",
        "1. Pasta /planilhas: arquivos .CSV compatíveis com Microsoft Excel (separados por ponto e vírgula).",
        "2. Arquivo banco_completo_jusmais.json: cópia técnica integral de todas as tabelas do banco de dados.",
      ].join("\r\n")
    );

    const blob = zip.generate({
      type: "blob",
      mimeType: "application/zip",
      compression: "DEFLATE",
    });

    const meta: ArquivoBackup = {
      arquivo: nomeArquivo,
      tamanho: blob.size,
      em: agora.toISOString(),
      documentos: totalDocumentos,
      registros: totalRegistros,
    };

    return { nomeArquivo, blob, meta };
  };

  const gerar = async () => {
    setGerando(true);
    try {
      const { nomeArquivo, blob, meta } = await montarPacoteBackup();
      setUltimoBlob({ nome: nomeArquivo, blob });

      const novaLista = [meta, ...historico].slice(0, 7);
      setHistorico(novaLista);
      try {
        localStorage.setItem(STORAGE_HISTORICO, JSON.stringify(novaLista));
      } catch {
        /* ignore */
      }

      toast.success("Backup gerado com sucesso!", {
        description: `${meta.registros} registros exportados (${formatarTamanho(meta.tamanho)}). Clique em Salvar no PC / pen drive.`,
      });
    } catch (e) {
      toast.error("Não foi possível gerar o backup", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setGerando(false);
    }
  };

  const baixar = async (a: ArquivoBackup) => {
    setBaixando(a.arquivo);
    try {
      let blobParaSalvar: Blob;
      if (ultimoBlob && ultimoBlob.nome === a.arquivo) {
        blobParaSalvar = ultimoBlob.blob;
      } else {
        const pacote = await montarPacoteBackup();
        blobParaSalvar = pacote.blob;
      }

      const salvarComo = (window as unknown as { showSaveFilePicker?: JanelaSalvar })
        .showSaveFilePicker;
      if (salvarComo) {
        try {
          const destino = await salvarComo({
            suggestedName: a.arquivo,
            types: [{ description: "Backup (.zip)", accept: { "application/zip": [".zip"] } }],
          });
          const w = await destino.createWritable();
          await w.write(blobParaSalvar);
          await w.close();
          toast.success("Backup salvo no local escolhido!");
          return;
        } catch {
          return;
        }
      }

      const url = URL.createObjectURL(blobParaSalvar);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.arquivo;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success("Backup baixado!", {
        description: "Arquivo salvo na pasta Downloads. Copie-o para seu pen drive ou HD externo.",
      });
    } catch (e) {
      toast.error("Erro ao baixar o backup", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBaixando(null);
    }
  };

  const ultimo = historico[0] || null;

  return (
    <Card className="border-[#010E38]/15">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-[#010E38] dark:text-[#F1F4F9]">
          <DatabaseBackup className="h-5 w-5 text-[#EBB52C]" /> Backup e Segurança
        </CardTitle>
        <CardDescription className="text-sm">
          Gere a qualquer momento uma cópia completa de todas as tabelas, clientes, processos, tarefas e lançamentos financeiros do sistema em formato <strong>.ZIP</strong> (com planilhas Excel + cópia técnica JSON) para guardar em pen drive ou HD externo.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4 text-sm">
        {ultimo && (
          <div className="rounded-md border border-[#010E38]/15 bg-[#F1F4F9] dark:bg-white/5 p-3 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#010E38] dark:text-[#EBB52C] shrink-0" />
            <p className="text-xs sm:text-sm text-[#010E38] dark:text-[#F1F4F9]">
              Último backup gerado: <strong className="font-data">{dataHora(ultimo.em)}</strong>
              {` · ${formatarTamanho(ultimo.tamanho)}`}
              {` · ${ultimo.registros} registros`}
              {ultimo.documentos != null ? ` · ${ultimo.documentos} documentos` : ""}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={gerar}
            disabled={gerando}
            className="bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-bold"
          >
            {gerando ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {gerando ? "Gerando backup..." : "Gerar backup agora"}
          </Button>
        </div>

        {historico.length > 0 && (
          <div className="space-y-2">
            <p className="font-bold text-xs uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
              Backups disponíveis para baixar
            </p>
            {historico.map((a, i) => (
              <div
                key={a.arquivo}
                className="flex items-center justify-between gap-2 rounded-md border border-[#010E38]/15 bg-white dark:bg-[#010E38] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-xs sm:text-sm">
                    <span className="font-data font-bold">{dataHora(a.em)}</span>{" "}
                    {i === 0 && (
                      <span className="text-[10px] font-bold uppercase bg-[#EBB52C] text-[#010E38] px-2 py-0.5 rounded ml-1.5">
                        Mais recente
                      </span>
                    )}
                  </p>
                  <p className="font-data text-xs text-muted-foreground mt-0.5">
                    {formatarTamanho(a.tamanho)} · {a.registros} registros
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => baixar(a)}
                  disabled={!!baixando}
                  className="bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 font-bold text-xs shrink-0"
                >
                  {baixando === a.arquivo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <HardDrive className="h-4 w-4 mr-1.5" /> Salvar no PC / pen drive
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-md border border-[#010E38]/15 bg-[#F1F4F9]/60 dark:bg-white/5 p-3 text-xs space-y-1 text-muted-foreground">
          <p className="font-bold text-[#010E38] dark:text-[#F1F4F9] flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-[#010E38] dark:text-[#EBB52C]" /> Como salvar no pen drive / HD externo
          </p>
          <p>
            1. Clique em <strong>Gerar backup agora</strong>. 2. Em seguida, clique em{" "}
            <strong>Salvar no PC / pen drive</strong>. 3. Na janela que abrir, escolha o pen drive ou HD externo e clique em Salvar.
          </p>
          <p>
            Dentro do arquivo <strong>.ZIP</strong> estão todas as planilhas (compatíveis com Excel) e a cópia técnica completa do banco de dados em JSON.
          </p>
        </div>

        <p className="text-xs flex gap-2 text-amber-600 dark:text-amber-500 font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          O backup contém dados pessoais dos clientes (LGPD). Guarde o pen drive em local seguro, não envie o arquivo por e-mail ou WhatsApp e apague cópias antigas.
        </p>
      </CardContent>
    </Card>
  );
}
