/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NICHOS, useUsuarios } from "@/lib/nichos";
import { classificacaoLabel } from "@/lib/classificacoes";

type Nicho = { id: string; cliente_id: string; nicho: string; status: string; responsavel_principal_id: string | null; responsaveis_secundarios: string[] };
type Proc = { id: string; status: string; cliente_nicho_id: string | null; data_limite: string | null };

// Item 6.1 (ABA Dashboard): produtividade por nicho. Cada usuário vê a própria carteira (RLS);
// a Gestão Administrativa vê todos e filtra por nicho ou responsável.
export function PainelNichos() {
  const { role } = useAuth();
  const isAdmin = role === "master" || role === "desenvolvedor";
  const usuarios = useUsuarios();
  const [nichos, setNichos] = useState<Nicho[]>([]);
  const [processos, setProcessos] = useState<Proc[]>([]);
  const [filtroNicho, setFiltroNicho] = useState("todos");
  const [filtroResp, setFiltroResp] = useState("todos");
  // Parceiro Jurídico OAB x Técnico (distinção de gestão pedida pelo compliance)
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    (async () => {
      const [{ data: n }, { data: p }] = await Promise.all([
        supabase.from("cliente_nichos" as never).select("id, cliente_id, nicho, status, responsavel_principal_id, responsaveis_secundarios"),
        supabase.from("processos").select("id, status, cliente_nicho_id, data_limite"),
      ]);
      setNichos(((n as any) || []) as Nicho[]);
      setProcessos(((p as any) || []) as Proc[]);
    })();
  }, []);

  const linhas = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const doTipo = new Set(usuarios.filter((u) => u.classificacao === filtroTipo).map((u) => u.id));
    const filtrados = nichos.filter(
      (n) =>
        (filtroNicho === "todos" || n.nicho === filtroNicho) &&
        (filtroResp === "todos" || n.responsavel_principal_id === filtroResp || (n.responsaveis_secundarios || []).includes(filtroResp)) &&
        (filtroTipo === "todos" ||
          (!!n.responsavel_principal_id && doTipo.has(n.responsavel_principal_id)) ||
          (n.responsaveis_secundarios || []).some((id) => doTipo.has(id)))
    );
    const grupos: Record<string, { clientes: number; ativos: number; proc: number; andamento: number; concluidos: number; atrasados: number }> = {};
    filtrados.forEach((n) => {
      const g = (grupos[n.nicho] ||= { clientes: 0, ativos: 0, proc: 0, andamento: 0, concluidos: 0, atrasados: 0 });
      g.clientes += 1;
      if (n.status === "Ativo") g.ativos += 1;
      processos
        .filter((p) => p.cliente_nicho_id === n.id)
        .forEach((p) => {
          g.proc += 1;
          if (p.status === "Arquivado") g.concluidos += 1;
          else {
            g.andamento += 1;
            if (p.data_limite && p.data_limite < hoje) g.atrasados += 1;
          }
        });
    });
    return Object.entries(grupos).sort((a, b) => b[1].clientes - a[1].clientes);
  }, [nichos, processos, filtroNicho, filtroResp, filtroTipo, usuarios]);

  const total = linhas.reduce(
    (acc, [, g]) => ({ clientes: acc.clientes + g.clientes, proc: acc.proc + g.proc, andamento: acc.andamento + g.andamento, atrasados: acc.atrasados + g.atrasados }),
    { clientes: 0, proc: 0, andamento: 0, atrasados: 0 }
  );

  return (
    <Card className="gradient-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          {isAdmin ? "Carteira por Nicho" : "Minha Carteira por Nicho"}
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={filtroNicho} onValueChange={setFiltroNicho}>
            <SelectTrigger className="w-full sm:w-52 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os nichos</SelectItem>
              {NICHOS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={filtroResp} onValueChange={setFiltroResp}>
              <SelectTrigger className="w-full sm:w-52 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                    {classificacaoLabel(u.classificacao) ? ` — ${classificacaoLabel(u.classificacao)}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {isAdmin && (
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-full sm:w-52 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os parceiros</SelectItem>
                <SelectItem value="parceiro_juridico_oab">Parceiros Jurídicos OAB</SelectItem>
                <SelectItem value="parceiro_juridico_tecnico">Parceiros Jurídicos Técnicos</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pt-2 sm:pt-4">
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum cliente com nicho {isAdmin ? "para este filtro" : "na sua carteira"}.</p>
        ) : (
          <>
            {/* Visualização Mobile (sm:hidden): Cards por Nicho */}
            <div className="sm:hidden space-y-2.5">
              {linhas.map(([nicho, g]) => (
                <div
                  key={nicho}
                  className="p-3 rounded-lg bg-[#F1F4F9] dark:bg-white/5 border border-[#010E38]/8 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#010E38] dark:text-[#F1F4F9] truncate max-w-[200px]">
                      {nicho}
                    </span>
                    {g.atrasados > 0 && (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                        {g.atrasados} atrasado(s)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-1.5 rounded bg-white dark:bg-black/20 border border-slate-200/60">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Clientes</span>
                      <span className="font-data font-bold text-[#010E38] dark:text-[#EBB52C]">{g.clientes}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-black/20 border border-slate-200/60">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Ativos</span>
                      <span className="font-data font-bold text-emerald-600">{g.ativos}</span>
                    </div>
                    <div className="p-1.5 rounded bg-white dark:bg-black/20 border border-slate-200/60">
                      <span className="text-[9.5px] font-bold text-slate-500 uppercase block">Processos</span>
                      <span className="font-data font-bold text-[#010E38] dark:text-white">{g.proc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Visualização Desktop (hidden sm:block): Tabela tradicional */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nicho</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Ativos</TableHead>
                    <TableHead className="text-right">Processos</TableHead>
                    <TableHead className="text-right">Ativos</TableHead>
                    <TableHead className="text-right">Arquivados</TableHead>
                    <TableHead className="text-right">Atrasados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhas.map(([nicho, g]) => (
                    <TableRow key={nicho}>
                      <TableCell className="font-medium">{nicho}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.clientes}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.ativos}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.proc}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.andamento}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.concluidos}</TableCell>
                      <TableCell className={`text-right tabular-nums ${g.atrasados > 0 ? "text-red-500 font-semibold" : ""}`}>{g.atrasados}</TableCell>
                    </TableRow>
                  ))}
                  {linhas.length > 1 && (
                    <TableRow className="font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{total.clientes}</TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">{total.proc}</TableCell>
                      <TableCell className="text-right tabular-nums">{total.andamento}</TableCell>
                      <TableCell />
                      <TableCell className="text-right tabular-nums">{total.atrasados}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
