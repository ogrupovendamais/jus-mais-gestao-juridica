import { ProcessoAstreaDetalhe } from "@/components/processos/ProcessoAstreaDetalhe";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Tag,
  ChevronDown,
  Star,
  Rss,
  ArrowUp,
  ArrowDown,
  ListFilter,
  Scale,
  Sparkles,
  CheckCircle2,
  MoreVertical,
  Loader2,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ImportExportModal } from "@/components/planilhas/ImportExportModal";
import { formatDateForDatabase } from "@/lib/utils";
import { NICHOS, useUsuarios } from '@/lib/nichos';
import { STATUS_PROCESSO, STATUS_INICIAL, STATUS_ACAO_INTERNA, StatusProcesso, processoAtivo, corStatusProcesso } from '@/lib/statusProcesso';
import { classificacaoLabel } from "@/lib/classificacoes";
import { useRascunho } from '@/hooks/useRascunho';
import { useSubmitUnico } from '@/hooks/useSubmitUnico';
import {
  UFS_BRASIL,
  ConfigOabAdvogado,
  ProcessoExtraAstrea,
  carregarConfigOabAdvogado,
  salvarConfigOabAdvogado,
  lerMetadadosAstreaProcessos,
  salvarMetadadoAstreaProcesso,
  sincronizarProcessosAdvogadoPorOab,
  formatarNumeroCnj,
} from "@/lib/oabSync";
import {
  EtiquetaItem,
  lerEtiquetas,
  criarEtiqueta,
  excluirEtiqueta,
  CORES_ETIQUETAS,
} from "@/lib/etiquetas";

const processoSchema = z.object({
  numero: z.string().optional().or(z.literal("")),
  cliente: z.string().optional().or(z.literal("")),
  assunto: z.string().optional().or(z.literal("")),
  assuntoPrincipal: z.string().optional().or(z.literal("")),
  parteContraria: z.string().optional().or(z.literal("")),
  acaoClasse: z.string().optional().or(z.literal("")),
  foroVara: z.string().optional().or(z.literal("")),
  pasta: z.string().optional().or(z.literal("")),
  status: z.enum(STATUS_PROCESSO),
  dataInicio: z.string().optional().or(z.literal("")),
  dataLimite: z.string().optional().or(z.literal("")),
  prioridade: z.enum(["Alta", "Média", "Baixa"]),
  responsavel_a_id: z.string().optional().nullable(),
  responsavel_b_id: z.string().optional().nullable(),
  valor: z.string().optional().or(z.literal("")),
  instancia: z.string().optional().or(z.literal("")),
});

type Processo = z.infer<typeof processoSchema> & {
  id: string;
  clienteId?: string;
  nichoId?: string | null;
  nicho?: string;
  responsavel?: string;
  createdAt?: string;
};

type OpcaoNicho = {
  id: string;
  clienteId: string;
  clienteNome: string;
  nicho: string;
};

const Processos = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ativos" | "encerrados" | "acao" | "todos"
  >("ativos");
  const [quickFilter, setQuickFilter] = useState<
    "todos" | "favoritos" | "monitorados" | "sincronizados_oab"
  >("todos");
  const [areaFilter, setAreaFilter] = useState("todas");
  const [selectedEtiquetas, setSelectedEtiquetas] = useState<string[]>([]);
  const [sortMovAsc, setSortMovAsc] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [processos, setProcessos] = useState<Processo[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [opcoesNicho, setOpcoesNicho] = useState<OpcaoNicho[]>([]);
  const usuarios = useUsuarios();

  // Metadados Astrea (Favoritos, RSS, Partes, Ação/Foro, Última Movimentação)
  const [astreaMetaMap, setAstreaMetaMap] = useState<
    Record<string, ProcessoExtraAstrea>
  >(() => lerMetadadosAstreaProcessos());

  // Etiquetas
  const [etiquetasDisponiveis, setEtiquetasDisponiveis] = useState<
    EtiquetaItem[]
  >(() => lerEtiquetas());
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [novaTagNome, setNovaTagNome] = useState("");
  const [novaTagCor, setNovaTagCor] = useState(typeof CORES_ETIQUETAS[0] === 'string' ? CORES_ETIQUETAS[0] : (CORES_ETIQUETAS[0] as any).hex);

  // Configuração e Sincronização Nativa por OAB + UF
  const [oabConfig, setOabConfig] = useState<ConfigOabAdvogado>({
    numeroOab: "",
    ufOab: "SP",
    autoSync: true,
  });
  const [isOabModalOpen, setIsOabModalOpen] = useState(false);
  const [isSyncingOab, setIsSyncingOab] = useState(false);
  const [autoSyncExecuted, setAutoSyncExecuted] = useState(false);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(
    null
  );
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [processoDetalhe, setProcessoDetalhe] = useState<Processo | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isDesktop, setIsDesktop] = useState(true);
  const { user, role } = useAuth();

  const formatCurrency = (num: number) =>
    num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const parseCurrency = (s?: string) => {
    const n = Number(
      String(s || "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^0-9.]/g, "")
    );
    return isNaN(n) ? 0 : n;
  };

  const fetchData = useCallback(async () => {
    const [procRes, cliRes, nichosRes] = await Promise.all([
      supabase
        .from("processos")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("clientes").select("id, nome"),
      supabase
        .from("cliente_nichos" as never)
        .select("id, cliente_id, nicho, status"),
    ]);

    if (procRes.error) {
      console.error(procRes.error);
      toast.error("Erro ao carregar processos");
      return;
    }

    const clientesList = cliRes.data || [];
    const profilesList = usuarios;
    const nichosList = ((nichosRes.data as any[]) || []).map((n) => ({
      id: n.id,
      clienteId: n.cliente_id,
      clienteNome:
        clientesList.find((c) => c.id === n.cliente_id)?.nome || "—",
      nicho: n.nicho,
    }));

    clientesList
      .filter((c: any) => !nichosList.some((n) => n.clienteId === c.id))
      .forEach((c: any) =>
        nichosList.push({
          id: `cliente:${c.id}`,
          clienteId: c.id,
          clienteNome: c.nome,
          nicho: "sem nicho",
        })
      );
    nichosList.sort((a, b) => a.clienteNome.localeCompare(b.clienteNome));

    setClientes(clientesList as any);
    setOpcoesNicho(nichosList);
    setAstreaMetaMap(lerMetadadosAstreaProcessos());

    const processosMapped: Processo[] = (procRes.data || []).map((p: any) => {
      const uA = profilesList.find((u) => u.id === p.responsavel_a_id);
      const uB = profilesList.find((u) => u.id === p.responsavel_b_id);

      const nameA = uA ? uA.full_name || uA.email : "—";
      const nameB = uB ? ` / ${uB.full_name || uB.email}` : "";

      return {
        id: p.id,
        numero: p.numero || "",
        cliente: clientesList.find((c) => c.id === p.cliente_id)?.nome || "—",
        clienteId: p.cliente_id,
        nichoId: p.cliente_nicho_id,
        nicho:
          nichosList.find((n) => n.id === p.cliente_nicho_id)?.nicho || "",
        assunto: p.assunto || "",
        assuntoPrincipal: p.assunto_principal || "",
        status: p.status,
        dataInicio: p.data_inicio || "",
        dataLimite: p.data_limite || "",
        prioridade: p.prioridade || "Média",
        responsavel_a_id: p.responsavel_a_id || "",
        responsavel_b_id: p.responsavel_b_id || "",
        responsavel: `${nameA}${nameB}`,
        valor:
          p.valor_causa != null ? formatCurrency(Number(p.valor_causa)) : "",
        instancia: p.instancia || "",
        createdAt: p.created_at,
      };
    });
    setProcessos(processosMapped);
  }, [usuarios]);

  useEffect(() => {
    fetchData();
  }, [fetchData, role, user]);

  // Carrega a OAB do perfil do advogado
  useEffect(() => {
    if (!user?.id) return;
    carregarConfigOabAdvogado(user.id).then((cfg) => {
      setOabConfig(cfg);
    });
  }, [user?.id]);

  // Se o advogado tem OAB + UF configurados e autoSync ligado, sincroniza automaticamente 1x na abertura da sessão
  const executarSincronizacaoOab = useCallback(
    async (
      numOab: string,
      uf: string,
      silencioso = false
    ) => {
      if (!user?.id) return;
      const cleanNum = numOab.replace(/\D/g, "");
      if (!cleanNum || !uf) {
        if (!silencioso) {
          toast.error("Informe o número da OAB e o Estado (UF) para buscar os processos.");
        }
        return;
      }

      setIsSyncingOab(true);
      try {
        const res = await sincronizarProcessosAdvogadoPorOab({
          numeroOab: cleanNum,
          ufOab: uf,
          userId: user.id,
        });

        const updatedCfg = await carregarConfigOabAdvogado(user.id);
        setOabConfig(updatedCfg);
        setAstreaMetaMap(lerMetadadosAstreaProcessos());
        await fetchData();

        if (!silencioso) {
          if (res.totalEncontradosNaApi === 0) {
            toast.info(
              `Nenhuma publicação/processo recente localizado na base nacional do CNJ para OAB ${cleanNum}/${uf}.`,
              {
                description:
                  "A configuração da sua OAB foi salva e o monitoramento automático está ativo.",
              }
            );
          } else {
            toast.success(
              `Sincronização OAB ${cleanNum}/${uf} concluída!`,
              {
                description: `${res.totalEncontradosNaApi} processo(s) localizados no CNJ (${res.novosImportados} novos importados e ${res.atualizados} atualizados).`,
              }
            );
          }
          setIsOabModalOpen(false);
        }
      } catch (err: any) {
        console.error("Erro na sincronização OAB:", err);
        if (!silencioso) {
          toast.error("Falha ao consultar tribunais pela OAB", {
            description: err?.message || "Tente novamente em instantes.",
          });
        }
      } finally {
        setIsSyncingOab(false);
      }
    },
    [user?.id, fetchData]
  );

  useEffect(() => {
    if (
      !autoSyncExecuted &&
      user?.id &&
      oabConfig.numeroOab &&
      oabConfig.ufOab &&
      oabConfig.autoSync
    ) {
      setAutoSyncExecuted(true);
      // Sincroniza em background caso a última sincronização tenha mais de 30 minutos
      const lastSync = oabConfig.ultimaSincronizacao
        ? new Date(oabConfig.ultimaSincronizacao).getTime()
        : 0;
      if (Date.now() - lastSync > 30 * 60 * 1000) {
        executarSincronizacaoOab(oabConfig.numeroOab, oabConfig.ufOab, true);
      }
    }
  }, [
    autoSyncExecuted,
    user?.id,
    oabConfig.numeroOab,
    oabConfig.ufOab,
    oabConfig.autoSync,
    oabConfig.ultimaSincronizacao,
    executarSincronizacaoOab,
  ]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const form = useForm<z.infer<typeof processoSchema>>({
    resolver: zodResolver(processoSchema),
  });

  // Helper para obter os metadados enriquecidos de um processo (Astrea layout)
  const getMetaForProcesso = useCallback(
    (p: Processo): ProcessoExtraAstrea => {
      const cnj = formatarNumeroCnj(p.numero || "");
      const meta = astreaMetaMap[p.id] || astreaMetaMap[cnj];

      // Título padrão estilo Astrea: "Autor x Réu"
      let tituloPartes = meta?.tituloPartes || "";
      if (!tituloPartes) {
        if (p.assuntoPrincipal && p.assuntoPrincipal.includes(" x ")) {
          tituloPartes = p.assuntoPrincipal;
        } else if (p.cliente && p.cliente !== "—" && p.assuntoPrincipal) {
          tituloPartes = `${p.cliente} x ${p.assuntoPrincipal}`;
        } else if (p.cliente && p.cliente !== "—") {
          tituloPartes = p.cliente;
        } else {
          tituloPartes = p.assuntoPrincipal || p.assunto || "Processo / Caso sem título";
        }
      }

      // Ação / Classe e Foro / Vara
      const acaoClasse =
        meta?.acaoClasse ||
        (p.assunto ? p.assunto.split("—")[0].trim() : "") ||
        p.assuntoPrincipal ||
        (p.nicho ? `Ação - ${p.nicho}` : "Procedimento Comum Cível");

      const foroVara =
        meta?.foroVara || p.instancia || "Juízo Titular I - 1ª Vara Judicial";

      const ultimaMovData =
        meta?.ultimaMovData ||
        p.dataInicio ||
        (p.createdAt ? p.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10));

      return {
        processoId: p.id,
        numeroCnj: cnj || p.numero || "",
        tituloPartes,
        poloAtivo: meta?.poloAtivo || p.cliente,
        poloPassivo: meta?.poloPassivo || "",
        acaoClasse,
        foroVara,
        siglaTribunal: meta?.siglaTribunal,
        ultimaMovData,
        ultimaMovTexto: meta?.ultimaMovTexto || p.assunto || "",
        pasta: meta?.pasta || p.nicho || "",
        etiquetas: meta?.etiquetas || [],
        favorito: Boolean(meta?.favorito),
        monitoradoRss: meta?.monitoradoRss ?? true,
        origemSincronizacao: meta?.origemSincronizacao || "MANUAL",
      };
    },
    [astreaMetaMap]
  );

  useEffect(() => {
    if (isSheetOpen) {
      if ((mode === "edit" || mode === "view") && selectedProcesso) {
        const meta = getMetaForProcesso(selectedProcesso);
        form.reset({
          ...selectedProcesso,
          cliente:
            selectedProcesso.nichoId ||
            (selectedProcesso.clienteId
              ? `cliente:${selectedProcesso.clienteId}`
              : ""),
          assuntoPrincipal: meta.tituloPartes,
          parteContraria: meta.poloPassivo || "",
          acaoClasse: meta.acaoClasse,
          foroVara: meta.foroVara,
          pasta: meta.pasta || "",
          responsavel_a_id: selectedProcesso.responsavel_a_id || "",
          responsavel_b_id: selectedProcesso.responsavel_b_id || "",
        });
      } else {
        form.reset({
          numero: "",
          cliente: "",
          assunto: "",
          assuntoPrincipal: "",
          parteContraria: "",
          acaoClasse: "",
          foroVara: "",
          pasta: "",
          status: STATUS_INICIAL,
          dataInicio: new Date().toISOString().slice(0, 10),
          dataLimite: "",
          prioridade: "Média",
          responsavel_a_id: role === "parceiro" ? user?.id : "",
          responsavel_b_id: "",
          valor: "",
          instancia: "1ª Instância",
        });
      }
    }
  }, [isSheetOpen, selectedProcesso, mode, form, role, user, getMetaForProcesso]);

  const rascunho = useRascunho(
    form,
    isSheetOpen && mode !== "view" && user
      ? `processo:${selectedProcesso?.id || "novo"}:${user.id}`
      : null
  );

  const salvarProcesso = async (values: z.infer<typeof processoSchema>) => {
    if (!user) {
      toast.error("É necessário estar logado.");
      return;
    }

    const respAId =
      role === "parceiro" ? user.id : values.responsavel_a_id || user.id;
    let respBId = values.responsavel_b_id || null;
    if (respBId === "none" || respBId === "") respBId = null;

    const nichoSel = opcoesNicho.find((n) => n.id === values.cliente);
    if (!nichoSel && mode === "add") {
      toast.error("Selecione o cliente do processo.");
      return;
    }
    const clienteId =
      nichoSel?.clienteId ?? selectedProcesso?.clienteId ?? null;
    const nichoId = nichoSel
      ? nichoSel.id.startsWith("cliente:")
        ? null
        : nichoSel.id
      : selectedProcesso?.nichoId ?? null;
    const dataInicio =
      formatDateForDatabase(values.dataInicio) ||
      new Date().toISOString().slice(0, 10);
    const dataLimite = formatDateForDatabase(values.dataLimite) || null;
    const numero = formatarNumeroCnj((values.numero || "").trim()) || null;

    const clienteNome =
      clientes.find((c) => c.id === clienteId)?.nome ||
      nichoSel?.clienteNome ||
      "Cliente";

    const tituloComputado =
      values.assuntoPrincipal?.trim() ||
      (values.parteContraria?.trim()
        ? `${clienteNome} x ${values.parteContraria.trim()}`
        : clienteNome);

    try {
      const processoData = {
        numero,
        cliente_id: clienteId,
        cliente_nicho_id: nichoId,
        assunto: values.assunto || values.acaoClasse || "",
        assunto_principal: tituloComputado || null,
        status: values.status,
        data_inicio: dataInicio,
        data_limite: dataLimite,
        prioridade: values.prioridade,
        responsavel_a_id: respAId,
        responsavel_b_id: respBId,
        responsavel: "",
        valor_causa: parseCurrency(values.valor),
        instancia: values.foroVara || values.instancia || "1ª Instância",
        user_id: user.id,
      };

      if (mode === "add") {
        const { data, error } = await supabase
          .from("processos")
          .insert(processoData as any)
          .select("*")
          .single();
        if (error) throw error;

        const procId = (data as any).id;
        salvarMetadadoAstreaProcesso(procId, {
          processoId: procId,
          numeroCnj: numero || "",
          tituloPartes: tituloComputado,
          poloAtivo: clienteNome,
          poloPassivo: values.parteContraria || "",
          acaoClasse: values.acaoClasse || values.assunto || "Procedimento Comum Cível",
          foroVara: values.foroVara || values.instancia || "1ª Instância",
          pasta: values.pasta || nichoSel?.nicho || "",
          ultimaMovData: dataInicio,
          monitoradoRss: true,
        });
        setAstreaMetaMap(lerMetadadosAstreaProcessos());
        await fetchData();
        toast.success("Processo / Caso criado com sucesso!");
      } else if (mode === "edit" && selectedProcesso) {
        const { data: alterados, error } = await supabase
          .from("processos")
          .update({
            numero,
            cliente_id: clienteId,
            cliente_nicho_id: nichoId,
            assunto: values.assunto || values.acaoClasse || "",
            assunto_principal: tituloComputado || null,
            status: values.status,
            data_inicio: dataInicio,
            data_limite: dataLimite,
            prioridade: values.prioridade,
            responsavel_a_id: respAId,
            responsavel_b_id: respBId,
            valor_causa: parseCurrency(values.valor),
            instancia: values.foroVara || values.instancia || "1ª Instância",
          } as any)
          .eq("id", selectedProcesso.id)
          .select("id");
        if (error) throw error;
        if (!(alterados || []).length) {
          toast.error("Sem permissão para editar este processo");
          return;
        }

        salvarMetadadoAstreaProcesso(selectedProcesso.id, {
          processoId: selectedProcesso.id,
          numeroCnj: numero || "",
          tituloPartes: tituloComputado,
          poloAtivo: clienteNome,
          poloPassivo: values.parteContraria || "",
          acaoClasse: values.acaoClasse || values.assunto || "Procedimento Comum Cível",
          foroVara: values.foroVara || values.instancia || "1ª Instância",
          pasta: values.pasta || nichoSel?.nicho || "",
        });
        setAstreaMetaMap(lerMetadadosAstreaProcessos());
        await fetchData();
        toast.success("Processo atualizado com sucesso!");
      }
      rascunho.limpar();
      setIsSheetOpen(false);
      setSelectedProcesso(null);
    } catch (e: any) {
      console.error(e);
      if (e?.code === "23505") {
        toast.error("Já existe um processo com este número CNJ");
      } else {
        toast.error("Erro ao salvar processo", {
          description: e?.message || String(e),
        });
      }
    }
  };
  const onSubmit = useSubmitUnico(salvarProcesso);

  const handleAddNew = () => {
    setMode("add");
    setSelectedProcesso(null);
    setIsSheetOpen(true);
  };

  const handleEdit = (processo: Processo) => {
    setMode("edit");
    setSelectedProcesso(processo);
    setIsSheetOpen(true);
  };

  const handleView = (processo: Processo) => {
    setMode("view");
    setSelectedProcesso(processo);
    setIsSheetOpen(true);
  };

  const handleDeleteClick = (processo: Processo) => {
    setSelectedProcesso(processo);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProcesso) return;
    try {
      const { error } = await supabase
        .from("processos")
        .delete()
        .eq("id", selectedProcesso.id);
      if (error) throw error;
      setProcessos((prev) => prev.filter((p) => p.id !== selectedProcesso.id));
      toast.success("Processo excluído com sucesso.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir processo");
    }
    setIsDeleteDialogOpen(false);
    setSelectedProcesso(null);
  };

  const toggleFavorito = (p: Processo) => {
    const meta = getMetaForProcesso(p);
    salvarMetadadoAstreaProcesso(p.id, {
      ...meta,
      favorito: !meta.favorito,
    });
    setAstreaMetaMap(lerMetadadosAstreaProcessos());
  };

  const toggleMonitoramentoRss = (p: Processo) => {
    const meta = getMetaForProcesso(p);
    const novoValor = !meta.monitoradoRss;
    salvarMetadadoAstreaProcesso(p.id, {
      ...meta,
      monitoradoRss: novoValor,
    });
    setAstreaMetaMap(lerMetadadosAstreaProcessos());
    toast.success(
      novoValor
        ? "Monitoramento automático de publicações CNJ/OAB ativado para este processo"
        : "Monitoramento automático pausado para este processo"
    );
  };

  const toggleEtiquetaProcesso = (p: Processo, tagNome: string) => {
    const meta = getMetaForProcesso(p);
    const jaTem = meta.etiquetas.includes(tagNome);
    const novas = jaTem
      ? meta.etiquetas.filter((t) => t !== tagNome)
      : [...meta.etiquetas, tagNome];
    salvarMetadadoAstreaProcesso(p.id, {
      ...meta,
      etiquetas: novas,
    });
    setAstreaMetaMap(lerMetadadosAstreaProcessos());
  };

  const areas = useMemo(
    () =>
      Array.from(
        new Set([
          ...NICHOS,
          ...(processos.map((p) => p.nicho).filter(Boolean) as string[]),
        ])
      ).sort(),
    [processos]
  );

  const filteredProcessos = useMemo(() => {
    const list = processos.filter((processo) => {
      const meta = getMetaForProcesso(processo);

      // Filtro de Área
      if (areaFilter !== "todas") {
        if (areaFilter === "sem" && processo.nicho) return false;
        if (areaFilter !== "sem" && processo.nicho !== areaFilter) return false;
      }

      // Filtro Rápido (dropdown esquerdo)
      if (quickFilter === "favoritos" && !meta.favorito) return false;
      if (quickFilter === "monitorados" && !meta.monitoradoRss) return false;
      if (
        quickFilter === "sincronizados_oab" &&
        meta.origemSincronizacao !== "CNJ_COMUNICA_PJE"
      )
        return false;

      // Filtro de Status (ATIVOS / ENCERRADOS / PRECISAM DE AÇÃO / TODOS)
      if (statusFilter === "ativos" && !processoAtivo(processo.status)) {
        return false;
      }
      if (statusFilter === "encerrados" && processoAtivo(processo.status)) {
        return false;
      }
      if (
        statusFilter === "acao" &&
        !STATUS_ACAO_INTERNA.includes(processo.status as StatusProcesso)
      ) {
        return false;
      }

      // Filtro de Etiquetas
      if (selectedEtiquetas.length > 0) {
        const hasTag = selectedEtiquetas.some((tag) =>
          meta.etiquetas.includes(tag)
        );
        if (!hasTag) return false;
      }

      // Busca textual (Título, Número CNJ, Cliente, Ação, Foro)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const match =
          (processo.numero || "").toLowerCase().includes(q) ||
          (processo.cliente || "").toLowerCase().includes(q) ||
          (processo.assunto || "").toLowerCase().includes(q) ||
          (processo.assuntoPrincipal || "").toLowerCase().includes(q) ||
          meta.tituloPartes.toLowerCase().includes(q) ||
          meta.acaoClasse.toLowerCase().includes(q) ||
          meta.foroVara.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const metaA = getMetaForProcesso(a);
      const metaB = getMetaForProcesso(b);
      const dA = metaA.ultimaMovData || "";
      const dB = metaB.ultimaMovData || "";
      return sortMovAsc ? dA.localeCompare(dB) : dB.localeCompare(dA);
    });

    return list;
  }, [
    processos,
    getMetaForProcesso,
    areaFilter,
    quickFilter,
    statusFilter,
    selectedEtiquetas,
    searchTerm,
    sortMovAsc,
  ]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProcessos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProcessos.map((p) => p.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatDataMovimentacao = (isoDate: string) => {
    if (!isoDate) return "—";
    try {
      const clean = isoDate.slice(0, 10);
      return format(new Date(clean + "T00:00:00"), "dd/MM/yyyy", {
        locale: ptBR,
      });
    } catch {
      return isoDate;
    }
  };

  const getStatusBadge = (status: string) => corStatusProcesso(status);

  const renderForm = () => (
    <Form {...form}>
      <form
        id="processo-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-1 py-3"
      >
        <FormField
          control={form.control}
          name="numero"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Número do Processo (Padrão CNJ)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="0000000-00.0000.0.00.0000"
                  className="font-mono text-sm border-[#010E38]/20 focus-visible:ring-[#010E38]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cliente"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Cliente / Pasta (Nicho)*
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger className="text-sm border-[#010E38]/20">
                    <SelectValue placeholder="Selecione o cliente e a pasta/nicho" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {opcoesNicho.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Nenhum cliente cadastrado.
                    </div>
                  )}
                  {opcoesNicho.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.clienteNome} —{" "}
                      {n.nicho === "sem nicho" ? "Pasta Geral" : n.nicho}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assuntoPrincipal"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Título do Processo (Autor x Réu)
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="text-sm border-[#010E38]/20"
                  placeholder="Ex.: Admilson De Almeida Carvalho x Souza Lima Segurança Patrimonial Ltda."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="acaoClasse"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Ação / Classe Processual
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="text-sm border-[#010E38]/20"
                  placeholder="Ex.: Ação Trabalhista - Rito Ordinário"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="foroVara"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Foro / Vara / Comarca
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="text-sm border-[#010E38]/20"
                  placeholder="Ex.: Juízo Titular I - 2ª Vara Cível"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assunto"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Última Movimentação / Observações do Caso
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  className="text-sm min-h-[75px] border-[#010E38]/20"
                  placeholder="Resumo do andamento, objeto da ação ou publicação recente..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Status Interno
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="text-sm border-[#010E38]/20">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STATUS_PROCESSO.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="prioridade"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Prioridade
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="text-sm border-[#010E38]/20">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dataInicio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Data da Últ. Movimentação / Distribuição
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  className="font-mono text-sm border-[#010E38]/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="valor"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                Valor da Causa
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="font-mono text-sm border-[#010E38]/20"
                  placeholder="R$ 0,00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {role !== "parceiro" && (
          <FormField
            control={form.control}
            name="responsavel_a_id"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                  Advogado Responsável
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger className="text-sm border-[#010E38]/20">
                      <SelectValue placeholder="Selecione o advogado responsável" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {usuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                        {classificacaoLabel(u.classificacao)
                          ? ` — ${classificacaoLabel(u.classificacao)}`
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </form>
    </Form>
  );

  const renderView = () => {
    if (!selectedProcesso) return null;
    const meta = getMetaForProcesso(selectedProcesso);
    return (
      <div className="space-y-4 px-1 py-3 text-sm text-[#010E38]">
        <div className="p-4 rounded-lg bg-[#F1F4F9] border border-[#010E38]/15 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#010E38] text-[#EBB52C]">
              {processoAtivo(selectedProcesso.status)
                ? "Processo ativo"
                : "Processo encerrado"}
            </span>
            <span className="font-mono text-xs font-bold text-[#010E38]">
              Últ. Mov: {formatDataMovimentacao(meta.ultimaMovData)}
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[#010E38]">
            {meta.tituloPartes}
          </h3>
          <p className="font-mono text-xs underline text-[#010E38]/80">
            {meta.numeroCnj || "Caso consultivo (sem numeração CNJ)"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]/60">
              Cliente / Pasta
            </Label>
            <p className="text-sm font-bold text-[#010E38] mt-0.5">
              {selectedProcesso.cliente}
            </p>
            {selectedProcesso.nicho && (
              <p className="text-xs text-[#010E38]/60">
                {selectedProcesso.nicho}
              </p>
            )}
          </div>
          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]/60">
              Ação / Foro
            </Label>
            <p className="text-sm font-bold text-[#010E38] mt-0.5">
              {meta.acaoClasse}
            </p>
            <p className="text-xs text-[#010E38]/70">{meta.foroVara}</p>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]/60">
              Status Operacional Jus+
            </Label>
            <div className="mt-1">
              <Badge className={getStatusBadge(selectedProcesso.status)}>
                {selectedProcesso.status}
              </Badge>
            </div>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]/60">
              Última Publicação / Andamento Registrado
            </Label>
            <div className="mt-1 p-3 rounded bg-[#F1F4F9]/70 border border-[#010E38]/10 text-xs leading-relaxed whitespace-pre-wrap text-[#010E38]/90">
              {meta.ultimaMovTexto ||
                selectedProcesso.assunto ||
                "Nenhuma publicação detalhada registrada."}
            </div>
          </div>
          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]/60">
              Advogado Responsável
            </Label>
            <p className="text-sm font-semibold mt-0.5">
              {selectedProcesso.responsavel}
            </p>
          </div>
          <div>
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]/60">
              Valor da Causa
            </Label>
            <p className="font-mono text-sm font-bold mt-0.5">
              {selectedProcesso.valor || "R$ 0,00"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F4F9] p-4 sm:p-6 space-y-4 animate-fade-in">
      {/* HEADER ESTILO ASTREA COM IDENTIDADE JUS+ (#010E38 & #EBB52C) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[24px] font-extrabold text-[#010E38] tracking-tight">
            Processos e casos
          </h1>

          {/* Badge / Gatilho da OAB Automática do Advogado */}
          <button
            type="button"
            onClick={() => setIsOabModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-[#010E38] text-[#EBB52C] hover:bg-[#010E38]/90 transition-all shadow-sm"
            title="Configurar OAB + UF para buscar e sincronizar todos os processos do advogado automaticamente via CNJ"
          >
            <Scale className="w-3.5 h-3.5 text-[#EBB52C]" />
            {oabConfig.numeroOab ? (
              <>
                <span className="font-mono">
                  OAB/{oabConfig.ufOab} {oabConfig.numeroOab}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </>
            ) : (
              <span>Conectar OAB + Estado (Busca Automática)</span>
            )}
          </button>
        </div>

        {/* Botões de Ação Superiores Direitos (Igual ao Astrea: Print, Excel, Refresh/Sync OAB, +) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsOabModalOpen(true)}
            disabled={isSyncingOab}
            className="h-9 px-3 bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] border-[#EBB52C] font-extrabold text-[11px] uppercase tracking-wider shadow-sm"
          >
            {isSyncingOab ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            )}
            Puxar Processos pela OAB
          </Button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Imprimir lista de processos"
            className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            title="Importar ou Exportar Planilha Excel"
            className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (oabConfig.numeroOab && oabConfig.ufOab) {
                executarSincronizacaoOab(
                  oabConfig.numeroOab,
                  oabConfig.ufOab,
                  false
                );
              } else {
                fetchData();
                toast.success("Lista de processos atualizada!");
              }
            }}
            disabled={isSyncingOab}
            title={
              oabConfig.numeroOab
                ? `Sincronizar processos da OAB ${oabConfig.numeroOab}/${oabConfig.ufOab} no CNJ`
                : "Atualizar lista de processos"
            }
            className="w-9 h-9 rounded border border-[#010E38]/15 bg-white hover:bg-[#010E38]/5 flex items-center justify-center text-[#010E38]/75 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncingOab ? "animate-spin text-[#EBB52C]" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={handleAddNew}
            title="Adicionar novo processo ou caso"
            className="w-9 h-9 rounded bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] flex items-center justify-center shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS UNIFICADA ESTILO ASTREA ([▾] | Digite algo para pesquisar 🔍 | [🏷️] | [ATIVOS ▾]) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center bg-white border border-[#010E38]/15 rounded shadow-sm overflow-hidden">
        <div className="flex items-center flex-1 h-10">
          {/* Menu Dropdown Esquerdo [▾] */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 px-3 border-r border-[#010E38]/15 hover:bg-[#F1F4F9] flex items-center justify-center text-[#010E38]/70 transition-colors"
                title="Filtros rápidos e áreas"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuItem
                onClick={() => {
                  setQuickFilter("todos");
                  setAreaFilter("todas");
                }}
                className="font-semibold text-xs"
              >
                Todos os processos e casos
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQuickFilter("favoritos")}
                className="text-xs"
              >
                <Star className="w-3.5 h-3.5 mr-2 text-[#EBB52C] fill-[#EBB52C]" />
                Marcados como importantes (Estrela)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQuickFilter("monitorados")}
                className="text-xs"
              >
                <Rss className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                Com monitoramento CNJ/OAB ativo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setQuickFilter("sincronizados_oab")}
                className="text-xs"
              >
                <Scale className="w-3.5 h-3.5 mr-2 text-[#010E38]" />
                Importados automaticamente pela OAB
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#010E38]/50">
                Filtrar por Pasta / Área
              </div>
              {areas.map((a) => (
                <DropdownMenuItem
                  key={a}
                  onClick={() => setAreaFilter(a)}
                  className="text-xs"
                >
                  {a}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Campo de Pesquisa */}
          <div className="relative flex-1 h-full flex items-center">
            <input
              type="text"
              placeholder="Digite algo para pesquisar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-full pl-3.5 pr-9 text-[13px] text-[#010E38] placeholder:text-[#010E38]/40 bg-transparent focus:outline-none"
            />
            <Search className="w-4 h-4 text-[#010E38]/50 absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* Botão de Etiquetas [🏷️] + Seletor [ATIVOS ▾] */}
        <div className="flex items-center h-10 border-t md:border-t-0 border-[#010E38]/15">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`h-10 px-3.5 border-l border-[#010E38]/15 hover:bg-[#F1F4F9] flex items-center justify-center transition-colors ${
                  selectedEtiquetas.length > 0
                    ? "bg-[#EBB52C]/20 text-[#010E38]"
                    : "text-[#010E38]/65"
                }`}
                title="Filtrar por etiquetas"
              >
                <Tag className="w-4 h-4" />
                {selectedEtiquetas.length > 0 && (
                  <span className="ml-1 font-mono text-[11px] font-bold">
                    {selectedEtiquetas.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38]">
                  Etiquetas
                </span>
                <button
                  type="button"
                  onClick={() => setIsManageTagsOpen(true)}
                  className="text-[11px] font-bold text-[#010E38] underline hover:text-[#EBB52C]"
                >
                  GERENCIAR ETIQUETAS
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {etiquetasDisponiveis.map((tag) => {
                  const checked = selectedEtiquetas.includes(tag.nome);
                  return (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[#F1F4F9] cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          setSelectedEtiquetas((prev) =>
                            checked
                              ? prev.filter((t) => t !== tag.nome)
                              : [...prev, tag.nome]
                          )
                        }
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: tag.cor }}
                      />
                      <span className="font-semibold text-[#010E38] truncate">
                        {tag.nome}
                      </span>
                    </label>
                  );
                })}
              </div>
              {selectedEtiquetas.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedEtiquetas([])}
                  className="w-full h-7 text-xs"
                >
                  Limpar filtro de etiquetas
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Dropdown [ATIVOS ▾] */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 px-4 border-l border-[#010E38]/15 bg-[#F1F4F9]/60 hover:bg-[#F1F4F9] flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] transition-colors"
              >
                <span>
                  {statusFilter === "ativos" && "ATIVOS"}
                  {statusFilter === "encerrados" && "ENCERRADOS"}
                  {statusFilter === "acao" && "PRECISAM DE AÇÃO"}
                  {statusFilter === "todos" && "TODOS"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#010E38]/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setStatusFilter("ativos")}
                className="text-xs font-bold"
              >
                ATIVOS ({processos.filter((p) => processoAtivo(p.status)).length})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter("encerrados")}
                className="text-xs font-bold"
              >
                ENCERRADOS / ARQUIVADOS (
                {processos.filter((p) => !processoAtivo(p.status)).length})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter("acao")}
                className="text-xs font-bold"
              >
                PRECISAM DE AÇÃO (
                {
                  processos.filter((p) =>
                    STATUS_ACAO_INTERNA.includes(p.status as StatusProcesso)
                  ).length
                }
                )
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setStatusFilter("todos")}
                className="text-xs font-bold"
              >
                TODOS ({processos.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* LINHA DO CONTADOR E CHIPS DE FILTRO ATIVO */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 text-[13px] text-[#010E38]/80">
          <ListFilter className="w-4 h-4 text-[#010E38]/50" />
          <span>
            <strong className="font-mono font-bold text-[#010E38]">
              {filteredProcessos.length}
            </strong>{" "}
            de{" "}
            <strong className="font-mono font-bold text-[#010E38]">
              {processos.length}
            </strong>{" "}
            processos e casos
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {quickFilter !== "todos" && (
            <Badge
              variant="secondary"
              className="bg-[#010E38] text-[#EBB52C] text-[10px] font-bold uppercase cursor-pointer"
              onClick={() => setQuickFilter("todos")}
            >
              Filtro: {quickFilter} ✕
            </Badge>
          )}
          {areaFilter !== "todas" && (
            <Badge
              variant="secondary"
              className="bg-[#010E38] text-[#EBB52C] text-[10px] font-bold uppercase cursor-pointer"
              onClick={() => setAreaFilter("todas")}
            >
              Pasta: {areaFilter} ✕
            </Badge>
          )}
          {selectedEtiquetas.map((tag) => (
            <Badge
              key={tag}
              className="bg-[#EBB52C] text-[#010E38] text-[10px] font-extrabold uppercase cursor-pointer"
              onClick={() =>
                setSelectedEtiquetas((prev) => prev.filter((t) => t !== tag))
              }
            >
              {tag} ✕
            </Badge>
          ))}
        </div>
      </div>

      {/* TABELA DE PROCESSOS E CASOS IDÊNTICA AO ASTREA COM IDENTIDADE JUS+ */}
      <Card className="border border-[#010E38]/12 bg-white shadow-sm rounded-md overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#010E38]/15 bg-[#F1F4F9]/60 text-[11px] font-extrabold text-[#010E38]/70 uppercase tracking-wider">
                  <th className="py-3 pl-4 pr-2 w-[92px]">
                    <div className="flex items-center">
                      <Checkbox
                        checked={
                          filteredProcessos.length > 0 &&
                          selectedIds.length === filteredProcessos.length
                        }
                        onCheckedChange={toggleSelectAll}
                        className="border-[#010E38]/35 data-[state=checked]:bg-[#010E38] data-[state=checked]:text-[#EBB52C]"
                      />
                    </div>
                  </th>
                  <th className="py-3 px-3 min-w-[290px]">TÍTULO</th>
                  <th className="py-3 px-3 min-w-[180px]">CLIENTE / PASTA</th>
                  <th className="py-3 px-3 min-w-[210px]">AÇÃO / FORO</th>
                  <th className="py-3 pl-3 pr-4 w-[135px]">
                    <button
                      type="button"
                      onClick={() => setSortMovAsc((prev) => !prev)}
                      className="inline-flex items-center gap-1 hover:text-[#010E38] transition-colors uppercase font-extrabold"
                    >
                      <span>ÚLT. MOV</span>
                      {sortMovAsc ? (
                        <ArrowDown className="w-3.5 h-3.5 text-[#010E38]" />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5 text-[#010E38]" />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#010E38]/10 text-[13px]">
                {filteredProcessos.map((processo) => {
                  const meta = getMetaForProcesso(processo);
                  const isAtivo = processoAtivo(processo.status);
                  const isChecked = selectedIds.includes(processo.id);

                  return (
                    <tr
                      key={processo.id}
                      className={`group transition-colors hover:bg-[#F1F4F9]/65 ${
                        isChecked ? "bg-[#EBB52C]/10" : "bg-white"
                      }`}
                    >
                      {/* Coluna 1: Checkbox + Estrela + Ícone RSS Verde (Monitoramento Automático) */}
                      <td className="py-3.5 pl-4 pr-2 align-top">
                        <div className="flex items-center gap-2 pt-0.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSelectRow(processo.id)}
                            className="border-[#010E38]/30 data-[state=checked]:bg-[#010E38] data-[state=checked]:text-[#EBB52C]"
                          />
                          <button
                            type="button"
                            onClick={() => toggleFavorito(processo)}
                            title={
                              meta.favorito
                                ? "Remover destaque"
                                : "Marcar processo como importante"
                            }
                            className="text-[#010E38]/35 hover:text-[#EBB52C] transition-colors"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                meta.favorito
                                  ? "text-[#EBB52C] fill-[#EBB52C]"
                                  : ""
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleMonitoramentoRss(processo)}
                            title={
                              meta.monitoradoRss
                                ? "Monitoramento automático de publicações CNJ/OAB Ativo"
                                : "Ativar monitoramento automático CNJ/OAB"
                            }
                            className="transition-colors"
                          >
                            <Rss
                              className={`w-4 h-4 ${
                                meta.monitoradoRss
                                  ? "text-emerald-600 stroke-[2.5]"
                                  : "text-[#010E38]/25"
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Coluna 2: TÍTULO (Linha 1: Autor x Réu em negrito | Linha 2: Processo ativo | 0010509-93.2026.5.15.0047 sublinhado) */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleView(processo)}
                              className="text-left font-bold text-[13.5px] text-[#010E38] hover:text-[#010E38]/75 transition-colors leading-snug"
                            >
                              {meta.tituloPartes}
                            </button>
                            {meta.etiquetas.map((tagNome) => {
                              const tagObj = etiquetasDisponiveis.find(
                                (t) => t.nome === tagNome
                              );
                              return (
                                <span
                                  key={tagNome}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider text-white"
                                  style={{
                                    backgroundColor: tagObj?.cor || "#010E38",
                                  }}
                                >
                                  {tagNome}
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#010E38]/60">
                            <span>
                              {isAtivo ? "Processo ativo" : "Processo arquivado"}
                            </span>
                            {meta.numeroCnj && (
                              <>
                                <span>|</span>
                                <button
                                  type="button"
                                  onClick={() => handleView(processo)}
                                  className="font-mono text-[12px] underline text-[#010E38]/70 hover:text-[#010E38] transition-colors"
                                >
                                  {meta.numeroCnj}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Coluna 3: CLIENTE / PASTA */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-medium text-[#010E38] leading-snug">
                            {processo.cliente !== "—"
                              ? processo.cliente
                              : meta.poloAtivo || "—"}
                          </p>
                          {(meta.pasta || processo.nicho) && (
                            <p className="text-[11.5px] text-[#010E38]/55 truncate max-w-[220px]">
                              {(meta.pasta || processo.nicho || "").replace(
                                "DIREITO ",
                                ""
                              )}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Coluna 4: AÇÃO / FORO */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-medium text-[#010E38]/90 leading-snug">
                            {meta.acaoClasse}
                          </p>
                          <p className="text-[12px] text-[#010E38]/55 truncate max-w-[260px]">
                            {meta.foroVara}
                          </p>
                        </div>
                      </td>

                      {/* Coluna 5: ÚLT. MOV + Menu de Ações */}
                      <td className="py-3.5 pl-3 pr-4 align-top">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12.5px] font-bold text-[#010E38]/85">
                            {formatDataMovimentacao(meta.ultimaMovData)}
                          </span>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-[#010E38]/10 text-[#010E38]/70 transition-opacity"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleView(processo)}
                                className="text-xs font-semibold"
                              >
                                <Eye className="w-3.5 h-3.5 mr-2" />
                                Abrir ficha do processo
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(processo)}
                                className="text-xs font-semibold"
                              >
                                <Edit className="w-3.5 h-3.5 mr-2" />
                                Editar processo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <div className="px-2 py-1 text-[10px] font-extrabold uppercase text-[#010E38]/50">
                                Etiquetar rápido
                              </div>
                              {etiquetasDisponiveis.slice(0, 4).map((tag) => (
                                <DropdownMenuItem
                                  key={tag.id}
                                  onClick={() =>
                                    toggleEtiquetaProcesso(processo, tag.nome)
                                  }
                                  className="text-xs"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full mr-2"
                                    style={{ backgroundColor: tag.cor }}
                                  />
                                  {tag.nome}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(processo)}
                                className="text-xs text-red-600 focus:text-red-600 font-semibold"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Excluir processo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProcessos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-14 text-center">
                      <div className="max-w-md mx-auto space-y-3 px-4">
                        <div className="w-12 h-12 rounded-full bg-[#010E38]/10 text-[#010E38] flex items-center justify-center mx-auto">
                          <Scale className="w-6 h-6" />
                        </div>
                        <p className="text-base font-extrabold text-[#010E38]">
                          Nenhum processo encontrado para os filtros atuais
                        </p>
                        <p className="text-xs text-[#010E38]/65">
                          Cadastre sua OAB e Estado (UF) para puxar todos os seus
                          processos automaticamente da base nacional do CNJ ou
                          adicione um novo processo manualmente.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Button
                            type="button"
                            onClick={() => setIsOabModalOpen(true)}
                            className="bg-[#EBB52C] hover:bg-[#EBB52C]/90 text-[#010E38] font-extrabold text-xs uppercase tracking-wider"
                          >
                            <Sparkles className="w-4 h-4 mr-1.5" />
                            Puxar Processos pela OAB
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddNew}
                            className="border-[#010E38]/20 text-[#010E38] font-bold text-xs"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Adicionar Manualmente
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL NATIVO DE BUSCA E SINCRONIZAÇÃO AUTOMÁTICA POR OAB + ESTADO (UF) */}
      <Dialog open={isOabModalOpen} onOpenChange={setIsOabModalOpen}>
        <DialogContent className="sm:max-w-[540px] border-[#010E38]/20 bg-white text-[#010E38]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-[#010E38] text-[#EBB52C] flex items-center justify-center shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-[#010E38]">
                  Busca Automática de Processos por OAB + UF
                </DialogTitle>
                <DialogDescription className="text-xs text-[#010E38]/70">
                  Integração Nativa com a Base Nacional do CNJ (Comunica PJe / DJEN
                  & DataJud)
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-lg bg-[#F1F4F9] border border-[#010E38]/15 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-[#010E38]">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Como funciona a sincronização nativa Jus+ por OAB?</span>
              </div>
              <p className="text-[#010E38]/80 leading-relaxed">
                Ao informar o seu <strong>Número da OAB</strong> e{" "}
                <strong>Estado (UF)</strong>, o Jus+ consulta diretamente a API
                oficial do <strong>CNJ (Comunica PJe / DJEN)</strong> em todos os
                tribunais brasileiros (TJ, TRT, TRF, STJ), identifica os seus
                processos, extrai <strong>Autor x Réu</strong>,{" "}
                <strong>Ação/Classe</strong>, <strong>Vara/Foro</strong> e{" "}
                <strong>Última Movimentação</strong> e já cadastra os clientes e
                processos automaticamente na sua carteira.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                  Número da OAB*
                </Label>
                <Input
                  placeholder="Ex.: 123456 (apenas números)"
                  value={oabConfig.numeroOab}
                  onChange={(e) =>
                    setOabConfig((prev) => ({
                      ...prev,
                      numeroOab: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="font-mono text-sm font-bold border-[#010E38]/25"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-[#010E38]">
                  Estado (UF)*
                </Label>
                <Select
                  value={oabConfig.ufOab}
                  onValueChange={(uf) =>
                    setOabConfig((prev) => ({ ...prev, ufOab: uf }))
                  }
                >
                  <SelectTrigger className="font-mono text-sm font-bold border-[#010E38]/25">
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS_BRASIL.map((uf) => (
                      <SelectItem key={uf} value={uf} className="font-mono">
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-[#010E38]/15 bg-[#F1F4F9]/50">
              <div className="space-y-0.5 pr-3">
                <p className="text-xs font-extrabold text-[#010E38]">
                  Sincronização Automática ao Entrar no Sistema
                </p>
                <p className="text-[11px] text-[#010E38]/65">
                  Vincular esta OAB ao meu cadastro de advogado e buscar novos
                  processos e movimentações automaticamente.
                </p>
              </div>
              <Switch
                checked={oabConfig.autoSync}
                onCheckedChange={(checked) =>
                  setOabConfig((prev) => ({ ...prev, autoSync: checked }))
                }
              />
            </div>

            {oabConfig.ultimaSincronizacao && (
              <div className="flex items-center justify-between text-[11px] text-[#010E38]/70 px-1">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Última sincronização:{" "}
                  <strong className="font-mono">
                    {new Date(oabConfig.ultimaSincronizacao).toLocaleString(
                      "pt-BR"
                    )}
                  </strong>
                </span>
                {oabConfig.totalProcessosSincronizados != null && (
                  <span className="font-mono font-bold">
                    {oabConfig.totalProcessosSincronizados} processo(s) no CNJ
                  </span>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOabModalOpen(false)}
              className="border-[#010E38]/20 text-[#010E38]"
            >
              Fechar
            </Button>
            <Button
              type="button"
              disabled={isSyncingOab || !oabConfig.numeroOab}
              onClick={() =>
                executarSincronizacaoOab(
                  oabConfig.numeroOab,
                  oabConfig.ufOab,
                  false
                )
              }
              className="bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] font-extrabold uppercase tracking-wider text-xs"
            >
              {isSyncingOab ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Consultando CNJ e Importando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-[#EBB52C]" />
                  Salvar OAB e Puxar Processos Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL GERENCIAR ETIQUETAS */}
      <Dialog open={isManageTagsOpen} onOpenChange={setIsManageTagsOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#010E38]">
              Gerenciar Etiquetas de Processos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da nova etiqueta..."
                value={novaTagNome}
                onChange={(e) => setNovaTagNome(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!novaTagNome.trim()) return;
                  criarEtiqueta(novaTagNome.trim(), novaTagCor);
                  setEtiquetasDisponiveis(lerEtiquetas());
                  setNovaTagNome("");
                }}
                className="bg-[#010E38] text-[#EBB52C] font-bold text-xs shrink-0"
              >
                Criar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CORES_ETIQUETAS.map((corItem) => { const hex = typeof corItem === 'string' ? corItem : (corItem as any).hex; return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setNovaTagCor(hex)}
                  className={`w-5 h-5 rounded-full border-2 ${
                    novaTagCor === hex
                      ? "border-[#010E38] scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ); })}
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-[#010E38]/10">
              {etiquetasDisponiveis.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between py-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.cor }}
                    />
                    <span className="font-bold text-[#010E38]">{tag.nome}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      excluirEtiqueta(tag.id);
                      setEtiquetasDisponiveis(lerEtiquetas());
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL / SHEET DE CRIAR, EDITAR OU VISUALIZAR PROCESSO */}
      {isDesktop ? (
        <Dialog open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <DialogContent
            className="sm:max-w-[640px]"
            onInteractOutside={(e) => mode !== "view" && e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-[#010E38]">
                {mode === "add" && "Adicionar Processo ou Caso"}
                {mode === "edit" && "Editar Processo ou Caso"}
                {mode === "view" && "Ficha do Processo"}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[68vh] overflow-y-auto">
              {mode === "view" ? renderView() : renderForm()}
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSheetOpen(false)}
                className="border-[#010E38]/20 text-[#010E38]"
              >
                Fechar
              </Button>
              {mode === "view" && selectedProcesso && (
                <Button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="bg-[#010E38] text-[#EBB52C] font-extrabold text-xs uppercase"
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Editar Processo
                </Button>
              )}
              {mode !== "view" && (
                <Button
                  type="submit"
                  form="processo-form"
                  className="bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] font-extrabold uppercase tracking-wider text-xs"
                >
                  Salvar Processo
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent
            side="bottom"
            className="h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => mode !== "view" && e.preventDefault()}
          >
            <SheetHeader>
              <SheetTitle className="text-lg font-extrabold text-[#010E38]">
                {mode === "add" && "Adicionar Processo ou Caso"}
                {mode === "edit" && "Editar Processo ou Caso"}
                {mode === "view" && "Ficha do Processo"}
              </SheetTitle>
              <SheetDescription className="text-xs">
                Gerencie os dados do processo judicial ou caso consultivo.
              </SheetDescription>
            </SheetHeader>
            <div className="py-2">
              {mode === "view" ? renderView() : renderForm()}
            </div>
            <SheetFooter className="gap-2">
              <SheetClose asChild>
                <Button variant="outline">Fechar</Button>
              </SheetClose>
              {mode !== "view" && (
                <Button
                  type="submit"
                  form="processo-form"
                  className="bg-[#010E38] text-[#EBB52C] font-extrabold"
                >
                  Salvar Processo
                </Button>
              )}
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-extrabold text-[#010E38]">
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir este processo? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        table="processos"
        onSuccess={fetchData}
      />
    </div>
  );
};

export default Processos;
