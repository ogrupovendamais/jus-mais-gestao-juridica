/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCopy, ClipboardPaste, NotebookPen, Pencil, Save, Star, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { nomeUsuario, useUsuarios } from "@/lib/nichos";
import { lerRespostas, perguntasDoNicho, textoParaWhatsApp } from "@/lib/questionarios";

type Anotacao = {
  id: string;
  cliente_nicho_id: string | null;
  tipo: "nota" | "questionario";
  titulo: string | null;
  conteudo: string | null;
  respostas: Record<string, string>;
  importante: boolean;
  user_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

const GERAL = "__geral";
const dataHora = (s: string) => format(new Date(s), "dd/MM/yyyy HH:mm", { locale: ptBR });

// Bloco de notas + questionário inicial do cliente, separados por nicho
export function ClienteAnotacoes({ cliente, nichoInicial }: { cliente: { id: string; nome: string }; nichoInicial?: string | null }) {
  const { user, role } = useAuth();
  const isAdmin = role === "master" || role === "desenvolvedor";
  const usuarios = useUsuarios();
  const [nichos, setNichos] = useState<{ id: string; nicho: string }[]>([]);
  const [nichoSel, setNichoSel] = useState<string>(nichoInicial || "");
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [nova, setNova] = useState({ titulo: "", conteudo: "", importante: false });
  const [editando, setEditando] = useState<string | null>(null);
  const [edicao, setEdicao] = useState({ titulo: "", conteudo: "" });
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [colarAberto, setColarAberto] = useState(false);
  const [textoColado, setTextoColado] = useState("");
  const [salvando, setSalvando] = useState(false);

  const nichoId = nichoSel && nichoSel !== GERAL ? nichoSel : null;
  const nichoNome = nichos.find((n) => n.id === nichoId)?.nicho || null;
  const { titulo: tituloQuest, perguntas } = useMemo(() => perguntasDoNicho(nichoNome), [nichoNome]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cliente_nichos" as never).select("id, nicho").eq("cliente_id", cliente.id).order("nicho");
      const lista = ((data as any) || []) as { id: string; nicho: string }[];
      setNichos(lista);
      setNichoSel((atual) => (atual && (atual === GERAL || lista.some((n) => n.id === atual)) ? atual : lista[0]?.id || GERAL));
    })();
  }, [cliente.id]);

  const carregar = async () => {
    if (!nichoSel) return;
    let q = supabase.from("cliente_anotacoes" as never).select("*").eq("cliente_id", cliente.id);
    q = nichoId ? q.eq("cliente_nicho_id", nichoId) : q.is("cliente_nicho_id", null);
    const { data, error } = await q.order("importante", { ascending: false }).order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar anotações", { description: error.message });
      return;
    }
    const lista = ((data as any) || []) as Anotacao[];
    setAnotacoes(lista);
    setRespostas(lista.find((a) => a.tipo === "questionario")?.respostas || {});
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nichoSel, cliente.id]);

  const notas = anotacoes.filter((a) => a.tipo === "nota");
  const questionario = anotacoes.find((a) => a.tipo === "questionario");

  const salvarNota = async () => {
    if (!user || !nova.conteudo.trim()) return;
    const { error } = await supabase.from("cliente_anotacoes" as never).insert({
      cliente_id: cliente.id,
      cliente_nicho_id: nichoId,
      tipo: "nota",
      titulo: nova.titulo.trim() || null,
      conteudo: nova.conteudo.trim(),
      importante: nova.importante,
      user_id: user.id,
    } as never);
    if (error) {
      toast.error("Erro ao salvar anotação", { description: error.message });
      return;
    }
    toast.success("Anotação salva");
    setNova({ titulo: "", conteudo: "", importante: false });
    carregar();
  };

  const atualizarNota = async (a: Anotacao, patch: Partial<Anotacao>) => {
    const { error } = await supabase.from("cliente_anotacoes" as never).update(patch as never).eq("id", a.id);
    if (error) {
      toast.error("Erro ao atualizar anotação", { description: error.message });
      return;
    }
    setEditando(null);
    carregar();
  };

  const excluirNota = async (a: Anotacao) => {
    if (!confirm("Excluir esta anotação? (fica registrada no log de auditoria)")) return;
    const { data, error } = await supabase.from("cliente_anotacoes" as never).delete().eq("id", a.id).select("id");
    if (error || !(data as any[])?.length) {
      toast.error("Só quem escreveu a anotação pode excluí-la.");
      return;
    }
    carregar();
  };

  const salvarQuestionario = async () => {
    if (!user) return;
    setSalvando(true);
    const payload = { respostas, titulo: tituloQuest };
    const { error } = questionario
      ? await supabase.from("cliente_anotacoes" as never).update(payload as never).eq("id", questionario.id)
      : await supabase.from("cliente_anotacoes" as never).insert({
          ...payload,
          cliente_id: cliente.id,
          cliente_nicho_id: nichoId,
          tipo: "questionario",
          user_id: user.id,
        } as never);
    setSalvando(false);
    if (error) {
      toast.error("Erro ao salvar questionário", { description: error.message });
      return;
    }
    toast.success("Questionário salvo");
    carregar();
  };

  const copiarWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(textoParaWhatsApp(perguntas, cliente.nome));
      toast.success("Questionário copiado. Cole no WhatsApp do cliente.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  };

  const aplicarColado = () => {
    const lidas = lerRespostas(textoColado, perguntas);
    const n = Object.keys(lidas).length;
    if (n === 0) {
      toast.error("Não encontrei as perguntas no texto colado.", { description: "Cole a mensagem que o cliente devolveu, com as perguntas e respostas." });
      return;
    }
    setRespostas((r) => ({ ...r, ...lidas }));
    setColarAberto(false);
    setTextoColado("");
    toast.success(`${n} de ${perguntas.length} respostas preenchidas. Confira e clique em Salvar.`);
  };

  const respondidas = perguntas.filter((p) => (respostas[p.chave] || "").trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="text-xs shrink-0">Nicho:</Label>
        <Select value={nichoSel} onValueChange={setNichoSel}>
          <SelectTrigger className="h-9 text-sm sm:w-72"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>
            {nichos.map((n) => <SelectItem key={n.id} value={n.id}>{n.nicho}</SelectItem>)}
            {(nichos.length === 0 || isAdmin) && <SelectItem value={GERAL}>Cadastro geral (sem nicho)</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="notas">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="notas">Bloco de notas ({notas.length})</TabsTrigger>
          <TabsTrigger value="questionario">Questionário inicial {respondidas ? `(${respondidas}/${perguntas.length})` : ""}</TabsTrigger>
        </TabsList>

        {/* ---------- Bloco de notas ---------- */}
        <TabsContent value="notas" className="space-y-3 pt-2">
          <div className="rounded-md border p-3 space-y-2 bg-muted/10">
            <Input placeholder="Título (opcional) — ex.: Testemunhas, Pontos para audiência" value={nova.titulo} onChange={(e) => setNova({ ...nova, titulo: e.target.value })} className="h-9 text-sm" />
            <Textarea rows={4} placeholder="Escreva a anotação..." value={nova.conteudo} onChange={(e) => setNova({ ...nova, conteudo: e.target.value })} />
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={nova.importante} onCheckedChange={(c) => setNova({ ...nova, importante: !!c })} />
                <Star className="h-4 w-4 text-amber-500" /> Importante para a audiência
              </label>
              <Button size="sm" onClick={salvarNota} disabled={!nova.conteudo.trim()}><Save className="h-4 w-4 mr-1" /> Salvar anotação</Button>
            </div>
          </div>

          {notas.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhuma anotação neste nicho.</p>}
          {notas.map((a) => (
            <div key={a.id} className={`rounded-md border p-3 space-y-2 ${a.importante ? "border-amber-500/50 bg-amber-500/5" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {a.importante && <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px]"><Star className="h-3 w-3 mr-1" />Audiência</Badge>}
                  <span className="font-semibold text-sm truncate">{a.titulo || "Anotação"}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title={a.importante ? "Tirar destaque" : "Marcar como importante para a audiência"} onClick={() => atualizarNota(a, { importante: !a.importante })}>
                    <Star className={`h-4 w-4 ${a.importante ? "fill-amber-500 text-amber-500" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => { setEditando(a.id); setEdicao({ titulo: a.titulo || "", conteudo: a.conteudo || "" }); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {(a.user_id === user?.id || isAdmin) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir" onClick={() => excluirNota(a)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {editando === a.id ? (
                <div className="space-y-2">
                  <Input value={edicao.titulo} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} className="h-8 text-sm" placeholder="Título" />
                  <Textarea rows={5} value={edicao.conteudo} onChange={(e) => setEdicao({ ...edicao, conteudo: e.target.value })} />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditando(null)}><X className="h-4 w-4 mr-1" />Cancelar</Button>
                    <Button size="sm" onClick={() => atualizarNota(a, { titulo: edicao.titulo || null, conteudo: edicao.conteudo })}><Save className="h-4 w-4 mr-1" />Salvar</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap break-words">{a.conteudo}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {nomeUsuario(usuarios, a.user_id) || (a.user_id === user?.id ? "Você" : "—")} · {dataHora(a.created_at)}
                {a.updated_at !== a.created_at && ` · editada ${dataHora(a.updated_at)}${a.updated_by ? " por " + (nomeUsuario(usuarios, a.updated_by) || "—") : ""}`}
              </p>
            </div>
          ))}
        </TabsContent>

        {/* ---------- Questionário inicial ---------- */}
        <TabsContent value="questionario" className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copiarWhatsApp}><ClipboardCopy className="h-4 w-4 mr-1" /> Copiar para enviar no WhatsApp</Button>
            <Button variant="outline" size="sm" onClick={() => setColarAberto(true)}><ClipboardPaste className="h-4 w-4 mr-1" /> Colar respostas do WhatsApp</Button>
          </div>
          <p className="text-xs text-muted-foreground">{tituloQuest}{questionario ? ` · última alteração ${dataHora(questionario.updated_at)}${questionario.updated_by ? " por " + (nomeUsuario(usuarios, questionario.updated_by) || "—") : ""}` : " · ainda não preenchido"}</p>
          <div className="space-y-3">
            {perguntas.map((p, i) => (
              <div key={p.chave} className="space-y-1">
                <Label className="text-xs font-semibold">{i + 1}. {p.pergunta}</Label>
                {p.ajuda && <p className="text-[11px] text-muted-foreground">{p.ajuda}</p>}
                <Textarea rows={2} className="text-sm" value={respostas[p.chave] || ""} onChange={(e) => setRespostas({ ...respostas, [p.chave]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex justify-end sticky bottom-0 bg-background py-2">
            <Button onClick={salvarQuestionario} disabled={salvando}><Save className="h-4 w-4 mr-1" /> {salvando ? "Salvando..." : "Salvar questionário"}</Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={colarAberto} onOpenChange={setColarAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Colar respostas do WhatsApp</DialogTitle>
            <DialogDescription>Cole a mensagem que o cliente devolveu com as respostas. O sistema encaixa cada resposta na pergunta certa.</DialogDescription>
          </DialogHeader>
          <Textarea rows={12} value={textoColado} onChange={(e) => setTextoColado(e.target.value)} placeholder="Nome completo: João da Silva&#10;Empresa: ..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setColarAberto(false)}>Cancelar</Button>
            <Button onClick={aplicarColado}>Preencher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Painel lateral para abrir as anotações a partir de Clientes / Audiências
export function ClienteAnotacoesSheet({
  cliente,
  nichoInicial,
  onClose,
}: {
  cliente: { id: string; nome: string } | null;
  nichoInicial?: string | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!cliente} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {cliente && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="flex items-center gap-2"><NotebookPen className="h-5 w-5" /> {cliente.nome}</SheetTitle>
              <SheetDescription>Anotações e questionário inicial do cliente. Todas as alterações ficam registradas.</SheetDescription>
            </SheetHeader>
            <div className="pt-4">
              <ClienteAnotacoes cliente={cliente} nichoInicial={nichoInicial} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
