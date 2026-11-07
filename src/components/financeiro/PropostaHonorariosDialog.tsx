/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { addMonths, format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUsuarios } from "@/lib/nichos";
import { dataDeIso, isoData, motivoNaoUtil, proximoDiaUtil, vencimentoMensal } from "@/lib/diasUteis";

export type PropostaHonorarios = {
  id: string;
  cliente_id: string;
  cliente_nicho_id: string | null;
  nicho: string | null;
  descricao: string;
  valor_total: number;
  valor_entrada: number;
  data_entrada: string | null;
  num_parcelas: number;
  primeiro_vencimento: string | null;
  forma_pagamento: string;
  distribuicao: { parceiro_id: string; pct: number }[];
  pct_reserva: number;
  observacoes: string | null;
  status: "aguardando_aprovacao" | "aprovada" | "devolvida" | "boletos_emitidos" | "cancelada";
  cronograma?: { descricao: string; valor: number; vencimento: string }[];
  motivo_devolucao: string | null;
  created_by: string | null;
  aprovado_por: string | null;
  aprovado_em: string | null;
  emitido_por: string | null;
  emitido_em: string | null;
  created_at: string;
};

export const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hoje = () => format(new Date(), "yyyy-MM-dd");
const num = (s: string) => {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

type Opcao = { value: string; clienteId: string; nichoId: string | null; nicho: string | null; label: string };

export function PropostaHonorariosDialog({
  open,
  onClose,
  onSaved,
  preset,
  editando,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  preset?: { clienteId: string; nichoId?: string | null } | null;
  editando?: PropostaHonorarios | null;
}) {
  const { user } = useAuth();
  const usuarios = useUsuarios();
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [vinculo, setVinculo] = useState("");
  const [descricao, setDescricao] = useState("Honorários iniciais");
  const [total, setTotal] = useState("");
  const [entrada, setEntrada] = useState("");
  const [dataEntrada, setDataEntrada] = useState(hoje());
  const [parcelas, setParcelas] = useState("0");
  const [primeiroVenc, setPrimeiroVenc] = useState(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
  const [forma, setForma] = useState("Boleto");
  const [dist, setDist] = useState<{ parceiro_id: string; pct: string }[]>([]);
  const [reserva, setReserva] = useState("5");
  const [obs, setObs] = useState("");
  // datas alteradas à mão na prévia (chave = "Entrada" / "Parcela i/n")
  const [datasEditadas, setDatasEditadas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [{ data: cls }, { data: ns }] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase.from("cliente_nichos" as never).select("id, cliente_id, nicho"),
      ]);
      const lista: Opcao[] = [];
      ((cls as any[]) || []).forEach((c) => {
        const nichos = ((ns as any[]) || []).filter((n) => n.cliente_id === c.id);
        if (nichos.length === 0) lista.push({ value: `${c.id}|`, clienteId: c.id, nichoId: null, nicho: null, label: `${c.nome} (sem nicho)` });
        nichos.forEach((n) => lista.push({ value: `${c.id}|${n.id}`, clienteId: c.id, nichoId: n.id, nicho: n.nicho, label: `${c.nome} — ${n.nicho}` }));
      });
      setOpcoes(lista);
    })();

    if (editando) {
      setVinculo(`${editando.cliente_id}|${editando.cliente_nicho_id || ""}`);
      setDescricao(editando.descricao);
      setTotal(String(editando.valor_total).replace(".", ","));
      setEntrada(editando.valor_entrada ? String(editando.valor_entrada).replace(".", ",") : "");
      setDataEntrada(editando.data_entrada || hoje());
      setParcelas(String(editando.num_parcelas));
      setPrimeiroVenc(editando.primeiro_vencimento || format(addMonths(new Date(), 1), "yyyy-MM-dd"));
      setForma(editando.forma_pagamento);
      setDist((editando.distribuicao || []).map((d) => ({ parceiro_id: d.parceiro_id, pct: String(d.pct) })));
      setReserva(String(editando.pct_reserva));
      setObs(editando.observacoes || "");
      setDatasEditadas(Object.fromEntries((editando.cronograma || []).map((c) => [c.descricao, c.vencimento])));
    } else {
      setVinculo(preset ? `${preset.clienteId}|${preset.nichoId || ""}` : "");
      setDescricao("Honorários iniciais");
      setTotal("");
      setEntrada("");
      setDataEntrada(hoje());
      setParcelas("0");
      setPrimeiroVenc(format(addMonths(new Date(), 1), "yyyy-MM-dd"));
      setForma("Boleto");
      setDist(user ? [{ parceiro_id: user.id, pct: "" }] : []);
      setReserva("5");
      setObs("");
      setDatasEditadas({});
    }
  }, [open, editando, preset, user]);

  const valorTotal = num(total);
  const valorEntrada = num(entrada);
  const nParcelas = Math.max(0, Math.floor(num(parcelas)));
  const previa = useMemo(() => {
    const linhas: { desc: string; valor: number; venc: string }[] = [];
    const venc = (desc: string, calculada: string) => datasEditadas[desc] || calculada;
    if (valorEntrada > 0 && dataEntrada) linhas.push({ desc: "Entrada", valor: valorEntrada, venc: venc("Entrada", isoData(proximoDiaUtil(dataDeIso(dataEntrada)))) });
    const resto = valorTotal - valorEntrada;
    if (nParcelas > 0 && resto > 0) {
      const base = Math.round((resto / nParcelas) * 100) / 100;
      for (let i = 1; i <= nParcelas; i++) {
        const v = i < nParcelas ? base : Math.round((resto - base * (nParcelas - 1)) * 100) / 100;
        const desc = `Parcela ${i}/${nParcelas}`;
        linhas.push({ desc, valor: v, venc: venc(desc, isoData(vencimentoMensal(dataDeIso(primeiroVenc), i - 1).data)) });
      }
    }
    return linhas;
  }, [valorTotal, valorEntrada, nParcelas, dataEntrada, primeiroVenc, datasEditadas]);

  const somaPct = dist.reduce((a, d) => a + num(d.pct), 0) + num(reserva);

  const salvar = async () => {
    const op = opcoes.find((o) => o.value === vinculo);
    if (!user || !op) return toast.error("Selecione o cliente e o nicho.");
    if (valorTotal <= 0) return toast.error("Informe o valor total dos honorários.");
    if (valorEntrada > valorTotal) return toast.error("A entrada não pode ser maior que o total.");
    if (valorEntrada < valorTotal && nParcelas === 0) return toast.error("Informe o número de parcelas do saldo (ou coloque a entrada igual ao total).");
    if (somaPct > 100) return toast.error("A soma das porcentagens (parceiros + reserva) passa de 100%.");
    const distribuicao = dist.filter((d) => d.parceiro_id && num(d.pct) > 0).map((d) => ({ parceiro_id: d.parceiro_id, pct: num(d.pct) }));

    const payload: any = {
      cliente_id: op.clienteId,
      cliente_nicho_id: op.nichoId,
      nicho: op.nicho,
      descricao: descricao.trim() || "Honorários iniciais",
      valor_total: valorTotal,
      valor_entrada: valorEntrada,
      data_entrada: valorEntrada > 0 ? dataEntrada : null,
      num_parcelas: valorEntrada >= valorTotal ? 0 : nParcelas,
      primeiro_vencimento: nParcelas > 0 ? primeiroVenc : null,
      forma_pagamento: forma,
      distribuicao,
      pct_reserva: num(reserva),
      observacoes: obs.trim() || null,
      cronograma: previa.map((l) => ({ descricao: l.desc, valor: l.valor, vencimento: l.venc })),
    };
    setSalvando(true);
    const { error } = editando
      ? await supabase.from("honorarios_propostas" as never).update({ ...payload, status: "aguardando_aprovacao" } as never).eq("id", editando.id)
      : await supabase.from("honorarios_propostas" as never).insert({ ...payload, created_by: user.id } as never);
    setSalvando(false);
    if (error) return toast.error("Erro ao salvar proposta", { description: error.message });
    toast.success(editando ? "Proposta reenviada para aprovação" : "Proposta enviada para a Dra. Keila confirmar a distribuição");
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="mx-4 max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{editando ? "Revisar proposta de honorários" : "Proposta de honorários"}</DialogTitle>
          <DialogDescription>
            Ao enviar, a Dra. Keila recebe uma tarefa para confirmar a distribuição. Depois de aprovada, a Assistente Financeira recebe a tarefa de gerar os boletos.
          </DialogDescription>
        </DialogHeader>

        {editando?.motivo_devolucao && (
          <p className="text-sm rounded border border-amber-500/40 bg-amber-500/10 p-2"><strong>Motivo da devolução:</strong> {editando.motivo_devolucao}</p>
        )}

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Cliente / Nicho *</Label>
            <Select value={vinculo || undefined} onValueChange={setVinculo}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor total (R$) *</Label>
              <Input inputMode="decimal" placeholder="Ex: 3000,00" value={total} onChange={(e) => setTotal(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Entrada (R$)</Label>
              <Input inputMode="decimal" placeholder="0,00" value={entrada} onChange={(e) => setEntrada(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vencimento da entrada</Label>
              <Input type="date" value={dataEntrada} onChange={(e) => { setDataEntrada(e.target.value); setDatasEditadas({}); }} disabled={valorEntrada <= 0} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Parcelas do saldo</Label>
              <Input type="number" min={0} max={120} value={parcelas} onChange={(e) => { setParcelas(e.target.value); setDatasEditadas({}); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">1º vencimento das parcelas</Label>
              <Input type="date" value={primeiroVenc} onChange={(e) => { setPrimeiroVenc(e.target.value); setDatasEditadas({}); }} disabled={nParcelas === 0} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Boleto", "PIX", "Transferência", "Cartão", "Dinheiro"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reserva do escritório (%)</Label>
              <Input inputMode="decimal" value={reserva} onChange={(e) => setReserva(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Distribuição entre parceiros (% de cada parcela)</Label>
              {dist.length < 3 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDist([...dist, { parceiro_id: "", pct: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Parceiro
                </Button>
              )}
            </div>
            {dist.length === 0 && <p className="text-xs text-muted-foreground">Nenhum parceiro: 100% para o escritório.</p>}
            {dist.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8">
                  <Select value={d.parceiro_id || undefined} onValueChange={(v) => setDist(dist.map((x, j) => (j === i ? { ...x, parceiro_id: v } : x)))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Parceiro" /></SelectTrigger>
                    <SelectContent>
                      {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Input className="h-9" inputMode="decimal" placeholder="%" value={d.pct} onChange={(e) => setDist(dist.map((x, j) => (j === i ? { ...x, pct: e.target.value } : x)))} />
                </div>
                <Button type="button" variant="ghost" size="icon" className="col-span-1 h-8 w-8 text-destructive" onClick={() => setDist(dist.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <p className={`text-xs ${somaPct > 100 ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
              Parceiros + reserva: {somaPct.toLocaleString("pt-BR")}% · Escritório: {Math.max(0, 100 - somaPct).toLocaleString("pt-BR")}%
            </p>
          </div>

          {previa.length > 0 && (
            <div className="rounded-md border p-3 space-y-1 bg-muted/10">
              <p className="text-xs font-semibold">Prévia dos boletos</p>
              <p className="text-[11px] text-muted-foreground">
                Vencimentos em sábado, domingo ou feriado bancário já foram passados para o próximo dia útil. Ajuste qualquer data, se precisar.
              </p>
              {previa.map((l) => {
                const naoUtil = l.venc ? motivoNaoUtil(dataDeIso(l.venc)) : null;
                return (
                  <div key={l.desc} className="grid grid-cols-12 items-center gap-2 text-xs">
                    <span className="col-span-3">{l.desc}</span>
                    <Input
                      type="date"
                      className="col-span-5 h-7 text-xs"
                      value={l.venc}
                      onChange={(e) => setDatasEditadas({ ...datasEditadas, [l.desc]: e.target.value })}
                    />
                    <span className={naoUtil ? "col-span-2 text-red-500 font-semibold" : "col-span-2 text-muted-foreground"}>{naoUtil || ""}</span>
                    <span className="col-span-2 text-right tabular-nums">{brl(l.valor)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between text-xs font-semibold border-t pt-1">
                <span>Total</span>
                <span className="tabular-nums">{brl(previa.reduce((a, l) => a + l.valor, 0))}</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Observações para a aprovação</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: cliente pediu vencimento todo dia 10" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Enviando..." : editando ? "Reenviar para aprovação" : "Enviar para aprovação"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
