/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Check, ChevronsUpDown, ClipboardPaste, UserSearch, AlertTriangle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDatabase, adjustDateForTimezone } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRascunho } from "@/hooks/useRascunho";
import { formatarDocumento, soDigitos, useUsuarios } from "@/lib/nichos";
import { CNJ_REGEX, interpretarTextoAgenda, nomesCompativeis } from "@/lib/agendaParser";
import { FUSOS, FUSO_ESCRITORIO, converterHora, fusoInfo, sugerirFusoPorLocal } from "@/lib/fusos";
import type { Audiencia } from "@/pages/Audiencias";

// Travas do cadastro (pedido da Gestão): nenhum campo pode ficar em branco
const obrigatorio = (msg: string) => z.string({ required_error: msg }).trim().min(1, msg);
const formSchema = z
  .object({
    titulo: obrigatorio("Informe a audiência / partes"),
    processoNumero: obrigatorio("Informe o nº do processo"),
    link: z.string().optional().or(z.literal("")),
    semLink: z.boolean().optional(),
    vinculo: obrigatorio("Vincule o cliente / nicho"), // "clienteId|nichoId"
    processoId: z.string().optional().or(z.literal("")),
    data: z.date({ required_error: "Informe a data da audiência" }),
    hora: obrigatorio("Informe a hora"),
    fuso: obrigatorio("Informe o fuso horário"),
    local: obrigatorio("Informe o local / vara"),
    tipo: z.enum(["Instrução", "Conciliação", "Julgamento", "Una"], { required_error: "Selecione o tipo" }),
    status: z.enum(["Agendada", "Realizada", "Cancelada", "Reagendada"], { required_error: "Selecione o status" }),
    responsavelId: obrigatorio("Selecione o responsável"),
  })
  .refine((d) => d.semLink || !!d.link?.trim(), {
    path: ["link"],
    message: 'Informe o link ou marque "Audiência sem link"',
  });

// nome do campo para o aviso de pendências (na ordem da tela)
const ROTULOS: Record<string, string> = {
  titulo: "Audiência / Partes",
  vinculo: "Cliente / Nicho",
  processoNumero: "Nº do Processo",
  data: "Data",
  hora: "Hora",
  fuso: "Fuso horário",
  local: "Local / Vara",
  link: "Link da audiência",
  tipo: "Tipo",
  status: "Status",
  responsavelId: "Responsável",
};

export type AudienciaFormValues = Omit<z.infer<typeof formSchema>, "data" | "vinculo"> & {
  data: Date | string;
  id?: string;
  clienteId: string | null;
  nichoId: string | null;
  responsavelNome: string;
};

type AudienciaFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AudienciaFormValues) => void;
  audiencia?: Audiencia;
};

type OpcaoVinculo = { value: string; clienteId: string; nichoId: string | null; label: string; nome: string; cpf: string | null };

export function AudienciaForm({ isOpen, onClose, onSave, audiencia }: AudienciaFormProps) {
  const { user } = useAuth();
  const usuarios = useUsuarios();
  const [opcoes, setOpcoes] = useState<OpcaoVinculo[]>([]);
  const [processos, setProcessos] = useState<{ id: string; numero: string | null; cliente_id: string | null; cliente_nicho_id: string | null }[]>([]);
  const [textoAgenda, setTextoAgenda] = useState("");
  const [partesLidas, setPartesLidas] = useState<string[]>([]);
  const [sugestoes, setSugestoes] = useState<OpcaoVinculo[] | null>(null);
  const [vinculoAberto, setVinculoAberto] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({ resolver: zodResolver(formSchema) });

  // Clientes/nichos e processos da carteira do usuário (RLS)
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [{ data: cls }, { data: nichos }, { data: procs }] = await Promise.all([
        supabase.from("clientes").select("id, nome, cpf").order("nome"),
        supabase.from("cliente_nichos" as never).select("id, cliente_id, nicho"),
        supabase.from("processos").select("id, numero, cliente_id, cliente_nicho_id"),
      ]);
      const lista: OpcaoVinculo[] = [];
      ((cls as any[]) || []).forEach((c) => {
        const ns = ((nichos as any[]) || []).filter((n) => n.cliente_id === c.id);
        if (ns.length === 0) lista.push({ value: `${c.id}|`, clienteId: c.id, nichoId: null, label: `${c.nome} (sem nicho)`, nome: c.nome, cpf: c.cpf });
        ns.forEach((n) => lista.push({ value: `${c.id}|${n.id}`, clienteId: c.id, nichoId: n.id, label: `${c.nome} — ${n.nicho}`, nome: c.nome, cpf: c.cpf }));
      });
      setOpcoes(lista);
      setProcessos((procs as any) || []);
    })();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setTextoAgenda("");
    setPartesLidas([]);
    setSugestoes(null);
    if (audiencia) {
      form.reset({
        titulo: audiencia.titulo || "",
        processoNumero: audiencia.processoNumero || "",
        link: audiencia.link || "",
        vinculo: audiencia.clienteId ? `${audiencia.clienteId}|${audiencia.nichoId || ""}` : "",
        processoId: audiencia.processoId || "",
        data: audiencia.data,
        hora: (audiencia.hora || "").slice(0, 5),
        fuso: audiencia.fuso || FUSO_ESCRITORIO,
        local: audiencia.local || "",
        tipo: audiencia.tipo,
        status: audiencia.status,
        responsavelId: audiencia.responsavelId || user?.id || "",
        semLink: !audiencia.link,
      });
    } else {
      form.reset({
        titulo: "", processoNumero: "", link: "", vinculo: "", processoId: "",
        data: undefined, hora: "", fuso: FUSO_ESCRITORIO, local: "", tipo: undefined, status: "Agendada",
        responsavelId: user?.id || "", semLink: false,
      });
    }
  }, [audiencia, form, isOpen, user]);

  // rascunho: não perde o que foi digitado se sair da tela/janela
  const rascunho = useRascunho(form, isOpen && user ? `audiencia:${audiencia?.id || "nova"}:${user.id}` : null);
  const cancelar = () => {
    rascunho.limpar();
    onClose();
  };

  const vinculo = form.watch("vinculo");
  const clienteSel = opcoes.find((o) => o.value === vinculo);
  const processosDoCliente = useMemo(
    () => processos.filter((p) => clienteSel && p.cliente_id === clienteSel.clienteId),
    [processos, clienteSel]
  );

  const buscarClientePorPartes = (partes: string[]) => {
    const encontrados = opcoes.filter((o) => partes.some((p) => nomesCompativeis(p, o.nome)));
    setSugestoes(encontrados);
    if (encontrados.length === 1) {
      form.setValue("vinculo", encontrados[0].value);
      toast.success(`Cliente vinculado: ${encontrados[0].label}`);
    }
    return encontrados;
  };

  const interpretar = () => {
    if (!textoAgenda.trim()) {
      toast.error("Cole o texto do evento do Google Agenda");
      return;
    }
    const r = interpretarTextoAgenda(textoAgenda);
    if (r.titulo) form.setValue("titulo", r.titulo);
    if (r.processoNumero) form.setValue("processoNumero", r.processoNumero);
    if (r.link) {
      form.setValue("link", r.link);
      form.setValue("semLink", false);
    }
    if (r.data) form.setValue("data", r.data);
    if (r.hora) form.setValue("hora", r.hora);
    // O Google Agenda de vocês mostra o horário já no fuso do escritório
    form.setValue("fuso", FUSO_ESCRITORIO);
    if (r.tipo) form.setValue("tipo", r.tipo);
    setPartesLidas(r.partes);

    // 1º tenta pelo nº do processo já cadastrado; depois pelo nome das partes
    const proc = r.processoNumero && processos.find((p) => soDigitos(p.numero) === soDigitos(r.processoNumero));
    if (proc) {
      const op = opcoes.find((o) => o.clienteId === proc.cliente_id && (o.nichoId === proc.cliente_nicho_id || !proc.cliente_nicho_id));
      if (op) form.setValue("vinculo", op.value);
      form.setValue("processoId", proc.id);
      setSugestoes(op ? [op] : []);
      toast.success("Processo encontrado e vinculado");
    } else {
      buscarClientePorPartes(r.partes);
    }
    const lidos = [r.data && "data", r.hora && "horário", r.processoNumero && "nº do processo", r.link && "link", r.tipo && "tipo"].filter(Boolean);
    toast.info(`Lido do Google Agenda: ${lidos.join(", ") || "apenas o título"}. Confira os campos antes de salvar.`);
  };

  // Campos pendentes: avisa quais são e leva até o primeiro
  const onInvalid = (erros: Record<string, unknown>) => {
    const pendentes = Object.keys(ROTULOS).filter((k) => k in erros);
    toast.error("Preencha os campos pendentes para salvar", { description: pendentes.map((k) => ROTULOS[k]).join(", ") });
    const primeiro = pendentes[0];
    if (primeiro) {
      const el = document.querySelector(`[data-campo="${primeiro}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      (el?.querySelector("input:not([disabled]), button, textarea") as HTMLElement | null)?.focus({ preventScroll: true });
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const op = opcoes.find((o) => o.value === data.vinculo);
    const resp = usuarios.find((u) => u.id === data.responsavelId);
    rascunho.limpar();
    onSave({
      ...data,
      link: data.semLink ? "" : data.link,
      // nº digitado igual ao de um processo do cliente: vincula automaticamente
      processoId: data.processoId || processosDoCliente.find((p) => soDigitos(p.numero) === soDigitos(data.processoNumero))?.id || "",
      data: formatDateForDatabase(data.data),
      id: audiencia?.id,
      clienteId: op?.clienteId ?? null,
      nichoId: op?.nichoId ?? null,
      responsavelNome: resp ? resp.full_name || resp.email || "" : "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="mx-4 max-w-2xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{audiencia ? "Editar Audiência" : "Nova Audiência"}</DialogTitle>
          <DialogDescription className="text-sm">
            Cole o evento do Google Agenda para preencher automaticamente, vincule o cliente e gere a tarefa do responsável.
          </DialogDescription>
        </DialogHeader>

        {/* Colar do Google Agenda */}
        <div className="rounded-md border border-dashed p-3 space-y-2 bg-muted/10">
          <p className="text-xs font-semibold flex items-center gap-1"><ClipboardPaste className="w-3.5 h-3.5" /> Colar do Google Agenda</p>
          <Textarea
            rows={3}
            className="text-xs"
            placeholder="Ex.: INICIAL - DIEGO BARBOSA x GENESIS GROUP LTDA Segunda-feira, 5 de outubro⋅1:00 – 2:00pm - Entrar com o Google Meet meet.google.com/..."
            value={textoAgenda}
            onChange={(e) => setTextoAgenda(e.target.value)}
          />
          <Button type="button" size="sm" variant="secondary" onClick={interpretar}>Preencher automaticamente</Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
            <FormField control={form.control} name="titulo" render={({ field }) => (
              <FormItem data-campo="titulo">
                <FormLabel className="text-sm font-medium">Audiência / Partes *</FormLabel>
                <FormControl><Input {...field} className="text-sm" placeholder="Ex.: INICIAL - FULANO x EMPRESA LTDA" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Vínculo com o cliente */}
            <FormField control={form.control} name="vinculo" render={({ field }) => (
              <FormItem className="flex flex-col" data-campo="vinculo">
                <FormLabel className="text-sm font-medium">Cliente / Nicho *</FormLabel>
                <div className="flex gap-2">
                  <Popover open={vinculoAberto} onOpenChange={setVinculoAberto}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" role="combobox" className={cn("flex-1 justify-between text-sm font-normal", !field.value && "text-muted-foreground")}>
                        <span className="truncate">{clienteSel?.label || "Buscar cliente por nome ou CPF..."}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command filter={(value, search) => {
                        const o = opcoes.find((x) => x.value === value);
                        if (!o) return 0;
                        const s = search.toLowerCase();
                        return o.label.toLowerCase().includes(s) || (!!soDigitos(s) && soDigitos(o.cpf).includes(soDigitos(s))) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="Nome ou CPF/CNPJ..." />
                        <CommandList>
                          <CommandEmpty>Nenhum cliente encontrado na sua carteira.</CommandEmpty>
                          <CommandGroup>
                            {field.value && (
                              <CommandItem value="__limpar" onSelect={() => { field.onChange(""); form.setValue("processoId", ""); setVinculoAberto(false); }}>
                                <span className="text-muted-foreground">Remover vínculo</span>
                              </CommandItem>
                            )}
                            {opcoes.map((o) => (
                              <CommandItem key={o.value} value={o.value} onSelect={() => { field.onChange(o.value); form.setValue("processoId", ""); setVinculoAberto(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", field.value === o.value ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span>{o.label}</span>
                                  {o.cpf && <span className="text-[10px] text-muted-foreground">{formatarDocumento(o.cpf)}</span>}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button type="button" variant="outline" size="icon" title="Buscar cliente pelo nome das partes"
                    onClick={() => {
                      const partes = partesLidas.length ? partesLidas : (form.getValues("titulo") || "").split(/\s+x\s+/i).map((p) => p.split(/\s[-–]\s|:\s/).pop() || p);
                      const r = buscarClientePorPartes(partes);
                      if (r.length === 0) toast.warning("Nenhum cliente cadastrado com esses nomes.");
                    }}>
                    <UserSearch className="h-4 w-4" />
                  </Button>
                </div>
                {sugestoes && sugestoes.length > 1 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-xs text-muted-foreground">Possíveis clientes:</span>
                    {sugestoes.map((s) => (
                      <Button key={s.value} type="button" size="sm" variant="secondary" className="h-6 text-xs" onClick={() => field.onChange(s.value)}>{s.label}</Button>
                    ))}
                  </div>
                )}
                {sugestoes && sugestoes.length === 0 && !field.value && (
                  <div className="text-xs rounded border border-amber-500/30 bg-amber-500/5 p-2 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      Nenhum cliente cadastrado {partesLidas.length ? <>com o nome <strong>{partesLidas.join(" / ")}</strong></> : "com esse nome"}.{" "}
                      <a href="/clientes" target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-0.5">Cadastrar cliente pelo CPF <ExternalLink className="w-3 h-3" /></a>{" "}
                      e depois clique no botão de busca ao lado.
                    </span>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="processoNumero" render={({ field }) => (
                <FormItem data-campo="processoNumero">
                  <FormLabel className="text-sm font-medium">Nº do Processo *</FormLabel>
                  <FormControl><Input {...field} className="text-sm" placeholder="0000000-00.0000.0.00.0000" /></FormControl>
                  {field.value && !CNJ_REGEX.test(field.value) && <p className="text-[11px] text-amber-600">Formato CNJ não reconhecido.</p>}
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="processoId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Processo cadastrado</FormLabel>
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)} disabled={!clienteSel}>
                    <FormControl><SelectTrigger className="text-sm"><SelectValue placeholder="Opcional" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {processosDoCliente.map((p) => <SelectItem key={p.id} value={p.id}>{p.numero || "(sem número)"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="data" render={({ field }) => (
                <FormItem className="flex flex-col" data-campo="data">
                  <FormLabel className="text-sm font-medium">Data *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("pl-3 text-left font-normal text-sm", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={(date) => date && field.onChange(adjustDateForTimezone(date))} initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="hora" render={({ field }) => (
                <FormItem data-campo="hora">
                  <FormLabel className="text-sm font-medium">Hora *</FormLabel>
                  <FormControl><Input type="time" {...field} className="text-sm" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="fuso" render={({ field }) => {
              const hora = form.watch("hora");
              const local = form.watch("local");
              const sugerido = sugerirFusoPorLocal(local);
              return (
                <FormItem data-campo="fuso">
                  <FormLabel className="text-sm font-medium">Fuso horário da hora informada *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || FUSO_ESCRITORIO}>
                    <FormControl><SelectTrigger className="text-sm"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {FUSOS.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome} (UTC{f.offset}) — {f.estados}{f.id === FUSO_ESCRITORIO ? " · escritório" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hora && field.value && field.value !== FUSO_ESCRITORIO && (
                    <p className="text-xs text-primary">{hora} {fusoInfo(field.value).sigla} = <strong>{converterHora(hora, field.value)} no horário de Mato Grosso</strong></p>
                  )}
                  {sugerido && sugerido !== (field.value || FUSO_ESCRITORIO) && (
                    <p className="text-[11px] text-muted-foreground">
                      O local parece ficar no fuso de {fusoInfo(sugerido).nome}. Se a hora acima é a da intimação (horário local da vara),{" "}
                      <button type="button" className="underline text-primary" onClick={() => field.onChange(sugerido)}>usar {fusoInfo(sugerido).nome}</button>.
                      Se veio do Google Agenda de vocês, mantenha Mato Grosso.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }} />

            <FormField control={form.control} name="local" render={({ field }) => (
              <FormItem data-campo="local">
                <FormLabel className="text-sm font-medium">Local / Vara *</FormLabel>
                <FormControl><Input {...field} className="text-sm" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="link" render={({ field }) => {
              const semLink = form.watch("semLink");
              return (
                <FormItem data-campo="link">
                  <FormLabel className="text-sm font-medium">Link da audiência virtual *</FormLabel>
                  <FormControl><Input {...field} disabled={semLink} className="text-sm" placeholder={semLink ? "Audiência sem link" : "https://meet.google.com/..."} /></FormControl>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox checked={!!semLink} onCheckedChange={(c) => { form.setValue("semLink", !!c); form.clearErrors("link"); }} />
                    Audiência sem link (somente presencial)
                  </label>
                  <FormMessage />
                </FormItem>
              );
            }} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem data-campo="tipo">
                  <FormLabel className="text-sm font-medium">Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Conciliação">Conciliação</SelectItem>
                      <SelectItem value="Instrução">Instrução</SelectItem>
                      <SelectItem value="Julgamento">Julgamento</SelectItem>
                      <SelectItem value="Una">Una</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem data-campo="status">
                  <FormLabel className="text-sm font-medium">Status *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Agendada">Agendada</SelectItem>
                      <SelectItem value="Realizada">Realizada</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                      <SelectItem value="Reagendada">Reagendada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="responsavelId" render={({ field }) => (
                <FormItem data-campo="responsavelId">
                  <FormLabel className="text-sm font-medium">Responsável *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl><SelectTrigger className="text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {audiencia?.tarefaId
                ? "Tarefa vinculada: data, responsável e status são atualizados junto com a audiência."
                : "Ao salvar, a tarefa do responsável é criada na data da audiência."}
            </p>
            {audiencia?.registradaEm && (
              <p className="text-xs text-muted-foreground">
                Registrada no ERP em {format(audiencia.registradaEm, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                {audiencia.registradaPor ? ` por ${audiencia.registradaPor}` : ""}.
              </p>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={cancelar} className="w-full sm:w-auto order-2 sm:order-1">Cancelar</Button>
              <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2">Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
