/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChevronDown, FileText, FolderOpen, Lock, Plus, Scale, Trash2, Users } from "lucide-react";
import { generateTemplatesForClient } from "@/utils/templateGenerator";
import { PropostaHonorariosDialog } from "@/components/financeiro/PropostaHonorariosDialog";
import { HandCoins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ClienteNicho, NICHOS, Usuario, abrirNichoCliente, nomeUsuario } from "@/lib/nichos";

// Seleção múltipla de responsáveis secundários
export function SecundariosSelect({
  usuarios,
  value,
  onChange,
  excluir,
}: {
  usuarios: Usuario[];
  value: string[];
  onChange: (ids: string[]) => void;
  excluir?: string | null;
}) {
  const opcoes = usuarios.filter((u) => u.id !== excluir);
  const nomes = value.map((id) => nomeUsuario(usuarios, id)).filter(Boolean);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-between text-sm font-normal h-9">
          <span className="truncate">{nomes.length ? nomes.join(", ") : "Nenhum"}</span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        {opcoes.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhum usuário disponível.</p>}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {opcoes.map((u) => {
            const checked = value.includes(u.id);
            return (
              <label key={u.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => onChange(c ? [...value, u.id] : value.filter((v) => v !== u.id))}
                />
                {u.full_name || u.email}
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PrincipalSelect({
  usuarios,
  value,
  onChange,
}: {
  usuarios: Usuario[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="text-sm h-9">
        <SelectValue placeholder="Selecione o responsável" />
      </SelectTrigger>
      <SelectContent>
        {usuarios.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.full_name || u.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function NichoSelect({ value, onChange, ocupados = [] }: { value: string; onChange: (v: string) => void; ocupados?: string[] }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="text-sm h-9">
        <SelectValue placeholder="Selecione o nicho" />
      </SelectTrigger>
      <SelectContent>
        {NICHOS.map((n) => (
          <SelectItem key={n} value={n} disabled={ocupados.includes(n)}>
            {n}
            {ocupados.includes(n) ? " (já aberto)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Painel: nichos do cliente que o usuário pode ver + abrir novo nicho
export function ClienteNichos({
  cliente,
  usuarios,
  onChange,
}: {
  cliente: { id: string; nome: string } & Record<string, any>;
  usuarios: Usuario[];
  onChange?: () => void;
}) {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "master" || role === "desenvolvedor";
  const [nichos, setNichos] = useState<ClienteNicho[]>([]);
  const [outrosNichos, setOutrosNichos] = useState<{ nicho: string; responsavel: string | null }[]>([]);
  const [adding, setAdding] = useState(false);
  const [novo, setNovo] = useState({ nicho: "", principal: user?.id || "", secundarios: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [nichoToDelete, setNichoToDelete] = useState<ClienteNicho | null>(null);
  const [propostaNicho, setPropostaNicho] = useState<ClienteNicho | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("cliente_nichos" as never)
      .select("*")
      .eq("cliente_id", cliente.id)
      .order("nicho");
    if (error) console.error(error);
    const visiveis = ((data as any) || []) as ClienteNicho[];
    setNichos(visiveis);

    // Nichos de outros responsáveis: só o nome do nicho e o responsável (sem dados)
    if (cliente.cpf) {
      const { data: busca } = await (supabase.rpc("buscar_cliente_por_documento" as never, { p_doc: cliente.cpf } as never) as any);
      const r = busca?.[0];
      setOutrosNichos(((r?.nichos as any[]) || []).filter((n) => !n.tem_acesso).map((n) => ({ nicho: n.nicho, responsavel: n.responsavel })));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente.id]);

  const atualizar = async (n: ClienteNicho, patch: Partial<ClienteNicho>) => {
    const { error } = await supabase.from("cliente_nichos" as never).update(patch as never).eq("id", n.id);
    if (error) {
      toast.error("Erro ao atualizar nicho", { description: error.message });
      return;
    }
    toast.success("Nicho atualizado");
    load();
    onChange?.();
  };

  const handleAdd = async () => {
    if (!user || !novo.nicho) {
      toast.error("Selecione o nicho");
      return;
    }
    setSaving(true);
    try {
      await abrirNichoCliente({
        cliente,
        nicho: novo.nicho,
        principalId: novo.principal || user.id,
        secundarios: novo.secundarios,
        userId: user.id,
      });
      toast.success(`Nicho ${novo.nicho} aberto para ${cliente.nome}`);
      setAdding(false);
      setNovo({ nicho: "", principal: user.id, secundarios: [] });
      load();
      onChange?.();
    } catch (e: any) {
      toast.error("Erro ao abrir nicho", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  // Gera de novo os documentos dos modelos (contrato, procuração...) na pasta do cliente neste nicho
  const gerarModelos = async (n: ClienteNicho) => {
    const { data: pasta } = await supabase
      .from("documentos")
      .select("id")
      .eq("is_folder", true)
      .eq("cliente_nicho_id" as never, n.id as never)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!pasta) {
      toast.error("Pasta do cliente neste nicho não encontrada em Documentos.");
      return;
    }
    const { data: completo } = await supabase.from("clientes").select("*").eq("id", cliente.id).maybeSingle();
    toast.info("Gerando documentos a partir dos modelos...");
    await generateTemplatesForClient({ ...(completo || cliente), nicho: n.nicho }, (pasta as any).id);
    toast.success("Documentos gerados. Veja na aba Documentos, na pasta do cliente.");
  };

  const handleDelete = async () => {
    if (!nichoToDelete) return;
    const { error } = await supabase.from("cliente_nichos" as never).delete().eq("id", nichoToDelete.id);
    if (error) toast.error("Erro ao remover nicho", { description: error.message });
    else toast.success(`Nicho ${nichoToDelete.nicho} removido`);
    setNichoToDelete(null);
    load();
    onChange?.();
  };

  const ocupados = [...nichos.map((n) => n.nicho), ...outrosNichos.map((n) => n.nicho)];

  return (
    <div className="space-y-3">
      {nichos.length === 0 && outrosNichos.length === 0 && (
        <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded border border-dashed text-center">
          Nenhum nicho aberto para este cliente.
        </p>
      )}

      {nichos.map((n) => (
        <div key={n.id} className="border rounded-md p-3 space-y-2 bg-muted/10">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">{n.nicho}</span>
              <Badge variant="outline" className={n.status === "Ativo" ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground"}>
                {n.status}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" title="Enviar proposta de honorários para aprovação" onClick={() => setPropostaNicho(n)}>
                <HandCoins className="h-3.5 w-3.5 mr-1" /> Honorários
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" title="Gerar contrato e demais documentos dos modelos" onClick={() => gerarModelos(n)}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Gerar documentos
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => atualizar(n, { status: n.status === "Ativo" ? "Encerrado" : "Ativo" })}
              >
                {n.status === "Ativo" ? "Encerrar" : "Reabrir"}
              </Button>
              {(isAdmin || n.responsavel_principal_id === user?.id) && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setNichoToDelete(n)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Responsável principal</Label>
              <PrincipalSelect
                usuarios={usuarios}
                value={n.responsavel_principal_id}
                onChange={(id) =>
                  atualizar(n, {
                    responsavel_principal_id: id,
                    responsaveis_secundarios: n.responsaveis_secundarios.filter((s) => s !== id),
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Parceiros secundários</Label>
              <SecundariosSelect
                usuarios={usuarios}
                value={n.responsaveis_secundarios || []}
                excluir={n.responsavel_principal_id}
                onChange={(ids) => atualizar(n, { responsaveis_secundarios: ids })}
              />
            </div>
          </div>
        </div>
      ))}

      {outrosNichos.map((n) => (
        <div key={n.nicho} className="border rounded-md p-3 flex items-center justify-between text-sm text-muted-foreground bg-muted/5">
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" /> {n.nicho}
          </span>
          <span className="text-xs flex items-center gap-1">
            <Users className="h-3 w-3" /> {n.responsavel || "—"}
          </span>
        </div>
      ))}

      {adding ? (
        <div className="border rounded-md p-3 space-y-2 border-primary/40">
          <div className="space-y-1">
            <Label className="text-xs">Nicho</Label>
            <NichoSelect value={novo.nicho} onChange={(v) => setNovo({ ...novo, nicho: v })} ocupados={ocupados} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Responsável principal</Label>
              <PrincipalSelect usuarios={usuarios} value={novo.principal} onChange={(id) => setNovo({ ...novo, principal: id })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Parceiros secundários</Label>
              <SecundariosSelect
                usuarios={usuarios}
                value={novo.secundarios}
                excluir={novo.principal}
                onChange={(ids) => setNovo({ ...novo, secundarios: ids })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={handleAdd} disabled={saving}>
              {saving ? "Abrindo..." : "Abrir nicho"}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Abrir novo nicho para este cliente
        </Button>
      )}

      <PropostaHonorariosDialog
        open={!!propostaNicho}
        preset={propostaNicho ? { clienteId: cliente.id, nichoId: propostaNicho.id } : null}
        onClose={() => setPropostaNicho(null)}
      />

      <AlertDialog open={!!nichoToDelete} onOpenChange={() => setNichoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover nicho {nichoToDelete?.nicho}?</AlertDialogTitle>
            <AlertDialogDescription>
              Os documentos e pastas deste nicho serão excluídos e os processos ficarão sem nicho. Os dados cadastrais do cliente e os
              demais nichos não são afetados. A ação fica registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
