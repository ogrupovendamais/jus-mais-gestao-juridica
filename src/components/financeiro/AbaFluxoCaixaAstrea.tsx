import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LancamentoLite {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: "Pago" | "Pendente";
  tipo_lancamento?: string | null;
  caixa_box?: string | null;
  instituicao_financeira?: string | null;
}

interface AbaFluxoCaixaAstreaProps {
  lancamentos: LancamentoLite[];
}

export const AbaFluxoCaixaAstrea: React.FC<AbaFluxoCaixaAstreaProps> = ({
  lancamentos,
}) => {
  const [filtroCentroCusto, setFiltroCentroCusto] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState("TODAS");
  const [expandirEntradas, setExpandirEntradas] = useState(true);
  const [expandirSaidas, setExpandirSaidas] = useState(true);

  // Deslocamento de meses (0 = centralizado em Nov 2026)
  const [deslocamentoMeses, setDeslocamentoMeses] = useState(0);

  // Mês de referência atual: Novembro de 2026
  const mesAtualBase = useMemo(() => new Date(2026, 10, 1), []); // Nov 2026

  // Gerar os 5 meses visíveis na matriz
  const mesesColunas = useMemo(() => {
    // Janela de 5 meses: -3, -2, -1, 0, +1 em relação ao centro deslocado
    // Por padrão (deslocamento 0): Ago 2026, Set 2026, Out 2026, Nov 2026, Dez 2026
    const centro = addMonths(mesAtualBase, deslocamentoMeses);
    return [-3, -2, -1, 0, 1].map((offset) => {
      const d = addMonths(centro, offset);
      const chaveAnoMes = format(d, "yyyy-MM");
      const siglaMes = format(d, "MMM", { locale: ptBR }).toUpperCase().replace(".", "");
      const ano = format(d, "yyyy");
      const isMesAtual = chaveAnoMes === "2026-11";
      const isPassado = chaveAnoMes < "2026-11";

      let statusTexto = "PREVISTO";
      if (isPassado) {
        statusTexto = "REALIZADO";
      } else if (isMesAtual) {
        statusTexto = "REALIZADO E PREVISTO";
      }

      return {
        data: d,
        chave: chaveAnoMes,
        titulo: `${siglaMes} ${ano}`,
        statusTexto,
        isMesAtual,
      };
    });
  }, [mesAtualBase, deslocamentoMeses]);

  const anoExibicao = useMemo(() => {
    return format(mesesColunas[3]?.data || mesAtualBase, "yyyy");
  }, [mesesColunas, mesAtualBase]);

  // Filtragem dos lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroCentroCusto.trim()) {
        const busca = filtroCentroCusto.toLowerCase();
        const matchDesc = (l.descricao || "").toLowerCase().includes(busca);
        const matchBox = (l.caixa_box || "").toLowerCase().includes(busca);
        if (!matchDesc && !matchBox) return false;
      }
      if (contaSelecionada !== "TODAS") {
        const matchConta = (l.instituicao_financeira || "").toLowerCase().includes(contaSelecionada.toLowerCase());
        if (!matchConta) return false;
      }
      return true;
    });
  }, [lancamentos, filtroCentroCusto, contaSelecionada]);

  // Cálculo financeiro por mês
  const fluxoMensal = useMemo(() => {
    let saldoAcumulado = 0;

    return mesesColunas.map((col) => {
      const lancDoMes = lancamentosFiltrados.filter((l) => {
        const d = (l.status === "Pago" && l.dataPagamento) ? l.dataPagamento : l.dataVencimento;
        return d && d.startsWith(col.chave);
      });

      // Detalhamento de Entradas
      const honorarios = lancDoMes
        .filter((l) => l.tipo_lancamento !== "Despesa" && (l.tipo_lancamento === "Receita" || l.tipo_lancamento === "Sucumbência" || !l.tipo_lancamento))
        .reduce((sum, l) => sum + Number(l.valor || 0), 0);

      const acordos = lancDoMes
        .filter((l) => l.tipo_lancamento === "Acordo")
        .reduce((sum, l) => sum + Number(l.valor || 0), 0);

      const totalEntradas = honorarios + acordos;

      // Detalhamento de Saídas
      const custasDespesas = lancDoMes
        .filter((l) => l.tipo_lancamento === "Despesa")
        .reduce((sum, l) => sum + Number(l.valor || 0), 0);

      const totalSaidas = custasDespesas;

      const saldoAnterior = saldoAcumulado;
      const saldoPeriodo = totalEntradas - totalSaidas;
      const saldoFinal = saldoAnterior + saldoPeriodo;

      // Atualiza acumulado para o próximo mês
      saldoAcumulado = saldoFinal;

      return {
        coluna: col,
        saldoAnterior,
        honorarios,
        acordos,
        totalEntradas,
        custasDespesas,
        totalSaidas,
        saldoPeriodo,
        saldoFinal,
      };
    });
  }, [mesesColunas, lancamentosFiltrados]);

  const formatValor = (v: number) => {
    return v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleExportarExcel = () => {
    try {
      const headers = ["Descrição", ...mesesColunas.map((m) => `${m.titulo} (${m.statusTexto})`)];
      const linhas: string[][] = [];

      linhas.push(["Saldo anterior", ...fluxoMensal.map((f) => formatValor(f.saldoAnterior))]);
      linhas.push(["TOTAL ENTRADAS", ...fluxoMensal.map((f) => formatValor(f.totalEntradas))]);
      linhas.push(["TOTAL SAÍDAS", ...fluxoMensal.map((f) => formatValor(f.totalSaidas))]);
      linhas.push(["Saldo do período", ...fluxoMensal.map((f) => formatValor(f.saldoPeriodo))]);
      linhas.push(["Saldo final", ...fluxoMensal.map((f) => formatValor(f.saldoFinal))]);

      const csvContent =
        "data:text/csv;charset=utf-8,\uFEFF" +
        [headers.join(";"), ...linhas.map((e) => e.join(";"))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `fluxo_de_caixa_${anoExibicao}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Fluxo de caixa exportado para Excel (CSV) com sucesso!");
    } catch {
      toast.error("Erro ao exportar planilha.");
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. BARRA SUPERIOR DE FILTRO (EXATA DO ASTREA - SCREENSHOT) */}
      <div className="bg-white rounded-lg border border-slate-200/80 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Input: Digite o centro de custo para filtrar */}
        <div className="relative flex-1">
          <Input
            placeholder="Digite o centro de custo para filtrar"
            value={filtroCentroCusto}
            onChange={(e) => setFiltroCentroCusto(e.target.value)}
            className="text-xs pr-8 bg-white border-slate-200 h-9 placeholder:text-slate-400"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown TODAS + Setas de Navegação + Botão Exportar Planilha */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {/* Dropdown TODAS */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-9 px-4 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors uppercase tracking-wider"
              >
                <span>{contaSelecionada}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 bg-white border border-slate-200 shadow-md p-1 text-xs">
              <DropdownMenuItem onClick={() => setContaSelecionada("TODAS")} className="cursor-pointer py-1.5 px-3 font-semibold">
                TODAS AS CONTAS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setContaSelecionada("Banco do Brasil")} className="cursor-pointer py-1.5 px-3">
                Banco do Brasil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setContaSelecionada("Santander")} className="cursor-pointer py-1.5 px-3">
                Santander PJ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setContaSelecionada("Caixa")} className="cursor-pointer py-1.5 px-3">
                Caixa Econômica
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setContaSelecionada("NuBank")} className="cursor-pointer py-1.5 px-3">
                NuBank PJ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botões Setas ◀ ▶ */}
          <div className="flex items-center rounded border border-slate-200 bg-white overflow-hidden h-9">
            <button
              type="button"
              onClick={() => setDeslocamentoMeses((prev) => prev - 1)}
              title="Meses anteriores"
              className="w-8 h-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors border-r border-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeslocamentoMeses((prev) => prev + 1)}
              title="Próximos meses"
              className="w-8 h-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Exportar Planilha [x] */}
          <button
            type="button"
            onClick={handleExportarExcel}
            title="Exportar Fluxo de Caixa para Planilha"
            className="w-9 h-9 rounded border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TABELA MATRIZ DO FLUXO DE CAIXA */}
      <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Título Centralizado: FLUXO DE CAIXA DE 2026 */}
        <div className="text-center py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 bg-white">
          FLUXO DE CAIXA DE {anoExibicao}
        </div>

        <div className="overflow-x-auto">
          <Table className="w-full text-xs border-collapse">
            {/* CABEÇALHO DAS COLUNAS COM MESES */}
            <TableHeader className="bg-slate-50/90 border-b border-slate-200">
              <TableRow className="divide-x divide-slate-200/80 text-[11px]">
                {/* Coluna DESCRIÇÃO */}
                <TableHead className="py-2.5 px-3 w-64 font-bold text-slate-700 uppercase">
                  <div className="flex items-center justify-between">
                    <span>DESCRIÇÃO</span>
                    <button
                      type="button"
                      onClick={() => setDeslocamentoMeses((p) => p - 1)}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title="Mês anterior"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </TableHead>

                {/* 5 Colunas de Meses */}
                {mesesColunas.map((col, idx) => {
                  const isUltimo = idx === mesesColunas.length - 1;
                  return (
                    <TableHead
                      key={col.chave}
                      className={`py-2 px-3 text-center min-w-[120px] transition-colors ${
                        col.isMesAtual
                          ? "bg-[#FAF0D7] text-[#010E38]"
                          : "text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-full text-center space-y-0.5">
                          <p className="font-bold tracking-tight text-[11px]">{col.titulo}</p>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                            {col.statusTexto}
                          </p>
                        </div>
                        {isUltimo && (
                          <button
                            type="button"
                            onClick={() => setDeslocamentoMeses((p) => p + 1)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 shrink-0"
                            title="Próximo mês"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100 font-mono">
              {/* LINHA: SALDO ANTERIOR */}
              <TableRow className="divide-x divide-slate-100 hover:bg-slate-50/50">
                <TableCell className="py-2.5 px-3 font-sans font-medium text-slate-700 text-xs">
                  Saldo anterior
                </TableCell>
                {fluxoMensal.map((f) => (
                  <TableCell
                    key={f.coluna.chave}
                    className={`py-2.5 px-3 text-right text-xs ${
                      f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""
                    }`}
                  >
                    {formatValor(f.saldoAnterior)}
                  </TableCell>
                ))}
              </TableRow>

              {/* SEÇÃO 1: CABEÇALHO ENTRADAS (VERDE SUAVE #D4EDDA) */}
              <TableRow className="bg-[#D4EDDA]/70 border-y border-[#C3E6CB]">
                <TableCell
                  colSpan={6}
                  onClick={() => setExpandirEntradas((prev) => !prev)}
                  className="py-1.5 px-3 font-sans font-bold text-emerald-900 text-xs cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {expandirEntradas ? (
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-800" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-800" />
                    )}
                    <span>ENTRADAS</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* SUB-LINHAS EXPANDÍVEIS DE ENTRADAS */}
              {expandirEntradas && (
                <>
                  <TableRow className="divide-x divide-slate-100 hover:bg-slate-50/50 text-[11px]">
                    <TableCell className="py-1.5 px-5 font-sans text-slate-600">
                      Honorários advocatícios e êxito
                    </TableCell>
                    {fluxoMensal.map((f) => (
                      <TableCell
                        key={f.coluna.chave}
                        className={`py-1.5 px-3 text-right ${
                          f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""
                        }`}
                      >
                        {formatValor(f.honorarios)}
                      </TableCell>
                    ))}
                  </TableRow>

                  {fluxoMensal.some((f) => f.acordos > 0) && (
                    <TableRow className="divide-x divide-slate-100 hover:bg-slate-50/50 text-[11px]">
                      <TableCell className="py-1.5 px-5 font-sans text-slate-600">
                        Acordos e repasses recebidos
                      </TableCell>
                      {fluxoMensal.map((f) => (
                        <TableCell
                          key={f.coluna.chave}
                          className={`py-1.5 px-3 text-right ${
                            f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""
                          }`}
                        >
                          {formatValor(f.acordos)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </>
              )}

              {/* TOTAL ENTRADAS */}
              <TableRow className="divide-x divide-slate-100 font-bold hover:bg-slate-50/50">
                <TableCell className="py-2 px-3 font-sans text-slate-800 text-xs">
                  TOTAL
                </TableCell>
                {fluxoMensal.map((f) => (
                  <TableCell
                    key={f.coluna.chave}
                    className={`py-2 px-3 text-right text-xs text-emerald-700 ${
                      f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""
                    }`}
                  >
                    {formatValor(f.totalEntradas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* SEÇÃO 2: CABEÇALHO SAÍDAS (ROSA SUAVE #F8D7DA) */}
              <TableRow className="bg-[#F8D7DA]/70 border-y border-[#F5C6CB]">
                <TableCell
                  colSpan={6}
                  onClick={() => setExpandirSaidas((prev) => !prev)}
                  className="py-1.5 px-3 font-sans font-bold text-rose-900 text-xs cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    {expandirSaidas ? (
                      <ChevronDown className="w-3.5 h-3.5 text-rose-800" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-rose-800" />
                    )}
                    <span>SAÍDAS</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* SUB-LINHAS EXPANDÍVEIS DE SAÍDAS */}
              {expandirSaidas && (
                <TableRow className="divide-x divide-slate-100 hover:bg-slate-50/50 text-[11px]">
                  <TableCell className="py-1.5 px-5 font-sans text-slate-600">
                    Custas, fornecedores e operacionais
                  </TableCell>
                  {fluxoMensal.map((f) => (
                    <TableCell
                      key={f.coluna.chave}
                      className={`py-1.5 px-3 text-right ${
                        f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""
                      }`}
                    >
                      {formatValor(f.custasDespesas)}
                    </TableCell>
                  ))}
                </TableRow>
              )}

              {/* TOTAL SAÍDAS */}
              <TableRow className="divide-x divide-slate-100 font-bold hover:bg-slate-50/50">
                <TableCell className="py-2 px-3 font-sans text-slate-800 text-xs">
                  TOTAL
                </TableCell>
                {fluxoMensal.map((f) => (
                  <TableCell
                    key={f.coluna.chave}
                    className={`py-2 px-3 text-right text-xs text-rose-600 ${
                      f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""
                    }`}
                  >
                    {formatValor(f.totalSaidas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* SEÇÃO 3: CABEÇALHO SALDO (AZUL SUAVE #D1ECF1) */}
              <TableRow className="bg-[#D1ECF1]/70 border-y border-[#BEE5EB]">
                <TableCell colSpan={6} className="py-1.5 px-3 font-sans font-bold text-cyan-950 text-xs">
                  SALDO
                </TableCell>
              </TableRow>

              {/* LINHA: SALDO DO PERÍODO */}
              <TableRow className="divide-x divide-slate-100 hover:bg-slate-50/50">
                <TableCell className="py-2 px-3 font-sans font-medium text-slate-700 text-xs">
                  Saldo do período
                </TableCell>
                {fluxoMensal.map((f) => (
                  <TableCell
                    key={f.coluna.chave}
                    className={`py-2 px-3 text-right text-xs font-semibold ${
                      f.saldoPeriodo < 0 ? "text-rose-600" : f.saldoPeriodo > 0 ? "text-emerald-700" : "text-slate-700"
                    } ${f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""}`}
                  >
                    {formatValor(f.saldoPeriodo)}
                  </TableCell>
                ))}
              </TableRow>

              {/* LINHA: SALDO FINAL */}
              <TableRow className="divide-x divide-slate-100 font-bold hover:bg-slate-50/50">
                <TableCell className="py-2 px-3 font-sans text-slate-800 text-xs">
                  Saldo final
                </TableCell>
                {fluxoMensal.map((f) => (
                  <TableCell
                    key={f.coluna.chave}
                    className={`py-2 px-3 text-right text-xs ${
                      f.saldoFinal < 0 ? "text-rose-600" : f.saldoFinal > 0 ? "text-slate-900" : "text-slate-700"
                    } ${f.coluna.isMesAtual ? "bg-[#FAF0D7]/50" : ""}`}
                  >
                    {formatValor(f.saldoFinal)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
