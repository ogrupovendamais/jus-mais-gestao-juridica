/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Tag,
  Trash2,
  Search,
  Check,
  Scale,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CORES_ETIQUETAS,
  isCorClara,
  useEtiquetasKanban,
} from "@/lib/etiquetas";
import {
  NichoSelect,
  PrincipalSelect,
  SecundariosSelect,
  ClienteNichos,
} from "@/components/clientes/ClienteNichos";
import type { Tables } from "@/integrations/supabase/types";

type DbCliente = Tables<"clientes">;

export type TelefoneItem = {
  tipo: string;
  numero: string;
  operadora: string;
};

export type EmailItem = {
  tipo: string;
  endereco: string;
};

export type EnderecoItem = {
  tipo: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  complemento: string;
  cidade: string;
  estado: string;
  pais: string;
};

export type DadosAstreaPF = {
  tipoPessoa: "pf" | "pj";
  // Aba 1: Informações pessoais (PF e PJ)
  nome: string; // Em PF = Nome*, em PJ = Empresa*
  etiquetas: string[];
  perfil: string;
  apelido: string; // Em PF = Apelido, em PJ = Nome fantasia
  telefones: TelefoneItem[];
  emails: EmailItem[];
  sites: string[];
  enderecos: EnderecoItem[];
  // Aba 2: Informações complementares (PF)
  nascDia: string;
  nascMes: string;
  nascAno: string;
  empresa: string;
  profissao: string;
  atividadeEconomica: string;
  estadoCivil: string;
  tratamento: string;
  codigo: string;
  nomePai: string;
  nomeMae: string;
  naturalidade: string;
  nacionalidade: string;
  comentarios: string;
  tipoContaBancaria: "" | "corrente" | "poupanca";
  banco: string;
  agencia: string;
  conta: string;
  pix: string;
  falecido: boolean;
  // Aba 2: Informações complementares (PJ)
  contatoPj: string;
  cargoPj: string;
  // Aba 3: Documentação (PF)
  cpf: string; // Em PF = CPF, em PJ = CNPJ
  rg: string; // Em PF = RG, em PJ = Inscrição estadual
  ctps: string;
  pis: string;
  tituloEleitor: string;
  cnh: string;
  passaporte: string;
  certidaoReservista: string;
  // Aba 3: Documentação (PJ)
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  optanteSimplesNacional: "Não" | "Sim";
};

const MESES = [
  { val: "01", label: "Janeiro" },
  { val: "02", label: "Fevereiro" },
  { val: "03", label: "Março" },
  { val: "04", label: "Abril" },
  { val: "05", label: "Maio" },
  { val: "06", label: "Junho" },
  { val: "07", label: "Julho" },
  { val: "08", label: "Agosto" },
  { val: "09", label: "Setembro" },
  { val: "10", label: "Outubro" },
  { val: "11", label: "Novembro" },
  { val: "12", label: "Dezembro" },
];

const DIAS = Array.from({ length: 31 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 110 }, (_, i) => String(ANO_ATUAL - i));

export function extrairDadosAstreaDeCliente(
  cliente?: DbCliente | null,
  etiquetasIniciais: string[] = [],
  cpfInicial = ""
): DadosAstreaPF {
  const rawComplementar = (cliente?.contatos_complementares as any) || [];
  const metaSalvo = Array.isArray(rawComplementar)
    ? rawComplementar.find((item: any) => item && item.__astrea_meta === true)
    : null;

  let nascDia = "";
  let nascMes = "";
  let nascAno = "";
  if ((cliente as any)?.data_nascimento) {
    const partes = String((cliente as any).data_nascimento).split("-");
    if (partes.length === 3) {
      nascAno = partes[0];
      nascMes = partes[1];
      nascDia = partes[2];
    }
  }

  const docDigitos = String((cliente as any)?.cpf || cpfInicial || "").replace(
    /\D/g,
    ""
  );
  const tipoDetectado: "pf" | "pj" =
    metaSalvo?.tipoPessoa || (docDigitos.length === 14 ? "pj" : "pf");

  return {
    tipoPessoa: tipoDetectado,
    nome: cliente?.nome || "",
    etiquetas: metaSalvo?.etiquetas || etiquetasIniciais,
    perfil: metaSalvo?.perfil || "Contato",
    apelido: metaSalvo?.apelido || "",
    telefones:
      metaSalvo?.telefones?.length > 0
        ? metaSalvo.telefones
        : [
            {
              tipo: "Celular",
              numero: cliente?.telefone || "",
              operadora: "",
            },
          ],
    emails:
      metaSalvo?.emails?.length > 0
        ? metaSalvo.emails
        : [
            {
              tipo: "Pessoal",
              endereco: cliente?.email || "",
            },
          ],
    sites: metaSalvo?.sites?.length > 0 ? metaSalvo.sites : [""],
    enderecos:
      metaSalvo?.enderecos?.length > 0
        ? metaSalvo.enderecos
        : [
            {
              tipo: "Residencial",
              cep: "",
              rua: (cliente as any)?.logradouro || cliente?.endereco || "",
              numero: (cliente as any)?.numero || "",
              bairro: (cliente as any)?.bairro || "",
              complemento: (cliente as any)?.referencia || "",
              cidade: (cliente as any)?.cidade || "",
              estado: (cliente as any)?.uf || "",
              pais: "Brasil",
            },
          ],
    nascDia: metaSalvo?.nascDia || nascDia,
    nascMes: metaSalvo?.nascMes || nascMes,
    nascAno: metaSalvo?.nascAno || nascAno,
    empresa: metaSalvo?.empresa || "",
    profissao: metaSalvo?.profissao || "",
    atividadeEconomica: metaSalvo?.atividadeEconomica || "",
    estadoCivil: (cliente as any)?.estado_civil || metaSalvo?.estadoCivil || "",
    tratamento: metaSalvo?.tratamento || "",
    codigo: metaSalvo?.codigo || "",
    nomePai: (cliente as any)?.nome_pai || metaSalvo?.nomePai || "",
    nomeMae: (cliente as any)?.nome_mae || metaSalvo?.nomeMae || "",
    naturalidade: metaSalvo?.naturalidade || "",
    nacionalidade: metaSalvo?.nacionalidade || "Brasileira",
    comentarios: metaSalvo?.comentarios || "",
    tipoContaBancaria: metaSalvo?.tipoContaBancaria || "",
    banco: (cliente as any)?.instituicao_financeira || metaSalvo?.banco || "",
    agencia: metaSalvo?.agencia || "",
    conta: metaSalvo?.conta || "",
    pix: cliente?.chave_pix || metaSalvo?.pix || "",
    falecido: Boolean(metaSalvo?.falecido),
    contatoPj: metaSalvo?.contatoPj || "",
    cargoPj: metaSalvo?.cargoPj || "",
    cpf: (cliente as any)?.cpf || cpfInicial || "",
    rg: (cliente as any)?.rg || metaSalvo?.rg || "",
    ctps: metaSalvo?.ctps || "",
    pis: metaSalvo?.pis || "",
    tituloEleitor: metaSalvo?.tituloEleitor || "",
    cnh: (cliente as any)?.cnh || metaSalvo?.cnh || "",
    passaporte: metaSalvo?.passaporte || "",
    certidaoReservista: metaSalvo?.certidaoReservista || "",
    inscricaoEstadual:
      metaSalvo?.inscricaoEstadual ||
      (tipoDetectado === "pj" ? (cliente as any)?.rg || "" : ""),
    inscricaoMunicipal: metaSalvo?.inscricaoMunicipal || "",
    optanteSimplesNacional: metaSalvo?.optanteSimplesNacional || "Não",
  };
}

type ContatoAstreaFormProps = {
  editingCliente?: DbCliente | null;
  etiquetasIniciais?: string[];
  cpfInicial?: string;
  usuarios: any[];
  novoNicho: { nicho: string; principal: string; secundarios: string[] };
  setNovoNicho: (v: {
    nicho: string;
    principal: string;
    secundarios: string[];
  }) => void;
  onRefreshClientes: () => void;
  onCancel: () => void;
  onSave: (dados: DadosAstreaPF) => Promise<void>;
  salvando?: boolean;
};

export const ContatoAstreaForm: React.FC<ContatoAstreaFormProps> = ({
  editingCliente,
  etiquetasIniciais = [],
  cpfInicial = "",
  usuarios,
  novoNicho,
  setNovoNicho,
  onRefreshClientes,
  onCancel,
  onSave,
  salvando = false,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<
    "pessoais" | "complementares" | "documentacao"
  >("pessoais");

  const [dados, setDados] = useState<DadosAstreaPF>(() =>
    extrairDadosAstreaDeCliente(editingCliente, etiquetasIniciais, cpfInicial)
  );

  const { etiquetas: catalogoEtiquetas, adicionarEtiqueta } =
    useEtiquetasKanban();
  const [novaTagNome, setNovaTagNome] = useState("");
  const [novaTagCor, setNovaTagCor] = useState<string>(CORES_ETIQUETAS[0]);

  useEffect(() => {
    setDados(
      extrairDadosAstreaDeCliente(editingCliente, etiquetasIniciais, cpfInicial)
    );
  }, [editingCliente, cpfInicial]);

  const updateField = <K extends keyof DadosAstreaPF>(
    key: K,
    val: DadosAstreaPF[K]
  ) => {
    setDados((prev) => ({ ...prev, [key]: val }));
  };

  const toggleEtiqueta = (nome: string) => {
    setDados((prev) => ({
      ...prev,
      etiquetas: prev.etiquetas.includes(nome)
        ? prev.etiquetas.filter((t) => t !== nome)
        : [...prev.etiquetas, nome],
    }));
  };

  const buscarCep = async (idx: number, cepValor: string) => {
    const limpo = cepValor.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const json = await resp.json();
      if (!json.erro) {
        setDados((prev) => {
          const copia = [...prev.enderecos];
          copia[idx] = {
            ...copia[idx],
            rua: json.logradouro || copia[idx].rua,
            bairro: json.bairro || copia[idx].bairro,
            cidade: json.localidade || copia[idx].cidade,
            estado: json.uf || copia[idx].estado,
          };
          return { ...prev, enderecos: copia };
        });
      }
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(dados);
  };

  const ehPJ = dados.tipoPessoa === "pj";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cabeçalho: Título + Radio Pessoa física / Pessoa jurídica */}
      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-[#010E38] dark:text-[#F1F4F9] tracking-tight">
          {editingCliente ? "Editar contato" : "Adicionar contato"}
        </h2>

        <div className="flex items-center gap-6">
          <label
            onClick={() => updateField("tipoPessoa", "pf")}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none"
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full border flex items-center justify-center",
                !ehPJ
                  ? "border-[#010E38] dark:border-[#EBB52C]"
                  : "border-slate-300"
              )}
            >
              {!ehPJ && (
                <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
              )}
            </span>
            <span>Pessoa física</span>
          </label>

          <label
            onClick={() => updateField("tipoPessoa", "pj")}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer select-none"
          >
            <span
              className={cn(
                "h-4 w-4 rounded-full border flex items-center justify-center",
                ehPJ
                  ? "border-[#010E38] dark:border-[#EBB52C]"
                  : "border-slate-300"
              )}
            >
              {ehPJ && (
                <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
              )}
            </span>
            <span>Pessoa jurídica</span>
          </label>
        </div>
      </div>

      {/* Barra de 3 Abas igual aos prints: Informações pessoais | Informações complementares | Documentação */}
      <div className="bg-[#F1F4F9] dark:bg-white/5 px-4 flex items-center gap-6 border-b border-slate-200 dark:border-white/10 overflow-x-auto">
        {(
          [
            { id: "pessoais", label: "Informações pessoais" },
            { id: "complementares", label: "Informações complementares" },
            { id: "documentacao", label: "Documentação" },
          ] as const
        ).map((tab) => {
          const ativa = abaAtiva === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAbaAtiva(tab.id)}
              className={cn(
                "py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
                ativa
                  ? "border-[#010E38] dark:border-[#EBB52C] text-[#010E38] dark:text-[#EBB52C]"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* ABA 1: INFORMAÇÕES PESSOAIS (PF e PJ)                               */}
      {/* =================================================================== */}
      {abaAtiva === "pessoais" && (
        <div className="space-y-4 max-w-2xl">
          {/* Em PF: Nome* | Em PJ: Empresa* */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              {ehPJ ? "Empresa" : "Nome"}
              <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={ehPJ ? "Digite a empresa" : "Digite o nome"}
              value={dados.nome}
              onChange={(e) => updateField("nome", e.target.value)}
              className="h-9 text-xs border-slate-300"
            />
          </div>

          {/* Etiquetas */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              Etiquetas
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-[#010E38]"
                    title="Selecionar ou criar etiquetas"
                  >
                    <Tag className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 p-3 space-y-2.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                    Etiquetas
                  </p>
                  {catalogoEtiquetas.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhuma etiqueta criada. Crie abaixo:
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {catalogoEtiquetas.map((et) => {
                        const selecionada = dados.etiquetas.includes(et.nome);
                        return (
                          <button
                            key={et.id}
                            type="button"
                            onClick={() => toggleEtiqueta(et.nome)}
                            className={cn(
                              "w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-muted",
                              selecionada && "font-bold bg-muted"
                            )}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <span
                                className="h-3 w-3 rounded-xs shrink-0"
                                style={{ backgroundColor: et.cor }}
                              />
                              <span className="truncate">{et.nome}</span>
                            </span>
                            {selecionada && <Check className="h-3.5 w-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-2 border-t">
                    <input
                      type="color"
                      value={novaTagCor}
                      onChange={(e) => setNovaTagCor(e.target.value)}
                      className="h-7 w-7 rounded border cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <Input
                      placeholder="Nova etiqueta..."
                      value={novaTagNome}
                      onChange={(e) => setNovaTagNome(e.target.value)}
                      className="h-7 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (!novaTagNome.trim()) return;
                        const n = novaTagNome.trim().toUpperCase();
                        adicionarEtiqueta(n, novaTagCor);
                        toggleEtiqueta(n);
                        setNovaTagNome("");
                      }}
                      className="h-7 px-2 bg-[#010E38] text-[#EBB52C] text-xs font-bold"
                    >
                      +
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {dados.etiquetas.map((nome) => {
                const et = catalogoEtiquetas.find((e) => e.nome === nome);
                const bg = et?.cor || "#010E38";
                const text =
                  et && (et.textoEscuro || isCorClara(et.cor))
                    ? "#010E38"
                    : "#FFFFFF";
                return (
                  <span
                    key={nome}
                    style={{ backgroundColor: bg, color: text }}
                    onClick={() => toggleEtiqueta(nome)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer"
                  >
                    {nome} ×
                  </span>
                );
              })}
            </div>
          </div>

          {/* Perfil + Apelido (PF) / Nome fantasia (PJ) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                Perfil
              </label>
              <Select
                value={dados.perfil}
                onValueChange={(v) => updateField("perfil", v)}
              >
                <SelectTrigger className="h-9 text-xs border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Contato" className="text-xs">
                    Contato
                  </SelectItem>
                  <SelectItem value="Cliente" className="text-xs">
                    Cliente
                  </SelectItem>
                  <SelectItem value="Parte contrária" className="text-xs">
                    Parte contrária
                  </SelectItem>
                  <SelectItem value="Testemunha" className="text-xs">
                    Testemunha
                  </SelectItem>
                  <SelectItem value="Correspondente" className="text-xs">
                    Correspondente
                  </SelectItem>
                  <SelectItem value="Perito" className="text-xs">
                    Perito
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-7 space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                {ehPJ ? "Nome fantasia" : "Apelido"}
              </label>
              <Input
                placeholder={
                  ehPJ ? "Digite o nome fantasia" : "Digite o apelido"
                }
                value={dados.apelido}
                onChange={(e) => updateField("apelido", e.target.value)}
                className="h-9 text-xs border-slate-300"
              />
            </div>
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              Telefone
            </label>
            {dados.telefones.map((tel, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
              >
                <div className="sm:col-span-4">
                  <Select
                    value={tel.tipo}
                    onValueChange={(v) => {
                      const copia = [...dados.telefones];
                      copia[idx] = { ...copia[idx], tipo: v };
                      updateField("telefones", copia);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Celular" className="text-xs">
                        Celular
                      </SelectItem>
                      <SelectItem value="WhatsApp" className="text-xs">
                        WhatsApp
                      </SelectItem>
                      <SelectItem value="Comercial" className="text-xs">
                        Comercial
                      </SelectItem>
                      <SelectItem value="Residencial" className="text-xs">
                        Residencial
                      </SelectItem>
                      <SelectItem value="Recado" className="text-xs">
                        Recado
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-4">
                  <Input
                    placeholder="Digite o telefone"
                    value={tel.numero}
                    onChange={(e) => {
                      const copia = [...dados.telefones];
                      copia[idx] = { ...copia[idx], numero: e.target.value };
                      updateField("telefones", copia);
                    }}
                    className="h-9 text-xs border-slate-300 font-data"
                  />
                </div>

                <div className="sm:col-span-3">
                  <Input
                    placeholder="Operadora"
                    value={tel.operadora}
                    onChange={(e) => {
                      const copia = [...dados.telefones];
                      copia[idx] = { ...copia[idx], operadora: e.target.value };
                      updateField("telefones", copia);
                    }}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (dados.telefones.length === 1) {
                        updateField("telefones", [
                          { tipo: "Celular", numero: "", operadora: "" },
                        ]);
                      } else {
                        updateField(
                          "telefones",
                          dados.telefones.filter((_, i) => i !== idx)
                        );
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    title="Remover telefone"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateField("telefones", [
                  ...dados.telefones,
                  { tipo: "Celular", numero: "", operadora: "" },
                ])
              }
              className="text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Adicionar telefone
            </button>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              Email
            </label>
            {dados.emails.map((em, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
              >
                <div className="sm:col-span-3">
                  <Select
                    value={em.tipo}
                    onValueChange={(v) => {
                      const copia = [...dados.emails];
                      copia[idx] = { ...copia[idx], tipo: v };
                      updateField("emails", copia);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pessoal" className="text-xs">
                        Pessoal
                      </SelectItem>
                      <SelectItem value="Profissional" className="text-xs">
                        Profissional
                      </SelectItem>
                      <SelectItem value="Outro" className="text-xs">
                        Outro
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-8">
                  <Input
                    placeholder="Digite o email"
                    value={em.endereco}
                    onChange={(e) => {
                      const copia = [...dados.emails];
                      copia[idx] = { ...copia[idx], endereco: e.target.value };
                      updateField("emails", copia);
                    }}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (dados.emails.length === 1) {
                        updateField("emails", [
                          { tipo: "Pessoal", endereco: "" },
                        ]);
                      } else {
                        updateField(
                          "emails",
                          dados.emails.filter((_, i) => i !== idx)
                        );
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    title="Remover email"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateField("emails", [
                  ...dados.emails,
                  { tipo: "Pessoal", endereco: "" },
                ])
              }
              className="text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Adicionar email
            </button>
          </div>

          {/* Site */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              Site
            </label>
            {dados.sites.map((site, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
              >
                <div className="sm:col-span-11">
                  <Input
                    placeholder="Digite o site"
                    value={site}
                    onChange={(e) => {
                      const copia = [...dados.sites];
                      copia[idx] = e.target.value;
                      updateField("sites", copia);
                    }}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (dados.sites.length === 1) {
                        updateField("sites", [""]);
                      } else {
                        updateField(
                          "sites",
                          dados.sites.filter((_, i) => i !== idx)
                        );
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600"
                    title="Remover site"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateField("sites", [...dados.sites, ""])}
              className="text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Adicionar site
            </button>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              Endereço
            </label>
            {dados.enderecos.map((end, idx) => (
              <div
                key={idx}
                className={cn(
                  "space-y-2.5",
                  idx > 0 && "pt-3 border-t border-slate-200"
                )}
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-3">
                    <Select
                      value={end.tipo}
                      onValueChange={(v) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], tipo: v };
                        updateField("enderecos", copia);
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs border-slate-300">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Residencial" className="text-xs">
                          Residencial
                        </SelectItem>
                        <SelectItem value="Comercial" className="text-xs">
                          Comercial
                        </SelectItem>
                        <SelectItem value="Correspondência" className="text-xs">
                          Correspondência
                        </SelectItem>
                        <SelectItem value="Outro" className="text-xs">
                          Outro
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-8">
                    <Input
                      placeholder="Digite o CEP"
                      value={end.cep}
                      onChange={(e) => {
                        const v = e.target.value;
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], cep: v };
                        updateField("enderecos", copia);
                        if (v.replace(/\D/g, "").length === 8) {
                          buscarCep(idx, v);
                        }
                      }}
                      className="h-9 text-xs border-slate-300 font-data"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (dados.enderecos.length === 1) {
                          updateField("enderecos", [
                            {
                              tipo: "Residencial",
                              cep: "",
                              rua: "",
                              numero: "",
                              bairro: "",
                              complemento: "",
                              cidade: "",
                              estado: "",
                              pais: "Brasil",
                            },
                          ]);
                        } else {
                          updateField(
                            "enderecos",
                            dados.enderecos.filter((_, i) => i !== idx)
                          );
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600"
                      title="Remover endereço"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-8">
                    <Input
                      placeholder="Digite a rua"
                      value={end.rua}
                      onChange={(e) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], rua: e.target.value };
                        updateField("enderecos", copia);
                      }}
                      className="h-9 text-xs border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <Input
                      placeholder="Digite o número"
                      value={end.numero}
                      onChange={(e) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], numero: e.target.value };
                        updateField("enderecos", copia);
                      }}
                      className="h-9 text-xs border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Digite o bairro"
                      value={end.bairro}
                      onChange={(e) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], bairro: e.target.value };
                        updateField("enderecos", copia);
                      }}
                      className="h-9 text-xs border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Digite o complemento"
                      value={end.complemento}
                      onChange={(e) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = {
                          ...copia[idx],
                          complemento: e.target.value,
                        };
                        updateField("enderecos", copia);
                      }}
                      className="h-9 text-xs border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Digite a cidade"
                      value={end.cidade}
                      onChange={(e) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], cidade: e.target.value };
                        updateField("enderecos", copia);
                      }}
                      className="h-9 text-xs border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <Input
                      placeholder="Digite o estado"
                      value={end.estado}
                      onChange={(e) => {
                        const copia = [...dados.enderecos];
                        copia[idx] = { ...copia[idx], estado: e.target.value };
                        updateField("enderecos", copia);
                      }}
                      className="h-9 text-xs border-slate-300"
                    />
                  </div>
                </div>

                <div className="relative">
                  <Input
                    placeholder="Digite o país"
                    value={end.pais}
                    onChange={(e) => {
                      const copia = [...dados.enderecos];
                      copia[idx] = { ...copia[idx], pais: e.target.value };
                      updateField("enderecos", copia);
                    }}
                    className="h-9 pr-8 text-xs border-slate-300"
                  />
                  <Search className="h-4 w-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                updateField("enderecos", [
                  ...dados.enderecos,
                  {
                    tipo: "Residencial",
                    cep: "",
                    rua: "",
                    numero: "",
                    bairro: "",
                    complemento: "",
                    cidade: "",
                    estado: "",
                    pais: "Brasil",
                  },
                ])
              }
              className="text-[11px] font-semibold text-[#010E38] dark:text-[#EBB52C] hover:underline"
            >
              Adicionar endereço
            </button>
          </div>

          {/* Nichos e Responsáveis do Jus+ */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" /> Nicho Jurídico e Responsáveis
            </p>
            {editingCliente ? (
              <ClienteNichos
                cliente={editingCliente as any}
                usuarios={usuarios}
                onChange={onRefreshClientes}
              />
            ) : (
              <div className="space-y-2 rounded-md border p-3 bg-[#F1F4F9]/50 dark:bg-white/5">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Nicho Jurídico
                  </label>
                  <NichoSelect
                    value={novoNicho.nicho}
                    onChange={(v) => setNovoNicho({ ...novoNicho, nicho: v })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Responsável principal
                    </label>
                    <PrincipalSelect
                      usuarios={usuarios}
                      value={novoNicho.principal}
                      onChange={(id) =>
                        setNovoNicho({ ...novoNicho, principal: id })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Parceiros secundários
                    </label>
                    <SecundariosSelect
                      usuarios={usuarios}
                      value={novoNicho.secundarios}
                      excluir={novoNicho.principal}
                      onChange={(ids) =>
                        setNovoNicho({ ...novoNicho, secundarios: ids })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 2: INFORMAÇÕES COMPLEMENTARES (PF vs PJ)                        */}
      {/* =================================================================== */}
      {abaAtiva === "complementares" && (
        <div className="space-y-4 max-w-2xl">
          {ehPJ ? (
            /* Campos específicos de Pessoa Jurídica (Print 2 de PJ) */
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Contato
                </label>
                <div className="relative">
                  <Input
                    placeholder="Digite o contato"
                    value={dados.contatoPj}
                    onChange={(e) => updateField("contatoPj", e.target.value)}
                    className="h-9 pr-8 text-xs border-slate-300"
                  />
                  <Search className="h-4 w-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Cargo
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="Digite o cargo"
                      value={dados.cargoPj}
                      onChange={(e) => updateField("cargoPj", e.target.value)}
                      className="h-9 pr-8 text-xs border-slate-300"
                    />
                    <Search className="h-4 w-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Código
                  </label>
                  <Input
                    placeholder="Digite o código"
                    value={dados.codigo}
                    onChange={(e) => updateField("codigo", e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Campos específicos de Pessoa Física (Print 2 de PF) */
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Nascimento
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <Select
                    value={dados.nascDia || undefined}
                    onValueChange={(v) => updateField("nascDia", v)}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Dia" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS.map((d) => (
                        <SelectItem key={d} value={d} className="text-xs">
                          {Number(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={dados.nascMes || undefined}
                    onValueChange={(v) => updateField("nascMes", v)}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem
                          key={m.val}
                          value={m.val}
                          className="text-xs"
                        >
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={dados.nascAno || undefined}
                    onValueChange={(v) => updateField("nascAno", v)}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {ANOS.map((a) => (
                        <SelectItem key={a} value={a} className="text-xs">
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Empresa
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="Digite a empresa"
                      value={dados.empresa}
                      onChange={(e) => updateField("empresa", e.target.value)}
                      className="h-9 pr-8 text-xs border-slate-300"
                    />
                    <Search className="h-4 w-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Profissão
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="Digite a profissão"
                      value={dados.profissao}
                      onChange={(e) => updateField("profissao", e.target.value)}
                      className="h-9 pr-8 text-xs border-slate-300"
                    />
                    <Search className="h-4 w-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Atividade econômica
                  </label>
                  <Input
                    placeholder="Digite o código da atividade econômica"
                    value={dados.atividadeEconomica}
                    onChange={(e) =>
                      updateField("atividadeEconomica", e.target.value)
                    }
                    className="h-9 text-xs border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Estado civil
                  </label>
                  <Input
                    placeholder="Digite o estado civil"
                    value={dados.estadoCivil}
                    onChange={(e) => updateField("estadoCivil", e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Tratamento
                  </label>
                  <Select
                    value={dados.tratamento || undefined}
                    onValueChange={(v) => updateField("tratamento", v)}
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sr." className="text-xs">
                        Sr.
                      </SelectItem>
                      <SelectItem value="Sra." className="text-xs">
                        Sra.
                      </SelectItem>
                      <SelectItem value="Dr." className="text-xs">
                        Dr.
                      </SelectItem>
                      <SelectItem value="Dra." className="text-xs">
                        Dra.
                      </SelectItem>
                      <SelectItem value="V. Exa." className="text-xs">
                        V. Exa.
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Código
                  </label>
                  <Input
                    placeholder="Digite o código"
                    value={dados.codigo}
                    onChange={(e) => updateField("codigo", e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Filiação
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Nome do pai"
                    value={dados.nomePai}
                    onChange={(e) => updateField("nomePai", e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                  <Input
                    placeholder="Nome da mãe"
                    value={dados.nomeMae}
                    onChange={(e) => updateField("nomeMae", e.target.value)}
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Naturalidade
                  </label>
                  <Input
                    placeholder="Digite a cidade"
                    value={dados.naturalidade}
                    onChange={(e) =>
                      updateField("naturalidade", e.target.value)
                    }
                    className="h-9 text-xs border-slate-300"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Nacionalidade
                  </label>
                  <Input
                    placeholder="Digite o país"
                    value={dados.nacionalidade}
                    onChange={(e) =>
                      updateField("nacionalidade", e.target.value)
                    }
                    className="h-9 text-xs border-slate-300"
                  />
                </div>
              </div>
            </>
          )}

          {/* Comentários (Comum em PF e PJ) */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
              Comentários
            </label>
            <Textarea
              rows={3}
              placeholder="Digite um comentário"
              value={dados.comentarios}
              onChange={(e) => updateField("comentarios", e.target.value)}
              className="text-xs border-slate-300"
            />
          </div>

          {/* CONTA BANCÁRIA (Comum em PF e PJ) */}
          <div className="pt-2 space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
              CONTA BANCÁRIA
            </p>

            <div className="flex items-center gap-6">
              <label
                onClick={() => updateField("tipoContaBancaria", "corrente")}
                className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer select-none"
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center",
                    dados.tipoContaBancaria === "corrente"
                      ? "border-[#010E38] dark:border-[#EBB52C]"
                      : "border-slate-300"
                  )}
                >
                  {dados.tipoContaBancaria === "corrente" && (
                    <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                  )}
                </span>
                <span>Conta corrente</span>
              </label>

              <label
                onClick={() => updateField("tipoContaBancaria", "poupanca")}
                className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 cursor-pointer select-none"
              >
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border flex items-center justify-center",
                    dados.tipoContaBancaria === "poupanca"
                      ? "border-[#010E38] dark:border-[#EBB52C]"
                      : "border-slate-300"
                  )}
                >
                  {dados.tipoContaBancaria === "poupanca" && (
                    <span className="h-2 w-2 rounded-full bg-[#010E38] dark:bg-[#EBB52C]" />
                  )}
                </span>
                <span>Conta poupança</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                Banco
              </label>
              <Input
                placeholder="Digite o banco"
                value={dados.banco}
                onChange={(e) => updateField("banco", e.target.value)}
                className="h-9 text-xs border-slate-300"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Agência
                </label>
                <Input
                  placeholder="Digite a agência"
                  value={dados.agencia}
                  onChange={(e) => updateField("agencia", e.target.value)}
                  className="h-9 text-xs border-slate-300 font-data"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Conta
                </label>
                <Input
                  placeholder="Digite o número da conta"
                  value={dados.conta}
                  onChange={(e) => updateField("conta", e.target.value)}
                  className="h-9 text-xs border-slate-300 font-data"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                Pix
              </label>
              <Input
                placeholder="Digite a chave pix"
                value={dados.pix}
                onChange={(e) => updateField("pix", e.target.value)}
                className="h-9 text-xs border-slate-300"
              />
            </div>
          </div>

          {/* DADOS OBITUÁRIOS (Apenas em Pessoa Física) */}
          {!ehPJ && (
            <div className="pt-2 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C]">
                DADOS OBITUÁRIOS
              </p>
              <label className="inline-flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                <span>CONTATO FALECIDO?</span>
                <input
                  type="checkbox"
                  checked={dados.falecido}
                  onChange={(e) => updateField("falecido", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* ABA 3: DOCUMENTAÇÃO (PF vs PJ)                                      */}
      {/* =================================================================== */}
      {abaAtiva === "documentacao" && (
        <div className="space-y-4 max-w-2xl">
          {ehPJ ? (
            /* Documentação de Pessoa Jurídica (Print 3 de PJ) */
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  CNPJ
                </label>
                <Input
                  placeholder="Digite o CNPJ"
                  value={dados.cpf}
                  onChange={(e) => updateField("cpf", e.target.value)}
                  className="h-9 text-xs border-slate-300 font-data"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Inscrição estadual
                  </label>
                  <Input
                    placeholder="Digite a inscrição estadual"
                    value={dados.inscricaoEstadual}
                    onChange={(e) => {
                      updateField("inscricaoEstadual", e.target.value);
                      updateField("rg", e.target.value);
                    }}
                    className="h-9 text-xs border-slate-300 font-data"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                    Inscrição municipal
                  </label>
                  <Input
                    placeholder="Digite a inscrição municipal"
                    value={dados.inscricaoMunicipal}
                    onChange={(e) =>
                      updateField("inscricaoMunicipal", e.target.value)
                    }
                    className="h-9 text-xs border-slate-300 font-data"
                  />
                </div>
              </div>

              <div className="space-y-1 max-w-xs">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Optante Simples Nacional
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={dados.optanteSimplesNacional}
                    onValueChange={(v) =>
                      updateField(
                        "optanteSimplesNacional",
                        v as "Não" | "Sim"
                      )
                    }
                  >
                    <SelectTrigger className="h-9 text-xs border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não" className="text-xs">
                        Não
                      </SelectItem>
                      <SelectItem value="Sim" className="text-xs">
                        Sim
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-[#010E38] dark:text-[#EBB52C]">
                        <HelpCircle className="h-4 w-4 fill-[#010E38] text-white dark:fill-[#EBB52C] dark:text-[#010E38]" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-xs">
                      Informe se a empresa é optante pelo regime tributário do
                      Simples Nacional.
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </>
          ) : (
            /* Documentação de Pessoa Física (Print 3 de PF) */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  CPF
                </label>
                <Input
                  placeholder="Digite o CPF"
                  value={dados.cpf}
                  onChange={(e) => updateField("cpf", e.target.value)}
                  className="h-9 text-xs border-slate-300 font-data"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  RG
                </label>
                <Input
                  placeholder="Número/emissão/emissor"
                  value={dados.rg}
                  onChange={(e) => updateField("rg", e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  CTPS
                </label>
                <Input
                  placeholder="Número / série / emissão / UF"
                  value={dados.ctps}
                  onChange={(e) => updateField("ctps", e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  PIS
                </label>
                <Input
                  placeholder="Número"
                  value={dados.pis}
                  onChange={(e) => updateField("pis", e.target.value)}
                  className="h-9 text-xs border-slate-300 font-data"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Título de eleitor
                </label>
                <Input
                  placeholder="Número/zona/sessão"
                  value={dados.tituloEleitor}
                  onChange={(e) => updateField("tituloEleitor", e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  CNH
                </label>
                <Input
                  placeholder="Número/categoria/vencimento"
                  value={dados.cnh}
                  onChange={(e) => updateField("cnh", e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Passaporte
                </label>
                <Input
                  placeholder="Número/tipo/emissor/autoridade/vencimento"
                  value={dados.passaporte}
                  onChange={(e) => updateField("passaporte", e.target.value)}
                  className="h-9 text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
                  Certidão reservista
                </label>
                <Input
                  placeholder="Número/espécie/categoria"
                  value={dados.certidaoReservista}
                  onChange={(e) =>
                    updateField("certidaoReservista", e.target.value)
                  }
                  className="h-9 text-xs border-slate-300"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rodapé Cancelar / SALVAR igual aos prints */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-200 dark:border-white/10 max-w-2xl">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-[#010E38] dark:text-[#F1F4F9] hover:underline px-3 py-2"
        >
          Cancelar
        </button>
        <Button
          type="submit"
          disabled={salvando}
          className="h-9 px-6 bg-[#010E38] hover:bg-[#010E38]/90 text-[#EBB52C] text-xs font-extrabold uppercase tracking-wider rounded-md"
        >
          {salvando ? "SALVANDO..." : "SALVAR"}
        </Button>
      </div>
    </form>
  );
};
