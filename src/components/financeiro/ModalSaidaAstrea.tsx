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

interface ModalSaidaAstreaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  clientes: { id: string; nome: string }[];
}

export const ModalSaidaAstrea: React.FC<ModalSaidaAstreaProps> = ({
  open,
  onOpenChange,
  onSuccess,
  clientes,
}) => {
  const { user } = useAuth();
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [situacao, setSituacao] = useState<"a_pagar" | "paga">("a_pagar");
  const [dataVencimento, setDataVencimento] = useState(hojeIso);
  const [tipo, setTipo] = useState<"Saída avulsa" | "Despesa de cliente">("Saída avulsa");
  const [pagaPara, setPagaPara] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [categoria, setCategoria] = useState("Custas Processuais");
  const [centroCusto, setCentroCusto] = useState("Geral");
  const [conta, setConta] = useState("Conta padrão");
  const [repetirMensal, setRepetirMensal] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      toast.error("Informe a descrição da despesa / saída.");
      return;
    }

    const valorLimpo = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (valorLimpo <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const clienteMatch = clientes.find((c) =>
      c.nome.toLowerCase().includes(pagaPara.toLowerCase())
    ) || (clientes.length > 0 ? clientes[0] : null);

    setSalvando(true);
    try {
      const isPago = situacao === "paga";
      const { error } = await supabase.from("financeiro_lancamentos").insert([
        {
          cliente_id: clienteMatch ? clienteMatch.id : "00000000-0000-0000-0000-000000000000",
          user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          descricao: `[Despesa] ${descricao.trim()}${pagaPara ? ` - ${pagaPara}` : ""}`,
          valor: valorLimpo,
          data_vencimento: dataVencimento || hojeIso,
          data_pagamento: isPago ? dataVencimento : null,
          status: isPago ? "Pago" : "Pendente",
          tipo_lancamento: "Despesa",
          instituicao_financeira: conta,
          depositante: pagaPara || null,
        },
      ]);

      if (error) throw error;

      toast.success("Saída / Despesa registrada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro ao registrar saída", { description: err?.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 text-[#010E38] rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
            Adicionar saída
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Linha 1: A pagar / Paga + Vencimento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-6 text-sm font-semibold">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="situacao_saida"
                  checked={situacao === "a_pagar"}
                  onChange={() => setSituacao("a_pagar")}
                  className="accent-[#010E38] w-4 h-4"
                />
                <span className="text-slate-800">A pagar</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="situacao_saida"
                  checked={situacao === "paga"}
                  onChange={() => setSituacao("paga")}
                  className="accent-[#010E38] w-4 h-4"
                />
                <span className="text-slate-800">Paga</span>
              </label>
            </div>

            <div className="space-y-1 sm:w-48">
              <Label className="text-xs font-semibold text-slate-700">
                {situacao === "a_pagar" ? "Vencimento*" : "Paga em*"}
              </Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                  className="text-xs pr-8 bg-white border-slate-200"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tipo de Saída */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <Label className="text-xs font-semibold text-slate-700">Tipo*</Label>
            <div className="flex flex-wrap items-center gap-6 text-xs">
              {(["Saída avulsa", "Despesa de cliente"] as const).map((t) => (
                <label key={t} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo_saida"
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="accent-[#010E38] w-4 h-4"
                  />
                  <span className="text-slate-800 font-medium">{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Paga para */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Paga para*</Label>
            <div className="relative">
              <Input
                placeholder="Digite o cliente, fornecedor, parceiro, etc."
                value={pagaPara}
                onChange={(e) => setPagaPara(e.target.value)}
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
                  <SelectItem value="Custas Processuais">Custas Processuais</SelectItem>
                  <SelectItem value="Aluguel e Condomínio">Aluguel e Condomínio</SelectItem>
                  <SelectItem value="Sistemas / TI">Sistemas / TI</SelectItem>
                  <SelectItem value="Salários e Pró-labore">Salários e Pró-labore</SelectItem>
                  <SelectItem value="Impostos e Tributos">Impostos e Tributos</SelectItem>
                  <SelectItem value="Marketing e Tráfego">Marketing e Tráfego</SelectItem>
                  <SelectItem value="Outras Despesas">Outras Despesas</SelectItem>
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
                  <SelectItem value="Administrativo">Administrativo</SelectItem>
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
          </div>

          {/* Repetir lançamento mensalmente */}
          <div className="flex items-center space-x-2 pt-1">
            <Checkbox
              id="repetir-mensal-saida"
              checked={repetirMensal}
              onCheckedChange={(checked) => setRepetirMensal(!!checked)}
            />
            <label
              htmlFor="repetir-mensal-saida"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Repetir lançamento mensalmente
            </label>
          </div>

          {/* Rodapé: CANCELAR | SALVAR */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 uppercase tracking-wide transition-colors"
            >
              CANCELAR
            </button>
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
