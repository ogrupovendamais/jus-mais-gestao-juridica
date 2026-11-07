
export type Cliente = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  endereco: string;
  dataRegistro: string;
  processosAtivos: number;
  status: string;
  ultimoContato: string;
};

export const initialClientes: Cliente[] = [
  {
    id: 1,
    nome: "João Silva",
    email: "joao.silva@email.com",
    telefone: "(11) 99999-9999",
    endereco: "São Paulo, SP",
    dataRegistro: "15/01/2024",
    processosAtivos: 3,
    status: "Ativo",
    ultimoContato: "05/06/2025"
  },
  {
    id: 2,
    nome: "Maria Santos",
    email: "maria.santos@email.com",
    telefone: "(11) 88888-8888",
    endereco: "Rio de Janeiro, RJ",
    dataRegistro: "22/02/2024",
    processosAtivos: 1,
    status: "Ativo",
    ultimoContato: "10/06/2025"
  },
  {
    id: 3,
    nome: "Pedro Oliveira",
    email: "pedro.oliveira@email.com",
    telefone: "(11) 77777-7777",
    endereco: "Belo Horizonte, MG",
    dataRegistro: "10/03/2024",
    processosAtivos: 0,
    status: "Inativo",
    ultimoContato: "01/05/2025"
  },
  {
    id: 4,
    nome: "Ana Costa",
    email: "ana.costa@email.com",
    telefone: "(11) 66666-6666",
    endereco: "Salvador, BA",
    dataRegistro: "05/04/2024",
    processosAtivos: 2,
    status: "Ativo",
    ultimoContato: "12/06/2025"
  }
];
