/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, FileUp, HandCoins, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { nichoLabel } from "@/lib/honorarios";
import { nomeUsuario, useUsuarios } from "@/lib/nichos";
import { nomeArquivoSeguro } from "@/lib/utils";
import { PropostaHonorarios, PropostaHonorariosDialog, brl } from "./PropostaHonorariosDialog";

const ETAPAS: { status: PropostaHonorarios["status"]; label: string }[] = [
  { status: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { status: "aprovada", label: "Gerar boletos" },
  { status: "devolvida", label: "Devolvidas" },
  { status: "boletos_emitidos", label: "Concluídas" },
];

const dataBr = (s?: string | null) => (s ? format(new Date(s.length > 10 ? s : s + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }) : "-");

// Item: cadastro do cliente -> contrato -> Dra. Keila confirma distribuição -> Assistente Financeira gera boletos
export function EsteiraHonorarios({ onLancamentosGerados }: { onLancamentosGerados?: () => void }) {
  const { user, role, classificacao } = useAuth();
  const isAdmin = role === "master" || role === "desenvolvedor";
  const usuarios = useUsuarios();
  const isFinanceiro = classificacao === "assistente_financeiro";
  const [propostas, setPropostas] = useState<PropostaHonorarios[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [novaAberta, setNovaAberta] = useState(false);
  const [editando, setEditando] = useState<PropostaHonorarios | null>(null);
  const [devolvendo, setDevolvendo] = useState<PropostaHonorarios | null>(null);
  const [motivo, setMotivo] = useState("");
  const [emitindo, setEmitindo] = useState<PropostaHonorarios | null>(null);
  const [arquivos, setArquivos] = useState<FileList | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const carregar = async () => {
    const [{ data, error }, { data: cls }] = await Promise.all([
      supabase.from("honorarios_propostas" as never).select("*").order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome"),
    ]);
    if (error) {
      console.error(error);
      return;
    }
    setPropostas(((data as any) || []) as PropostaHonorarios[]);
    const mapa: Record<string, string> = {};
    ((cls as any[]) || []).forEach((c) => (mapa[c.id] = c.nome));
    setClientes(mapa);
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const aprovar = async (p: PropostaHonorarios) => {
    setOcupado(true);
    const { error } = await supabase.rpc("aprovar_honorarios" as never, { p_id: p.id } as never);
    setOcupado(false);
    if (error) return toast.error("Erro ao aprovar", { description: error.message });
    toast.success("Distribuição aprovada. A Assistente Financeira recebeu a tarefa de gerar os boletos.");
    carregar();
  };

  const devolver = async () => {
    if (!devolvendo) return;
    setOcupado(true);
    const { error } = await supabase.rpc("devolver_honorarios" as never, { p_id: devolvendo.id, p_motivo: motivo } as never);
    setOcupado(false);
    if (error) return toast.error("Erro ao devolver", { description: error.message });
    toast.success("Proposta devolvida ao responsável com o motivo.");
    setDevolvendo(null);
    setMotivo("");
    carregar();
  };

  const emitir = async () => {
    if (!emitindo || !user) return;
    setOcupado(true);
    try {
      const { data: n, error } = await supabase.rpc("emitir_boletos_honorarios" as never, { p_id: emitindo.id } as never);
      if (error) throw error;
      const falhas: string[] = [];
      for (const f of Array.from(arquivos || [])) {
        const path = `${user.id}/boletos/${emitindo.id}/${Date.now()}-${nomeArquivoSeguro(f.name)}`;
        const { error: upErr } = await supabase.storage.from("documentos").upload(path, f, { upsert: false });
        const { error: regErr } = upErr
          ? { error: upErr }
          : await supabase.rpc("registrar_boleto" as never, { p_id: emitindo.id, p_nome: f.name, p_path: path, p_tamanho: f.size } as never);
        if (regErr) falhas.push(f.name);
      }
      toast.success(`Boletos registrados. ${n} lançamento(s) criados no Financeiro.`);
      if (falhas.length) {
        toast.error("Alguns PDFs não foram anexados", { description: `${falhas.join(", ")} — anexe pela aba Documentos, na pasta FINANCEIRO_E_FISCAL do cliente.` });
      }
      setEmitindo(null);
      setArquivos(null);
      carregar();
      onLancamentosGerados?.();
    } catch (e: any) {
      toast.error("Erro ao registrar boletos", { description: e.message });
    } finally {
      setOcupado(false);
    }
  };

  const [excluindo, setExcluindo] = useState<PropostaHonorarios | null>(null);
  const podeExcluirProposta = (p: PropostaHonorarios) =>
    isAdmin || (p.created_by === user?.id && (p.status === "aguardando_aprovacao" || p.status === "devolvida"));

  const excluir = async () => {
    if (!excluindo) return;
    setOcupado(true);
    const { error } = await supabase.rpc("excluir_proposta_honorarios" as never, { p_id: excluindo.id } as never);
    setOcupado(false);
    if (error) return toast.error("Erro ao excluir proposta", { description: error.message });
    toast.success("Proposta excluída.");
    setExcluindo(null);
    carregar();
  };

  const contagem = (s: string) => propostas.filter((p) => p.status === s).length;

  const cartao = (p: PropostaHonorarios) => (
    <div key={p.id} className="rounded-md border p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{clientes[p.cliente_id] || "Cliente"} <span className="text-muted-foreground font-normal">— {nichoLabel(p.nicho)}</span></p>
          <p className="text-xs text-muted-foreground">{p.descricao} · enviada por {nomeUsuario(usuarios, p.created_by) || "—"} em {dataBr(p.created_at)}</p>
        </div>
        <p className="text-lg font-bold tabular-nums">{brl(p.valor_total)}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {p.valor_entrada > 0 && <Badge variant="outline">Entrada {brl(p.valor_entrada)} em {dataBr(p.data_entrada)}</Badge>}
        {p.num_parcelas > 0 && (
          <Badge variant="outline">
            {p.num_parcelas}x de {brl((p.valor_total - p.valor_entrada) / p.num_parcelas)} a partir de {dataBr(p.primeiro_vencimento)}
          </Badge>
        )}
        <Badge variant="outline">{p.forma_pagamento}</Badge>
      </div>
      <p className="text-xs">
        <span className="font-semibold">Distribuição: </span>
        {(p.distribuicao || []).map((d) => `${nomeUsuario(usuarios, d.parceiro_id) || "?"} ${d.pct}%`).join(" · ") || "100% escritório"} · Reserva {p.pct_reserva}%
      </p>
      {p.observacoes && <p className="text-xs text-muted-foreground whitespace-pre-wrap">Obs.: {p.observacoes}</p>}
      {p.status === "devolvida" && p.motivo_devolucao && (
        <p className="text-xs rounded bg-amber-500/10 border border-amber-500/30 p-2"><strong>Devolvida:</strong> {p.motivo_devolucao}</p>
      )}
      {p.status === "boletos_emitidos" && (
        <p className="text-xs text-emerald-600">Aprovada por {nomeUsuario(usuarios, p.aprovado_por) || "—"} em {dataBr(p.aprovado_em)} · boletos por {nomeUsuario(usuarios, p.emitido_por) || "—"} em {dataBr(p.emitido_em)}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {p.status === "aguardando_aprovacao" && isAdmin && (
          <>
            <Button size="sm" onClick={() => aprovar(p)} disabled={ocupado}><CheckCircle2 className="h-4 w-4 mr-1" /> Aprovar distribuição</Button>
            <Button size="sm" variant="outline" onClick={() => setDevolvendo(p)}><Undo2 className="h-4 w-4 mr-1" /> Devolver</Button>
          </>
        )}
        {p.status === "aguardando_aprovacao" && !isAdmin && (
          <span className="text-xs text-muted-foreground">Aguardando a Dra. Keila confirmar a distribuição.</span>
        )}
        {p.status === "aprovada" && (isFinanceiro || isAdmin) && (
          <Button size="sm" onClick={() => setEmitindo(p)}><FileUp className="h-4 w-4 mr-1" /> Registrar boletos emitidos</Button>
        )}
        {p.status === "aprovada" && !(isFinanceiro || isAdmin) && (
          <span className="text-xs text-muted-foreground">Aprovada. Aguardando a Assistente Financeira gerar os boletos.</span>
        )}
        {(p.status === "devolvida" || p.status === "aguardando_aprovacao") && (p.created_by === user?.id || isAdmin) && (
          <Button size="sm" variant="ghost" onClick={() => setEditando(p)}><Pencil className="h-4 w-4 mr-1" /> {p.status === "devolvida" ? "Corrigir e reenviar" : "Editar"}</Button>
        )}
        {podeExcluirProposta(p) && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive ml-auto" onClick={() => setExcluindo(p)}>
            <Trash2 className="h-4 w-4 mr-1" /> Excluir proposta
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><HandCoins className="h-5 w-5" /> Esteira de Honorários</CardTitle>
          <CardDescription>Proposta → confirmação da Dra. Keila → boletos pela Assistente Financeira → parcelas no Financeiro.</CardDescription>
        </div>
        <Button onClick={() => setNovaAberta(true)}><Plus className="h-4 w-4 mr-1" /> Nova proposta</Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={isAdmin ? "aguardando_aprovacao" : isFinanceiro ? "aprovada" : "aguardando_aprovacao"} key={`${isAdmin}-${isFinanceiro}`}>
          <TabsList className="flex flex-wrap h-auto">
            {ETAPAS.map((e) => (
              <TabsTrigger key={e.status} value={e.status} className="text-xs sm:text-sm">
                {e.label} {contagem(e.status) > 0 && <Badge className="ml-1 h-5 px-1.5 text-[10px]">{contagem(e.status)}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>
          {ETAPAS.map((e) => (
            <TabsContent key={e.status} value={e.status} className="space-y-2 pt-2">
              {propostas.filter((p) => p.status === e.status).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nada nesta etapa.</p>
              ) : (
                propostas.filter((p) => p.status === e.status).map(cartao)
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <PropostaHonorariosDialog open={novaAberta || !!editando} editando={editando} onClose={() => { setNovaAberta(false); setEditando(null); }} onSaved={carregar} />

      <Dialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir proposta de honorários?</DialogTitle>
            <DialogDescription>
              {excluindo && <>{clientes[excluindo.cliente_id] || "Cliente"} — {brl(excluindo.valor_total)}. </>}
              As tarefas da proposta e os PDFs de boletos anexados a ela também serão excluídos.
              {excluindo?.status === "boletos_emitidos" && " Os lançamentos já gerados no Financeiro serão mantidos (exclua-os no Financeiro, se for o caso)."}
              {" "}A exclusão fica registrada no log de auditoria.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluindo(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={excluir} disabled={ocupado}>{ocupado ? "Excluindo..." : "Excluir"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!devolvendo} onOpenChange={(o) => !o && setDevolvendo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver proposta</DialogTitle>
            <DialogDescription>O responsável recebe uma tarefa com o motivo para corrigir e reenviar.</DialogDescription>
          </DialogHeader>
          <Textarea rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: ajustar o percentual do parceiro para 30%" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDevolvendo(null)}>Cancelar</Button>
            <Button onClick={devolver} disabled={ocupado || !motivo.trim()}>Devolver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!emitindo} onOpenChange={(o) => !o && setEmitindo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar boletos emitidos</DialogTitle>
            <DialogDescription>
              Anexe os PDFs dos boletos (opcional). Eles ficam na pasta FINANCEIRO_E_FISCAL do cliente, e a entrada e as parcelas entram no Financeiro como receitas pendentes.
            </DialogDescription>
          </DialogHeader>
          {emitindo && (
            <p className="text-sm">{clientes[emitindo.cliente_id]} — {brl(emitindo.valor_total)}</p>
          )}
          <Input type="file" multiple accept="application/pdf,image/*" onChange={(e) => setArquivos(e.target.files)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmitindo(null)}>Cancelar</Button>
            <Button onClick={emitir} disabled={ocupado}>{ocupado ? "Registrando..." : "Confirmar boletos emitidos"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
