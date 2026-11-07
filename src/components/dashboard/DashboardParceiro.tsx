import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Star,
  Users2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { COLUNAS_COMISSAO, FILTRO_MEUS_LANCAMENTOS, minhaParte } from "@/lib/comissao";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PainelNichos } from "@/components/dashboard/PainelNichos";
import { rotuloHora } from "@/lib/fusos";
import { corStatusProcesso } from "@/lib/statusProcesso";

const currency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

interface MeuProcesso {
  id: string;
  numero: string;
  cliente: string;
  status: string;
  prioridade: string | null;
  papel: "Principal" | "Colaborador";
}

interface MinhaAudiencia {
  id: string;
  processo: string;
  data: string;
  hora: string;
  tipo: string;
  local: string;
}

interface MinhaComissaoResumo {
  totalRecebido: number;
  aReceberMes: number;
  aReceberAnterior: number;
  percMes: number;
}

interface MinhaTarefa {
  id: string;
  titulo: string;
  processo: string;
  prazo: string | null;
  prioridade: string;
}

export function DashboardParceiro() {
  const { user } = useAuth();
  const uid = user?.id ?? "";

  const [totalProcessos, setTotalProcessos] = useState(0);
  const [audienciasProximas, setAudienciasProximas] = useState(0);
  const [tarefasPendentes, setTarefasPendentes] = useState(0);
  const [comissao, setComissao] = useState<MinhaComissaoResumo>({
    totalRecebido: 0,
    aReceberMes: 0,
    aReceberAnterior: 0,
    percMes: 0,
  });

  const [meusProcessos, setMeusProcessos] = useState<MeuProcesso[]>([]);
  const [minhasAudiencias, setMinhasAudiencias] = useState<MinhaAudiencia[]>([]);
  const [minhasTarefas, setMinhasTarefas] = useState<MinhaTarefa[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!uid) return;
    const load = async () => {
      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const sevenDays = format(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd"
        );
        const first = format(startOfMonth(new Date()), "yyyy-MM-dd");
        const last = format(endOfMonth(new Date()), "yyyy-MM-dd");

        // Nome do usuário
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", uid)
          .single();
        setUserName(profile?.full_name || "");

        // Processos: onde é responsável A ou B ou criou
        const { data: procs, count: procsCount } = await supabase
          .from("processos")
          .select("id, numero, status, prioridade, responsavel_a_id, responsavel_b_id, cliente_id, created_at", {
            count: "exact",
          })
          .order("created_at", { ascending: false })
          .limit(5);

        setTotalProcessos(procsCount || 0);

        // Buscar clientes para os processos
        const clienteIds = Array.from(
          new Set((procs || []).map((p: any) => p.cliente_id).filter(Boolean))
        );
        let clientesMap: Record<string, string> = {};
        if (clienteIds.length > 0) {
          const { data: cls } = await supabase
            .from("clientes")
            .select("id, nome")
            .in("id", clienteIds);
          (cls || []).forEach((c: any) => (clientesMap[c.id] = c.nome));
        }

        setMeusProcessos(
          (procs || []).map((p: any) => ({
            id: p.id,
            numero: p.numero,
            cliente: clientesMap[p.cliente_id] || "—",
            status: p.status,
            prioridade: p.prioridade,
            papel:
              p.responsavel_a_id === uid || (!p.responsavel_a_id && p.user_id === uid)
                ? "Principal"
                : "Colaborador",
          }))
        );

        // IDs dos meus processos para filtrar audiências
        const { data: todosProcs } = await supabase
          .from("processos")
          .select("id");
        const procIds = (todosProcs || []).map((p: any) => p.id);

        // Audiências próximas (7 dias)
        if (procIds.length > 0) {
          const { data: auds, count: audsCount } = await supabase
            .from("audiencias")
            .select("id, processo_numero, titulo, data, hora, fuso, tipo, local", { count: "exact" })
            .in("processo_id", procIds)
            .gte("data", todayStr)
            .lte("data", sevenDays)
            .order("data", { ascending: true })
            .limit(3);

          setAudienciasProximas(audsCount || 0);
          setMinhasAudiencias(
            (auds || []).map((a: any) => ({
              id: a.id,
              processo: a.titulo || a.processo_numero || "—",
              data: a.data
                ? format(new Date(a.data + "T00:00:00"), "dd/MM", { locale: ptBR })
                : "—",
              hora: rotuloHora(a.hora, a.fuso) || "",
              tipo: a.tipo || "",
              local: a.local || "",
            }))
          );
        }

        // Tarefas pendentes
        const { data: tarefas, count: tarefasCount } = await supabase
          .from("tarefas")
          .select("id, descricao, data_conclusao, prioridade", { count: "exact" })
          .or(`user_id.eq.${uid},responsavel_id.eq.${uid}`)
          .neq("status", "Concluída")
          .order("data_conclusao", { ascending: true })
          .limit(5);

        setTarefasPendentes(tarefasCount || 0);
        setMinhasTarefas(
          (tarefas || []).map((t: any) => ({
            id: t.id,
            titulo: t.descricao,
            processo: "—",
            prazo: t.data_conclusao
              ? format(new Date(t.data_conclusao + "T00:00:00"), "dd/MM", { locale: ptBR })
              : null,
            prioridade: t.prioridade || "Normal",
          }))
        );

        // Comissão
        const [{ data: recebido }, { data: pendMes }, { data: pendAnt }] =
          await Promise.all([
            supabase
              .from("financeiro_lancamentos")
              .select(COLUNAS_COMISSAO)
              .or(FILTRO_MEUS_LANCAMENTOS(uid))
              .eq("status", "Pago"),
            supabase
              .from("financeiro_lancamentos")
              .select(COLUNAS_COMISSAO)
              .or(FILTRO_MEUS_LANCAMENTOS(uid))
              .eq("status", "Pendente")
              .gte("data_vencimento", first)
              .lte("data_vencimento", last),
            supabase
              .from("financeiro_lancamentos")
              .select(COLUNAS_COMISSAO)
              .or(FILTRO_MEUS_LANCAMENTOS(uid))
              .eq("status", "Pendente")
              .lt("data_vencimento", first),
          ]);

        const totalRec = (recebido || []).reduce(
          (acc: number, l: any) => acc + minhaParte(l, uid),
          0
        );
        const mesVal = (pendMes || []).reduce(
          (acc: number, l: any) => acc + minhaParte(l, uid),
          0
        );
        const antVal = (pendAnt || []).reduce(
          (acc: number, l: any) => acc + minhaParte(l, uid),
          0
        );
        const total = totalRec + mesVal;
        const perc = total > 0 ? Math.round((totalRec / total) * 100) : 0;

        setComissao({
          totalRecebido: totalRec,
          aReceberMes: mesVal,
          aReceberAnterior: antVal,
          percMes: perc,
        });
      } catch (e) {
        console.error("Erro ao carregar dashboard do parceiro:", e);
      }
    };
    load();
  }, [uid]);

  const primeiroNome = userName.split(" ")[0] || "Parceiro";

  const getPrioridadeColor = (p: string | null) => {
    switch (p) {
      case "Alta": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "Média": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "Baixa": return "bg-green-500/10 text-green-500 border-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusColor = (s: string) => corStatusProcesso(s);

  const kpis = useMemo(
    () => [
      {
        title: "Meus Processos",
        value: String(totalProcessos),
        sub: "ativos no escritório",
        icon: Briefcase,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        title: "A Receber",
        value: currency(comissao.aReceberMes),
        sub: "comissão pendente",
        icon: DollarSign,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
      },
      {
        title: "Audiências",
        value: String(audienciasProximas),
        sub: "próximos 7 dias",
        icon: Calendar,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
      },
      {
        title: "Tarefas Pendentes",
        value: String(tarefasPendentes),
        sub: "aguardando conclusão",
        icon: Clock,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
      },
    ],
    [totalProcessos, comissao.aReceberMes, audienciasProximas, tarefasPendentes]
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {primeiroNome}! 👋
          </h1>
          <p className="text-muted-foreground">Seu painel de acompanhamento</p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10 px-3 py-1">
          <Users2 className="w-3 h-3 mr-1" />
          Parceiro
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((k) => (
          <Card key={k.title} className="gradient-card hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{k.title}</p>
                  <p className="text-2xl font-bold mt-1">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                </div>
                <div className={`p-3 rounded-lg ${k.bg}`}>
                  <k.icon className={`w-6 h-6 ${k.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PainelNichos />

      {/* Linha 2 — Processos e Audiências */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Meus Processos */}
        <Card className="lg:col-span-2 gradient-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Meus Processos
            </CardTitle>
            <Link to="/processos">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Ver todos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {meusProcessos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum processo atribuído ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {meusProcessos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.numero}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.cliente}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs border ${getStatusColor(p.status)}`}
                      >
                        {p.status}
                      </Badge>
                      {p.prioridade && (
                        <Badge
                          variant="outline"
                          className={`text-xs border ${getPrioridadeColor(p.prioridade)}`}
                        >
                          {p.prioridade}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          p.papel === "Principal"
                            ? "text-xs border border-blue-500/20 bg-blue-500/10 text-blue-500"
                            : "text-xs border border-violet-500/20 bg-violet-500/10 text-violet-500"
                        }
                      >
                        {p.papel === "Principal" ? (
                          <><Star className="w-2.5 h-2.5 mr-1" />Principal</>
                        ) : (
                          "Colaborador"
                        )}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Audiências */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próximas Audiências
            </CardTitle>
            <Link to="/audiencias">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {minhasAudiencias.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma audiência nos próximos 7 dias.
              </p>
            ) : (
              <div className="space-y-3">
                {minhasAudiencias.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">{a.data} às {a.hora}</p>
                      <Badge variant="outline" className="text-xs">{a.tipo}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Proc: {a.processo}</p>
                    {a.local && (
                      <p className="text-xs text-muted-foreground truncate">{a.local}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 3 — Comissão e Tarefas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minha Comissão */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Minha Comissão
            </CardTitle>
            <Link to="/minha-comissao">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Ver detalhes
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <p className="text-xs text-muted-foreground mb-1">Total Recebido</p>
                <p className="text-lg font-bold text-green-500">{currency(comissao.totalRecebido)}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <p className="text-xs text-muted-foreground mb-1">A Receber (mês)</p>
                <p className="text-lg font-bold text-amber-500">{currency(comissao.aReceberMes)}</p>
              </div>
            </div>
            {comissao.aReceberAnterior > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-400">
                  {currency(comissao.aReceberAnterior)} de meses anteriores em aberto
                </p>
              </div>
            )}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Recebido este mês</span>
                <span className="font-medium">{comissao.percMes}%</span>
              </div>
              <Progress value={comissao.percMes} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Minhas Tarefas */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Minhas Tarefas
            </CardTitle>
            <Link to="/tarefas">
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {minhasTarefas.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa pendente!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {minhasTarefas.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.titulo}</p>
                      <p className="text-xs text-muted-foreground">Proc: {t.processo}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {t.prazo && (
                        <span className="text-xs text-muted-foreground">{t.prazo}</span>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs border ${getPrioridadeColor(t.prioridade)}`}
                      >
                        {t.prioridade}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
