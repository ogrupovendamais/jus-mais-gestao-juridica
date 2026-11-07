import { nomeCompliance } from "@/lib/nomes";
import { useState, useEffect, useCallback, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  FileSpreadsheet,
  Clock, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { ImportExportModal } from "@/components/planilhas/ImportExportModal";
import { useToast } from "@/components/ui/use-toast";
import { format, isAfter, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateForDatabase } from "@/lib/utils";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  LancamentoForm,
  LancamentoFormValues,
} from "@/components/financeiro/LancamentoForm";
import { DeleteLancamentoDialog } from "@/components/financeiro/DeleteLancamentoDialog";
import { StatusUpdateDialog } from "@/components/financeiro/StatusUpdateDialog";
import { EsteiraHonorarios } from "@/components/financeiro/EsteiraHonorarios";
import { useSubmitUnico } from "@/hooks/useSubmitUnico";
import { dataDeIso, vencimentoMensal } from "@/lib/diasUteis";

type Lancamento = {
  id: string;
  autorId?: string; // quem lançou: pode editar e excluir o próprio lançamento
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string | null;
  status: "Pago" | "Pendente";
  clienteId: string;
  clienteNome: string;
  advogadoNome?: string | null;
  tipo_lancamento?: "Receita" | "Despesa" | "Acordo" | "Sucumbência" | null;
  valor_cliente?: number | null;
  valor_escritorio?: number | null;
  valor_parceiro?: number | null;
  valor_reserva?: number | null;
  status_cliente?: "Pendente" | "Pago" | null;
  status_parceiro?: "Pendente" | "Pago" | null;
  data_pgto_cliente?: string | null;
  data_pgto_parceiro?: string | null;
  forma_recebimento?: string | null;
  caixa_box?: string | null;
  pct_parceiro2?: number | null;
  pct_parceiro3?: number | null;
  valor_parceiro2?: number | null;
  valor_parceiro3?: number | null;
  pct_reserva?: number | null;
  valor_sucumbencia?: number | null;
  instituicao_financeira?: string | null;
  depositante?: string | null;
  data_fato_gerador?: string | null;
  parceiro_id_1?: string | null;
  parceiro_id_2?: string | null;
  parceiro_id_3?: string | null;
};

type ClienteLite = { id: string; nome: string };

const Financeiro = () => {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [clientes, setClientes] = useState<ClienteLite[]>([]);
  const [parceiros, setParceiros] = useState<{ id: string; full_name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroSituacao, setFiltroSituacao] = useState("todas");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [editingLancamento, setEditingLancamento] = useState<Lancamento | null>(
    null
  );
  const [lancamentoToDelete, setLancamentoToDelete] = useState<string | null>(
    null
  );
  const [statusUpdateTarget, setStatusUpdateTarget] =
    useState<Lancamento | null>(null);
  const { toast } = useToast();
  const { user, role, classificacao } = useAuth();
  // Gestão e Assistente Financeira gerenciam os lançamentos; excluir só a Gestão
  const podeExcluir = role === "desenvolvedor" || role === "master";
  const isAdmin = podeExcluir || classificacao === "assistente_financeiro";

  const getStatus = (lancamento: Lancamento) => {
    if (lancamento.status === "Pago") {
      return { text: "Pago", variant: "success" as const };
    }
    if (
      isAfter(new Date(), new Date(lancamento.dataVencimento + "T00:00:00"))
    ) {
      return { text: "Atrasado", variant: "destructive" as const };
    }
    return { text: "Pendente", variant: "warning" as const };
  };

  interface RawLancamento {
    id: string;
    user_id: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
    data_pagamento?: string | null;
    status: "Pago" | "Pendente";
    cliente_id: string;
    profiles?: {
      full_name: string | null;
      email: string | null;
    } | null;
    tipo_lancamento?: "Receita" | "Despesa" | "Acordo" | "Sucumbência" | null;
    valor_cliente?: number | null;
    valor_escritorio?: number | null;
    valor_parceiro?: number | null;
    valor_reserva?: number | null;
    status_cliente?: "Pendente" | "Pago" | null;
    status_parceiro?: "Pendente" | "Pago" | null;
    data_pgto_cliente?: string | null;
    data_pgto_parceiro?: string | null;
    forma_recebimento?: string | null;
    caixa_box?: string | null;
    pct_parceiro2?: number | null;
    pct_parceiro3?: number | null;
    valor_parceiro2?: number | null;
    valor_parceiro3?: number | null;
    pct_reserva?: number | null;
    valor_sucumbencia?: number | null;
    instituicao_financeira?: string | null;
    depositante?: string | null;
    data_fato_gerador?: string | null;
    parceiro_id_1?: string | null;
    parceiro_id_2?: string | null;
    parceiro_id_3?: string | null;
  }

  const load = useCallback(async () => {
    try {
      const [clientesRes, lancRes, equipeRes, profilesRes] = await Promise.all([
        supabase.from("clientes").select("id, nome").order("nome"),
        supabase
          .from("financeiro_lancamentos")
          .select("*, profiles!financeiro_lancamentos_user_id_fkey(full_name, email)")
          .order("created_at", { ascending: false }),
        supabase.from("equipe").select("id, nome, cargo").eq("status", "Ativo").order("nome"),
        supabase.rpc("listar_usuarios" as never) as any, // lista segura de usuários (parceiros não leem a tabela profiles)
      ]);

      if (clientesRes.error) console.error(clientesRes.error);
      if (lancRes.error) throw lancRes.error;
      if (equipeRes.error) console.error("Equipe error:", equipeRes.error);
      if (profilesRes.error) console.error("Profiles error:", profilesRes.error);

      const clientesData = (clientesRes.data || []) as {
        id: string;
        nome: string;
      }[];
      setClientes(clientesData);
      
      const equipeList = (equipeRes.data || []).map((e: any) => ({
        id: e.id,
        full_name: e.cargo ? `${nomeCompliance(e.nome)} (${e.cargo})` : nomeCompliance(e.nome),
      }));

      const profilesList = (profilesRes.data || [])
        .filter((p: any) => p.role === "parceiro")
        .map((p: any) => ({
          id: p.id,
          full_name: p.full_name || p.email,
        }));

      const combinedParceiros = [...equipeList];
      for (const p of profilesList) {
        if (!combinedParceiros.some((cp) => cp.id === p.id)) {
          combinedParceiros.push(p);
        }
      }
      setParceiros(combinedParceiros);

      const rawLancamentos = (lancRes.data || []) as unknown as RawLancamento[];
      setLancamentos(
        rawLancamentos.map((l) => ({
          id: l.id,
          autorId: l.user_id,
          descricao: l.descricao,
          valor: Number(l.valor),
          dataVencimento: l.data_vencimento,
          dataPagamento: l.data_pagamento,
          status: l.status,
          clienteId: l.cliente_id,
          clienteNome:
            clientesData.find((c) => c.id === l.cliente_id)?.nome || "-",
          advogadoNome: l.profiles?.full_name || l.profiles?.email || "-",
          tipo_lancamento: l.tipo_lancamento,
          valor_cliente: l.valor_cliente ? Number(l.valor_cliente) : null,
          valor_escritorio: l.valor_escritorio ? Number(l.valor_escritorio) : null,
          valor_parceiro: l.valor_parceiro ? Number(l.valor_parceiro) : null,
          valor_reserva: l.valor_reserva ? Number(l.valor_reserva) : null,
          status_cliente: l.status_cliente,
          status_parceiro: l.status_parceiro,
          data_pgto_cliente: l.data_pgto_cliente,
          data_pgto_parceiro: l.data_pgto_parceiro,
          forma_recebimento: l.forma_recebimento,
          caixa_box: l.caixa_box,
          pct_parceiro2: l.pct_parceiro2,
          pct_parceiro3: l.pct_parceiro3,
          valor_parceiro2: l.valor_parceiro2,
          valor_parceiro3: l.valor_parceiro3,
          pct_reserva: l.pct_reserva,
          valor_sucumbencia: l.valor_sucumbencia,
          instituicao_financeira: l.instituicao_financeira,
          depositante: l.depositante,
          data_fato_gerador: l.data_fato_gerador,
          parceiro_id_1: l.parceiro_id_1,
          parceiro_id_2: l.parceiro_id_2,
          parceiro_id_3: l.parceiro_id_3,
        }))
      );
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Erro ao carregar lançamentos",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenForm = (lancamento?: Lancamento) => {
    setEditingLancamento(lancamento || null);
    setIsFormOpen(true);
  };

  const handleUpdateRepasse = async (
    lancamentoId: string,
    target: "cliente" | "parceiro",
    newStatus: "Pago" | "Pendente"
  ) => {
    try {
      const today = newStatus === "Pago" ? formatDateForDatabase(new Date()) : null;
      const payload: { status_cliente?: string | null; data_pgto_cliente?: string | null; status_parceiro?: string | null; data_pgto_parceiro?: string | null } = {};
      if (target === "cliente") {
        payload.status_cliente = newStatus;
        payload.data_pgto_cliente = today;
      } else {
        payload.status_parceiro = newStatus;
        payload.data_pgto_parceiro = today;
      }

      const { error } = await supabase
        .from("financeiro_lancamentos")
        .update(payload)
        .eq("id", lancamentoId);

      if (error) throw error;

      setLancamentos(
        lancamentos.map((l) =>
          l.id === lancamentoId
            ? {
                ...l,
                ...(target === "cliente"
                  ? { status_cliente: newStatus, data_pgto_cliente: today }
                  : { status_parceiro: newStatus, data_pgto_parceiro: today }),
              }
            : l
        )
      );

      toast({
        title: "Sucesso!",
        description: `Repasse do ${target} atualizado para ${newStatus}.`,
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status de repasse",
        variant: "destructive",
      });
    }
  };

  const salvarLancamento = async (data: LancamentoFormValues) => {
    const selectedCliente = clientes.find((c) => c.id === data.clienteId);
    if (!selectedCliente || !user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou cliente inválido",
        variant: "destructive",
      });
      return;
    }

    const pctCliente = data.pctCliente ?? 60;
    const pctParceiro = data.pctParceiro ?? 20;
    const pctParceiro2 = data.pctParceiro2 ?? 0;
    const pctParceiro3 = data.pctParceiro3 ?? 0;
    const pctReserva = data.pctReserva ?? 5;
    const valorSucumbencia = data.valor_sucumbencia || 0;

    const isAcordo = data.tipo_lancamento === "Acordo";
    const isSucumbencia = data.tipo_lancamento === "Sucumbência";

    const calcValCliente = isAcordo ? data.valor * (pctCliente / 100) : (isSucumbencia ? 0 : null);
    const calcValReserva = isAcordo 
      ? (data.valor - (calcValCliente || 0)) * (pctReserva / 100)
      : (isSucumbencia ? data.valor * (pctReserva / 100) : null);
    const calcValEscritorio = isAcordo 
      ? data.valor - (calcValCliente || 0)
      : (isSucumbencia ? data.valor - (calcValReserva || 0) : null);
    const calcValParceiro = isAcordo ? (calcValEscritorio || 0) * (pctParceiro / 100) : (isSucumbencia ? 0 : null);
    const calcValParceiro2 = isAcordo ? (calcValEscritorio || 0) * (pctParceiro2 / 100) : (isSucumbencia ? 0 : null);
    const calcValParceiro3 = isAcordo ? (calcValEscritorio || 0) * (pctParceiro3 / 100) : (isSucumbencia ? 0 : null);

    try {
      if (editingLancamento) {
        const rawDate = data.dataVencimento ? new Date(data.dataVencimento) : new Date();
        const validDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;

        let dataFatoGeradorStr: string | null = null;
        if (data.data_fato_gerador) {
          const fgDate = new Date(data.data_fato_gerador);
          if (!isNaN(fgDate.getTime())) {
            dataFatoGeradorStr = formatDateForDatabase(fgDate);
          }
        }

        const { error } = await supabase
          .from("financeiro_lancamentos")
          .update({
            descricao: data.descricao || "",
            valor: Number(data.valor) || 0,
            data_vencimento: formatDateForDatabase(validDate),
            cliente_id: data.clienteId,
            tipo_lancamento: data.tipo_lancamento,
            valor_cliente: calcValCliente,
            valor_escritorio: calcValEscritorio,
            valor_parceiro: calcValParceiro,
            valor_reserva: calcValReserva,
            pct_parceiro2: isAcordo ? pctParceiro2 : null,
            pct_parceiro3: isAcordo ? pctParceiro3 : null,
            valor_parceiro2: calcValParceiro2,
            valor_parceiro3: calcValParceiro3,
            pct_reserva: (isAcordo || isSucumbencia) ? pctReserva : null,
            valor_sucumbencia: isAcordo ? valorSucumbencia : null,
            instituicao_financeira: data.instituicao_financeira === "Outro" ? (data.instituicao_financeira_outra || "Outro") : (data.instituicao_financeira || null),
            depositante: data.depositante || null,
            data_fato_gerador: dataFatoGeradorStr,
            parceiro_id_1: isAcordo ? (data.parceiro_id_1 === "none" ? null : (data.parceiro_id_1 || null)) : null,
            parceiro_id_2: isAcordo ? (data.parceiro_id_2 === "none" ? null : (data.parceiro_id_2 || null)) : null,
            parceiro_id_3: isAcordo ? (data.parceiro_id_3 === "none" ? null : (data.parceiro_id_3 || null)) : null,
          })
          .eq("id", editingLancamento.id);
        if (error) throw error;

        setLancamentos(
          lancamentos.map((l) =>
            l.id === editingLancamento.id
              ? {
                  ...l,
                  descricao: data.descricao || "",
                  valor: Number(data.valor) || 0,
                  dataVencimento: formatDateForDatabase(validDate),
                  clienteId: selectedCliente.id,
                  clienteNome: selectedCliente.nome,
                  tipo_lancamento: data.tipo_lancamento,
                  valor_cliente: calcValCliente,
                  valor_escritorio: calcValEscritorio,
                  valor_parceiro: calcValParceiro,
                  valor_reserva: calcValReserva,
                  forma_recebimento: data.forma_recebimento || null,
                  caixa_box: data.caixa_box || null,
                  parceiro_id_1: isAcordo ? (data.parceiro_id_1 === "none" ? null : (data.parceiro_id_1 || null)) : null,
                  parceiro_id_2: isAcordo ? (data.parceiro_id_2 === "none" ? null : (data.parceiro_id_2 || null)) : null,
                  parceiro_id_3: isAcordo ? (data.parceiro_id_3 === "none" ? null : (data.parceiro_id_3 || null)) : null,
                }
              : l
          )
        );
        toast({ title: "Sucesso!", description: "Lançamento atualizado." });
      } else {
        const parcelasCount = data.parcelas && data.parcelas > 1 ? data.parcelas : 1;
        const numValor = Number(data.valor) || 0;
        const valorPorParcela = numValor / parcelasCount;
        const valClientePorParcela = calcValCliente ? calcValCliente / parcelasCount : null;
        const valEscritorioPorParcela = calcValEscritorio ? calcValEscritorio / parcelasCount : null;
        const valParceiroPorParcela = calcValParceiro ? calcValParceiro / parcelasCount : null;
        const valParceiro2PorParcela = calcValParceiro2 ? calcValParceiro2 / parcelasCount : null;
        const valParceiro3PorParcela = calcValParceiro3 ? calcValParceiro3 / parcelasCount : null;
        const valReservaPorParcela = calcValReserva ? calcValReserva / parcelasCount : null;
        const valSucumbenciaPorParcela = valorSucumbencia ? valorSucumbencia / parcelasCount : null;

        const payloads = [];
        const rawDate = data.dataVencimento ? new Date(data.dataVencimento) : new Date();
        const baseDate = isNaN(rawDate.getTime()) ? new Date() : rawDate;

        let dataFatoGeradorStr: string | null = null;
        if (data.data_fato_gerador) {
          const fgDate = new Date(data.data_fato_gerador);
          if (!isNaN(fgDate.getTime())) {
            dataFatoGeradorStr = formatDateForDatabase(fgDate);
          }
        }

        for (let i = 0; i < parcelasCount; i++) {
          // Vencimento da parcela: data escolhida/ajustada no formulário (dia útil);
          // sem cronograma, calcula mês a mês já empurrando para o próximo dia útil
          const currentDueDate = data.vencimentos?.[i]
            ? dataDeIso(data.vencimentos[i])
            : vencimentoMensal(baseDate, i).data;
          
          let descricaoParcela = data.descricao || (isAcordo ? "Acordo Judicial" : "Lançamento");
          if (parcelasCount > 1) {
            descricaoParcela = `${descricaoParcela} - Parcela ${i + 1}/${parcelasCount}`;
          }

          payloads.push({
            descricao: descricaoParcela,
            valor: valorPorParcela,
            data_vencimento: formatDateForDatabase(currentDueDate),
            status: "Pendente",
            cliente_id: data.clienteId,
            user_id: user.id,
            tipo_lancamento: data.tipo_lancamento,
            valor_cliente: valClientePorParcela,
            valor_escritorio: valEscritorioPorParcela,
            valor_parceiro: valParceiroPorParcela,
            valor_reserva: valReservaPorParcela,
            pct_parceiro2: isAcordo ? pctParceiro2 : null,
            pct_parceiro3: isAcordo ? pctParceiro3 : null,
            valor_parceiro2: valParceiro2PorParcela,
            valor_parceiro3: valParceiro3PorParcela,
            pct_reserva: (isAcordo || isSucumbencia) ? pctReserva : null,
            valor_sucumbencia: isAcordo ? valSucumbenciaPorParcela : null,
            instituicao_financeira: data.instituicao_financeira === "Outro" ? (data.instituicao_financeira_outra || "Outro") : (data.instituicao_financeira || null),
            depositante: data.depositante || null,
            data_fato_gerador: dataFatoGeradorStr,
            parceiro_id_1: isAcordo ? (data.parceiro_id_1 === "none" ? null : (data.parceiro_id_1 || null)) : null,
            parceiro_id_2: isAcordo ? (data.parceiro_id_2 === "none" ? null : (data.parceiro_id_2 || null)) : null,
            parceiro_id_3: isAcordo ? (data.parceiro_id_3 === "none" ? null : (data.parceiro_id_3 || null)) : null,
            status_cliente: isAcordo ? "Pendente" : (isSucumbencia ? "Pago" : null),
            status_parceiro: isAcordo ? "Pendente" : (isSucumbencia ? "Pago" : null),
          });
        }

        if (isAcordo && valorSucumbencia > 0 && data.separar_lancamento_sucumbencia !== false) {
          const rawSuc = data.data_vencimento_sucumbencia 
            ? new Date(data.data_vencimento_sucumbencia) 
            : baseDate;
          const sucDueDate = isNaN(rawSuc.getTime()) ? baseDate : rawSuc;
          const sucReserva = valorSucumbencia * (pctReserva / 100);
          const sucEscritorio = valorSucumbencia - sucReserva;

          payloads.push({
            descricao: `Honorários Sucumbenciais - ${data.descricao || "Acordo"}`,
            valor: valorSucumbencia,
            data_vencimento: formatDateForDatabase(sucDueDate),
            status: "Pendente",
            cliente_id: data.clienteId,
            user_id: user.id,
            tipo_lancamento: "Sucumbência",
            valor_cliente: 0,
            valor_escritorio: sucEscritorio,
            valor_parceiro: 0,
            valor_parceiro2: 0,
            valor_parceiro3: 0,
            valor_reserva: sucReserva,
            pct_reserva: pctReserva,
            valor_sucumbencia: valorSucumbencia,
            instituicao_financeira: data.instituicao_financeira === "Outro" ? (data.instituicao_financeira_outra || "Outro") : (data.instituicao_financeira || null),
            depositante: data.depositante || null,
            data_fato_gerador: dataFatoGeradorStr,
            status_cliente: "Pago",
            status_parceiro: "Pago",
          });
        }

        const { data: insertedList, error } = await supabase
          .from("financeiro_lancamentos")
          .insert(payloads)
          .select("*");
          
        if (error) throw error;

        const newLancamentos = ((insertedList || []) as unknown as RawLancamento[]).map((inserted) => ({
            id: inserted.id,
            descricao: inserted.descricao,
            valor: Number(inserted.valor),
            dataVencimento: inserted.data_vencimento,
            dataPagamento: inserted.data_pagamento,
            status: inserted.status,
            clienteId: inserted.cliente_id,
            clienteNome: selectedCliente.nome,
            advogadoNome: user.email || "-",
            tipo_lancamento: (inserted.tipo_lancamento as "Receita" | "Despesa" | "Acordo" | null | undefined),
            valor_cliente: inserted.valor_cliente ? Number(inserted.valor_cliente) : null,
            valor_escritorio: inserted.valor_escritorio ? Number(inserted.valor_escritorio) : null,
            valor_parceiro: inserted.valor_parceiro ? Number(inserted.valor_parceiro) : null,
            valor_reserva: inserted.valor_reserva ? Number(inserted.valor_reserva) : null,
            forma_recebimento: inserted.forma_recebimento,
            status_cliente: (inserted.status_cliente as "Pago" | "Pendente" | null | undefined),
            status_parceiro: (inserted.status_parceiro as "Pago" | "Pendente" | null | undefined),
            data_pgto_cliente: inserted.data_pgto_cliente,
            data_pgto_parceiro: inserted.data_pgto_parceiro,
            caixa_box: inserted.caixa_box,
            parceiro_id_1: inserted.parceiro_id_1,
            parceiro_id_2: inserted.parceiro_id_2,
            parceiro_id_3: inserted.parceiro_id_3,
            autorId: inserted.user_id,
        }));

        setLancamentos([
          ...newLancamentos,
          ...lancamentos,
        ]);
        toast({
          title: "Sucesso!",
          description: "Novo lançamento adicionado.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Falha ao salvar lançamento",
        variant: "destructive",
      });
    }

    setIsFormOpen(false);
  };
  // Clique duplo em "Salvar" não grava duas vezes
  const onSubmit = useSubmitUnico(salvarLancamento);

  const handleDelete = async () => {
    if (!lancamentoToDelete) return;
    try {
      const { error } = await supabase
        .from("financeiro_lancamentos")
        .delete()
        .eq("id", lancamentoToDelete);
      if (error) throw error;
      setLancamentos(lancamentos.filter((l) => l.id !== lancamentoToDelete));
      toast({ title: "Lançamento excluído", variant: "destructive" });
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Falha ao excluir lançamento",
        variant: "destructive",
      });
    } finally {
      setLancamentoToDelete(null);
    }
  };

  const handleUpdateStatus = async (newStatus: "Pago" | "Pendente") => {
    if (!statusUpdateTarget) return;
    try {
      const payload: { status: "Pago" | "Pendente"; data_pagamento?: string | null } = { status: newStatus };
      if (newStatus === "Pago") {
        payload.data_pagamento = formatDateForDatabase(new Date());
      } else {
        payload.data_pagamento = null;
      }
      const { error } = await supabase
        .from("financeiro_lancamentos")
        .update(payload)
        .eq("id", statusUpdateTarget.id);
      if (error) throw error;

      setLancamentos(
        lancamentos.map((l) =>
          l.id === statusUpdateTarget.id
            ? {
                ...l,
                status: newStatus,
                dataPagamento:
                  newStatus === "Pago"
                    ? formatDateForDatabase(new Date())
                    : null,
              }
            : l
        )
      );
      toast({
        title: "Sucesso!",
        description: "Status do lançamento atualizado.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro",
        description: "Falha ao atualizar status",
        variant: "destructive",
      });
    } finally {
      setStatusUpdateTarget(null);
    }
  };

  const hojeIso = new Date().toISOString().slice(0, 10);
  const situacao = (l: Lancamento) =>
    l.status === "Pago" ? "Pago" : l.dataVencimento && l.dataVencimento < hojeIso ? "Atrasado" : "Pendente";

  // Clientes que têm lançamentos (para o filtro)
  const clientesComLancamento = Array.from(
    new Map(lancamentos.filter((l) => l.clienteId).map((l) => [l.clienteId, l.clienteNome])).entries()
  ).sort((a, b) => String(a[1]).localeCompare(String(b[1])));

  const filteredLancamentos = lancamentos
    .filter(
      (l) =>
        ((l.descricao || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (l.clienteNome || "").toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filtroCliente === "todos" || l.clienteId === filtroCliente) &&
        (filtroSituacao === "todas" || situacao(l) === filtroSituacao)
    )
    // com um cliente escolhido, mostra as parcelas em ordem de vencimento
    .sort((a, b) => (filtroCliente === "todos" ? 0 : String(a.dataVencimento).localeCompare(String(b.dataVencimento))));

  const resumoCliente =
    filtroCliente === "todos"
      ? null
      : {
          qtd: filteredLancamentos.length,
          total: filteredLancamentos.reduce((s2, l) => s2 + l.valor, 0),
          pago: filteredLancamentos.filter((l) => situacao(l) === "Pago").reduce((s2, l) => s2 + l.valor, 0),
          pendente: filteredLancamentos.filter((l) => situacao(l) === "Pendente").reduce((s2, l) => s2 + l.valor, 0),
          atrasado: filteredLancamentos.filter((l) => situacao(l) === "Atrasado").reduce((s2, l) => s2 + l.valor, 0),
        };
  const brlF = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Stats calculations
  const totalAReceber = lancamentos
    .filter((l) => l.status === "Pendente" && l.tipo_lancamento !== "Acordo")
    .reduce((sum, l) => sum + l.valor, 0);

  const recebido30dias = lancamentos
    .filter(
      (l) =>
        l.status === "Pago" &&
        l.tipo_lancamento !== "Acordo" &&
        l.dataPagamento &&
        isWithinInterval(new Date(l.dataPagamento + "T00:00:00"), {
          start: subDays(new Date(), 30),
          end: new Date(),
        })
    )
    .reduce((sum, l) => sum + l.valor, 0);

  const comissaoPendente = lancamentos
    .filter((l) => l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pendente")
    .reduce((sum, l) => sum + (l.valor_parceiro || 0), 0);

  const comissaoPaga = lancamentos
    .filter((l) => l.tipo_lancamento === "Acordo" && l.status_parceiro === "Pago")
    .reduce((sum, l) => sum + (l.valor_parceiro || 0), 0);

  const reservaAcumulada = lancamentos
    .filter((l) => l.tipo_lancamento === "Acordo" && l.status === "Pago")
    .reduce((sum, l) => sum + (l.valor_reserva || 0), 0);

  const faturamentoBanca30d = lancamentos
    .filter(
      (l) =>
        l.status === "Pago" &&
        l.dataPagamento &&
        isWithinInterval(new Date(l.dataPagamento + "T00:00:00"), {
          start: subDays(new Date(), 30),
          end: new Date(),
        })
    )
    .reduce((sum, l) => {
      if (l.tipo_lancamento === "Acordo") {
        return sum + (l.valor_escritorio || 0);
      }
      if (l.tipo_lancamento === "Despesa") {
        return sum - l.valor;
      }
      return sum + l.valor;
    }, 0);

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const comissaoPendenteMes = lancamentos
    .filter((l) => {
      if (l.tipo_lancamento !== "Acordo" || l.status_parceiro !== "Pendente") return false;
      if (!l.dataVencimento) return true;
      return new Date(l.dataVencimento + "T00:00:00") >= firstOfMonth;
    })
    .reduce((sum, l) => sum + (l.valor_parceiro || 0), 0);

  const comissaoPendenteAtrasada = lancamentos
    .filter((l) => {
      if (l.tipo_lancamento !== "Acordo" || l.status_parceiro !== "Pendente") return false;
      if (!l.dataVencimento) return false;
      return new Date(l.dataVencimento + "T00:00:00") < firstOfMonth;
    })
    .reduce((sum, l) => sum + (l.valor_parceiro || 0), 0);

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const stats = isAdmin
    ? [
        {
          title: "Resultado da Banca (30d)",
          value: formatBRL(faturamentoBanca30d),
          icon: TrendingUp,
          color: faturamentoBanca30d >= 0 ? "text-green-500" : "text-red-500",
        },
        {
          title: "Repasses Parceiros Pendentes",
          value: formatBRL(comissaoPendente),
          icon: DollarSign,
          color: "text-orange-500",
        },
        {
          title: "Reserva Adm. Acumulada",
          value: formatBRL(reservaAcumulada),
          icon: AlertCircle,
          color: "text-blue-500",
        },
      ]
    : [
        {
          title: "Total Recebido",
          value: formatBRL(comissaoPaga),
          icon: CheckCircle2,
          color: "text-green-500",
        },
        {
          title: "A Receber (mês)",
          value: formatBRL(comissaoPendenteMes),
          icon: Clock,
          color: "text-amber-500",
        },
        {
          title: "Atrasado",
          value: formatBRL(comissaoPendenteAtrasada),
          icon: AlertCircle,
          color: "text-red-500",
        },
      ];

  const getStatusBadge = (variant: "success" | "warning" | "destructive") => {
    switch (variant) {
      case "success":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "warning":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "destructive":
        return "bg-red-500/10 text-red-500 border-red-500/20";
    }
  };

  // ---------- agrupamento por cliente (clientes com mais de um lançamento viram uma linha que abre) ----------
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(new Set());
  const alternarGrupo = (chave: string) =>
    setGruposAbertos((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  // com um cliente filtrado ou busca digitada, as parcelas já aparecem abertas
  const grupoAberto = (chave: string) => gruposAbertos.has(chave) || filtroCliente !== "todos" || searchTerm.trim() !== "";

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDataBr = (d: string) => d.split("-").reverse().join("/");
  const getBadgeClass = (st: { variant: string }) =>
    st.variant === "success"
      ? "bg-green-500/10 text-green-500 border-green-500/20"
      : st.variant === "destructive"
      ? "bg-red-500/10 text-red-500 border-red-500/20"
      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";

  const gruposLancamentos = (() => {
    const mapa = new Map<string, Lancamento[]>();
    for (const l of filteredLancamentos) {
      const chave = l.clienteId ? `c-${l.clienteId}` : `l-${l.id}`;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(l);
    }
    return Array.from(mapa.entries()).map(([chave, itens]) => {
      const ordenados = [...itens].sort((a, b) => String(a.dataVencimento).localeCompare(String(b.dataVencimento)));
      const sts = ordenados.map((l) => getStatus(l));
      const soma = (f: (i: number) => boolean) => ordenados.reduce((acc, l, i) => acc + (f(i) ? l.valor : 0), 0);
      const qtdAtrasados = sts.filter((x) => x.text === "Atrasado").length;
      const proximo = ordenados.find((l, i) => sts[i].text !== "Pago")?.dataVencimento || null;
      return {
        chave,
        itens: ordenados,
        clienteNome: ordenados[0].clienteNome,
        total: soma(() => true),
        pago: soma((i) => sts[i].text === "Pago"),
        aberto: soma((i) => sts[i].text !== "Pago"),
        atrasado: soma((i) => sts[i].text === "Atrasado"),
        qtdAtrasados,
        proximo,
        situacao: qtdAtrasados > 0
          ? { text: "Atrasado", variant: "destructive" }
          : sts.some((x) => x.text === "Pendente")
          ? { text: "Pendente", variant: "warning" }
          : { text: "Pago", variant: "success" },
      };
    });
  })();

  const renderLinhaDesktop = (lancamento: Lancamento, dentroDoGrupo = false) => {
                  const statusInfo = getStatus(lancamento);
                  return (
                    <TableRow key={lancamento.id} className={dentroDoGrupo ? "bg-muted/10" : undefined}>
                      <TableCell className={dentroDoGrupo ? "font-medium pl-10" : "font-medium"}>
                        <div className="flex items-center gap-2">
                          {lancamento.tipo_lancamento === "Despesa" && (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/25 px-1.5 py-0 text-[10px] font-semibold">DESPESA</Badge>
                          )}
                          {lancamento.tipo_lancamento === "Acordo" && (
                            <Badge className="bg-[#EBB52C]/20 text-[#010E38] dark:text-[#EBB52C] border-[#EBB52C]/40 px-1.5 py-0 text-[10px] font-semibold">ACORDO</Badge>
                          )}
                          {lancamento.tipo_lancamento === "Receita" && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/25 px-1.5 py-0 text-[10px] font-semibold">RECEITA</Badge>
                          )}
                          {lancamento.tipo_lancamento === "Sucumbência" && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-1.5 py-0 text-[10px] font-semibold">SUCUMBÊNCIA</Badge>
                          )}
                          <span>{lancamento.descricao}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{lancamento.clienteNome}</div>
                        {lancamento.tipo_lancamento === "Acordo" && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              lancamento.status_cliente === "Pago"
                                ? "bg-green-500/5 text-green-600 border-green-500/20"
                                : "bg-orange-500/5 text-orange-600 border-orange-500/20"
                            }`}>
                              Cli: {formatBRL(lancamento.valor_cliente ?? 0)} ({lancamento.status_cliente === "Pago" ? "Pago" : "Pend"})
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              lancamento.status_parceiro === "Pago"
                                ? "bg-green-500/5 text-green-600 border-green-500/20"
                                : "bg-orange-500/5 text-orange-600 border-orange-500/20"
                            }`}>
                              Parc: {formatBRL(lancamento.valor_parceiro ?? 0)} ({lancamento.status_parceiro === "Pago" ? "Pago" : "Pend"})
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/5 text-blue-600 border-blue-500/20">
                              Res: {formatBRL(lancamento.valor_reserva ?? 0)}
                            </Badge>
                          </div>
                        )}
                        {lancamento.tipo_lancamento === "Sucumbência" && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                              Banca: {formatBRL(lancamento.valor_escritorio ?? lancamento.valor)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/5 text-blue-600 border-blue-500/20">
                              Res: {formatBRL(lancamento.valor_reserva ?? 0)}
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-xs text-muted-foreground">
                          {lancamento.advogadoNome}
                        </TableCell>
                      )}
                      <TableCell className="text-right font-semibold">
                        {formatBRL(lancamento.valor)}
                      </TableCell>
                      <TableCell>
                        {format(
                          new Date(lancamento.dataVencimento + "T00:00:00"),
                          "dd/MM/yyyy",
                          { locale: ptBR }
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${getStatusBadge(
                            statusInfo.variant
                          )} ${isAdmin ? "cursor-pointer" : ""}`}
                          onClick={() => isAdmin && setStatusUpdateTarget(lancamento)}
                        >
                          {statusInfo.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {lancamento.tipo_lancamento === "Acordo" && isAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRepasse(
                                      lancamento.id,
                                      "cliente",
                                      lancamento.status_cliente === "Pago" ? "Pendente" : "Pago"
                                    )
                                  }
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" />
                                  <span>
                                    {lancamento.status_cliente === "Pago"
                                      ? "Repasse Cliente Pendente"
                                      : "Pagar Cliente"}
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRepasse(
                                      lancamento.id,
                                      "parceiro",
                                      lancamento.status_parceiro === "Pago" ? "Pendente" : "Pago"
                                    )
                                  }
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                  <span>
                                    {lancamento.status_parceiro === "Pago"
                                      ? "Repasse Parceiro Pendente"
                                      : "Pagar Parceiro"}
                                  </span>
                                </DropdownMenuItem>
                              </>
                            )}
                            {(isAdmin || lancamento.autorId === user?.id) && (
                              <DropdownMenuItem
                                onClick={() => setStatusUpdateTarget(lancamento)}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                <span>Alterar status</span>
                              </DropdownMenuItem>
                            )}
                            {(isAdmin || lancamento.autorId === user?.id) && (
                            <DropdownMenuItem
                              onClick={() => handleOpenForm(lancamento)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            )}
                            {(podeExcluir || lancamento.autorId === user?.id) && (
                              <DropdownMenuItem
                                className="text-red-500"
                                onClick={() => setLancamentoToDelete(lancamento.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                };

  const renderCardMobile = (lancamento: Lancamento) => {
              const statusInfo = getStatus(lancamento);
              return (
                <Card key={lancamento.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-medium text-sm leading-tight flex items-center gap-1.5">
                            {lancamento.tipo_lancamento === "Despesa" && (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/25 px-1.5 py-0 text-[9px] font-semibold">DESP</Badge>
                            )}
                            {lancamento.tipo_lancamento === "Acordo" && (
                              <Badge className="bg-[#EBB52C]/20 text-[#010E38] dark:text-[#EBB52C] border-[#EBB52C]/40 px-1.5 py-0 text-[9px] font-semibold">ACORDO</Badge>
                            )}
                            {lancamento.tipo_lancamento === "Receita" && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/25 px-1.5 py-0 text-[9px] font-semibold">REC</Badge>
                            )}
                            {lancamento.tipo_lancamento === "Sucumbência" && (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 px-1.5 py-0 text-[9px] font-semibold">SUCUMBÊNCIA</Badge>
                            )}
                            {lancamento.descricao}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{lancamento.clienteNome}</span>
                        </div>
                        {lancamento.tipo_lancamento === "Acordo" && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                              lancamento.status_cliente === "Pago"
                                ? "bg-green-500/5 text-green-600 border-green-500/20"
                                : "bg-orange-500/5 text-orange-600 border-orange-500/20"
                            }`}>
                              Cli: {formatBRL(lancamento.valor_cliente ?? 0)} ({lancamento.status_cliente === "Pago" ? "Pago" : "Pend"})
                            </Badge>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                              lancamento.status_parceiro === "Pago"
                                ? "bg-green-500/5 text-green-600 border-green-500/20"
                                : "bg-orange-500/5 text-orange-600 border-orange-500/20"
                            }`}>
                              Parc: {formatBRL(lancamento.valor_parceiro ?? 0)} ({lancamento.status_parceiro === "Pago" ? "Pago" : "Pend"})
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/5 text-blue-600 border-blue-500/20">
                              Res: {formatBRL(lancamento.valor_reserva ?? 0)}
                            </Badge>
                          </div>
                        )}
                        {lancamento.tipo_lancamento === "Sucumbência" && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/30">
                              Banca: {formatBRL(lancamento.valor_escritorio ?? lancamento.valor)}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/5 text-blue-600 border-blue-500/20">
                              Res: {formatBRL(lancamento.valor_reserva ?? 0)}
                            </Badge>
                          </div>
                        )}
                        {isAdmin && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground/75">Responsável:</span>
                            <span>{lancamento.advogadoNome}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {lancamento.tipo_lancamento === "Acordo" && isAdmin && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdateRepasse(
                                    lancamento.id,
                                    "cliente",
                                    lancamento.status_cliente === "Pago" ? "Pendente" : "Pago"
                                  )
                                }
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" />
                                <span>
                                  {lancamento.status_cliente === "Pago"
                                    ? "Repasse Cliente Pendente"
                                    : "Pagar Cliente"}
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleUpdateRepasse(
                                    lancamento.id,
                                    "parceiro",
                                    lancamento.status_parceiro === "Pago" ? "Pendente" : "Pago"
                                  )
                                }
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                <span>
                                  {lancamento.status_parceiro === "Pago"
                                    ? "Repasse Parceiro Pendente"
                                    : "Pagar Parceiro"}
                                </span>
                              </DropdownMenuItem>
                            </>
                          )}
                          {(isAdmin || lancamento.autorId === user?.id) && (
                            <DropdownMenuItem
                              onClick={() => setStatusUpdateTarget(lancamento)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              <span>Alterar status</span>
                            </DropdownMenuItem>
                          )}
                          {(isAdmin || lancamento.autorId === user?.id) && (
                          <DropdownMenuItem
                            onClick={() => handleOpenForm(lancamento)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          )}
                          {(podeExcluir || lancamento.autorId === user?.id) && (
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={() => setLancamentoToDelete(lancamento.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-green-600">
                          {formatBRL(lancamento.valor)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(
                            new Date(lancamento.dataVencimento + "T00:00:00"),
                            "dd/MM/yyyy",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-start">
                      <Badge
                        className={`${getStatusBadge(
                          statusInfo.variant
                        )} ${isAdmin ? "cursor-pointer" : ""} text-xs`}
                        onClick={() => isAdmin && setStatusUpdateTarget(lancamento)}
                      >
                        {statusInfo.text}
                      </Badge>
                    </div>
                  </div>
                </Card>
              );
            };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Gestão Financeira</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Acompanhe os recebimentos do seu escritório.
        </p>
      </header>

      <EsteiraHonorarios onLancamentosGerados={load} />

      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon
                  className={`h-4 w-4 text-muted-foreground ${stat.color}`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou cliente..."
                className="pl-10 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="w-full sm:w-64 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientesComLancamento.map(([id, nome]) => (
                  <SelectItem key={id} value={id}>{nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
              <SelectTrigger className="w-full sm:w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as situações</SelectItem>
                <SelectItem value="Pendente">Pendentes</SelectItem>
                <SelectItem value="Atrasado">Atrasados</SelectItem>
                <SelectItem value="Pago">Pagos</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="outline"
                onClick={() => setIsImportExportOpen(true)}
                className="w-full sm:w-auto border-primary/20 hover:border-primary/50 text-xs py-5"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-primary animate-pulse" />
                Planilhas (Excel)
              </Button>
              <Button onClick={() => handleOpenForm()} className="w-full sm:w-auto text-sm">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Lançamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {resumoCliente && (
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-2 rounded-lg border bg-muted/10 p-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Lançamentos</p><p className="font-semibold tabular-nums">{resumoCliente.qtd}</p></div>
              <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold tabular-nums">{brlF(resumoCliente.total)}</p></div>
              <div><p className="text-xs text-muted-foreground">Pago</p><p className="font-semibold tabular-nums text-green-600">{brlF(resumoCliente.pago)}</p></div>
              <div><p className="text-xs text-muted-foreground">A vencer</p><p className="font-semibold tabular-nums text-amber-600">{brlF(resumoCliente.pendente)}</p></div>
              <div><p className="text-xs text-muted-foreground">Atrasado</p><p className="font-semibold tabular-nums text-red-600">{brlF(resumoCliente.atrasado)}</p></div>
            </div>
          )}
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  {isAdmin && <TableHead>Responsável</TableHead>}
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gruposLancamentos.map((g) =>
                  g.itens.length === 1 ? (
                    renderLinhaDesktop(g.itens[0])
                  ) : (
                    <Fragment key={g.chave}>
                      <TableRow
                        className="cursor-pointer bg-muted/30 hover:bg-muted/50 font-medium"
                        onClick={() => alternarGrupo(g.chave)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {grupoAberto(g.chave) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <Layers className="h-4 w-4 text-primary" />
                            <span>{g.itens.length} lançamentos</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{g.clienteNome}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Pago {formatCurrency(g.pago)} · Em aberto {formatCurrency(g.aberto)}
                            {g.atrasado > 0 && <span className="text-red-500"> · Atrasado {formatCurrency(g.atrasado)}</span>}
                          </p>
                        </TableCell>
                        {isAdmin && <TableCell />}
                        <TableCell className="text-right font-semibold">{formatCurrency(g.total)}</TableCell>
                        <TableCell className="text-sm">{g.proximo ? <>próx. {formatDataBr(g.proximo)}</> : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getBadgeClass(g.situacao)}>
                            {g.qtdAtrasados > 0 ? `${g.qtdAtrasados} atrasado${g.qtdAtrasados > 1 ? "s" : ""}` : g.situacao.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{grupoAberto(g.chave) ? "fechar" : "abrir"}</TableCell>
                      </TableRow>
                      {grupoAberto(g.chave) && g.itens.map((l) => renderLinhaDesktop(l, true))}
                    </Fragment>
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {gruposLancamentos.map((g) =>
              g.itens.length === 1 ? (
                renderCardMobile(g.itens[0])
              ) : (
                <div key={g.chave} className="space-y-2">
                  <button
                    type="button"
                    onClick={() => alternarGrupo(g.chave)}
                    className="w-full text-left rounded-lg border bg-muted/30 p-4 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        {grupoAberto(g.chave) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {g.clienteNome}
                      </span>
                      <span className="font-semibold text-sm">{formatCurrency(g.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {g.itens.length} lançamentos · Pago {formatCurrency(g.pago)} · Em aberto {formatCurrency(g.aberto)}
                      {g.qtdAtrasados > 0 && <span className="text-red-500"> · {g.qtdAtrasados} atrasado(s)</span>}
                    </p>
                  </button>
                  {grupoAberto(g.chave) && <div className="pl-3 border-l-2 border-primary/30 space-y-3">{g.itens.map((l) => renderCardMobile(l))}</div>}
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="mx-4 max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {editingLancamento ? "Editar" : "Adicionar"} Lançamento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Preencha as informações do lançamento financeiro.
            </DialogDescription>
          </DialogHeader>
          <LancamentoForm
            onSubmit={onSubmit}
            lancamento={editingLancamento}
            clientes={clientes}
            parceiros={parceiros}
          />
        </DialogContent>
      </Dialog>

      <DeleteLancamentoDialog
        open={!!lancamentoToDelete}
        onOpenChange={(open) => !open && setLancamentoToDelete(null)}
        onConfirm={handleDelete}
      />

      <StatusUpdateDialog
        open={!!statusUpdateTarget}
        onOpenChange={(open) => !open && setStatusUpdateTarget(null)}
        onConfirm={handleUpdateStatus}
        currentStatus={
          statusUpdateTarget
            ? (getStatus(statusUpdateTarget).text as
                | "Pago"
                | "Pendente"
                | "Atrasado")
            : "Pendente"
        }
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        table="financeiro"
        onSuccess={load}
      />
    </div>
  );
};

export default Financeiro;
