import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Printer,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FaturaEmitida {
  id: string;
  numero: string;
  clienteId: string;
  clienteNome: string;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string | null;
  valor: number;
  despesas: number;
  honorarios: number;
  timesheet: number;
  status: "Pendente" | "Paga" | "Cancelada";
  itens: { descricao: string; valor: number; tipo: string }[];
}

interface AbaFaturasAstreaProps {
  subAbaFaturas: "a_faturar" | "emitidas";
  onMudarSubAba: (sub: "a_faturar" | "emitidas") => void;
  lancamentos: any[];
  clientes: { id: string; nome: string }[];
  onAtualizarLancamentos?: () => void;
}

export const AbaFaturasAstrea: React.FC<AbaFaturasAstreaProps> = ({
  subAbaFaturas,
  onMudarSubAba,
  lancamentos,
  clientes,
  onAtualizarLancamentos,
}) => {
  const [busca, setBusca] = useState("");
  const [mesOffset, setMesOffset] = useState(0); // 0 = Este mês

  // Faturas emitidas salvas (persistência local)
  const [faturasEmitidas, setFaturasEmitidas] = useState<FaturaEmitida[]>(() => {
    try {
      const salvas = localStorage.getItem("jus_faturas_emitidas_v1");
      if (salvas) return JSON.parse(salvas);
    } catch {}

    // Faturas iniciais de exemplo realistas
    return [
      {
        id: "fat-1",
        numero: "FAT-2026-001",
        clienteId: "c1",
        clienteNome: "Admilson De Almeida Carvalho",
        dataEmissao: "2026-11-05",
        dataVencimento: "2026-11-20",
        dataPagamento: null,
        valor: 4500.0,
        despesas: 350.0,
        honorarios: 4150.0,
        timesheet: 0,
        status: "Pendente",
        itens: [
          { descricao: "Honorários contratuais - Ação Trabalhista TRT15", valor: 4150.0, tipo: "Honorários" },
          { descricao: "Custas de distribuição e certidões", valor: 350.0, tipo: "Despesas" },
        ],
      },
      {
        id: "fat-2",
        numero: "FAT-2026-002",
        clienteId: "c2",
        clienteNome: "Normi De Jesus Silva",
        dataEmissao: "2026-11-01",
        dataVencimento: "2026-11-15",
        dataPagamento: "2026-11-14",
        valor: 2800.0,
        despesas: 0,
        honorarios: 2800.0,
        timesheet: 0,
        status: "Paga",
        itens: [
          { descricao: "Honorários consultoria e petição inicial", valor: 2800.0, tipo: "Honorários" },
        ],
      },
    ];
  });

  const salvarFaturas = (lista: FaturaEmitida[]) => {
    setFaturasEmitidas(lista);
    try {
      localStorage.setItem("jus_faturas_emitidas_v1", JSON.stringify(lista));
    } catch {}
  };

  // Modal de Emissão de Fatura para um Cliente
  const [clienteParaFaturar, setClienteParaFaturar] = useState<any | null>(null);
  const [modalEmitirAberto, setModalEmitirAberto] = useState(false);

  // Modal de Visualização da Fatura Emitida
  const [faturaVisualizar, setFaturaVisualizar] = useState<FaturaEmitida | null>(null);

  // Data do mês selecionado
  const dataMesSelecionado = useMemo(() => {
    const d = new Date(2026, 10, 16); // Novembro 2026
    return mesOffset === 0 ? d : mesOffset > 0 ? addMonths(d, mesOffset) : subMonths(d, Math.abs(mesOffset));
  }, [mesOffset]);

  const textoMesAno = useMemo(() => {
    const nomeMes = format(dataMesSelecionado, "MMMM", { locale: ptBR });
    const ano = format(dataMesSelecionado, "yyyy");
    const capital = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
    return `${capital} de ${ano}`;
  }, [dataMesSelecionado]);

  // Agrupamento de clientes "A Faturar"
  const clientesAFaturar = useMemo(() => {
    const pendentes = lancamentos.filter((l) => l.status === "Pendente");
    const mapa = new Map<string, {
      clienteId: string;
      clienteNome: string;
      despesas: number;
      honorarios: number;
      timesheet: number;
      total: number;
      itens: any[];
    }>();

    for (const l of pendentes) {
      const cId = l.clienteId || "avulso";
      const cNome = l.clienteNome || "Cliente Avulso";

      if (!mapa.has(cId)) {
        mapa.set(cId, {
          clienteId: cId,
          clienteNome: cNome,
          despesas: 0,
          honorarios: 0,
          timesheet: 0,
          total: 0,
          itens: [],
        });
      }

      const item = mapa.get(cId)!;
      const v = Number(l.valor) || 0;
      item.total += v;
      item.itens.push(l);

      if (l.tipo_lancamento === "Despesa") {
        item.despesas += v;
      } else {
        item.honorarios += v;
      }
    }

    let lista = Array.from(mapa.values());
    if (busca.trim()) {
      const b = busca.toLowerCase();
      lista = lista.filter((c) => c.clienteNome.toLowerCase().includes(b));
    }
    return lista.sort((a, b) => a.clienteNome.localeCompare(b.clienteNome));
  }, [lancamentos, busca]);

  // Faturas Emitidas filtradas por busca e mês
  const faturasFiltradas = useMemo(() => {
    const chaveMes = format(dataMesSelecionado, "yyyy-MM");
    return faturasEmitidas.filter((f) => {
      const matchMes = f.dataEmissao.startsWith(chaveMes) || f.dataVencimento.startsWith(chaveMes);
      const matchBusca = !busca.trim() || f.clienteNome.toLowerCase().includes(busca.toLowerCase()) || f.numero.toLowerCase().includes(busca.toLowerCase());
      return matchMes && matchBusca;
    });
  }, [faturasEmitidas, dataMesSelecionado, busca]);

  const handleEmitirFaturaConfirmada = () => {
    if (!clienteParaFaturar) return;

    const proximoNum = `FAT-2026-${String(faturasEmitidas.length + 1).padStart(3, "0")}`;
    const novaFatura: FaturaEmitida = {
      id: "fat-" + Date.now(),
      numero: proximoNum,
      clienteId: clienteParaFaturar.clienteId,
      clienteNome: clienteParaFaturar.clienteNome,
      dataEmissao: new Date().toISOString().slice(0, 10),
      dataVencimento: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      valor: clienteParaFaturar.total,
      despesas: clienteParaFaturar.despesas,
      honorarios: clienteParaFaturar.honorarios,
      timesheet: clienteParaFaturar.timesheet,
      status: "Pendente",
      itens: clienteParaFaturar.itens.map((i: any) => ({
        descricao: i.descricao,
        valor: Number(i.valor),
        tipo: i.tipo_lancamento || "Honorários",
      })),
    };

    salvarFaturas([novaFatura, ...faturasEmitidas]);
    setModalEmitirAberto(false);
    setClienteParaFaturar(null);
    toast.success(`Fatura ${novaFatura.numero} emitida com sucesso!`, {
      description: `Cliente: ${novaFatura.clienteNome} · Total: R$ ${novaFatura.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    });
    onMudarSubAba("emitidas");
  };

  const handleImprimirRelatorio = () => {
    window.print();
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDataBr = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return format(new Date(iso.slice(0, 10) + "T00:00:00"), "dd/MM/yyyy");
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR DE PESQUISA (IDÊNTICA AOS PRINTS 2 E 3) */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Seletor dropdown A Faturar / Emitidas */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-9 px-3 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-[#010E38] flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <span>{subAbaFaturas === "a_faturar" ? "A faturar" : "Emitidas"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 bg-white border border-slate-200 shadow-md p-1 text-xs">
              <DropdownMenuItem
                onClick={() => onMudarSubAba("a_faturar")}
                className={`cursor-pointer py-2 px-3 font-semibold ${
                  subAbaFaturas === "a_faturar" ? "bg-slate-100 text-[#010E38]" : "text-slate-700"
                }`}
              >
                A faturar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onMudarSubAba("emitidas")}
                className={`cursor-pointer py-2 px-3 font-semibold ${
                  subAbaFaturas === "emitidas" ? "bg-slate-100 text-[#010E38]" : "text-slate-700"
                }`}
              >
                Emitidas
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Input de Busca */}
          <div className="relative flex-1">
            <Input
              placeholder="Encontre processo, caso ou atendimento"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="text-xs pr-8 bg-white border-slate-200 h-9"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Botão de Impressão */}
        <button
          type="button"
          onClick={handleImprimirRelatorio}
          title="Imprimir relatório"
          className="w-9 h-9 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shrink-0 self-end sm:self-center"
        >
          <Printer className="w-4 h-4" />
        </button>
      </div>

      {/* ============================================================
          VISÃO 1: FATURAS A FATURAR (PRINT 2)
          ============================================================ */}
      {subAbaFaturas === "a_faturar" && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Subheader */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 text-xs font-medium text-slate-600">
            Mostrando <strong className="text-slate-800">{clientesAFaturar.length}</strong>{" "}
            cliente{clientesAFaturar.length === 1 ? "" : "s"} com despesas, honorários e timesheets{" "}
            <span className="font-bold text-[#010E38]">a faturar</span>
          </div>

          {clientesAFaturar.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">Nenhum cliente com valores pendentes de faturamento</p>
              <p>Quando houver honorários ou despesas a faturar vinculados aos clientes, eles aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                  <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <TableHead className="py-3 px-4 text-left">CLIENTE</TableHead>
                    <TableHead className="py-3 px-4 text-right">DESPESAS</TableHead>
                    <TableHead className="py-3 px-4 text-right">HONORÁRIOS</TableHead>
                    <TableHead className="py-3 px-4 text-right">TIMESHEET</TableHead>
                    <TableHead className="py-3 px-4 text-right">TOTAL</TableHead>
                    <TableHead className="py-3 px-4 text-center w-28">AÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs">
                  {clientesAFaturar.map((c) => (
                    <TableRow key={c.clienteId} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-3 px-4 font-semibold text-slate-800">
                        {c.clienteNome}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatBRL(c.despesas)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatBRL(c.honorarios)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono text-slate-400">
                        {formatBRL(c.timesheet)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-[#010E38]">
                        {formatBRL(c.total)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setClienteParaFaturar(c);
                            setModalEmitirAberto(true);
                          }}
                          className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 text-[11px] font-bold uppercase rounded px-3 py-1 h-7 shadow-sm transition-all"
                        >
                          FATURAR
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          VISÃO 2: FATURAS EMITIDAS (PRINT 3)
          ============================================================ */}
      {subAbaFaturas === "emitidas" && (
        <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden space-y-0">
          {/* Barra de Mês e Paginação (Ex: Novembro de 2026 · X fatura(s) emitida(s)   < Este mês >) */}
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 text-xs">
            <div className="font-semibold text-slate-700">
              <span className="text-[#010E38] font-bold">{textoMesAno}</span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-500">
                {faturasFiltradas.length} fatura{faturasFiltradas.length === 1 ? "" : "s"} emitida{faturasFiltradas.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Navegador < Este mês > */}
            <div className="flex items-center gap-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMesOffset((m) => m - 1)}
                title="Mês anterior"
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setMesOffset(0)}
                className="px-2.5 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
              >
                {mesOffset === 0 ? "Este mês" : "Voltar p/ Este mês"}
              </button>

              <button
                type="button"
                onClick={() => setMesOffset((m) => m + 1)}
                title="Próximo mês"
                className="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {faturasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-700">Nenhuma fatura emitida neste período</p>
              <p>Selecione a aba "A faturar" para emitir faturas unificadas a partir dos honorários e despesas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                  <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <TableHead className="py-3 px-4 w-12 text-center">
                      <input type="checkbox" className="accent-[#010E38] rounded w-3.5 h-3.5" />
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-slate-800">
                        <span>NÚMERO</span>
                        <ArrowUpDown className="w-3 h-3 text-[#010E38]" />
                      </div>
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left">VENCIMENTO</TableHead>
                    <TableHead className="py-3 px-4 text-left">PAGAMENTO</TableHead>
                    <TableHead className="py-3 px-4 text-left">CLIENTE</TableHead>
                    <TableHead className="py-3 px-4 text-right">VALOR</TableHead>
                    <TableHead className="py-3 px-4 text-center w-24">AÇÃO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 text-xs">
                  {faturasFiltradas.map((fat) => (
                    <TableRow key={fat.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="py-3 px-4 text-center">
                        <input type="checkbox" className="accent-[#010E38] rounded w-3.5 h-3.5" />
                      </TableCell>
                      <TableCell className="py-3 px-4 font-mono font-bold text-[#010E38]">
                        {fat.numero}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-slate-600 font-mono">
                        {formatDataBr(fat.dataVencimento)}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        {fat.status === "Paga" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
                            Pago em {formatDataBr(fat.dataPagamento)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50/50">
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-medium text-slate-800">
                        {fat.clienteNome}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        {formatBRL(fat.valor)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setFaturaVisualizar(fat)}
                          className="text-xs font-bold text-[#010E38] hover:underline"
                        >
                          Ver
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL: EMITIR FATURA (CONSOLIDAÇÃO)
          ============================================================ */}
      <Dialog open={modalEmitirAberto} onOpenChange={setModalEmitirAberto}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38]">
              Emitir Fatura para {clienteParaFaturar?.clienteNome}
            </DialogTitle>
          </DialogHeader>

          {clienteParaFaturar && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                <p className="text-slate-500">Resumo de itens a consolidar:</p>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Despesas:</span>
                    <strong className="text-slate-700">{formatBRL(clienteParaFaturar.despesas)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Honorários:</span>
                    <strong className="text-slate-700">{formatBRL(clienteParaFaturar.honorarios)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Total da Fatura:</span>
                    <strong className="text-[#010E38] text-sm">{formatBRL(clienteParaFaturar.total)}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-slate-700">Lançamentos incluídos ({clienteParaFaturar.itens.length}):</span>
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded p-2 bg-white">
                  {clienteParaFaturar.itens.map((it: any, i: number) => (
                    <div key={i} className="py-1.5 flex justify-between items-center text-[11px]">
                      <span className="text-slate-700 truncate pr-2">{it.descricao}</span>
                      <span className="font-mono font-medium text-slate-800 shrink-0">{formatBRL(Number(it.valor))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEmitirAberto(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
                >
                  Cancelar
                </button>
                <Button
                  type="button"
                  onClick={handleEmitirFaturaConfirmada}
                  className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-5 py-2 rounded shadow-sm"
                >
                  CONFIRMAR E EMITIR
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: VISUALIZAR FATURA EMITIDA
          ============================================================ */}
      <Dialog open={!!faturaVisualizar} onOpenChange={(open) => !open && setFaturaVisualizar(null)}>
        <DialogContent className="max-w-2xl bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          {faturaVisualizar && (
            <div className="space-y-6">
              {/* Topo da Fatura */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#010E38] tracking-tight">FATURA DE SERVIÇOS JURÍDICOS</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{faturaVisualizar.numero}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-[#010E38] text-[#EBB52C] border border-[#EBB52C]/30 text-xs font-bold uppercase">
                    {faturaVisualizar.status}
                  </Badge>
                  <p className="text-[11px] text-slate-500 mt-1">Emissão: {formatDataBr(faturaVisualizar.dataEmissao)}</p>
                </div>
              </div>

              {/* Dados do Cliente e Vencimento */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tomador / Cliente</span>
                  <strong className="text-sm text-slate-800">{faturaVisualizar.clienteNome}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vencimento</span>
                  <strong className="text-sm text-slate-800 font-mono">{formatDataBr(faturaVisualizar.dataVencimento)}</strong>
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700">Discriminação dos Serviços e Despesas:</span>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px]">
                      <tr>
                        <th className="py-2 px-3 text-left">ITEM</th>
                        <th className="py-2 px-3 text-left">TIPO</th>
                        <th className="py-2 px-3 text-right">VALOR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {faturaVisualizar.itens.map((it, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 text-slate-800">{it.descricao}</td>
                          <td className="py-2 px-3 text-slate-500">{it.tipo}</td>
                          <td className="py-2 px-3 text-right font-mono font-medium">{formatBRL(it.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                      <tr>
                        <td colSpan={2} className="py-2.5 px-3 text-right text-slate-700">TOTAL:</td>
                        <td className="py-2.5 px-3 text-right font-mono text-sm text-[#010E38]">{formatBRL(faturaVisualizar.valor)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImprimirRelatorio}
                  className="flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </Button>

                <div className="flex items-center gap-2">
                  {faturaVisualizar.status === "Pendente" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        const atualizadas = faturasEmitidas.map((f) =>
                          f.id === faturaVisualizar.id ? { ...f, status: "Paga" as const, dataPagamento: new Date().toISOString().slice(0, 10) } : f
                        );
                        salvarFaturas(atualizadas);
                        setFaturaVisualizar(null);
                        toast.success("Fatura liquidada como PAGA!");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase px-3 py-1.5 rounded"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Marcar como Paga
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFaturaVisualizar(null)}
                    className="border-slate-200 text-slate-700 text-xs font-semibold"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
