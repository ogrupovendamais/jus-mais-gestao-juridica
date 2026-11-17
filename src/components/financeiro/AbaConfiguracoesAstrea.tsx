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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreVertical,
  Check,
  Edit2,
  Trash2,
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
  tipo: string;
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

  // Estado dos Centros de Custo (Print 3)
  const [centrosCusto, setCentrosCusto] = useState<CentroCustoItem[]>([
    { id: "1", nome: "Trabalhista", status: "Ativo" },
    { id: "2", nome: "Família", status: "Ativo" },
    { id: "3", nome: "Tributário", status: "Ativo" },
    { id: "4", nome: "Civil", status: "Ativo" },
  ]);

  // Estado das Contas (Print 4)
  const [contas, setContas] = useState<ContaItem[]>([
    {
      id: "1",
      nome: "Conta padrão",
      tipo: "Outros",
      ativa: true,
      padrao: true,
      configuracao: "INDISPONÍVEL",
      repasse: "INDISPONÍVEL",
    },
  ]);

  // Modal Adicionar Categoria (Print 5)
  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false);
  const [novaCatNome, setNovaCatNome] = useState("");
  const [novaCatCor, setNovaCatCor] = useState("#3B82F6");
  const [novaCatAgrupador, setNovaCatAgrupador] = useState("sem_agrupador");

  // Modal Adicionar Centro de Custo
  const [modalCentroAberto, setModalCentroAberto] = useState(false);
  const [novoCentroNome, setNovoCentroNome] = useState("");

  // Modal Adicionar Conta
  const [modalContaAberto, setModalContaAberto] = useState(false);
  const [novaContaNome, setNovaContaNome] = useState("");
  const [novaContaTipo, setNovaContaTipo] = useState("Conta Corrente");

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
      // Adicionar como filho do agrupador escolhido
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

  const handleSalvarConta = () => {
    if (!novaContaNome.trim()) {
      toast.error("Informe o nome da conta.");
      return;
    }
    const nova: ContaItem = {
      id: "cta-" + Date.now(),
      nome: novaContaNome.trim(),
      tipo: novaContaTipo,
      ativa: true,
      padrao: false,
      configuracao: "INDISPONÍVEL",
      repasse: "INDISPONÍVEL",
    };
    setContas([...contas, nova]);
    setNovaContaNome("");
    setModalContaAberto(false);
    toast.success(`Conta "${nova.nome}" cadastrada com sucesso!`);
  };

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

                    {/* Linhas Filhas / Subcategorias (se houver, com recuo como COFINS, IRRF, PIS) */}
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
          VISÃO 3: CONTAS (PRINT 4)
          ============================================================ */}
      {subAbaConfig === "contas" && (
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
              onClick={() => setModalContaAberto(true)}
              className="bg-[#010E38] hover:bg-[#021B66] text-[#EBB52C] border border-[#EBB52C]/30 font-bold text-xs uppercase px-5 py-2.5 rounded shadow-sm self-start sm:self-auto"
            >
              ADICIONAR CONTA
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200/80 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/70 border-b border-slate-200">
                <TableRow className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <TableHead className="py-3 px-4 text-left">CONTA 🛈</TableHead>
                  <TableHead className="py-3 px-4 text-center w-48">CONFIGURAÇÃO 🛈</TableHead>
                  <TableHead className="py-3 px-4 text-center w-48">REPASSE 🛈</TableHead>
                  <TableHead className="py-3 px-4 text-center w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-xs">
                {contas.map((cta) => (
                  <TableRow key={cta.id} className="hover:bg-slate-50/60">
                    <TableCell className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase px-1.5 py-0">
                            ATIVA
                          </Badge>
                          {cta.padrao && (
                            <Badge className="bg-[#010E38] text-white text-[10px] font-bold uppercase px-1.5 py-0">
                              PADRÃO
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800 text-sm">{cta.nome}</p>
                        <p className="text-[11px] text-slate-400">{cta.tipo}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                        {cta.configuracao}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500">
                        {cta.repasse}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <button type="button" className="text-slate-400 hover:text-slate-700 p-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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

      {/* MODAL ADICIONAR CONTA */}
      <Dialog open={modalContaAberto} onOpenChange={setModalContaAberto}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl border border-slate-200 shadow-2xl text-[#010E38]">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-bold text-[#010E38]">
              Adicionar conta bancária
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nome da conta*</Label>
              <Input
                placeholder="Ex: Banco do Brasil PJ, Santander, etc."
                value={novaContaNome}
                onChange={(e) => setNovaContaNome(e.target.value)}
                className="text-xs bg-white border-slate-200"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Tipo de conta</Label>
              <Select value={novaContaTipo} onValueChange={setNovaContaTipo}>
                <SelectTrigger className="text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 shadow-md">
                  <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                  <SelectItem value="Poupança">Poupança</SelectItem>
                  <SelectItem value="Investimento">Investimento</SelectItem>
                  <SelectItem value="Caixa Físico">Caixa Físico</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalContaAberto(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2"
              >
                Cancelar
              </button>
              <Button
                type="button"
                onClick={handleSalvarConta}
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
