/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import { useToast } from "@/components/ui/use-toast";
import {
  Search,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  MoreVertical,
  FileSpreadsheet,
  FolderOpen,
  Scale,
  ChevronDown,
  ListPlus,
  Tag,
  RotateCw,
  User as UserIcon,
  Building2,
  X,
} from "lucide-react";
import { MiniDrive } from "@/components/documentos/MiniDrive";
import { ImportExportModal } from "@/components/planilhas/ImportExportModal";
import {
  NICHOS,
  abrirNichoCliente,
  formatarDocumento,
  nomeUsuario,
  soDigitos,
  useUsuarios,
} from "@/lib/nichos";
import { ClienteNichos } from "@/components/clientes/ClienteNichos";
import { ClienteAnotacoesSheet } from "@/components/clientes/ClienteAnotacoes";
import { PropostaHonorariosDialog } from "@/components/financeiro/PropostaHonorariosDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useEtiquetasKanban } from "@/lib/etiquetas";
import {
  ContatoAstreaForm,
  extrairDadosAstreaDeCliente,
  type DadosAstreaPF,
} from "@/components/clientes/ContatoAstreaForm";
import { ContatoAstreaDetalhe } from "@/components/clientes/ContatoAstreaDetalhe";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

type DbCliente = Tables<"clientes">;

const STORAGE_TAGS_CLIENTES = "jusmais_clientes_tags_v1";

const Clientes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [letraSelecionada, setLetraSelecionada] = useState<string>("TODOS");
  const [ordenacaoAsc, setOrdenacaoAsc] = useState(true);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [filtroTipoPessoa, setFiltroTipoPessoa] = useState<
    "todos" | "pf" | "pj"
  >("todos");

  const [clientes, setClientes] = useState<DbCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [cpfPrePreenchido, setCpfPrePreenchido] = useState("");
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<DbCliente | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<string | null>(null);
  const [viewingCliente, setViewingCliente] = useState<DbCliente | null>(null);
  const usuarios = useUsuarios();
  const [nichosPorCliente, setNichosPorCliente] = useState<
    Record<
      string,
      { nicho: string; principal: string | null; secundarios: string[] }[]
    >
  >({});
  const [filtroNicho, setFiltroNicho] = useState("todos");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");

  // Etiquetas personalizadas por cliente
  const { etiquetas: catalogoEtiquetas, obterCorEtiqueta } =
    useEtiquetasKanban();
  const [tagsPorCliente, setTagsPorCliente] = useState<
    Record<string, string[]>
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_TAGS_CLIENTES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [filtroEtiquetaCustom, setFiltroEtiquetaCustom] = useState<
    string | null
  >(null);
  const [buscaTagPopover, setBuscaTagPopover] = useState("");

  const [propostaPreset, setPropostaPreset] = useState<{
    clienteId: string;
    nichoId: string | null;
  } | null>(null);
  const [anotacoesCliente, setAnotacoesCliente] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [novoNicho, setNovoNicho] = useState({
    nicho: "",
    principal: "",
    secundarios: [] as string[],
  });
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { role, user } = useAuth();

  const salvarTagsPorCliente = (novoMapa: Record<string, string[]>) => {
    setTagsPorCliente(novoMapa);
    try {
      localStorage.setItem(STORAGE_TAGS_CLIENTES, JSON.stringify(novoMapa));
    } catch {
      /* ignore */
    }
  };

  const adicionarTagAoCliente = (clienteId: string, tagNome: string) => {
    const atuais = tagsPorCliente[clienteId] || [];
    if (atuais.includes(tagNome)) return;
    salvarTagsPorCliente({
      ...tagsPorCliente,
      [clienteId]: [...atuais, tagNome],
    });
  };

  const removerTagDoCliente = (clienteId: string, tagNome: string) => {
    const atuais = tagsPorCliente[clienteId] || [];
    salvarTagsPorCliente({
      ...tagsPorCliente,
      [clienteId]: atuais.filter((t) => t !== tagNome),
    });
  };

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: nichos }] = await Promise.all([
        supabase
          .from("clientes")
          .select("*")
          .order("nome", { ascending: true }),
        supabase
          .from("cliente_nichos" as never)
          .select(
            "cliente_id, nicho, responsavel_principal_id, responsaveis_secundarios"
          ),
      ]);
      if (error) {
        toast({
          title: "Erro ao carregar contatos",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      const mapa: Record<
        string,
        { nicho: string; principal: string | null; secundarios: string[] }[]
      > = {};
      ((nichos as any[]) || []).forEach((n) => {
        (mapa[n.cliente_id] ||= []).push({
          nicho: n.nicho,
          principal: n.responsavel_principal_id,
          secundarios: n.responsaveis_secundarios || [],
        });
      });
      setNichosPorCliente(mapa);
      const lista = data ?? [];
      setClientes(lista);
      setViewingCliente((atual) =>
        atual ? lista.find((c) => c.id === atual.id) || atual : null
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user]);

  const handleOpenNovoContato = () => {
    setEditingCliente(null);
    setCpfPrePreenchido("");
    setNovoNicho({ nicho: "", principal: user?.id || "", secundarios: [] });
    setIsFormOpen(true);
  };

  const handleOpenEditContato = (cliente: DbCliente) => {
    setEditingCliente(cliente);
    setCpfPrePreenchido((cliente as any).cpf || "");
    setIsFormOpen(true);
  };

  const handleSalvarContatoAstrea = async (dados: DadosAstreaPF) => {
    const isPJ = dados.tipoPessoa === "pj";
    if (!dados.nome.trim()) {
      toast({
        title: isPJ ? "Empresa obrigatória" : "Nome obrigatório",
        description: isPJ
          ? "Preencha o campo Empresa* do contato."
          : "Preencha o campo Nome* do contato.",
        variant: "destructive",
      });
      return;
    }

    setSalvandoContato(true);
    try {
      const primeiroTel =
        dados.telefones.find((t) => t.numero.trim())?.numero.trim() || null;
      const primeiroEmail =
        dados.emails.find((e) => e.endereco.trim())?.endereco.trim() || null;
      const endPrincipal = dados.enderecos[0] || {
        rua: "",
        numero: "",
        bairro: "",
        complemento: "",
        cidade: "",
        estado: "",
      };

      const dataNascimentoFormatada =
        !isPJ && dados.nascAno && dados.nascMes && dados.nascDia
          ? `${dados.nascAno}-${dados.nascMes}-${dados.nascDia}`
          : null;

      const docPrincipal = isPJ
        ? (dados.cnpj || dados.cpf || "").trim() || null
        : (dados.cpf || "").trim() || null;

      // Guarda todos os campos das 3 abas do Astrea em contatos_complementares (JSONB)
      const metaAstrea = [
        {
          __astrea_meta: true,
          ...dados,
        },
      ];

      if (editingCliente) {
        const payload: any = {
          nome: dados.nome.trim(),
          email: primeiroEmail,
          telefone: primeiroTel,
          endereco: endPrincipal.rua || null,
          logradouro: endPrincipal.rua || null,
          numero: endPrincipal.numero || null,
          bairro: endPrincipal.bairro || null,
          referencia: endPrincipal.complemento || null,
          cidade: endPrincipal.cidade || null,
          uf: endPrincipal.estado || null,
          data_nascimento: dataNascimentoFormatada,
          estado_civil: isPJ ? null : dados.estadoCivil || null,
          rg: isPJ ? dados.inscricaoEstadual || null : dados.rg || null,
          cpf: docPrincipal,
          cnh: isPJ ? dados.inscricaoMunicipal || null : dados.cnh || null,
          nome_mae: isPJ ? null : dados.nomeMae || null,
          nome_pai: isPJ ? null : dados.nomePai || null,
          chave_pix: dados.pix || null,
          instituicao_financeira: dados.banco || null,
          contatos_complementares: metaAstrea,
        };

        const { data: alterados, error } = await supabase
          .from("clientes")
          .update(payload)
          .eq("id", editingCliente.id)
          .select("id");

        if (!error && !(alterados || []).length) {
          toast({
            title: "Sem permissão para editar este contato",
            description: "Você pode consultar o cadastro, mas não alterá-lo.",
            variant: "destructive",
          });
          return;
        }
        if (error) {
          toast({
            title: "Erro ao atualizar contato",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        salvarTagsPorCliente({
          ...tagsPorCliente,
          [editingCliente.id]: dados.etiquetas,
        });

        toast({
          title: "Sucesso!",
          description: "Contato atualizado com sucesso.",
        });
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) {
          toast({
            title: "Não autenticado",
            description: "Faça login para cadastrar contatos.",
            variant: "destructive",
          });
          return;
        }

        const payload: any = {
          user_id: userId,
          nome: dados.nome.trim(),
          email: primeiroEmail,
          telefone: primeiroTel,
          endereco: endPrincipal.rua || null,
          logradouro: endPrincipal.rua || null,
          numero: endPrincipal.numero || null,
          bairro: endPrincipal.bairro || null,
          referencia: endPrincipal.complemento || null,
          cidade: endPrincipal.cidade || null,
          uf: endPrincipal.estado || null,
          data_nascimento: dataNascimentoFormatada,
          estado_civil: isPJ ? null : dados.estadoCivil || null,
          rg: isPJ ? dados.inscricaoEstadual || null : dados.rg || null,
          cpf: docPrincipal,
          cnh: isPJ ? dados.inscricaoMunicipal || null : dados.cnh || null,
          nome_mae: isPJ ? null : dados.nomeMae || null,
          nome_pai: isPJ ? null : dados.nomePai || null,
          responsavel_id: novoNicho.principal || userId,
          chave_pix: dados.pix || null,
          instituicao_financeira: dados.banco || null,
          contatos_complementares: metaAstrea,
          nicho: novoNicho.nicho || null,
        };

        const { data: newCliente, error } = await supabase
          .from("clientes")
          .insert(payload)
          .select()
          .single();

        if (error) {
          toast({
            title: "Erro ao salvar contato",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        if (newCliente) {
          salvarTagsPorCliente({
            ...tagsPorCliente,
            [newCliente.id]: dados.etiquetas,
          });

          if (novoNicho.nicho) {
            try {
              const nichoCriado = await abrirNichoCliente({
                cliente: newCliente,
                nicho: novoNicho.nicho,
                principalId: novoNicho.principal || userId,
                secundarios: novoNicho.secundarios,
                userId,
              });
              setPropostaPreset({
                clienteId: newCliente.id,
                nichoId: nichoCriado,
              });
            } catch (e: any) {
              toast({
                title: "Contato salvo, mas o nicho não foi aberto",
                description: e.message,
                variant: "destructive",
              });
            }
          }
        }

        toast({
          title: "Contato salvo!",
          description: "O contato foi cadastrado com sucesso.",
        });
      }

      setIsFormOpen(false);
      setEditingCliente(null);
      await fetchClientes();
    } finally {
      setSalvandoContato(false);
    }
  };

  const handleDeleteCliente = async (id: string) => {
    const { data: removidos, error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)
      .select("id");
    if (!error && (removidos || []).length === 0) {
      toast({
        title: "Exclusão não permitida",
        description:
          'Este contato possui nichos de outros responsáveis. Abra "Visualizar" e remova apenas o seu nicho.',
        variant: "destructive",
      });
      setClienteToDelete(null);
      return;
    }
    if (error) {
      toast({
        title: "Erro ao excluir contato",
        description: `Não foi possível excluir: ${error.message}`,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Contato excluído com sucesso",
      description:
        "O contato e todos os dados relacionados foram removidos.",
      variant: "default",
    });
    if (viewingCliente?.id === id) {
      setViewingCliente(null);
    }
    await fetchClientes();
    setClienteToDelete(null);
  };

  const termo = searchTerm.trim().toLowerCase();
  const termoDigitos = soDigitos(searchTerm);

  const filteredClientes = useMemo(() => {
    const filtrados = clientes.filter((cliente) => {
      const nichos = nichosPorCliente[cliente.id] || [];
      const meta = extrairDadosAstreaDeCliente(
        cliente,
        tagsPorCliente[cliente.id] || []
      );
      const customTags = Array.from(
        new Set([...(tagsPorCliente[cliente.id] || []), ...(meta.etiquetas || [])])
      );
      const docDigits = soDigitos((cliente as any).cpf || "");
      const ehPJ = meta.tipoPessoa === "pj" || docDigits.length === 14;

      const matchBusca =
        !termo ||
        (cliente.nome || "").toLowerCase().includes(termo) ||
        (meta.apelido || "").toLowerCase().includes(termo) ||
        (cliente.email || "").toLowerCase().includes(termo) ||
        (cliente.telefone || "").toLowerCase().includes(termo) ||
        (!!termoDigitos && docDigits.includes(termoDigitos));

      const nomeLimpo = (cliente.nome || "")
        .trim()
        .replace(/^[^a-zA-ZÀ-ÿ]+/, "")
        .toUpperCase();
      const matchLetra =
        letraSelecionada === "TODOS" ||
        nomeLimpo.startsWith(letraSelecionada);

      const matchTipoPessoa =
        filtroTipoPessoa === "todos" ||
        (filtroTipoPessoa === "pj" ? ehPJ : !ehPJ);

      const matchNicho =
        filtroNicho === "todos" ||
        (filtroNicho === "sem"
          ? nichos.length === 0
          : nichos.some((n) => n.nicho === filtroNicho));

      const matchResp =
        filtroResponsavel === "todos" ||
        nichos.some(
          (n) =>
            n.principal === filtroResponsavel ||
            n.secundarios.includes(filtroResponsavel)
        );

      const matchTagCustom =
        !filtroEtiquetaCustom || customTags.includes(filtroEtiquetaCustom);

      return (
        matchBusca &&
        matchLetra &&
        matchTipoPessoa &&
        matchNicho &&
        matchResp &&
        matchTagCustom
      );
    });

    return filtrados.slice().sort((a, b) => {
      const cmp = (a.nome || "").localeCompare(b.nome || "", "pt-BR", {
        sensitivity: "base",
      });
      return ordenacaoAsc ? cmp : -cmp;
    });
  }, [
    clientes,
    nichosPorCliente,
    tagsPorCliente,
    termo,
    termoDigitos,
    letraSelecionada,
    filtroTipoPessoa,
    filtroNicho,
    filtroResponsavel,
    filtroEtiquetaCustom,
    ordenacaoAsc,
  ]);

  const todosSelecionados =
    filteredClientes.length > 0 &&
    filteredClientes.every((c) => selecionados.includes(c.id));

  const toggleSelecionarTodos = () => {
    if (todosSelecionados) {
      setSelecionados([]);
    } else {
      setSelecionados(filteredClientes.map((c) => c.id));
    }
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const corNichoPill = (nichoNome: string) => {
    const limpo = nichoNome.replace("DIREITO ", "").toUpperCase();
    if (limpo.includes("TRABALH")) return "bg-[#F4511E] text-white";
    if (limpo.includes("PREVIDENC")) return "bg-[#010E38] text-[#EBB52C]";
    if (limpo.includes("CÍVEL") || limpo.includes("CIVEL"))
      return "bg-[#1E88E5] text-white";
    if (limpo.includes("TRIBUT")) return "bg-[#00A859] text-white";
    if (limpo.includes("FAMÍLIA") || limpo.includes("FAMILIA"))
      return "bg-[#7B1FA2] text-white";
    return "bg-[#EBB52C] text-[#010E38]";
  };

  const renderEtiquetasENichos = (cliente: DbCliente) => {
    const nichos = nichosPorCliente[cliente.id] || [];
    const meta = extrairDadosAstreaDeCliente(
      cliente,
      tagsPorCliente[cliente.id] || []
    );
    const customTags = Array.from(
      new Set([...(tagsPorCliente[cliente.id] || []), ...(meta.etiquetas || [])])
    );

    return (
      <div className="flex flex-wrap items-center gap-1">
        {nichos.map((n) => {
          const labelCurto = n.nicho.replace("DIREITO ", "");
          return (
            <span
              key={n.nicho}
              title={`Responsável: ${
                nomeUsuario(usuarios, n.principal) || "—"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setFiltroNicho(filtroNicho === n.nicho ? "todos" : n.nicho);
              }}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-extrabold uppercase tracking-wide cursor-pointer",
                corNichoPill(n.nicho)
              )}
            >
              {labelCurto}
              <span className="opacity-75 text-[9px]">×</span>
            </span>
          );
        })}

        {customTags.map((tag) => (
          <span
            key={tag}
            onClick={(e) => {
              e.stopPropagation();
              removerTagDoCliente(cliente.id, tag);
            }}
            style={{ backgroundColor: obterCorEtiqueta(tag) }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-extrabold uppercase tracking-wide text-white cursor-pointer"
            title="Clique para remover etiqueta deste contato"
          >
            {tag}
            <span className="opacity-80 text-[9px]">×</span>
          </span>
        ))}
      </div>
    );
  };

  const vc: any = viewingCliente;
  const metaVc = useMemo(
    () =>
      vc
        ? extrairDadosAstreaDeCliente(vc, tagsPorCliente[vc.id] || [])
        : null,
    [vc, tagsPorCliente]
  );

  const viewContent = vc && metaVc && (
    <div className="space-y-6 py-4 text-sm">
      {/* Bloco 1: Informações Pessoais */}
      <div>
        <h4 className="font-bold text-[#010E38] dark:text-[#EBB52C] border-b pb-1 mb-2">
          Informações Pessoais ({metaVc.tipoPessoa === "pj" ? "Pessoa jurídica" : "Pessoa física"})
        </h4>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <p className="text-muted-foreground">
              {metaVc.tipoPessoa === "pj" ? "Empresa" : "Nome"}
            </p>
            <p className="font-semibold">{vc.nome}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {metaVc.tipoPessoa === "pj" ? "Perfil / Nome fantasia" : "Perfil / Apelido"}
            </p>
            <p className="font-medium">
              {metaVc.perfil}
              {metaVc.tipoPessoa === "pj"
                ? metaVc.nomeFantasia
                  ? ` · ${metaVc.nomeFantasia}`
                  : ""
                : metaVc.apelido
                ? ` · ${metaVc.apelido}`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Telefones</p>
            <p className="font-data font-medium">
              {metaVc.telefones
                .filter((t) => t.numero)
                .map(
                  (t) =>
                    `${t.numero}${t.tipo ? ` (${t.tipo})` : ""}${
                      t.operadora ? ` · ${t.operadora}` : ""
                    }`
                )
                .join(", ") ||
                vc.telefone ||
                "-"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Emails</p>
            <p className="font-medium truncate">
              {metaVc.emails
                .filter((e) => e.endereco)
                .map((e) => e.endereco)
                .join(", ") ||
                vc.email ||
                "-"}
            </p>
          </div>
          {metaVc.sites.some((s) => s.url) && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Sites</p>
              <p className="font-medium">
                {metaVc.sites
                  .filter((s) => s.url)
                  .map((s) => s.url)
                  .join(", ")}
              </p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-muted-foreground">Endereço</p>
            <p className="font-medium">
              {[
                vc.logradouro,
                vc.numero,
                vc.bairro,
                vc.referencia,
                vc.cidade && `${vc.cidade}/${vc.uf}`,
              ]
                .filter(Boolean)
                .join(", ") || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Bloco 2: Informações Complementares + Conta Bancária */}
      <div>
        <h4 className="font-bold text-[#010E38] dark:text-[#EBB52C] border-b pb-1 mb-2">
          Informações Complementares & Conta Bancária
        </h4>
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          {metaVc.tipoPessoa === "pj" ? (
            <>
              <div>
                <p className="text-muted-foreground">Contato</p>
                <p className="font-medium">{metaVc.contatoPJ || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cargo</p>
                <p className="font-medium">{metaVc.cargoPJ || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Código</p>
                <p className="font-data font-medium">{metaVc.codigo || "-"}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-muted-foreground">Nascimento</p>
                <p className="font-medium">
                  {vc.data_nascimento
                    ? new Date(vc.data_nascimento).toLocaleDateString("pt-BR", {
                        timeZone: "UTC",
                      })
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado Civil</p>
                <p className="font-medium">{vc.estado_civil || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Empresa / Profissão</p>
                <p className="font-medium">
                  {[metaVc.empresa, metaVc.profissao].filter(Boolean).join(" · ") ||
                    "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Naturalidade / Nacionalidade</p>
                <p className="font-medium">
                  {[metaVc.naturalidade, metaVc.nacionalidade]
                    .filter(Boolean)
                    .join(" · ") || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Filiação (Pai / Mãe)</p>
                <p className="font-medium">
                  {[vc.nome_pai, vc.nome_mae].filter(Boolean).join(" / ") || "-"}
                </p>
              </div>
            </>
          )}
          <div>
            <p className="text-muted-foreground">Banco / Agência / Conta</p>
            <p className="font-medium">
              {[
                metaVc.banco || vc.instituicao_financeira,
                metaVc.agencia && `Ag: ${metaVc.agencia}`,
                metaVc.conta && `Cc: ${metaVc.conta}`,
              ]
                .filter(Boolean)
                .join(" · ") || "-"}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Chave PIX</p>
            <p className="font-data font-medium">{vc.chave_pix || "-"}</p>
          </div>
          {metaVc.comentarios && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Comentários</p>
              <p className="font-medium whitespace-pre-wrap">
                {metaVc.comentarios}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bloco 3: Documentação */}
      <div>
        <h4 className="font-bold text-[#010E38] dark:text-[#EBB52C] border-b pb-1 mb-2">
          Documentação
        </h4>
        {metaVc.tipoPessoa === "pj" ? (
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <p className="text-muted-foreground">CNPJ</p>
              <p className="font-data font-bold">
                {formatarDocumento(metaVc.cnpj || vc.cpf) || "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Inscrição Estadual</p>
              <p className="font-data font-medium">
                {metaVc.inscricaoEstadual || vc.rg || "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Inscrição Municipal</p>
              <p className="font-data font-medium">
                {metaVc.inscricaoMunicipal || vc.cnh || "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Optante Simples Nacional</p>
              <p className="font-medium">
                {metaVc.optanteSimplesNacional === "sim" ? "Sim" : "Não"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <p className="text-muted-foreground">CPF</p>
              <p className="font-data font-bold">
                {formatarDocumento(vc.cpf) || "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">RG</p>
              <p className="font-medium">{vc.rg || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CTPS</p>
              <p className="font-medium">{metaVc.ctps || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PIS</p>
              <p className="font-data font-medium">{metaVc.pis || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Título de Eleitor</p>
              <p className="font-medium">{metaVc.tituloEleitor || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CNH</p>
              <p className="font-medium">{vc.cnh || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Passaporte</p>
              <p className="font-medium">{metaVc.passaporte || "-"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Certidão Reservista</p>
              <p className="font-medium">{metaVc.certidaoReservista || "-"}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 text-xs"
          onClick={() => setAnotacoesCliente({ id: vc.id, nome: vc.nome })}
        >
          <ListPlus className="w-4 h-4 mr-2" /> Anotações e questionário inicial
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-xs"
          onClick={() => {
            setViewingCliente(null);
            handleOpenEditContato(vc);
          }}
        >
          <Edit className="w-4 h-4 mr-1.5" /> Editar contato
        </Button>
      </div>

      {/* Nichos do cliente */}
      <div>
        <h4 className="font-bold text-[#010E38] dark:text-[#EBB52C] border-b pb-1 mb-2 flex items-center gap-2">
          <Scale className="h-4 w-4" /> Nichos e Responsáveis
        </h4>
        <ClienteNichos
          cliente={vc}
          usuarios={usuarios}
          onChange={fetchClientes}
        />
      </div>

      {/* Mini Drive (Arquivos) */}
      <div>
        <h4 className="font-bold text-[#010E38] dark:text-[#EBB52C] border-b pb-1 mb-2 flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Arquivos do Cliente
        </h4>
        <MiniDrive clienteId={vc.id} />
      </div>
    </div>
  );

  const etiquetasCatalogoFiltradas = useMemo(() => {
    const q = buscaTagPopover.trim().toLowerCase();
    if (!q) return catalogoEtiquetas;
    return catalogoEtiquetas.filter((e) => e.nome.toLowerCase().includes(q));
  }, [catalogoEtiquetas, buscaTagPopover]);

  // =========================================================================
  // TELA "ADICIONAR CONTATO / EDITAR CONTATO" IGUAL AOS 3 PRINTS DO ASTREA
  // =========================================================================
  if (isFormOpen) {
    return (
      <div className="p-4 sm:p-8 bg-white dark:bg-[#010E38] min-h-[calc(100vh-60px)]">
        <ContatoAstreaForm
          editingCliente={editingCliente}
          etiquetasIniciais={
            editingCliente ? tagsPorCliente[editingCliente.id] || [] : []
          }
          cpfInicial={cpfPrePreenchido}
          usuarios={usuarios}
          novoNicho={novoNicho}
          setNovoNicho={setNovoNicho}
          onRefreshClientes={fetchClientes}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingCliente(null);
          }}
          onSave={handleSalvarContatoAstrea}
          salvando={salvandoContato}
        />
      </div>
    );
  }

  // =========================================================================
  // TELA INTERNA DO CLIENTE (5 ABAS DO ASTREA: Cadastro, Documentos, Atendimentos, Processos, Notificações)
  // =========================================================================
  if (viewingCliente) {
    return (
      <>
        <ContatoAstreaDetalhe
          cliente={viewingCliente}
          etiquetas={tagsPorCliente[viewingCliente.id] || []}
          usuarios={usuarios}
          onVoltar={() => setViewingCliente(null)}
          onEdit={(cli) => handleOpenEditContato(cli)}
          onDelete={(cliId) => setClienteToDelete(cliId)}
          onRefresh={fetchClientes}
          onGerarProposta={(cliId) =>
            setPropostaPreset({ clienteId: cliId, nichoId: null })
          }
        />

        {/* AlertDialog para Excluir Contato */}
        <AlertDialog
          open={!!clienteToDelete}
          onOpenChange={() => setClienteToDelete(null)}
        >
          <AlertDialogContent className="mx-4 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-semibold">
                Excluir Contato
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita. Só é permitida se todos os
                nichos do contato estiverem sob sua responsabilidade. Tem
                certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <AlertDialogCancel
                onClick={() => setClienteToDelete(null)}
                className="w-full sm:w-auto text-sm"
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  clienteToDelete && handleDeleteCliente(clienteToDelete)
                }
                className="w-full sm:w-auto text-sm"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PropostaHonorariosDialog
          open={!!propostaPreset}
          preset={propostaPreset}
          onClose={() => setPropostaPreset(null)}
        />
      </>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* Cabeçalho estilo Astrea: "Contatos" à esquerda e "Planilhas" + "ADICIONAR" à direita */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
          Contatos
        </h1>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsImportExportOpen(true)}
            className="h-9 text-xs font-bold border-[#010E38]/20 text-[#010E38] dark:text-[#F1F4F9] hover:bg-[#F1F4F9]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-[#010E38] dark:text-[#EBB52C]" />
            PLANILHAS (EXCEL)
          </Button>
          <Button
            type="button"
            onClick={handleOpenNovoContato}
            className="h-9 px-5 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider rounded-md shadow-xs"
          >
            ADICIONAR
          </Button>
        </div>
      </div>

      {/* Barra Unificada Astrea: [▾] | TODOS A B C D ... Z | [Procure por nome, apelido... 🔍] | [🏷️] | [⋮] [🔄] */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
        <div className="flex-1 flex flex-col xl:flex-row items-stretch xl:items-center rounded-md border border-slate-200 dark:border-white/15 bg-white dark:bg-[#010E38] shadow-2xs overflow-hidden">
          {/* Seletor rápido de Tipo / Nicho à esquerda + Barra A-Z */}
          <div className="flex items-center border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-white/10 px-2 py-1.5 overflow-x-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Filtrar por tipo de contato ou responsável"
                  className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 mr-1 shrink-0"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem
                  onClick={() => setFiltroTipoPessoa("todos")}
                  className={cn(
                    "text-xs cursor-pointer",
                    filtroTipoPessoa === "todos" && "font-bold"
                  )}
                >
                  Todos os tipos (PF e PJ)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFiltroTipoPessoa("pf")}
                  className={cn(
                    "text-xs cursor-pointer",
                    filtroTipoPessoa === "pf" && "font-bold"
                  )}
                >
                  Apenas Pessoa Física (CPF)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setFiltroTipoPessoa("pj")}
                  className={cn(
                    "text-xs cursor-pointer",
                    filtroTipoPessoa === "pj" && "font-bold"
                  )}
                >
                  Apenas Pessoa Jurídica (CNPJ)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setFiltroResponsavel("todos")}
                  className="text-xs cursor-pointer"
                >
                  Responsável: Todos
                </DropdownMenuItem>
                {usuarios.map((u) => (
                  <DropdownMenuItem
                    key={u.id}
                    onClick={() => setFiltroResponsavel(u.id)}
                    className={cn(
                      "text-xs cursor-pointer truncate",
                      filtroResponsavel === u.id && "font-bold"
                    )}
                  >
                    Resp: {u.full_name || u.email}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setLetraSelecionada("TODOS")}
                className={cn(
                  "px-2 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0",
                  letraSelecionada === "TODOS"
                    ? "text-[#010E38] dark:text-[#EBB52C] border-b-2 border-[#010E38] dark:border-[#EBB52C]"
                    : "text-slate-500 hover:text-[#010E38]"
                )}
              >
                TODOS
              </button>
              {ALFABETO.map((letra) => (
                <button
                  key={letra}
                  type="button"
                  onClick={() =>
                    setLetraSelecionada(
                      letraSelecionada === letra ? "TODOS" : letra
                    )
                  }
                  className={cn(
                    "w-5 py-1 text-[11px] font-bold uppercase text-center transition-colors shrink-0",
                    letraSelecionada === letra
                      ? "text-[#010E38] dark:text-[#EBB52C] border-b-2 border-[#010E38] dark:border-[#EBB52C]"
                      : "text-slate-500 hover:text-[#010E38]"
                  )}
                >
                  {letra}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de busca integrado + botão de etiquetas */}
          <div className="flex-1 flex items-center px-3 py-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Procure por nome, apelido, CPF/CNPJ ou e-mail do seu contato"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-transparent outline-none text-[#010E38] dark:text-[#F1F4F9] placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <Search className="h-4 w-4 text-slate-500 shrink-0 ml-1" />

            <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-2.5" />

            {/* Popover de Filtro por Nicho / Etiqueta */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Filtrar por nicho ou etiqueta"
                  className={cn(
                    "p-1 rounded hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shrink-0",
                    filtroNicho !== "todos" || filtroEtiquetaCustom
                      ? "text-[#EBB52C] bg-[#010E38]"
                      : "text-slate-500"
                  )}
                >
                  <Tag className="h-4 w-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    NICHOS JURÍDICOS
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    <button
                      type="button"
                      onClick={() => setFiltroNicho("todos")}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded text-xs hover:bg-muted",
                        filtroNicho === "todos" && "font-bold bg-muted"
                      )}
                    >
                      Todos os nichos
                    </button>
                    {NICHOS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setFiltroNicho(filtroNicho === n ? "todos" : n)
                        }
                        className={cn(
                          "w-full text-left px-2 py-1 rounded text-xs hover:bg-muted flex items-center gap-2",
                          filtroNicho === n && "font-bold bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-xs shrink-0",
                            corNichoPill(n).split(" ")[0]
                          )}
                        />
                        <span className="truncate">{n}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-2.5 space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    ETIQUETAS CRIADAS
                  </p>
                  <Input
                    placeholder="Encontrar etiqueta..."
                    value={buscaTagPopover}
                    onChange={(e) => setBuscaTagPopover(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {etiquetasCatalogoFiltradas.length === 0 ? (
                      <p className="text-[11px] text-slate-400 py-1">
                        Nenhuma etiqueta criada.
                      </p>
                    ) : (
                      etiquetasCatalogoFiltradas.map((et) => (
                        <button
                          key={et.id}
                          type="button"
                          onClick={() =>
                            setFiltroEtiquetaCustom(
                              filtroEtiquetaCustom === et.nome ? null : et.nome
                            )
                          }
                          className={cn(
                            "w-full text-left px-2 py-1 rounded text-xs hover:bg-muted flex items-center gap-2",
                            filtroEtiquetaCustom === et.nome &&
                              "font-bold bg-muted"
                          )}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: et.cor }}
                          />
                          <span className="truncate">{et.nome}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Botões laterais de Atualizar e Mais Opções iguais ao print */}
        <div className="flex items-center gap-1 self-end lg:self-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Opções da lista"
                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => setIsImportExportOpen(true)}
                className="text-xs cursor-pointer"
              >
                Importar / Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSearchTerm("");
                  setLetraSelecionada("TODOS");
                  setFiltroNicho("todos");
                  setFiltroResponsavel("todos");
                  setFiltroTipoPessoa("todos");
                  setFiltroEtiquetaCustom(null);
                }}
                className="text-xs cursor-pointer"
              >
                Limpar todos os filtros
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={fetchClientes}
            title="Atualizar contatos"
            className="p-2 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500"
          >
            <RotateCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Pílulas de filtros ativos igual ao print */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          NICHO: {filtroNicho === "todos" ? "TODOS" : filtroNicho}
          {filtroNicho !== "todos" && (
            <button
              type="button"
              onClick={() => setFiltroNicho("todos")}
              className="hover:text-red-600"
            >
              ×
            </button>
          )}
        </span>

        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
          TIPO:{" "}
          {filtroTipoPessoa === "todos"
            ? "TODOS"
            : filtroTipoPessoa === "pf"
            ? "PESSOA FÍSICA"
            : "PESSOA JURÍDICA"}
          {filtroTipoPessoa !== "todos" && (
            <button
              type="button"
              onClick={() => setFiltroTipoPessoa("todos")}
              className="hover:text-red-600"
            >
              ×
            </button>
          )}
        </span>

        {filtroResponsavel !== "todos" && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#010E38] text-[#EBB52C] text-[10px] font-bold uppercase tracking-wide">
            RESPONSÁVEL: {nomeUsuario(usuarios, filtroResponsavel) || "FILTRO"}
            <button
              type="button"
              onClick={() => setFiltroResponsavel("todos")}
              className="hover:opacity-75"
            >
              ×
            </button>
          </span>
        )}

        {filtroEtiquetaCustom && (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#010E38] text-[#EBB52C] text-[10px] font-bold uppercase tracking-wide">
            ETIQUETA: {filtroEtiquetaCustom}
            <button
              type="button"
              onClick={() => setFiltroEtiquetaCustom(null)}
              className="hover:opacity-75"
            >
              ×
            </button>
          </span>
        )}
      </div>

      {/* Contador de contatos igual ao print */}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Mostrando {filteredClientes.length} de {clientes.length} contato(s)
      </div>

      {/* Tabela enxuta idêntica à foto do Astrea: [☐] | TIPO | NOME ▾ | TELEFONE | EMAIL | ETIQUETAS */}
      <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#010E38] shadow-2xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-[#F1F4F9]/40 dark:bg-white/5">
              <th className="py-2.5 pl-4 pr-2 w-9">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={toggleSelecionarTodos}
                  className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-2 w-14">TIPO</th>
              <th className="py-2.5 px-3">
                <button
                  type="button"
                  onClick={() => setOrdenacaoAsc((v) => !v)}
                  className="inline-flex items-center gap-1 font-bold uppercase hover:text-[#010E38] dark:hover:text-[#EBB52C]"
                >
                  <span>NOME</span>
                  <span className="text-[9px]">{ordenacaoAsc ? "▾" : "▴"}</span>
                </button>
              </th>
              <th className="py-2.5 px-3">TELEFONE</th>
              <th className="py-2.5 px-3">EMAIL</th>
              <th className="py-2.5 pl-3 pr-4">ETIQUETAS</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/70 dark:divide-white/10 text-xs">
            {filteredClientes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-slate-400 text-xs"
                >
                  Nenhum contato encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredClientes.map((cliente) => {
                const docDigits = soDigitos((cliente as any).cpf || "");
                const meta = extrairDadosAstreaDeCliente(cliente);
                const ehPJ = meta.tipoPessoa === "pj" || docDigits.length === 14;
                const temContatoAtivo =
                  Boolean(cliente.telefone) ||
                  Boolean(cliente.email) ||
                  (nichosPorCliente[cliente.id] || []).length > 0;

                return (
                  <tr
                    key={cliente.id}
                    onClick={() => setViewingCliente(cliente)}
                    className="group hover:bg-[#F1F4F9]/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {/* Checkbox */}
                    <td
                      className="py-2.5 pl-4 pr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selecionados.includes(cliente.id)}
                        onChange={() => toggleSelecionado(cliente.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer"
                      />
                    </td>

                    {/* Coluna TIPO */}
                    <td className="py-2.5 px-2">
                      {ehPJ ? (
                        <Building2
                          className={cn(
                            "h-4 w-4",
                            temContatoAtivo
                              ? "text-[#010E38] dark:text-[#EBB52C]"
                              : "text-slate-400"
                          )}
                        />
                      ) : (
                        <UserIcon
                          className={cn(
                            "h-4 w-4",
                            temContatoAtivo
                              ? "text-[#010E38] fill-[#010E38] dark:text-[#EBB52C] dark:fill-[#EBB52C]"
                              : "text-slate-500 fill-slate-500"
                          )}
                        />
                      )}
                    </td>

                    {/* Coluna NOME */}
                    <td className="py-2.5 px-3 font-medium text-[#010E38] dark:text-[#F1F4F9] group-hover:underline">
                      <span>{cliente.nome || "(Sem nome)"}</span>
                      {(meta.nomeFantasia || meta.apelido) && (
                        <span className="ml-1.5 text-slate-500 font-normal">
                          ({meta.nomeFantasia || meta.apelido})
                        </span>
                      )}
                      {(cliente as any).cpf && (
                        <span className="ml-2 font-data text-[10.5px] text-slate-400 font-normal">
                          {formatarDocumento((cliente as any).cpf)}
                        </span>
                      )}
                    </td>

                    {/* Coluna TELEFONE */}
                    <td className="py-2.5 px-3">
                      {cliente.telefone ? (
                        <span className="font-data text-slate-800 dark:text-slate-200">
                          {cliente.telefone}{" "}
                          <span className="font-sans text-[9.5px] uppercase text-slate-400 font-semibold ml-0.5">
                            {meta.telefones[0]?.tipo?.toUpperCase() ||
                              "WHATSAPP"}
                          </span>
                        </span>
                      ) : (
                        <span className="italic text-slate-400">
                          Nenhum telefone
                        </span>
                      )}
                    </td>

                    {/* Coluna EMAIL */}
                    <td className="py-2.5 px-3">
                      {cliente.email ? (
                        <span className="text-slate-700 dark:text-slate-200">
                          {cliente.email}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">
                          Nenhum email
                        </span>
                      )}
                    </td>

                    {/* Coluna ETIQUETAS + Menu de ações */}
                    <td
                      className="py-2.5 pl-3 pr-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {renderEtiquetasENichos(cliente)}

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {catalogoEtiquetas.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  title="Adicionar etiqueta ao contato"
                                  className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-400 hover:text-[#010E38]"
                                >
                                  <Tag className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                {catalogoEtiquetas.map((et) => (
                                  <DropdownMenuItem
                                    key={et.id}
                                    onClick={() =>
                                      adicionarTagAoCliente(cliente.id, et.nome)
                                    }
                                    className="text-xs cursor-pointer flex items-center gap-2"
                                  >
                                    <span
                                      className="h-2.5 w-2.5 rounded-xs shrink-0"
                                      style={{ backgroundColor: et.cor }}
                                    />
                                    <span className="truncate">{et.nome}</span>
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewingCliente(cliente)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizar Ficha e Arquivos
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAnotacoesCliente(cliente)}
                              >
                                <ListPlus className="mr-2 h-4 w-4" />
                                Anotações / Questionário
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleOpenEditContato(cliente)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setClienteToDelete(cliente.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* AlertDialog para Excluir Contato */}
      <AlertDialog
        open={!!clienteToDelete}
        onOpenChange={() => setClienteToDelete(null)}
      >
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold">
              Excluir Contato
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Só é permitida se todos os nichos
              do contato estiverem sob sua responsabilidade. Tem certeza que
              deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => setClienteToDelete(null)}
              className="w-full sm:w-auto text-sm"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                clienteToDelete && handleDeleteCliente(clienteToDelete)
              }
              className="w-full sm:w-auto text-sm"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog/Sheet para Visualizar Contato */}
      {viewingCliente &&
        (isMobile ? (
          <Sheet
            open={!!viewingCliente}
            onOpenChange={() => setViewingCliente(null)}
          >
            <SheetContent
              side="bottom"
              className="rounded-t-lg max-h-[90vh] overflow-y-auto"
            >
              <SheetHeader className="text-left">
                <SheetTitle className="text-lg font-semibold">
                  Detalhes do Contato
                </SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">
                  Informações detalhadas sobre {viewingCliente?.nome}.
                </SheetDescription>
              </SheetHeader>
              {viewContent}
              <SheetFooter>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full text-sm"
                  >
                    Fechar
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog
            open={!!viewingCliente}
            onOpenChange={() => setViewingCliente(null)}
          >
            <DialogContent className="mx-4 max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">
                  Detalhes do Contato
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Informações detalhadas sobre {viewingCliente?.nome}.
                </DialogDescription>
              </DialogHeader>
              {viewContent}
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto text-sm"
                  >
                    Fechar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ))}

      <PropostaHonorariosDialog
        open={!!propostaPreset}
        preset={propostaPreset}
        onClose={() => setPropostaPreset(null)}
      />

      <ClienteAnotacoesSheet
        cliente={anotacoesCliente}
        onClose={() => setAnotacoesCliente(null)}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        table="clientes"
        onSuccess={fetchClientes}
      />
    </div>
  );
};

export default Clientes;
