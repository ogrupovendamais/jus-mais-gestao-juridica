import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Search,
  MoreHorizontal,
  Calendar,
  MapPin,
  Clock,
  Video,
  UserCheck,
  AlertTriangle,
  ListChecks,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { differenceInCalendarDays } from "date-fns";
import { useUsuarios } from "@/lib/nichos";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDatabase, parseDateFromDatabase } from "@/lib/utils";
import { AudienciaForm, AudienciaFormValues } from "@/components/audiencias/AudienciaForm";
import { ClienteAnotacoesSheet } from "@/components/clientes/ClienteAnotacoes";
import { FUSO_ESCRITORIO, rotuloHora } from "@/lib/fusos";
import { useSubmitUnico } from "@/hooks/useSubmitUnico";
import { DeleteAudienciaDialog } from "@/components/audiencias/DeleteAudienciaDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Audiencia = {
  id: string;
  processoNumero: string;
  titulo?: string | null;
  link?: string | null;
  clienteId?: string | null;
  clienteNome?: string | null;
  nichoId?: string | null;
  processoId?: string | null;
  responsavelId?: string | null;
  tarefaId?: string | null;
  data: Date;
  hora: string;
  fuso?: string | null;
  local: string;
  tipo: "Instrução" | "Conciliação" | "Julgamento" | "Una";
  status: "Agendada" | "Realizada" | "Cancelada" | "Reagendada";
  google_event_id?: string | null;
  registradaEm?: Date | null;
  registradaPor?: string | null;
};

// Campos que a trava do cadastro exige (registros antigos podem estar incompletos)
const pendenciasDe = (a: Audiencia) =>
  [
    !a.titulo && "partes",
    !a.clienteId && "cliente",
    !a.processoNumero && "nº do processo",
    !a.hora && "hora",
    !a.local && "local",
    !a.tarefaId && "tarefa",
  ].filter(Boolean) as string[];

// Registro no ERP: data, autor e antecedência em relação à audiência (gestão / CI)
function RegistroInfo({ a }: { a: Audiencia }) {
  if (!a.registradaEm) return null;
  const dias = differenceInCalendarDays(a.data, a.registradaEm);
  return (
    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
      <History className="w-3 h-3 shrink-0" />
      Registrada em {format(a.registradaEm, "dd/MM/yyyy", { locale: ptBR })}
      {a.registradaPor ? ` por ${a.registradaPor}` : ""}
      {dias >= 0 ? ` · ${dias} dia(s) de antecedência` : " · registrada após a data da audiência"}
    </p>
  );
}

function PendenciasBadge({ a }: { a: Audiencia }) {
  const p = pendenciasDe(a);
  if (!p.length) return null;
  return (
    <Badge variant="outline" className="text-[10px] gap-1 text-red-500 border-red-500/30" title="Abra em Editar para completar">
      <AlertTriangle className="w-3 h-3" />Pendente: {p.join(", ")}
    </Badge>
  );
}

const descricaoTarefa = (a: { tipo?: string; titulo?: string | null; processoNumero?: string | null; data: string; hora?: string | null; fuso?: string | null; local?: string | null; link?: string | null }) =>
  [
    `AUDIÊNCIA${a.tipo ? " " + a.tipo.toUpperCase() : ""}: ${a.titulo || a.processoNumero || ""}`.trim(),
    a.processoNumero && a.titulo && !a.titulo.includes(a.processoNumero) ? `Processo ${a.processoNumero}` : null,
    `${a.data.split("-").reverse().join("/")}${a.hora ? " às " + rotuloHora(a.hora, a.fuso) + " (horário MT)" : ""}`,
    a.local || null,
    a.link || null,
  ]
    .filter(Boolean)
    .join(" — ");

const initialAudiencias: Audiencia[] = [];

const getStatusBadgeClass = (status: Audiencia["status"]) => {
  switch (status) {
    case "Agendada":
      return "bg-blue-500/20 text-blue-400 border-blue-500/20";
    case "Realizada":
      return "bg-green-500/20 text-green-400 border-green-500/20";
    case "Cancelada":
      return "bg-red-500/20 text-red-400 border-red-500/20";
    case "Reagendada":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/20";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/20";
  }
};

export default function Audiencias() {
  const [audiencias, setAudiencias] = useState<Audiencia[]>(initialAudiencias);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAudiencia, setEditingAudiencia] = useState<
    Audiencia | undefined
  >(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAudienciaId, setDeletingAudienciaId] = useState<string | null>(
    null
  );

  const { user } = useAuth();
  const usuarios = useUsuarios();
  const [anotacoesDe, setAnotacoesDe] = useState<Audiencia | null>(null);

  const load = async () => {
    const [{ data, error }, { data: cls }, { data: tars }] = await Promise.all([
      supabase.from("audiencias").select("*").order("data", { ascending: true }),
      supabase.from("clientes").select("id, nome"),
      supabase.from("tarefas").select("id, audiencia_id").not("audiencia_id" as never, "is", null),
    ]);
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar audiências");
      return;
    }
    setAudiencias(
      (data || []).map((a: any) => ({
        id: a.id,
        processoNumero: a.processo_numero || "",
        titulo: a.titulo,
        link: a.link_reuniao,
        clienteId: a.cliente_id,
        clienteNome: ((cls as any[]) || []).find((c) => c.id === a.cliente_id)?.nome || null,
        nichoId: a.cliente_nicho_id,
        processoId: a.processo_id,
        responsavelId: a.responsavel_id,
        tarefaId: ((tars as any[]) || []).find((t) => t.audiencia_id === a.id)?.id || null,
        data: new Date(a.data + "T00:00:00"),
        hora: a.hora,
        fuso: a.fuso,
        local: a.local,
        tipo: a.tipo,
        status: a.status,
        google_event_id: a.google_event_id,
        registradaEm: a.created_at ? new Date(a.created_at) : null,
        registradaPor: a.user_id,
      }))
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAudiencias = useMemo(() => {
    return audiencias
      .filter(
        (a) =>
          (a.processoNumero || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.titulo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.clienteNome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (a.local || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((a) => {
        // registradaPor chega como id de quem lançou; aqui vira o nome
        const u = usuarios.find((x) => x.id === a.registradaPor);
        return u ? { ...a, registradaPor: u.full_name || u.email } : a;
      });
  }, [audiencias, searchTerm, usuarios]);

  const salvarAudiencia = async (audienciaData: AudienciaFormValues) => {
    try {
      let targetId = audienciaData.id;
      const existente = audiencias.find((a) => a.id === audienciaData.id);
      const existingEventId = existente?.google_event_id;
      const dataStr = typeof audienciaData.data === "string" ? audienciaData.data : formatDateForDatabase(audienciaData.data);

      const payload: any = {
        processo_numero: audienciaData.processoNumero || null,
        titulo: audienciaData.titulo || null,
        link_reuniao: audienciaData.link || null,
        cliente_id: audienciaData.clienteId,
        cliente_nicho_id: audienciaData.nichoId,
        processo_id: audienciaData.processoId || null,
        responsavel_id: audienciaData.responsavelId || user?.id,
        data: dataStr,
        hora: audienciaData.hora || null,
        fuso: audienciaData.fuso || FUSO_ESCRITORIO,
        local: audienciaData.local,
        tipo: audienciaData.tipo,
        status: audienciaData.status,
      };

      if (audienciaData.id) {
        const { error } = await supabase.from("audiencias").update(payload).eq("id", audienciaData.id);
        if (error) throw error;
        toast.success("Audiência atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("audiencias")
          .insert({ ...payload, user_id: user?.id })
          .select("id")
          .single();
        if (error) throw error;
        targetId = (data as any).id;
        toast.success("Audiência adicionada com sucesso!");
      }

      // Tarefa vinculada: cria (se pedido) ou mantém sincronizada com a audiência
      if (targetId) {
        const tarefaPayload: any = {
          descricao: descricaoTarefa({ ...audienciaData, data: dataStr }),
          data_conclusao: dataStr,
          responsavel_id: audienciaData.responsavelId || user?.id,
          responsavel: audienciaData.responsavelNome || null,
          cliente_id: audienciaData.clienteId,
          ...(audienciaData.status === "Realizada" || audienciaData.status === "Cancelada" ? { status: "Concluída" } : {}),
        };
        if (existente?.tarefaId) {
          await supabase.from("tarefas").update(tarefaPayload).eq("id", existente.tarefaId);
        } else {
          const { error: tErr } = await supabase.from("tarefas").insert({
            ...tarefaPayload,
            user_id: user?.id,
            audiencia_id: targetId,
            prioridade: "Alta",
            status: tarefaPayload.status || "Pendente",
          });
          if (tErr) toast.error("Audiência salva, mas a tarefa não foi criada", { description: tErr.message });
          else toast.success("Tarefa criada para o responsável");
        }
      }

      setIsFormOpen(false);
      setEditingAudiencia(undefined);
      load();

      // Sincronização em Background com o Google Calendar
      if (targetId) {
        const formattedDate = dataStr;

        fetch("https://erp.cadoreadvocacia.com.br/api/google/calendar/sync-audiencia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Audiência - ${audienciaData.tipo}${audienciaData.titulo ? ": " + audienciaData.titulo : ""}`,
            description: [audienciaData.processoNumero && `Processo nº: ${audienciaData.processoNumero}`, audienciaData.link].filter(Boolean).join("\n"),
            date: formattedDate,
            time: audienciaData.hora,
            timezone: audienciaData.fuso || FUSO_ESCRITORIO,
            location: audienciaData.local,
            partner_email: user?.email,
            google_event_id: existingEventId
          })
        })
        .then(async (res) => {
          if (res.ok) {
            const resData = await res.json();
            if (resData.eventId && resData.eventId !== existingEventId) {
              await supabase
                .from("audiencias")
                .update({ google_event_id: resData.eventId })
                .eq("id", targetId);

              setAudiencias((prev) =>
                prev.map((a) =>
                  a.id === targetId ? { ...a, google_event_id: resData.eventId } : a
                )
              );
            }
          }
        })
        .catch((err) => console.warn("Erro ao sincronizar com Google Agenda:", err));
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar audiência");
    }
  };
  const handleSave = useSubmitUnico(salvarAudiencia);

  const handleDelete = async () => {
    if (deletingAudienciaId) {
      const audToDelete = audiencias.find(a => a.id === deletingAudienciaId);

      const { error } = await supabase
        .from("audiencias")
        .delete()
        .eq("id", deletingAudienciaId);
      if (error) {
        console.error(error);
        toast.error("Erro ao excluir audiência");
        return;
      }
      setAudiencias(audiencias.filter((a) => a.id !== deletingAudienciaId));
      toast.success("Audiência excluída com sucesso!");
      setIsDeleteDialogOpen(false);
      setDeletingAudienciaId(null);

      // Exclui do Google Agenda em background
      if (audToDelete?.google_event_id) {
        fetch("https://erp.cadoreadvocacia.com.br/api/google/calendar/delete-audiencia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ google_event_id: audToDelete.google_event_id })
        })
        .catch((err) => console.warn("Erro ao excluir evento do Google Agenda:", err));
      }
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            Gerenciamento de Audiências
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visualize, adicione e gerencie as audiências.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAudiencia(undefined);
            setIsFormOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Audiência
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nº do processo ou local..."
          className="pl-9 sm:pl-10 text-sm sm:text-base"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Audiência / Cliente</TableHead>
              <TableHead>Data e Hora</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAudiencias.map((audiencia) => (
              <TableRow key={audiencia.id}>
                <TableCell className="max-w-md">
                  <p className="font-medium text-sm">{audiencia.titulo || audiencia.processoNumero || "—"}</p>
                  {audiencia.titulo && audiencia.processoNumero && !audiencia.titulo.includes(audiencia.processoNumero) && (
                    <p className="text-xs text-muted-foreground">Processo {audiencia.processoNumero}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {audiencia.clienteNome && (
                      <Badge variant="outline" className="text-[10px] gap-1"><UserCheck className="w-3 h-3" />{audiencia.clienteNome}</Badge>
                    )}
                    {audiencia.tarefaId && (
                      <Link to={`/tarefas?tarefa=${audiencia.tarefaId}`} title="Abrir a tarefa">
                        <Badge variant="outline" className="text-[10px] gap-1 hover:bg-muted cursor-pointer"><ListChecks className="w-3 h-3" />Ver tarefa</Badge>
                      </Link>
                    )}
                    <PendenciasBadge a={audiencia} />
                    {audiencia.link && (
                      <a href={audiencia.link} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline inline-flex items-center gap-1"><Video className="w-3 h-3" />Entrar na audiência</a>
                    )}
                  </div>
                  <RegistroInfo a={audiencia} />
                </TableCell>
                <TableCell>
                  {format(audiencia.data, "dd/MM/yyyy", { locale: ptBR })}{audiencia.hora ? ` às ${rotuloHora(audiencia.hora, audiencia.fuso)}` : ""}
                </TableCell>
                <TableCell>{audiencia.local}</TableCell>
                <TableCell>{audiencia.tipo}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "pointer-events-none",
                      getStatusBadgeClass(audiencia.status)
                    )}
                  >
                    {audiencia.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingAudiencia(audiencia);
                          setIsFormOpen(true);
                        }}
                      >
                        Editar
                      </DropdownMenuItem>
                      {audiencia.clienteId && (
                        <DropdownMenuItem onClick={() => setAnotacoesDe(audiencia)}>Anotações do cliente</DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-500 hover:!text-red-500"
                        onClick={() => {
                          setDeletingAudienciaId(audiencia.id);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {filteredAudiencias.map((audiencia) => (
          <Card key={audiencia.id} className="p-3">
            <CardHeader className="p-0 pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm">
                    {audiencia.titulo || `Processo ${audiencia.processoNumero}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">{audiencia.clienteNome || "Sem cliente vinculado"}</p>
                  <PendenciasBadge a={audiencia} />
                  {audiencia.tarefaId && <Link to={`/tarefas?tarefa=${audiencia.tarefaId}`} className="block text-xs text-primary underline">Ver tarefa</Link>}
                  <RegistroInfo a={audiencia} />
                  {audiencia.link && <a href={audiencia.link} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Entrar na audiência</a>}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      getStatusBadgeClass(audiencia.status)
                    )}
                  >
                    {audiencia.status}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingAudiencia(audiencia);
                        setIsFormOpen(true);
                      }}
                    >
                      Editar
                    </DropdownMenuItem>
                    {audiencia.clienteId && (
                      <DropdownMenuItem onClick={() => setAnotacoesDe(audiencia)}>Anotações do cliente</DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-red-500 hover:!text-red-500"
                      onClick={() => {
                        setDeletingAudienciaId(audiencia.id);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(audiencia.data, "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <Clock className="h-4 w-4 ml-2" />
                <span>{rotuloHora(audiencia.hora, audiencia.fuso)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{audiencia.local}</span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Tipo:</span> {audiencia.tipo}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AudienciaForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAudiencia(undefined);
        }}
        onSave={handleSave}
        audiencia={editingAudiencia}
      />

      <ClienteAnotacoesSheet
        cliente={anotacoesDe?.clienteId ? { id: anotacoesDe.clienteId, nome: anotacoesDe.clienteNome || "Cliente" } : null}
        nichoInicial={anotacoesDe?.nichoId}
        onClose={() => setAnotacoesDe(null)}
      />

      <DeleteAudienciaDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
