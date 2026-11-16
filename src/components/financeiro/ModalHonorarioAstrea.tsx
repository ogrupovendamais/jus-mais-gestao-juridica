import React, { useState, useEffect } from "react";
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
import { Calendar, Search, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LinhaHonorario {
  id: string;
  vencimento: string;
  valor: string;
  descricao: string;
}

interface ModalHonorarioAstreaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  clientes: { id: string; nome: string }[];
}

export const ModalHonorarioAstrea: React.FC<ModalHonorarioAstreaProps> = ({
  open,
  onOpenChange,
  onSuccess,
  clientes,
}) => {
  const { user } = useAuth();
  const hojeIso = new Date().toISOString().slice(0, 10);

  const [linhas, setLinhas] = useState<LinhaHonorario[]>([
    {
      id: "1",
      vencimento: hojeIso,
      valor: "",
      descricao: "",
    },
  ]);

  const [repetirMensalmente, setRepetirMensalmente] = useState(false);
  const [qtdAdicionarLinhas, setQtdAdicionarLinhas] = useState("1");

  // Campos de contexto
  const [processoBusca, setProcessoBusca] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>("");
  const [responsavel, setResponsavel] = useState("ALEX F");
  const [processosLista, setProcessosLista] = useState<{ id: string; numero: string; cliente: string }[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      // Buscar processos rápidos para autocomplete
      supabase
        .from("processos")
        .select("id, numero, cliente")
        .limit(30)
        .then(({ data }) => {
          if (data) setProcessosLista(data as any);
        });
    }
  }, [open]);

  const handleAddLinhas = () => {
    const qtd = Math.max(1, Math.min(24, parseInt(qtdAdicionarLinhas) || 1));
    const novas: LinhaHonorario[] = [];
    const ultimaData = linhas.length > 0 ? linhas[linhas.length - 1].vencimento : hojeIso;
    
    for (let i = 0; i < qtd; i++) {
      const dataRef = new Date(ultimaData + "T00:00:00");
      dataRef.setMonth(dataRef.getMonth() + (i + 1));
      const proxVenc = dataRef.toISOString().slice(0, 10);
      novas.push({
        id: Math.random().toString(36).slice(2, 9),
        vencimento: proxVenc,
        valor: linhas[0]?.valor || "",
        descricao: linhas[0]?.descricao || "",
      });
    }
    setLinhas([...linhas, ...novas]);
    toast.info(`${qtd} parcela(s) adicionada(s)`);
  };

  const handleRemoveLinha = (id: string) => {
    if (linhas.length <= 1) return;
    setLinhas(linhas.filter((l) => l.id !== id));
  };

  const handleUpdateLinha = (id: string, campo: keyof LinhaHonorario, valor: string) => {
    setLinhas(linhas.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  };

  const handleSalvar = async () => {
    if (!clienteSelecionadoId && clientes.length > 0) {
      // Tentar encontrar cliente pelo nome digitado ou usar o primeiro
      const achado = clientes.find((c) =>
        c.nome.toLowerCase().includes(clienteBusca.toLowerCase())
      );
      if (achado) {
        setClienteSelecionadoId(achado.id);
      } else {
        setClienteSelecionadoId(clientes[0].id);
      }
    }

    const cId = clienteSelecionadoId || (clientes.length > 0 ? clientes[0].id : null);
    if (!cId) {
      toast.error("Por favor, selecione ou informe o cliente.");
      return;
    }

    setSalvando(true);
    try {
      const payloads = linhas.map((linha, idx) => {
        const descFinal = linha.descricao.trim()
          ? linhas.length > 1
            ? `${linha.descricao.trim()} (${idx + 1}/${linhas.length})`
            : linha.descricao.trim()
          : `Honorários advocatícios${processoBusca ? ` - Processo ${processoBusca}` : ""}`;

        const valorLimpo = parseFloat(linha.valor.replace(/\./g, "").replace(",", ".")) || 0;

        return {
          cliente_id: cId,
          user_id: user?.id || "00000000-0000-0000-0000-000000000000",
          descricao: descFinal,
          valor: valorLimpo,
          data_vencimento: linha.vencimento || hojeIso,
          status: "Pendente" as const,
          tipo_lancamento: "Receita",
        };
      });

      const { error } = await supabase.from("financeiro_lancamentos").insert(payloads);
      if (error) throw error;

      toast.success(
        linhas.length > 1
          ? `${linhas.length} lançamentos de honorários cadastrados!`
          : "Honorário cadastrado com sucesso!"
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro ao salvar honorário", { description: err?.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 sm:p-8 text-[#010E38] rounded-xl border border-slate-200 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
            Adicionar honorários
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Linhas de Parcelamento */}
          <div className="space-y-4">
            {linhas.map((linha, idx) => (
              <div
                key={linha.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end p-3 rounded-lg bg-slate-50/70 border border-slate-100"
              >
                {/* Vencimento */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Vencimento*
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={linha.vencimento}
                      onChange={(e) =>
                        handleUpdateLinha(linha.id, "vencimento", e.target.value)
                      }
                      className="text-xs pr-8 bg-white border-slate-200"
                    />
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Valor */}
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Valor/Valor com desc*
                  </Label>
                  <Input
                    placeholder="00,00"
                    value={linha.valor}
                    onChange={(e) =>
                      handleUpdateLinha(linha.id, "valor", e.target.value)
                    }
                    className="text-xs bg-white border-slate-200 font-mono"
                  />
                </div>

                {/* Descrição */}
                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Descrição*
                  </Label>
                  <Input
                    placeholder="Ex: Honorários da elaboração do contrato..."
                    value={linha.descricao}
                    onChange={(e) =>
                      handleUpdateLinha(linha.id, "descricao", e.target.value)
                    }
                    className="text-xs bg-white border-slate-200"
                  />
                </div>

                {/* Botão Remover linha se > 1 */}
                {linhas.length > 1 && (
                  <div className="sm:col-span-1 flex justify-center pb-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveLinha(linha.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Remover linha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Repetir mensalmente */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="repetir-mensal"
              checked={repetirMensalmente}
              onCheckedChange={(checked) => setRepetirMensalmente(!!checked)}
            />
            <label
              htmlFor="repetir-mensal"
              className="text-xs font-medium text-slate-700 cursor-pointer"
            >
              Repetir mensalmente
            </label>
          </div>

          {/* Botão Adicionar X Linhas */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLinhas}
              className="bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase px-3 py-1.5 rounded"
            >
              ADICIONAR
            </Button>
            <Input
              type="number"
              min="1"
              max="24"
              value={qtdAdicionarLinhas}
              onChange={(e) => setQtdAdicionarLinhas(e.target.value)}
              className="w-16 h-8 text-xs text-center border-slate-200"
            />
            <span className="text-xs text-slate-500 font-medium">linha(s)</span>
          </div>

          {/* Seção Processo / Cliente / Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            {/* Processo, caso ou atendimento */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Processo, caso ou atendimento *
              </Label>
              <div className="relative">
                <Input
                  placeholder="Encontre processo, caso ou atendimento"
                  value={processoBusca}
                  onChange={(e) => setProcessoBusca(e.target.value)}
                  className="text-xs pr-8 bg-white border-slate-200"
                  list="processos-datalist"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <datalist id="processos-datalist">
                  {processosLista.map((p) => (
                    <option key={p.id} value={p.numero}>
                      {p.numero} - {p.cliente}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Cliente */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Cliente *
              </Label>
              <div className="relative">
                <Input
                  placeholder="Digite o nome do cliente"
                  value={clienteBusca}
                  onChange={(e) => {
                    setClienteBusca(e.target.value);
                    const match = clientes.find((c) =>
                      c.nome.toLowerCase().includes(e.target.value.toLowerCase())
                    );
                    if (match) setClienteSelecionadoId(match.id);
                  }}
                  className="text-xs pr-8 bg-white border-slate-200"
                  list="clientes-datalist"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <datalist id="clientes-datalist">
                  {clientes.map((c) => (
                    <option key={c.id} value={c.nome}>
                      {c.nome}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Responsável */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Responsável*
              </Label>
              <div className="relative">
                <Input
                  value={responsavel}
                  onChange={(e) => setResponsavel(e.target.value)}
                  className="text-xs pr-8 bg-white border-slate-200 font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Rodapé: Cancelar | SALVAR */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 transition-colors"
            >
              Cancelar
            </button>
            <Button
              type="button"
              disabled={salvando}
              onClick={handleSalvar}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2 rounded shadow-sm transition-all"
            >
              {salvando ? "SALVANDO..." : "SALVAR"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
