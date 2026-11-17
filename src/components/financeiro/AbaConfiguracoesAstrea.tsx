import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Plus,
  MoreVertical,
  Check,
  Search,
  Calendar,
  HelpCircle,
  Building2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export interface CategoriaItem {
  id: string;
  nome: string;
  cor: string;
  permiteLancamento: boolean;
  status: "Ativo" | "Inativo";
  agrupadorId?: string | null;
  filhos?: CategoriaItem[];
}

export interface CentroCustoItem {
  id: string;
  nome: string;
  status: "Ativo" | "Inativo";
}

export interface ContaItem {
  id: string;
  nome: string;
  tipo: "corrente" | "outros";
  tipoLabel: string;
  inicio: string;
  saldoInicial: string;
  banco?: string;
  agencia?: string;
  contaNumero?: string;
  gerente?: string;
  ativa: boolean;
  padrao: boolean;
  configuracao: string;
  repasse: string;
}

interface AbaConfiguracoesAstreaProps {
  subAbaConfig: "categorias" | "centros_custo" | "contas";
  onMudarSubAba: (sub: "categorias" | "centros_custo" | "contas") => void;
}

const CORES_PALETA = [
  "#10B981", // verde
  "#EF4444", // vermelho
  "#F59E0B", // laranja / âmbar
  "#8B5CF6", // roxo
  "#3B82F6", // azul
  "#06B6D4", // ciano
  "#6B7280", // cinza
  "#1E293B", // escuro
  "#D97706", // mostarda
  "#EC4899", // rosa
];

const BANCOS_CATALOGO = [
  "001 - Banco do Brasil S.A.",
  "033 - Banco Santander (Brasil) S.A.",
  "104 - Caixa Econômica Federal",
  "237 - Banco Bradesco S.A.",
  "341 - Itaú Unibanco S.A.",
  "260 - Nubank (Nu Pagamentos S.A.)",
  "077 - Banco Inter S.A.",
  "212 - Banco Original S.A.",
  "748 - Banco Cooperativo Sicredi S.A.",
  "756 - Banco Cooperativo Sicoob S.A.",
  "422 - Banco Safra S.A.",
  "336 - Banco C6 S.A.",
  "655 - Banco Votorantim S.A.",
  "389 - Banco Mercantil do Brasil S.A.",
  "070 - BRB - Banco de Brasília S.A.",
];

const CATEGORIAS_PADRAO: CategoriaItem[] = [
  { id: "1", nome: "Adiantamento de despesas", cor: "#84CC16", permiteLancamento: true, status: "Ativo" },
  { id: "2", nome: "Aluguel", cor: "#DC2626", permiteLancamento: true, status: "Ativo" },
  { id: "3", nome: "Anuidade OAB", cor: "#EF4444", permiteLancamento: true, status: "Ativo" },
  { id: "4", nome: "Capitalização sócios", cor: "#A855F7", permiteLancamento: true, status: "Ativo" },
  { id: "5", nome: "Condomínio", cor: "#F87171", permiteLancamento: true, status: "Ativo" },
  { id: "6", nome: "Contador", cor: "#991B1B", permiteLancamento: true, status: "Ativo" },
  { id: "7", nome: "CSLL", cor: "#0F172A", permiteLancamento: true, status: "Ativo" },
  { id: "8", nome: "Despesa do cliente", cor: "#65A30D", permiteLancamento: true, status: "Ativo" },
  { id: "9", nome: "GPS - INSS", cor: "#94A3B8", permiteLancamento: true, status: "Ativo" },
  { id: "10", nome: "Honorários", cor: "#38BDF8", permiteLancamento: true, status: "Ativo" },
  {
    id: "11",
    nome: "Impostos",
    cor: "#020617",
    permiteLancamento: true,
    status: "Ativo",
    filhos: [
      { id: "11-1", nome: "COFINS", cor: "#020617", permiteLancamento: true, status: "Ativo", agrupadorId: "11" },
      { id: "11-2", nome: "IRRF", cor: "#020617", permiteLancamento: true, status: "Ativo", agrupadorId: "11" },
      { id: "11-3", nome: "PIS", cor: "#020617", permiteLancamento: true, status: "Ativo", agrupadorId: "11" },
    ],
  },
  { id: "12", nome: "IPTU", cor: "#64748B", permiteLancamento: true, status: "Ativo" },
  { id: "13", nome: "Limpeza", cor: "#6366F1", permiteLancamento: true, status: "Ativo" },
  { id: "14", nome: "Marketing", cor: "#F97316", permiteLancamento: true, status: "Ativo" },
  { id: "15", nome: "PróLabore", cor: "#CA8A04", permiteLancamento: true, status: "Ativo" },
  { id: "16", nome: "Rendimentos financeiros", cor: "#06B6D4", permiteLancamento: true, status: "Ativo" },
  { id: "17", nome: "Saldo inicial", cor: "#1E3A8A", permiteLancamento: true, status: "Ativo" },
  { id: "18", nome: "Salários", cor: "#E11D48", permiteLancamento: true, status: "Ativo" },
  { id: "19", nome: "Suprimentos escritório", cor: "#FB923C", permiteLancamento: true, status: "Ativo" },
  { id: "20", nome: "Tarifas Bancárias", cor: "#4F46E5", permiteLancamento: true, status: "Ativo" },
  { id: "21", nome: "Taxa assistencial", cor: "#2563EB", permiteLancamento: true, status: "Ativo" },
];

const CONTAS_PADRAO: ContaItem[] = [
  {
    id: "cta-padrao-1",
    nome: "Conta padrão",
    tipo: "outros",
    tipoLabel: "Outros",
    inicio: "07/11/2026",
    saldoInicial: "R$ 0,00",
    ativa: true,
    padrao: true,
    configuracao: "INDISPONÍVEL",
    repasse: "INDISPONÍVEL",
  },
];

export const AbaConfiguracoesAstrea: React.FC<AbaConfiguracoesAstreaProps> = ({
  subAbaConfig,
  onMudarSubAba,
}) => {
  // Estado das Categorias
  const [categorias, setCategorias] = useState<CategoriaItem[]>(() => {
    try {
      const salvas = localStorage.getItem("jus_categorias_financeiro_v1");
      if (salvas) return JSON.parse(salvas);
    } catch {}
    return CATEGORIAS_PADRAO;
  });

  // Estado dos Centros de Custo
  const [centrosCusto, setCentrosCusto] = useState<CentroCustoItem[]>([
    { id: "1", nome: "Trabalhista", status: "Ativo" },
    { id: "2", nome: "Família", status: "Ativo" },
    { id: "3", nome: "Tributário", status: "Ativo" },
    { id: "4", nome: "Civil", status: "Ativo" },
  ]);

  // Estado das Contas
  const [contas, setContas] = useState<ContaItem[]>(() => {
    try {
      const salvas = localStorage.getItem("jus_contas_financeiro_v1");
      if (salvas) return JSON.parse(salvas);
    } catch {}
    return CONTAS_PADRAO;
  });

  const salvarContasLocal = (novas: ContaItem[]) => {
    setContas(novas);
    try {
      localStorage.setItem("jus_contas_financeiro_v1", JSON.stringify(novas));
    } catch {}
  };

  // Modos de visualização de Contas: "lista" | "adicionar" | "editar"
  const [visaoContas, setVisaoContas] = useState<"lista" | "adicionar" | "editar">("lista");
  const [contaEditando, setContaEditando] = useState<ContaItem | null>(null);

  // Form State para Contas
  const [tipoContaForm, setTipoContaForm] = useState<"corrente" | "outros">("corrente");
  const [formNome, setFormNome] = useState("");
  const [formInicio, setFormInicio] = useState("07/11/2026");
  const [formSaldoInicial, setFormSaldoInicial] = useState("00,00");
  const [formBanco, setFormBanco] = useState("");
  const [formAgencia, setFormAgencia] = useState("");
  const [formContaNumero, setFormContaNumero] = useState("");
  const [formGerente, setFormGerente] = useState("");

  // Sugestões de banco
  const [sugestoesBancoAbertas, setSugestoesBancoAbertas] = useState(false);

  // Modal Adicionar Categoria
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");
  const [novaCatCor, setNovaCatCor] = useState("#3B82F6");
  const [novaCatAgrupador, setNovaCatAgrupador] = useState("sem_agrupador");

  // Modal Adicionar Centro de Custo
  const [modalCentroAberto, setModalCentroAberto] = useState(false);
  const [novoCentroNome, setNovoCentroNome] = useState("");

  const totalCategoriasContadas = categorias.reduce((acc, c) => acc + 1 + (c.filhos?.length || 0), 0);

  const salvarCategoriasLocal = (novas: CategoriaItem[]) => {
    setCategorias(novas);
    try {
      localStorage.setItem("jus_categorias_financeiro_v1", JSON.stringify(novas));
    } catch {}
  };

  const handleSalvarCategoria = () => {
    if (!novaCatNome.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    const novoItem: CategoriaItem = {
      id: "cat-" + Date.now(),
      nome: novaCatNome.trim(),
      cor: novaCatCor,
      permiteLancamento: true,
      status: "Ativo",
    };

    if (novaCatAgrupador && novaCatAgrupador !== "sem_agrupador") {
      const atualizadas = categorias.map((c) => {
        if (c.id === novaCatAgrupador) {
          const filhosAtuais = c.filhos || [];
          return {
            ...c,
            filhos: [...filhosAtuais, { ...novoItem, agrupadorId: c.id }],
          };
        }
        return c;
      });
      salvarCategoriasLocal(atualizadas);
    } else {
      salvarCategoriasLocal([...categorias, novoItem]);
    }

    setNovaCatNome("");
    setNovaCatCor("#3B82F6");
    setNovaCatAgrupador("sem_agrupador");
    setModalCategoriaAberto(false);
    toast.success(`Categoria "${novoItem.nome}" cadastrada com sucesso!`);
  };

  const handleSalvarCentro = () => {
    if (!novoCentroNome.trim()) {
      toast.error("Informe o nome do centro de custo.");
      return;
    }
    const novo: CentroCustoItem = {
      id: "cc-" + Date.now(),
      nome: novoCentroNome.trim(),
      status: "Ativo",
    };
    setCentrosCusto([...centrosCusto, novo]);
    setNovoCentroNome("");
    setModalCentroAberto(false);
    toast.success(`Centro de custo "${novo.nome}" cadastrado!`);
  };

  // Abrir tela Adicionar Conta
  const handleAbrirAdicionarConta = () => {
    setContaEditando(null);
    setTipoContaForm("corrente");
    setFormNome("");
    setFormInicio(new Date().toLocaleDateString("pt-BR"));
    setFormSaldoInicial("00,00");
    setFormBanco("");
    setFormAgencia("");
    setFormContaNumero("");
    setFormGerente("");
    setVisaoContas("adicionar");
  };

  // Abrir tela Editar Conta
  const handleAbrirEditarConta = (cta: ContaItem) => {
    setContaEditando(cta);
    setTipoContaForm(cta.tipo);
    setFormNome(cta.nome);
    setFormInicio(cta.inicio || "07/11/2026");
    setFormSaldoInicial(cta.saldoInicial || "00,00");
    setFormBanco(cta.banco || "");
    setFormAgencia(cta.agencia || "");
    setFormContaNumero(cta.contaNumero || "");
    setFormGerente(cta.gerente || "");
    setVisaoContas("editar");
  };

  // Salvar Conta (criação ou edição)
  const handleSalvarConta = (iniciarCredenciamento = false) => {
    if (!formNome.trim()) {
      toast.error("Por favor preencha o Nome da conta.");
      return;
    }

    if (tipoContaForm === "corrente") {
      if (!formBanco.trim()) {
        toast.error("Por favor informe o Banco.");
        return;
      }
      if (!formAgencia.trim()) {
        toast.error("Por favor informe a Agência.");
        return;
      }
      if (!formContaNumero.trim()) {
        toast.error("Por favor informe o Número da Conta.");
        return;
      }
    }

    const saldoFormatado = formSaldoInicial.startsWith("R$")
      ? formSaldoInicial
      : `R$ ${formSaldoInicial}`;

    if (contaEditando) {
      // Edição
      const atualizadas = contas.map((c) => {
        if (c.id === contaEditando.id) {
          return {
            ...c,
            nome: formNome.trim(),
            tipo: tipoContaForm,
            tipoLabel: tipoContaForm === "corrente" ? formBanco.split("-")[1]?.trim() || formBanco : "Outros",
            inicio: formInicio,
            saldoInicial: saldoFormatado,
            banco: tipoContaForm === "corrente" ? formBanco : undefined,
            agencia: tipoContaForm === "corrente" ? formAgencia : undefined,
            contaNumero: tipoContaForm === "corrente" ? formContaNumero : undefined,
            gerente: tipoContaForm === "corrente" ? formGerente : undefined,
          };
        }
        return c;
      });
      salvarContasLocal(atualizadas);
      toast.success(`Conta "${formNome}" atualizada com sucesso!`);
    } else {
      // Nova Conta
      const nova: ContaItem = {
        id: "cta-" + Date.now(),
        nome: formNome.trim(),
        tipo: tipoContaForm,
        tipoLabel: tipoContaForm === "corrente" ? formBanco.split("-")[1]?.trim() || formBanco : "Outros",
        inicio: formInicio,
        saldoInicial: saldoFormatado,
        banco: tipoContaForm === "corrente" ? formBanco : undefined,
        agencia: tipoContaForm === "corrente" ? formAgencia : undefined,
        contaNumero: tipoContaForm === "corrente" ? formContaNumero : undefined,
        gerente: tipoContaForm === "corrente" ? formGerente : undefined,
        ativa: true,
        padrao: contas.length === 0,
        configuracao: "INDISPONÍVEL",
        repasse: "INDISPONÍVEL",
      };
      salvarContasLocal([...contas, nova]);
      if (iniciarCredenciamento) {
        toast.success(`Conta "${nova.nome}" salva e encaminhada para credenciamento bancário!`);
      } else {
        toast.success(`Conta "${nova.nome}" cadastrada com sucesso!`);
      }
    }

    setVisaoContas("lista");
  };

  const handleToggleStatusConta = (id: string) => {
    const alvo = contas.find((c) => c.id === id);
    if (alvo?.padrao) {
      toast.warning("A conta padrão não pode ser desativada.");
      return;
    }
    const atualizadas = contas.map((c) => {
      if (c.id === id) {
        const novoStatus = !c.ativa;
        toast.info(`Conta "${c.nome}" ${novoStatus ? "reativada" : "desativada"}.`);
        return { ...c, ativa: novoStatus };
      }
      return c;
    });
    salvarContasLocal(atualizadas);
  };

  const handleDefinirPadrao = (id: string) => {
    const atualizadas = contas.map((c) => ({
      ...c,
      padrao: c.id === id,
    }));
    salvarContasLocal(atualizadas);
    toast.success("Conta padrão atualizada com sucesso!");
  };

  const bancosFiltrados = BANCOS_CATALOGO.filter((b) =>
    b.toLowerCase().includes(formBanco.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* ============================================================
          VISÃO 1: CATEGORIAS (PRINTS 2 E 5)
          ============================================================ */}
      {subAbaConfig === "categorias" && (
        <div className="space-y-4">
          {/* Topo: Título + Botão ADICIONAR CATEGORIA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
                Categorias
              </h2>
              <p className="text-xs text-slate-500 pt-1">
                Você possui <strong className="text-slate-800">{totalCategoriasContadas} categorias</strong> cadastradas.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setModalCategoriaAberto(true)}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <span>ADICIONAR CATEGORIA</span>
            </Button>
          </div>

          {/* Tabela de Categorias */}
          <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead className="py-3 px-4 text-left">
                    <div className="flex items-center gap-1.5">
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      <span>CATEGORIA</span>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center w-48">PERMITE LANÇAMENTO</TableHead>
                  <TableHead className="py-3 px-4 text-center w-36">STATUS</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-slate-100 text-xs">
                {categorias.map((cat) => (
                  <React.Fragment key={cat.id}>
                    {/* Linha da Categoria Principal */}
                    <TableRow className="hover:bg-slate-50/60 transition-colors">
                      <TableCell className="py-2.5 px-4 font-medium text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0"
                            style={{ backgroundColor: cat.cor }}
                            title={`Cor: ${cat.cor}`}
                          />
                          <span>{cat.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-slate-600">
                        {cat.permiteLancamento ? "Sim" : "Não"}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-center text-slate-600 font-medium">
                        {cat.status}
                      </TableCell>
                    </TableRow>

                    {/* Linhas Filhas / Subcategorias (com recuo para COFINS, IRRF, PIS) */}
                    {cat.filhos?.map((filho) => (
                      <TableRow key={filho.id} className="hover:bg-slate-50/60 transition-colors bg-slate-50/30">
                        <TableCell className="py-2 px-4 pl-10 font-normal text-slate-700">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: filho.cor }}
                            />
                            <span>{filho.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-4 text-center text-slate-500 text-[11px]">
                          {filho.permiteLancamento ? "Sim" : "Não"}
                        </TableCell>
                        <TableCell className="py-2 px-4 text-center text-slate-500 text-[11px]">
                          {filho.status}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ============================================================
          VISÃO 2: CENTROS DE CUSTO (PRINT 3)
          ============================================================ */}
      {subAbaConfig === "centros_custo" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
                Centros de custo
              </h2>
              <p className="text-xs text-slate-500 pt-1">
                Mostrando <strong className="text-slate-800">{centrosCusto.length} de {centrosCusto.length}</strong> centros de custo
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setModalCentroAberto(true)}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-sm self-start sm:self-auto"
            >
              ADICIONAR CENTRO DE CUSTO
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead className="py-3 px-4 text-left">NOME</TableHead>
                  <TableHead className="py-3 px-4 text-left w-48">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-xs">
                {centrosCusto.map((cc) => (
                  <TableRow key={cc.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 px-4 font-medium text-slate-800">
                      {cc.nome}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-slate-600 font-medium">
                      {cc.status}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ============================================================
          VISÃO 3: CONTAS (PRINTS 1, 2 E 3 - ASTREA OFICIAL)
          ============================================================ */}
      {subAbaConfig === "contas" && (
        <div className="space-y-4">
          {/* MODO 1: LISTAGEM DE CONTAS (PRINT 3) */}
          {visaoContas === "lista" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
                    Contas
                  </h2>
                  <p className="text-xs text-slate-500 pt-1">
                    Mostrando <strong className="text-slate-800">{contas.length} de {contas.length}</strong> contas
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleAbrirAdicionarConta}
                  className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-sm self-start sm:self-auto transition-all"
                >
                  ADICIONAR CONTA
                </Button>
              </div>

              {/* Tabela de Contas Oficial Astrea */}
              <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                    <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <TableHead className="py-3 px-4 text-left">
                        <div className="flex items-center gap-1.5">
                          <span>CONTA</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center w-52">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>CONFIGURAÇÃO</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center w-52">
                        <div className="flex items-center justify-center gap-1.5">
                          <span>REPASSE</span>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center w-12"></TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody className="divide-y divide-slate-100 text-xs">
                    {contas.map((cta) => (
                      <TableRow key={cta.id} className="hover:bg-slate-50/60 transition-colors">
                        <TableCell className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {cta.ativa ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                                  ATIVA
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                                  INATIVA
                                </Badge>
                              )}
                              {cta.padrao && (
                                <Badge className="bg-[#010E38] text-white border-[#010E38] text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                                  PADRÃO
                                </Badge>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900 text-sm tracking-tight pt-0.5">
                              {cta.nome}
                            </p>
                            <p className="text-[11px] text-slate-400 font-normal">
                              {cta.tipo === "corrente"
                                ? `${cta.tipoLabel || cta.banco || "Conta corrente"} ${
                                    cta.agencia ? `· Ag: ${cta.agencia}` : ""
                                  } ${cta.contaNumero ? `· Cc: ${cta.contaNumero}` : ""}`
                                : cta.tipoLabel || "Outros"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200/60">
                            {cta.configuracao}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200/60">
                            {cta.repasse}
                          </span>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 transition-colors"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-xl rounded-lg py-1">
                              <DropdownMenuItem
                                onClick={() => handleAbrirEditarConta(cta)}
                                className="text-xs font-medium text-slate-700 hover:text-[#010E38] hover:bg-slate-50 cursor-pointer py-2 px-3"
                              >
                                Editar informações internas
                              </DropdownMenuItem>
                              
                              {!cta.padrao && (
                                <DropdownMenuItem
                                  onClick={() => handleDefinirPadrao(cta.id)}
                                  className="text-xs font-medium text-slate-700 hover:text-[#010E38] hover:bg-slate-50 cursor-pointer py-2 px-3"
                                >
                                  Definir como padrão
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator className="my-1 bg-slate-100" />

                              <DropdownMenuItem
                                onClick={() => !cta.padrao && handleToggleStatusConta(cta.id)}
                                disabled={cta.padrao}
                                className={`text-xs py-2 px-3 ${
                                  cta.padrao
                                    ? "text-slate-300 cursor-not-allowed select-none"
                                    : "text-slate-600 hover:text-red-600 hover:bg-red-50 cursor-pointer font-medium"
                                }`}
                              >
                                {cta.padrao
                                  ? "Desativar (Conta padrão)"
                                  : cta.ativa
                                  ? "Desativar"
                                  : "Reativar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* MODO 2: ADICIONAR CONTA OU EDITAR CONTA (PRINTS 1 E 2) */}
          {(visaoContas === "adicionar" || visaoContas === "editar") && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 w-full text-[#010E38]">
              {/* Título */}
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <button
                  type="button"
                  onClick={() => setVisaoContas("lista")}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-[#010E38] transition-colors"
                  title="Voltar para a lista de contas"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] tracking-tight">
                  {visaoContas === "adicionar" ? "Adicionar conta" : "Editar conta"}
                </h2>
              </div>

              {/* Radio Group: Conta corrente | Outros */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#010E38] font-medium">
                  <input
                    type="radio"
                    name="tipoContaRadio"
                    checked={tipoContaForm === "corrente"}
                    onChange={() => setTipoContaForm("corrente")}
                    className="w-4 h-4 text-[#010E38] focus:ring-[#010E38] border-slate-300"
                  />
                  <span>Conta corrente</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-[#010E38] font-medium">
                  <input
                    type="radio"
                    name="tipoContaRadio"
                    checked={tipoContaForm === "outros"}
                    onChange={() => setTipoContaForm("outros")}
                    className="w-4 h-4 text-[#010E38] focus:ring-[#010E38] border-slate-300"
                  />
                  <span>Outros</span>
                </label>
              </div>

              {/* Campo Nome* */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#010E38]">
                  Nome<span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Digite o nome da conta"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                />
              </div>

              {/* Linha 2 Colunas: Início* | Saldo inicial* */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#010E38]">
                    Início<span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="07/11/2026"
                      value={formInicio}
                      onChange={(e) => setFormInicio(e.target.value)}
                      className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#010E38]">
                    Saldo inicial<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="00,00"
                    value={formSaldoInicial}
                    onChange={(e) => setFormSaldoInicial(e.target.value)}
                    className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                  />
                </div>
              </div>

              {/* CAMPOS ESPECÍFICOS DE CONTA CORRENTE (PRINT 1) */}
              {tipoContaForm === "corrente" && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* Banco* com busca/lookup */}
                  <div className="space-y-1.5 relative">
                    <Label className="text-xs font-semibold text-[#010E38]">
                      Banco<span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="Digite o código ou nome do banco"
                        value={formBanco}
                        onChange={(e) => {
                          setFormBanco(e.target.value);
                          setSugestoesBancoAbertas(true);
                        }}
                        onFocus={() => setSugestoesBancoAbertas(true)}
                        className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>

                    {/* Dropdown de sugestão de Bancos */}
                    {sugestoesBancoAbertas && formBanco.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-lg divide-y divide-slate-100">
                        {bancosFiltrados.length > 0 ? (
                          bancosFiltrados.map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                setFormBanco(b);
                                setSugestoesBancoAbertas(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[#010E38] flex items-center gap-2 transition-colors"
                            >
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{b}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            Nenhum banco encontrado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Linha: Agência* | Conta (com dígito)* */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#010E38]">
                        Agência<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o Nº da agência"
                        value={formAgencia}
                        onChange={(e) => setFormAgencia(e.target.value)}
                        className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-[#010E38]">
                        Conta (com dígito)<span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder="Digite o Nº da conta"
                        value={formContaNumero}
                        onChange={(e) => setFormContaNumero(e.target.value)}
                        className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 focus:border-[#010E38]"
                      />
                    </div>
                  </div>

                  {/* Gerente (busca de contato) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#010E38]">Gerente</Label>
                    <div className="relative">
                      <Input
                        placeholder="Encontre o contato"
                        value={formGerente}
                        onChange={(e) => setFormGerente(e.target.value)}
                        className="h-10 text-sm bg-white text-[#010E38] placeholder:text-slate-400 border-slate-200 pr-10 focus:border-[#010E38]"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Botões do Rodapé de Ações (Fiel às Screenshots 1 e 2) */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setVisaoContas("lista")}
                  className="text-xs font-bold uppercase text-slate-600 hover:text-slate-900 px-4 py-2.5 transition-colors"
                >
                  CANCELAR
                </button>

                {visaoContas === "adicionar" && tipoContaForm === "corrente" && (
                  <button
                    type="button"
                    onClick={() => handleSalvarConta(true)}
                    className="bg-white hover:bg-slate-100 text-[#010E38] border-2 border-[#010E38] font-bold text-xs uppercase px-5 py-2.5 rounded shadow-sm transition-all"
                  >
                    SALVAR E INICIAR O CREDENCIAMENTO
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSalvarConta(false)}
                  className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2.5 rounded shadow-sm transition-all"
                >
                  SALVAR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          MODAL: ADICIONAR CATEGORIA (PRINT 5)
          ============================================================ */}
      <Dialog open={modalCategoriaAberto} onOpenChange={setModalCategoriaAberto}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38]">
              Adicionar categoria
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Linha Categoria* + Cor* (com PRÉ-VISUALIZAÇÃO) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-8 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Categoria*</Label>
                <Input
                  placeholder="Digite o nome da categoria"
                  value={novaCatNome}
                  onChange={(e) => setNovaCatNome(e.target.value)}
                  className="text-xs bg-white border-slate-200"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Cor*</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="w-full h-9 rounded border border-slate-200 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      style={{
                        backgroundColor: novaCatCor,
                        color: "#FFFFFF",
                      }}
                    >
                      <span>PRÉ-VISUALIZAÇÃO</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-2 bg-white border border-slate-200 shadow-xl rounded-lg">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 px-1">Escolha a cor:</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {CORES_PALETA.map((corHex) => (
                        <button
                          key={corHex}
                          type="button"
                          onClick={() => setNovaCatCor(corHex)}
                          className="w-7 h-7 rounded-md transition-transform hover:scale-110 flex items-center justify-center"
                          style={{ backgroundColor: corHex }}
                        >
                          {novaCatCor === corHex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                        </button>
                      ))}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Agrupador */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Agrupador</Label>
              <Select value={novaCatAgrupador} onValueChange={setNovaCatAgrupador}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Sem agrupador" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="sem_agrupador">Sem agrupador</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Ao selecionar um agrupador, a categoria será cadastrada dentro dele. Exemplo: agrupador Escritório e categorias Aluguel, Móveis e Energia.
              </p>
            </div>

            {/* Botões do Rodapé: Cancelar | SALVAR */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCategoriaAberto(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 transition-colors"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleSalvarCategoria}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2 rounded shadow-sm transition-all"
              >
                SALVAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL ADICIONAR CENTRO DE CUSTO */}
      <Dialog open={modalCentroAberto} onOpenChange={setModalCentroAberto}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38]">
              Adicionar centro de custo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome do centro de custo*</Label>
              <Input
                placeholder="Ex: Trabalhista, Família, etc."
                value={novoCentroNome}
                onChange={(e) => setNovoCentroNome(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalCentroAberto(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleSalvarCentro}
                className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/40 font-bold text-xs uppercase px-6 py-2 rounded shadow-sm"
              >
                SALVAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
