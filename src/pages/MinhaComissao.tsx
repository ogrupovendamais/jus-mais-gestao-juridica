import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, CheckCircle2, Clock, AlertCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COLUNAS_COMISSAO, FILTRO_MEUS_LANCAMENTOS, minhaParte } from "@/lib/comissao";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lancamento {
  id: string;
  descricao: string;
  valor_parceiro: number;
  status: string;
  data_vencimento: string | null;
  processo_numero: string;
  cliente_nome: string;
}

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function MinhaComissao() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [filtro, setFiltro] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const [totais, setTotais] = useState({
    recebido: 0,
    pendenteMes: 0,
    pendenteAnterior: 0,
  });

  useEffect(() => {
    if (!uid) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase
          .from("financeiro_lancamentos" as never)
          .select(`id, descricao, status_parceiro, data_vencimento, cliente_id, ${COLUNAS_COMISSAO}`)
          .or(FILTRO_MEUS_LANCAMENTOS(uid))
          .order("data_vencimento", { ascending: true }) as unknown as Promise<{
            data: {
              id: string;
              descricao: string | null;
              valor_parceiro: number | null;
              status_parceiro: string | null;
              data_vencimento: string | null;
              cliente_id: string | null;
            }[] | null;
            error: { message: string } | null;
          }>);

        if (error) throw error;

        // Buscar nomes dos clientes
        const clienteIds = Array.from(
          new Set((data || []).map((l) => l.cliente_id).filter(Boolean) as string[])
        );
        const clientesMap: Record<string, string> = {};
        if (clienteIds.length > 0) {
          const { data: cls } = await (supabase
            .from("clientes" as never)
            .select("id, nome")
            .in("id", clienteIds) as unknown as Promise<{ data: { id: string; nome: string }[] | null }>);
          (cls || []).forEach((c) => (clientesMap[c.id] = c.nome));
        }

        const mapped: Lancamento[] = (data || []).map((l) => ({
          id: l.id,
          descricao: l.descricao || "Sem descrição",
          valor_parceiro: minhaParte(l, uid),
          status: l.status_parceiro || "Pendente",
          data_vencimento: l.data_vencimento,
          processo_numero: "—",
          cliente_nome: l.cliente_id ? (clientesMap[l.cliente_id] || "—") : "—",
        }));

        setLancamentos(mapped);

        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const recebido = mapped
          .filter((l) => l.status === "Pago")
          .reduce((acc, l) => acc + l.valor_parceiro, 0);

        const pendenteMes = mapped
          .filter((l) => {
            if (l.status !== "Pendente") return false;
            if (!l.data_vencimento) return true;
            return new Date(l.data_vencimento + "T00:00:00") >= firstOfMonth;
          })
          .reduce((acc, l) => acc + l.valor_parceiro, 0);

        const pendenteAnterior = mapped
          .filter((l) => {
            if (l.status !== "Pendente") return false;
            if (!l.data_vencimento) return false;
            return new Date(l.data_vencimento + "T00:00:00") < firstOfMonth;
          })
          .reduce((acc, l) => acc + l.valor_parceiro, 0);

        setTotais({ recebido, pendenteMes, pendenteAnterior });
      } catch (e) {
        console.error("Erro ao carregar comissão:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [uid]);

  const filtrados = lancamentos.filter((l) => {
    if (filtro === "Todos") return true;
    if (filtro === "Pendentes") return l.status === "Pendente";
    if (filtro === "Pagos") return l.status === "Pago";
    if (filtro === "Atrasados") {
      if (l.status !== "Pendente" || !l.data_vencimento) return false;
      return new Date(l.data_vencimento + "T00:00:00") < new Date();
    }
    return true;
  });

  const getStatusBadge = (status: string, vencimento: string | null) => {
    if (status === "Pago") return "bg-green-500/10 text-green-500 border-green-500/20";
    if (
      status === "Pendente" &&
      vencimento &&
      new Date(vencimento + "T00:00:00") < new Date()
    ) {
      return "bg-red-500/10 text-red-500 border-red-500/20";
    }
    return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  };

  const getStatusLabel = (status: string, vencimento: string | null) => {
    if (status === "Pago") return "Recebido";
    if (
      status === "Pendente" &&
      vencimento &&
      new Date(vencimento + "T00:00:00") < new Date()
    ) {
      return "Atrasado";
    }
    return "Pendente";
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Wallet className="w-8 h-8 text-emerald-500" />
            Minha Comissão
          </h1>
          <p className="text-muted-foreground">
            Acompanhe os valores de comissão dos seus processos
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Recebido</p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  {currency(totais.recebido)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">histórico completo</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber (mês)</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {currency(totais.pendenteMes)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">vencimento este mês</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`gradient-card ${totais.pendenteAnterior > 0 ? "border-red-500/20" : ""}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atrasado</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {currency(totais.pendenteAnterior)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">meses anteriores em aberto</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/10">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Lançamentos */}
      <Card className="gradient-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Detalhamento de Comissões
          </CardTitle>
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Pendentes">Pendentes</SelectItem>
              <SelectItem value="Pagos">Pagos</SelectItem>
              <SelectItem value="Atrasados">Atrasados</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
              Carregando...
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">
                Nenhum lançamento encontrado para este filtro.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                      Processo
                    </th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-muted-foreground font-medium">
                      Descrição
                    </th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-medium">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">
                      Vencimento
                    </th>
                    <th className="text-center py-3 px-4 text-muted-foreground font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((l) => (
                    <tr
                      key={l.id}
                      className="border-b border-border/20 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{l.processo_numero}</td>
                      <td className="py-3 px-4 text-muted-foreground">{l.cliente_nome}</td>
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                        {l.descricao}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-500">
                        {currency(l.valor_parceiro)}
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {l.data_vencimento
                          ? format(
                              new Date(l.data_vencimento + "T00:00:00"),
                              "dd/MM/yyyy",
                              { locale: ptBR }
                            )
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-xs border ${getStatusBadge(
                            l.status,
                            l.data_vencimento
                          )}`}
                        >
                          {getStatusLabel(l.status, l.data_vencimento)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20">
                    <td colSpan={3} className="py-3 px-4 font-semibold">
                      Total filtrado
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-500">
                      {currency(filtrados.reduce((acc, l) => acc + l.valor_parceiro, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
