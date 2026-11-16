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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ModalTransferenciaAstreaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  clientes: { id: string; nome: string }[];
}

export const ModalTransferenciaAstrea: React.FC<ModalTransferenciaAstreaProps> = ({
  open,
  onOpenChange,
  onSuccess,
  clientes,
}) => {
  const { user } = useAuth();
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [contaOrigem, setContaOrigem] = useState("Conta Corrente Banco do Brasil");
  const [contaDestino, setContaDestino] = useState("Conta Reserva Santander");
  const [dataTransferencia, setDataTransferencia] = useState(hojeIso);
  const [valor, setValor] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [responsavel, setResponsavel] = useState("ALEX F");
  const [salvando, setSalvando] = useState(false);

  const executarSalvar = async (adicionarOutra = false) => {
    if (!descricao.trim()) {
      toast.error("Informe a descrição da transferência.");
      return false;
    }

    const valorLimpo = parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
    if (valorLimpo <= 0) {
      toast.error("Informe um valor válido.");
      return false;
    }

    if (contaOrigem === contaDestino) {
      toast.error("A conta de origem e destino devem ser diferentes.");
      return false;
    }

    const clienteId = clientes.length > 0 ? clientes[0].id : "00000000-0000-0000-0000-000000000000";

    setSalvando(true);
    try {
      // Registrar transferência: saída da origem e entrada no destino
      const descCompleta = `[Transferência] ${descricao.trim()} (${contaOrigem} ➔ ${contaDestino})`;
      const { error } = await supabase.from("financeiro_lancamentos").insert([
        {
          cliente_id: clienteId,
          user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          descricao: descCompleta,
          valor: valorLimpo,
          data_vencimento: dataTransferencia || hojeIso,
          data_pagamento: dataTransferencia || hojeIso,
          status: "Pago",
          tipo_lancamento: "Receita",
          instituicao_financeira: contaDestino,
          depositante: `Origem: ${contaOrigem}`,
        },
      ]);

      if (error) throw error;

      toast.success("Transferência realizada com sucesso!");
      onSuccess?.();

      if (adicionarOutra) {
        setValor("");
        setNumeroDocumento("");
        setDescricao("");
      } else {
        onOpenChange(false);
      }
      return true;
    } catch (err: any) {
      toast.error("Erro ao registrar transferência", { description: err?.message });
      return false;
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 text-[#010E38] rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
            Adicionar transferência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-3">
          {/* Contas Origem e Destino */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Conta de origem*</Label>
              <Select value={contaOrigem} onValueChange={setContaOrigem}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="Conta Corrente Banco do Brasil">Conta Corrente Banco do Brasil</SelectItem>
                  <SelectItem value="Santander PJ">Santander PJ</SelectItem>
                  <SelectItem value="Caixa Econômica">Caixa Econômica</SelectItem>
                  <SelectItem value="NuBank PJ">NuBank PJ</SelectItem>
                  <SelectItem value="Caixa Físico Escritório">Caixa Físico Escritório</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Conta de destino*</Label>
              <Select value={contaDestino} onValueChange={setContaDestino}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="Conta Reserva Santander">Conta Reserva Santander</SelectItem>
                  <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                  <SelectItem value="Caixa Poupança">Caixa Poupança</SelectItem>
                  <SelectItem value="NuBank Investimentos">NuBank Investimentos</SelectItem>
                  <SelectItem value="Caixa Físico Escritório">Caixa Físico Escritório</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data*</Label>
              <div className="relative">
                <Input
                  type="date"
                  value={dataTransferencia}
                  onChange={(e) => setDataTransferencia(e.target.value)}
                  className="text-xs pr-8 bg-white border-slate-200"
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Valor*</Label>
              <Input
                placeholder="Digite o valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="text-xs bg-white border-slate-200 font-mono"
              />
            </div>
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

          {/* Responsável */}
          <div className="space-y-1 sm:w-1/2">
            <Label className="text-xs font-semibold text-slate-700">Responsável*</Label>
            <div className="relative">
              <Input
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="text-xs pr-8 bg-white border-slate-200 font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Rodapé: Cancelar | Salvar e adicionar outra | CONFIRMAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 transition-colors"
            >
              Cancelar
            </button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={salvando}
              onClick={() => executarSalvar(true)}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded px-4 py-2"
            >
              Salvar e adicionar outra
            </Button>
            <Button
              type="button"
              disabled={salvando}
              onClick={() => executarSalvar(false)}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2 rounded shadow-sm transition-all"
            >
              {salvando ? "CONFIRMANDO..." : "CONFIRMAR"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
