import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Search, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ModalEntradaAstreaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  clientes: { id: string; nome: string }[];
}

export const ModalEntradaAstrea: React.FC<ModalEntradaAstreaProps> = ({
  open,
  onOpenChange,
  onSuccess,
  clientes,
}) => {
  const { user } = useAuth();
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [situacao, setSituacao] = useState<"a_receber" | "recebida">("a_receber");
  const [dataLancamento, setDataLancamento] = useState(hojeIso);
  const [tipo, setTipo] = useState<"Entrada avulsa" | "Adiantamento de despesa" | "Honorário">("Entrada avulsa");
  const [recebidaDe, setRecebidaDe] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [categoria, setCategoria] = useState("Honorários");
  const [centroCusto, setCentroCusto] = useState("Geral");
  const [conta, setConta] = useState("Conta padrão");
  const [repetirMensal, setRepetirMensal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      toast.error("Informe a descrição da entrada.");
      return;
    }

    const valorLimpo = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (valorLimpo <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    // Identificar ou atribuir cliente
    const clienteMatch = clientes.find((c) =>
      c.nome.toLowerCase().includes(recebidaDe.toLowerCase())
    ) || (clientes.length > 0 ? clientes[0] : null);

    setSalvando(true);
    try {
      const isPago = situacao === "recebida";
      const { error } = await supabase.from("financeiro_lancamentos").insert([
        {
          cliente_id: clienteMatch ? clienteMatch.id : "00000000-0000-0000-0000-000000000000",
          user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          descricao: `${descricao.trim()}${recebidaDe ? ` - ${recebidaDe}` : ""}`,
          valor: valorLimpo,
          data_vencimento: dataLancamento || hojeIso,
          data_pagamento: isPago ? dataLancamento : null,
          status: isPago ? "Pago" : "Pendente",
          tipo_lancamento: "Receita",
          instituicao_financeira: conta,
          depositante: recebidaDe || null,
        },
      ]);

      if (error) throw error;

      toast.success("Entrada registrada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro ao registrar entrada", { description: err?.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 text-[#010E38] rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
            Adicionar entrada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Linha 1: A receber / Recebida + Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-sm font-semibold">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="situacao_entrada"
                  checked={situacao === "a_receber"}
                  onChange={() => setSituacao("a_receber")}
                  className="accent-[#010E38] w-4 h-4"
                />
                <span className="text-slate-800">A receber</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="situacao_entrada"
                  checked={situacao === "recebida"}
                  onChange={() => setSituacao("recebida")}
                  className="accent-[#010E38] w-4 h-4"
                />
                <span className="text-slate-800">Recebida</span>
              </label>
            </div>

            <div className="space-y-1 sm:w-48">
              <Label className="text-xs font-semibold text-slate-700">
                {situacao === "a_receber" ? "A receber em*" : "Recebida em*"}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dataLancamento}
                  onChange={(e) => setDataLancamento(e.target.value)}
                  className="text-xs pr-8 bg-white border-slate-200"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tipo de Entrada */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <Label className="text-xs font-semibold text-slate-700">Tipo*</Label>
            <div className="flex flex-wrap items-center gap-6 text-xs">
              {(["Entrada avulsa", "Adiantamento de despesa", "Honorário"] as const).map((t) => (
                <label key={t} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_entrada"
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="accent-[#010E38] w-4 h-4"
                  />
                  <span className="text-slate-800 font-medium">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Recebida de */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Recebida de*</Label>
            <div className="relative">
              <Input
                placeholder="Digite o cliente, fornecedor, parceiro, etc."
                value={recebidaDe}
                onChange={(e) => setRecebidaDe(e.target.value)}
                className="text-xs pr-8 bg-white border-slate-200"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Descrição*</Label>
            <Input
              placeholder="Digite a descrição"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs bg-white border-slate-200"
            />
          </div>

          {/* Valor */}
          <div className="space-y-1 sm:w-1/2">
            <Label className="text-xs font-semibold text-slate-700">Valor*</Label>
            <Input
              placeholder="Digite o valor"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="text-xs bg-white border-slate-200 font-mono"
            />
          </div>

          {/* Número do documento */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Número do documento</Label>
            <Input
              placeholder="Digite o número da nota fiscal ou comprovante"
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              className="text-xs bg-white border-slate-200"
            />
          </div>

          {/* Classificação / Centro de custo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Classificação*</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="Honorários">Honorários</SelectItem>
                  <SelectItem value="Consultoria">Consultoria</SelectItem>
                  <SelectItem value="Êxito / Sucumbência">Êxito / Sucumbência</SelectItem>
                  <SelectItem value="Rendimentos Financeiros">Rendimentos Financeiros</SelectItem>
                  <SelectItem value="Outras Receitas">Outras Receitas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Centro de custo</Label>
              <Select value={centroCusto} onValueChange={setCentroCusto}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o centro de custo" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="Cível">Cível</SelectItem>
                  <SelectItem value="Previdenciário">Previdenciário</SelectItem>
                  <SelectItem value="Empresarial">Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conta */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Conta*</Label>
            <Select value={conta} onValueChange={setConta}>
              <SelectTrigger className="text-xs bg-white border-slate-200 sm:w-1/2">
                <SelectValue placeholder="Conta padrão" />
              </SelectTrigger>
              <SelectContent className="bg-white border-slate-200 shadow-md">
                <SelectItem value="Conta padrão">Conta padrão</SelectItem>
                <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                <SelectItem value="Santander">Santander</SelectItem>
                <SelectItem value="Caixa Econômica">Caixa Econômica</SelectItem>
                <SelectItem value="NuBank PJ">NuBank PJ</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-500 pt-0.5">
              Credencie esta conta para emitir boletos nas configurações de contas.
            </p>
          </div>

          {/* Repetir lançamento mensalmente */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="repetir-mensal-entrada"
              checked={repetirMensal}
              onCheckedChange={(checked) => setRepetirMensal(!!checked)}
            />
            <label
              htmlFor="repetir-mensal-entrada"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Repetir lançamento mensalmente
            </label>
          </div>

          {/* Rodapé: CANCELAR | SALVAR E EMITIR BOLETO | SALVAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 uppercase tracking-wide transition-colors"
            >
              CANCELAR
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info("Emissão de Boletos integrada às configurações de banco.")}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold uppercase rounded px-4 py-2"
            >
              SALVAR E EMITIR BOLETO
            </Button>
            <Button
              type="button"
              disabled={salvando}
              onClick={handleSalvar}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2 rounded shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>{salvando ? "SALVANDO..." : "SALVAR"}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
