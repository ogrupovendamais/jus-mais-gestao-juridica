
export type LancamentoFinanceiro = {
  id: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: 'Pago' | 'Pendente';
  clienteId: number;
  clienteNome: string;
};

export const initialLancamentos: LancamentoFinanceiro[] = [
  {
    id: 1,
    descricao: "Honorários Iniciais - Processo 123",
    valor: 1500.00,
    dataVencimento: "2025-06-20",
    status: "Pendente",
    clienteId: 1,
    clienteNome: "João Silva"
  },
  {
    id: 2,
    descricao: "Custas processuais",
    valor: 350.50,
    dataVencimento: "2025-06-10",
    status: "Pago",
    dataPagamento: "2025-06-08",
    clienteId: 2,
    clienteNome: "Maria Santos"
  },
  {
    id: 3,
    descricao: "Consulta Jurídica",
    valor: 500.00,
    dataVencimento: "2025-05-30",
    status: "Pendente",
    clienteId: 4,
    clienteNome: "Ana Costa"
  },
  {
    id: 4,
    descricao: "Segunda parcela - Acordo",
    valor: 2500.00,
    dataVencimento: "2025-07-01",
    status: "Pendente",
    clienteId: 1,
    clienteNome: "João Silva"
  },
  {
    id: 5,
    descricao: "Honorários de Êxito",
    valor: 5000.00,
    dataVencimento: "2025-06-05",
    status: "Pago",
    dataPagamento: "2025-06-05",
    clienteId: 3,
    clienteNome: "Pedro Oliveira"
  }
];
