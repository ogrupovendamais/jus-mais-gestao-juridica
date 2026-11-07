import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { adjustDateForTimezone } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useRascunho } from "@/hooks/useRascunho";
import { useEffect } from "react";
import { isoData, motivoNaoUtil, dataDeIso, vencimentoMensal } from "@/lib/diasUteis";

const lancamentoSchema = z.object({
  descricao: z.string().optional().or(z.literal('')),
  valor: z.coerce.number().optional(),
  dataVencimento: z.date().optional(),
  clienteId: z.string().optional().or(z.literal('')),
  tipo_lancamento: z.enum(["Receita", "Despesa", "Acordo", "Sucumbência"]).optional(),
  pctCliente: z.coerce.number().min(0).max(100).optional(),
  pctParceiro: z.coerce.number().min(0).max(100).optional(),
  pctParceiro2: z.coerce.number().min(0).max(100).optional(),
  pctParceiro3: z.coerce.number().min(0).max(100).optional(),
  pctReserva: z.coerce.number().min(0).max(100).optional(),
  valor_sucumbencia: z.coerce.number().optional(),
  separar_lancamento_sucumbencia: z.boolean().optional(),
  data_vencimento_sucumbencia: z.date().optional(),
  instituicao_financeira: z.string().optional().or(z.literal('')),
  instituicao_financeira_outra: z.string().optional().or(z.literal('')),
  depositante: z.string().optional().or(z.literal('')),
  data_fato_gerador: z.date().optional(),
  forma_recebimento: z.string().optional().or(z.literal('')),
  parcelas: z.coerce.number().min(1).max(120).optional(),
  // datas de vencimento de cada parcela (AAAA-MM-DD), já ajustadas para dia útil e editáveis
  vencimentos: z.array(z.string()).optional(),
  caixa_box: z.string().optional().or(z.literal('')),
  parceiro_id_1: z.string().optional().nullable(),
  parceiro_id_2: z.string().optional().nullable(),
  parceiro_id_3: z.string().optional().nullable(),
});

export type LancamentoFormValues = z.infer<typeof lancamentoSchema>;

type LancamentoFormProps = {
  onSubmit: (data: LancamentoFormValues) => void | Promise<void>;
  lancamento?: {
    id?: string;
    descricao: string;
    valor: number;
    dataVencimento: string;
    clienteId: string;
    tipo_lancamento?: "Receita" | "Despesa" | "Acordo" | "Sucumbência" | null;
    pctCliente?: number | null;
    pctParceiro?: number | null;
    pctParceiro2?: number | null;
    pctParceiro3?: number | null;
    pctReserva?: number | null;
    valor_sucumbencia?: number | null;
    instituicao_financeira?: string | null;
    instituicao_financeira_outra?: string | null;
    depositante?: string | null;
    data_fato_gerador?: string | null;
    forma_recebimento?: string | null;
    parcelas?: number | null;
    caixa_box?: string | null;
    parceiro_id_1?: string | null;
    parceiro_id_2?: string | null;
    parceiro_id_3?: string | null;
    // como vem do banco (lista do Financeiro)
    valor_cliente?: number | null;
    valor_escritorio?: number | null;
    valor_parceiro?: number | null;
    pct_parceiro2?: number | null;
    pct_parceiro3?: number | null;
    pct_reserva?: number | null;
  } | null;
  clientes: { id: string; nome: string }[];
  parceiros: { id: string; full_name: string }[];
};

// % gravados no lançamento. O banco guarda só os R$ do cliente e do parceiro 1,
// então esses % são recalculados a partir dos valores (edição não pode voltar ao padrão 60/20/5).
const arred = (n: number) => (Math.abs(n - Math.round(n)) < 0.01 ? Math.round(n) : Math.round(n * 100) / 100);
const pctSalvos = (l: LancamentoFormProps["lancamento"]) => {
  if (!l) return { pctCliente: 60, pctParceiro: 20, pctParceiro2: 0, pctParceiro3: 0, pctReserva: 5 };
  const valor = Number(l.valor) || 0;
  const valCliente = l.valor_cliente != null ? Number(l.valor_cliente) : null;
  const escritorio = valor - (valCliente ?? 0);
  return {
    pctCliente: l.pctCliente ?? (valor > 0 && valCliente != null ? arred((valCliente / valor) * 100) : l.tipo_lancamento === "Acordo" ? 60 : 0),
    pctParceiro: l.pctParceiro ?? (escritorio > 0 && l.valor_parceiro != null ? arred((Number(l.valor_parceiro) / escritorio) * 100) : l.parceiro_id_1 ? 20 : 0),
    pctParceiro2: l.pctParceiro2 ?? l.pct_parceiro2 ?? 0,
    pctParceiro3: l.pctParceiro3 ?? l.pct_parceiro3 ?? 0,
    pctReserva: l.pctReserva ?? l.pct_reserva ?? 5,
  };
};

export function LancamentoForm({
  onSubmit,
  lancamento,
  clientes,
  parceiros = [],
}: LancamentoFormProps) {
  const { role, user } = useAuth();
  const isParceiro = role === "parceiro";

  const form = useForm<LancamentoFormValues>({
    resolver: zodResolver(lancamentoSchema),
    defaultValues: {
      descricao: lancamento?.descricao || "",
      valor: lancamento?.valor || 0,
      dataVencimento: lancamento?.dataVencimento
        ? new Date(lancamento.dataVencimento)
        : undefined,
      clienteId: lancamento?.clienteId.toString() || "",
      tipo_lancamento: (lancamento?.tipo_lancamento) || "Receita",
      ...pctSalvos(lancamento),
      valor_sucumbencia: lancamento?.valor_sucumbencia || 0,
      separar_lancamento_sucumbencia: true,
      data_vencimento_sucumbencia: undefined,
      instituicao_financeira: (() => {
        if (!lancamento?.instituicao_financeira) return "";
        const standard = ["Banco do Brasil", "Caixa Econômica", "Bradesco", "Itaú", "Santander", "Nubank", "Inter", "Sicredi", "Sicoob", "Outro"];
        if (standard.includes(lancamento.instituicao_financeira)) return lancamento.instituicao_financeira;
        return "Outro";
      })(),
      instituicao_financeira_outra: (() => {
        if (!lancamento?.instituicao_financeira) return "";
        const standard = ["Banco do Brasil", "Caixa Econômica", "Bradesco", "Itaú", "Santander", "Nubank", "Inter", "Sicredi", "Sicoob", "Outro"];
        if (!standard.includes(lancamento.instituicao_financeira)) return lancamento.instituicao_financeira;
        return "";
      })(),
      depositante: lancamento?.depositante || "",
      data_fato_gerador: lancamento?.data_fato_gerador ? new Date(lancamento.data_fato_gerador) : undefined,
      forma_recebimento: lancamento?.forma_recebimento || "",
      parcelas: lancamento?.parcelas || 1,
      caixa_box: lancamento?.caixa_box || "",
      parceiro_id_1: lancamento?.parceiro_id_1 || null,
      parceiro_id_2: lancamento?.parceiro_id_2 || null,
      parceiro_id_3: lancamento?.parceiro_id_3 || null,
    },
  });

  // rascunho: o formulário só existe enquanto o diálogo está aberto
  const rascunho = useRascunho(form, user ? `lancamento:${lancamento?.id || "novo"}:${user.id}` : null);
  const enviar = (data: LancamentoFormValues) => {
    rascunho.limpar();
    return onSubmit(data);
  };

  const tipoLancamento = form.watch("tipo_lancamento");
  const rawValor = form.watch("valor");
  const valor = Number(rawValor) || 0;
  const pctCliente = Number(form.watch("pctCliente") ?? 60);
  const pctParceiro = Number(form.watch("pctParceiro") ?? 20);
  const pctParceiro2 = Number(form.watch("pctParceiro2") ?? 0);
  const pctParceiro3 = Number(form.watch("pctParceiro3") ?? 0);
  const pctReserva = Number(form.watch("pctReserva") ?? 5);
  const parcelas = Number(form.watch("parcelas") || 1);
  const dataVencimento = form.watch("dataVencimento");
  const vencimentos = form.watch("vencimentos") || [];
  const nParcelas = Math.max(1, Math.min(120, Math.floor(parcelas) || 1));

  useEffect(() => {
    if (lancamento || !dataVencimento) {
      form.setValue("vencimentos", undefined);
      return;
    }
    const lista = Array.from({ length: nParcelas }, (_, i) => isoData(vencimentoMensal(dataVencimento, i).data));
    form.setValue("vencimentos", lista);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataVencimento?.getTime(), nParcelas, lancamento]);

  const avisoAjuste = (i: number) => {
    if (!dataVencimento) return null;
    return vencimentoMensal(dataVencimento, i).ajustadoDe;
  };
  const valorSucumbencia = Number(form.watch("valor_sucumbencia") || 0);

  // Calculadora de Split do Acordo em Tempo Real
  const calcValCliente = Number((valor || 0) * (pctCliente / 100)) || 0;
  const calcValEscritorio = Number((valor || 0) - calcValCliente) || 0;
  const calcValParceiro = Number(calcValEscritorio * (pctParceiro / 100)) || 0;
  const calcValParceiro2 = Number(calcValEscritorio * (pctParceiro2 / 100)) || 0;
  const calcValParceiro3 = Number(calcValEscritorio * (pctParceiro3 / 100)) || 0;
  const calcValReserva = Number(calcValEscritorio * (pctReserva / 100)) || 0;

  const safeParcelas = parcelas > 0 ? parcelas : 1;
  const calcValClientePorParcela = Number(calcValCliente / safeParcelas) || 0;
  const calcValEscritorioPorParcela = Number(calcValEscritorio / safeParcelas) || 0;
  const calcValParceiroPorParcela = Number(calcValParceiro / safeParcelas) || 0;
  const calcValParceiro2PorParcela = Number(calcValParceiro2 / safeParcelas) || 0;
  const calcValParceiro3PorParcela = Number(calcValParceiro3 / safeParcelas) || 0;
  const calcValReservaPorParcela = Number(calcValReserva / safeParcelas) || 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(enviar)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tipo_lancamento"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm font-medium">Tipo de Lançamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Receita">Receita (Honorários normais)</SelectItem>
                    {!isParceiro && (
                      <SelectItem value="Despesa">Despesa (Custos/Infraestrutura)</SelectItem>
                    )}
                    <SelectItem value="Acordo">Acordo Judicial (Com rateio/split)</SelectItem>
                    <SelectItem value="Sucumbência">Honorários Sucumbenciais (100% Banca + Reserva)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="descricao"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm font-medium">Descrição</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Honorários iniciais ou Acordo Cível" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="data_fato_gerador"
            render={({ field }) => (
              <FormItem className="sm:col-span-2 flex flex-col">
                <FormLabel className="text-sm font-medium">Data do Fato Gerador (ex: Data do Acordo)</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal text-sm",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione a data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  {tipoLancamento === "Acordo" ? "Valor do Acordo (R$)" : "Valor (R$)"}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 1500.00"
                    className="text-sm"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dataVencimento"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-sm font-medium">Data de Vencimento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal text-sm w-full",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Escolha uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(adjustDateForTimezone(date));
                        }
                      }}
                      disabled={(date) => date < new Date("1900-01-01")}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {!lancamento && dataVencimento && (
            <div className="sm:col-span-2 rounded-lg border p-3 space-y-3 bg-muted/10">
              <div className="flex flex-wrap items-end gap-3">
                <FormField
                  control={form.control}
                  name="parcelas"
                  render={({ field }) => (
                    <FormItem className="w-40">
                      <FormLabel className="text-sm font-medium">Número de Parcelas</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="120" className="text-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <p className="text-xs text-muted-foreground flex-1 min-w-[200px]">
                  {nParcelas > 1
                    ? `Uma parcela por mês a partir da data de vencimento. Valor de cada parcela: R$ ${(valor / nParcelas).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
                    : "Lançamento único."}{" "}
                  Vencimentos em sábado, domingo ou feriado bancário passam para o próximo dia útil. Ajuste qualquer data abaixo, se precisar.
                </p>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {vencimentos.map((v, i) => {
                  const aviso = avisoAjuste(i);
                  const naoUtil = v ? motivoNaoUtil(dataDeIso(v)) : null;
                  return (
                    <div key={i} className="grid grid-cols-12 items-center gap-2 text-xs">
                      <span className="col-span-3 sm:col-span-2 font-medium">{nParcelas > 1 ? `Parcela ${i + 1}/${nParcelas}` : "Vencimento"}</span>
                      <Input
                        type="date"
                        className="col-span-5 sm:col-span-4 h-8 text-xs"
                        value={v}
                        onChange={(e) => {
                          const novo = [...vencimentos];
                          novo[i] = e.target.value;
                          form.setValue("vencimentos", novo);
                        }}
                      />
                      <span className={cn("col-span-4 sm:col-span-6", naoUtil ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                        {naoUtil ? `Atenção: cai em ${naoUtil}` : aviso ? `ajustado (${aviso})` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="clienteId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm font-medium">Cliente</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
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
            name="forma_recebimento"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm font-medium">Forma de Recebimento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione a forma de recebimento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instituicao_financeira"
            render={({ field }) => (
              <FormItem className="sm:col-span-1">
                <FormLabel className="text-sm font-medium">Instituição Financeira</FormLabel>
                <div className="flex gap-2">
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Banco do Brasil">Banco do Brasil</SelectItem>
                      <SelectItem value="Caixa Econômica">Caixa Econômica</SelectItem>
                      <SelectItem value="Bradesco">Bradesco</SelectItem>
                      <SelectItem value="Itaú">Itaú</SelectItem>
                      <SelectItem value="Santander">Santander</SelectItem>
                      <SelectItem value="Nubank">Nubank</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Sicredi">Sicredi</SelectItem>
                      <SelectItem value="Sicoob">Sicoob</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("instituicao_financeira") === "Outro" && (
            <FormField
              control={form.control}
              name="instituicao_financeira_outra"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel className="text-sm font-medium">Qual?</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do banco" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="depositante"
            render={({ field }) => (
              <FormItem className="sm:col-span-1">
                <FormLabel className="text-sm font-medium">Depositante (Reclamada)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Empresa XYZ" className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="caixa_box"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-sm font-medium">Caixa BOX (Comprovante)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Caixa 01, Gaveta A..." className="text-sm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {tipoLancamento === "Acordo" && (
            <>
              <FormField
                control={form.control}
                name="pctCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Repasse ao Cliente (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pctParceiro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Comissão do Parceiro (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="text-sm mb-2"
                        {...field}
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="parceiro_id_1"
                      render={({ field: selectField }) => (
                        <Select onValueChange={selectField.onChange} value={selectField.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecione o Parceiro 1" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {parceiros.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pctParceiro2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Comissão do Parceiro 2 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="text-sm mb-2"
                        {...field}
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="parceiro_id_2"
                      render={({ field: selectField }) => (
                        <Select onValueChange={selectField.onChange} value={selectField.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecione o Parceiro 2" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {parceiros.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pctParceiro3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Comissão do Parceiro 3 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="text-sm mb-2"
                        {...field}
                      />
                    </FormControl>
                    <FormField
                      control={form.control}
                      name="parceiro_id_3"
                      render={({ field: selectField }) => (
                        <Select onValueChange={selectField.onChange} value={selectField.value || undefined}>
                          <FormControl>
                            <SelectTrigger className="text-sm">
                              <SelectValue placeholder="Selecione o Parceiro 3" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {parceiros.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pctReserva"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Reserva Adm. (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_sucumbencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Sucumbência (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {Number(form.watch("valor_sucumbencia")) > 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="separar_lancamento_sucumbencia"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2 flex flex-row items-center justify-between rounded-lg border border-amber-500/30 p-3 bg-amber-500/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-medium text-amber-500">
                            Gerar lançamento avulso para a Sucumbência
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Cria um registro próprio de Honorários Sucumbenciais para acompanhamento de guia/alvará avulso.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("separar_lancamento_sucumbencia") && (
                    <FormField
                      control={form.control}
                      name="data_vencimento_sucumbencia"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2 flex flex-col">
                          <FormLabel className="text-sm font-medium text-amber-500">
                            Previsão / Vencimento da Sucumbência
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal text-sm border-amber-500/30",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: ptBR })
                                  ) : (
                                    <span>Mesma data da primeira parcela (ou selecione outra)</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              <div className="sm:col-span-2 bg-[#EBB52C]/15 dark:bg-[#EBB52C]/10 border border-[#EBB52C]/30 rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#010E38] dark:text-[#EBB52C] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Calculadora de Split do Acordo
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">R$ Cliente ({pctCliente}%)</span>
                    <span className="font-semibold text-foreground">
                      R$ {calcValCliente.toFixed(2)} 
                      {parcelas > 1 && <span className="text-[10px] font-normal text-muted-foreground ml-1">(R$ {calcValClientePorParcela.toFixed(2)}/mês)</span>}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Bruto Escritório ({100 - pctCliente}%)</span>
                    <span className="font-semibold text-[#010E38] dark:text-[#EBB52C]">
                      R$ {calcValEscritorio.toFixed(2)}
                      {parcelas > 1 && <span className="text-[10px] font-normal opacity-70 ml-1">(R$ {calcValEscritorioPorParcela.toFixed(2)}/mês)</span>}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Parceiro 1 ({pctParceiro}% CAdv)</span>
                    <span className="font-semibold text-green-500 font-mono">
                      R$ {calcValParceiro.toFixed(2)}
                      {parcelas > 1 && <span className="text-[10px] font-normal opacity-70 ml-1 font-sans">(R$ {calcValParceiroPorParcela.toFixed(2)}/mês)</span>}
                    </span>
                  </div>
                  {(pctParceiro2 || 0) > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase">Parceiro 2 ({pctParceiro2}% CAdv)</span>
                      <span className="font-semibold text-green-500 font-mono">
                        R$ {calcValParceiro2.toFixed(2)}
                        {parcelas > 1 && <span className="text-[10px] font-normal opacity-70 ml-1 font-sans">(R$ {calcValParceiro2PorParcela.toFixed(2)}/mês)</span>}
                      </span>
                    </div>
                  )}
                  {(pctParceiro3 || 0) > 0 && (
                    <div className="space-y-0.5">
                      <span className="text-muted-foreground block text-[10px] uppercase">Parceiro 3 ({pctParceiro3}% CAdv)</span>
                      <span className="font-semibold text-green-500 font-mono">
                        R$ {calcValParceiro3.toFixed(2)}
                        {parcelas > 1 && <span className="text-[10px] font-normal opacity-70 ml-1 font-sans">(R$ {calcValParceiro3PorParcela.toFixed(2)}/mês)</span>}
                      </span>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <span className="text-muted-foreground block text-[10px] uppercase">Reserva Adm. ({pctReserva}% CAdv)</span>
                    <span className="font-semibold text-orange-500 font-mono">
                      R$ {calcValReserva.toFixed(2)}
                      {parcelas > 1 && <span className="text-[10px] font-normal opacity-70 ml-1 font-sans">(R$ {calcValReservaPorParcela.toFixed(2)}/mês)</span>}
                    </span>
                  </div>
                </div>

                  {valorSucumbencia > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#EBB52C]/30">
                      <div className="bg-amber-500/10 border border-amber-500/25 rounded-md p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                            ⚖️ SUCUMBÊNCIA DA BANCA
                          </span>
                          <span className="text-xs font-bold text-amber-500 font-mono">
                            R$ {valorSucumbencia.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Destinado integralmente ao escritório (sem repasse para cliente ou parceiros).
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-500/20 text-xs">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Retenção Reserva ({pctReserva}%)</span>
                            <span className="font-semibold text-orange-400 font-mono">
                              R$ {(valorSucumbencia * (pctReserva / 100)).toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Líquido Escritório</span>
                            <span className="font-semibold text-emerald-400 font-mono">
                              R$ {(valorSucumbencia * (1 - pctReserva / 100)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </>
          )}

          {tipoLancamento === "Sucumbência" && (
            <>
              <FormField
                control={form.control}
                name="pctReserva"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-sm font-medium">Retenção de Reserva Adm. do Escritório (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        className="text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                    ⚖️ Honorários Sucumbenciais da Banca
                  </span>
                  <span className="text-sm font-bold text-amber-500 font-mono">
                    R$ {Number(valor || 0).toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor 100% pertencente ao escritório.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-amber-500/20 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Caixa Reserva Adm. ({pctReserva}%)</span>
                    <span className="font-semibold text-orange-400 font-mono">
                      R$ {(Number(valor || 0) * (pctReserva / 100)).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Líquido Caixa Escritório</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      R$ {(Number(valor || 0) * (1 - pctReserva / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        <Button type="submit" className="w-full text-sm py-5 mt-4" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Salvando..." : "Salvar Lançamento"}
        </Button>
      </form>
    </Form>
  );
}
