-- Dados fictícios para o sistema AdvogaPRO
-- Período: Julho 2025 em diante
-- Execute este script no Supabase SQL Editor

-- IMPORTANTE: Substitua 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b' pelo ID real do seu usuário autenticado
-- Você pode obter seu user_id executando: SELECT auth.uid();
-- Depois substitua todas as ocorrências de 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b' pelo seu ID real

-- 1. CLIENTES
INSERT INTO public.clientes (user_id, nome, email, telefone, endereco, data_registro, processos_ativos, status, ultimo_contato) VALUES
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Maria Silva Santos', 'maria.silva@email.com', '(11) 99999-1111', 'Rua das Flores, 123 - São Paulo/SP', '2025-07-01', 2, 'Ativo', '2025-08-15'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'João Carlos Oliveira', 'joao.carlos@email.com', '(11) 99999-2222', 'Av. Paulista, 456 - São Paulo/SP', '2025-07-05', 1, 'Ativo', '2025-08-10'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Ana Paula Costa', 'ana.paula@email.com', '(11) 99999-3333', 'Rua Augusta, 789 - São Paulo/SP', '2025-07-10', 3, 'Ativo', '2025-08-20'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Carlos Eduardo Lima', 'carlos.eduardo@email.com', '(11) 99999-4444', 'Rua Oscar Freire, 321 - São Paulo/SP', '2025-07-15', 1, 'Ativo', '2025-08-05'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Fernanda Rodrigues', 'fernanda.rodrigues@email.com', '(11) 99999-5555', 'Av. Faria Lima, 654 - São Paulo/SP', '2025-07-20', 2, 'Ativo', '2025-08-25'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Roberto Almeida', 'roberto.almeida@email.com', '(11) 99999-6666', 'Rua Consolação, 987 - São Paulo/SP', '2025-07-25', 0, 'Inativo', '2025-07-30'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Juliana Ferreira', 'juliana.ferreira@email.com', '(11) 99999-7777', 'Av. Rebouças, 147 - São Paulo/SP', '2025-08-01', 1, 'Ativo', '2025-08-30'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Pedro Henrique Souza', 'pedro.souza@email.com', '(11) 99999-8888', 'Rua Haddock Lobo, 258 - São Paulo/SP', '2025-08-05', 2, 'Ativo', '2025-09-01'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Camila Barbosa', 'camila.barbosa@email.com', '(11) 99999-9999', 'Av. Ibirapuera, 369 - São Paulo/SP', '2025-08-10', 1, 'Ativo', '2025-09-05'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Ricardo Martins', 'ricardo.martins@email.com', '(11) 99999-0000', 'Rua Bela Cintra, 741 - São Paulo/SP', '2025-08-15', 3, 'Ativo', '2025-09-10');

-- 2. EQUIPE (deve ser inserida antes de PROCESSOS e TAREFAS)
INSERT INTO equipe (user_id, nome, email, telefone, cargo, departamento, data_admissao, salario, status, endereco, observacoes) VALUES
(
    'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
    'Dr. Carlos Silva',
    'carlos.silva@escritorio.com',
    '(11) 99999-1234',
    'Advogado Sênior',
    'Jurídico',
    '2020-03-15',
    15000.00,
    'Ativo',
    'Rua das Flores, 123 - São Paulo, SP',
    'Especialista em Direito Civil e Empresarial. Mais de 15 anos de experiência.'
),
(
    'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
    'Dra. Ana Costa',
    'ana.costa@escritorio.com',
    '(11) 99999-5678',
    'Advogada Plena',
    'Jurídico',
    '2021-08-10',
    12000.00,
    'Ativo',
    'Av. Paulista, 456 - São Paulo, SP',
    'Especialista em Direito Trabalhista e Previdenciário.'
),
(
    'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
    'João Santos',
    'joao.santos@escritorio.com',
    '(11) 99999-9012',
    'Advogado Júnior',
    'Jurídico',
    '2023-02-01',
    8000.00,
    'Ativo',
    'Rua Augusta, 789 - São Paulo, SP',
    'Recém-formado, focado em Direito Criminal.'
),
(
    'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
    'Maria Oliveira',
    'maria.oliveira@escritorio.com',
    '(11) 99999-3456',
    'Secretária Jurídica',
    'Administrativo',
    '2019-11-20',
    4500.00,
    'Ativo',
    'Rua da Consolação, 321 - São Paulo, SP',
    'Responsável pela organização de documentos e agendamento de audiências.'
),
(
    'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
    'Pedro Ferreira',
    'pedro.ferreira@escritorio.com',
    '(11) 99999-7890',
    'Estagiário',
    'Jurídico',
    '2024-01-15',
    1500.00,
    'Ativo',
    'Rua Liberdade, 654 - São Paulo, SP',
    'Estudante de Direito no 8º semestre, estagiário em Direito Civil.'
);

-- 3. PROCESSOS
-- Primeiro, vamos obter os IDs dos clientes inseridos
WITH cliente_ids AS (
  SELECT id, nome FROM public.clientes WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b' ORDER BY data_registro
)
INSERT INTO public.processos (user_id, cliente_id, numero, assunto, status, data_inicio, data_limite, prioridade, responsavel, valor_causa, instancia)
SELECT 
  'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
  c.id,
  processo_data.numero,
  processo_data.assunto,
  processo_data.status,
  processo_data.data_inicio,
  processo_data.data_limite,
  processo_data.prioridade,
  processo_data.responsavel,
  processo_data.valor_causa,
  processo_data.instancia
FROM cliente_ids c
CROSS JOIN (
  VALUES
    ('1001234-56.2025.8.26.0100', 'Ação de Cobrança', 'Em Andamento'::processo_status, '2025-07-01'::date, '2025-12-01'::date, 'Alta'::processo_prioridade, 'Dr. Carlos Silva', 50000.00, '1ª Instância'),
    ('1001235-57.2025.8.26.0100', 'Divórcio Consensual', 'Concluído'::processo_status, '2025-07-05'::date, '2025-09-05'::date, 'Média'::processo_prioridade, 'Dra. Ana Costa', 25000.00, '1ª Instância'),
    ('1001236-58.2025.8.26.0100', 'Ação Trabalhista', 'Em Andamento'::processo_status, '2025-07-10'::date, '2025-11-10'::date, 'Alta'::processo_prioridade, 'Dra. Ana Costa', 75000.00, '1ª Instância'),
    ('1001237-59.2025.8.26.0100', 'Inventário', 'Aguardando'::processo_status, '2025-07-15'::date, '2026-01-15'::date, 'Baixa'::processo_prioridade, 'Dr. Carlos Silva', 120000.00, '1ª Instância'),
    ('1001238-60.2025.8.26.0100', 'Ação de Despejo', 'Em Andamento'::processo_status, '2025-07-20'::date, '2025-10-20'::date, 'Média'::processo_prioridade, 'João Santos', 30000.00, '1ª Instância'),
    ('1001239-61.2025.8.26.0100', 'Ação Penal', 'Aguardando'::processo_status, '2025-07-25'::date, '2025-12-25'::date, 'Alta'::processo_prioridade, 'João Santos', 80000.00, '1ª Instância'),
    ('1001240-62.2025.8.26.0100', 'Ação Civil Pública', 'Em Andamento'::processo_status, '2025-08-01'::date, '2026-02-01'::date, 'Média'::processo_prioridade, 'Dr. Carlos Silva', 200000.00, '1ª Instância'),
    ('1001241-63.2025.8.26.0100', 'Mandado de Segurança', 'Concluído'::processo_status, '2025-08-05'::date, '2025-09-05'::date, 'Alta'::processo_prioridade, 'Dra. Ana Costa', 45000.00, '1ª Instância'),
    ('1001242-64.2025.8.26.0100', 'Ação de Alimentos', 'Em Andamento'::processo_status, '2025-08-10'::date, '2025-11-10'::date, 'Média'::processo_prioridade, 'Dra. Ana Costa', 35000.00, '1ª Instância'),
    ('1001243-65.2025.8.26.0100', 'Ação de Indenização', 'Aguardando'::processo_status, '2025-08-15'::date, '2026-01-15'::date, 'Baixa'::processo_prioridade, 'Dr. Carlos Silva', 90000.00, '1ª Instância')
) AS processo_data(numero, assunto, status, data_inicio, data_limite, prioridade, responsavel, valor_causa, instancia)
WHERE c.nome IN (
  'Maria Silva Santos', 'João Carlos Oliveira', 'Ana Paula Costa', 'Carlos Eduardo Lima', 
  'Fernanda Rodrigues', 'Roberto Almeida', 'Juliana Ferreira', 'Pedro Henrique Souza', 
  'Camila Barbosa', 'Ricardo Martins'
)
LIMIT 10;

-- 4. AUDIÊNCIAS
-- Inserir audiências relacionadas aos processos
WITH processo_ids AS (
  SELECT id, numero FROM public.processos WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b' ORDER BY data_inicio
)
INSERT INTO public.audiencias (user_id, processo_id, processo_numero, data, hora, local, tipo, status)
SELECT 
  'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
  p.id,
  p.numero,
  audiencia_data.data,
  audiencia_data.hora,
  audiencia_data.local,
  audiencia_data.tipo,
  audiencia_data.status
FROM processo_ids p
CROSS JOIN (
  VALUES
    ('2025-09-15'::date, '14:00'::time, 'Fórum Central - Sala 101', 'Conciliação'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-09-20'::date, '10:30'::time, 'Fórum Central - Sala 205', 'Instrução'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-09-25'::date, '15:45'::time, 'Fórum Trabalhista - Sala 301', 'Julgamento'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-10-05'::date, '09:15'::time, 'Fórum Central - Sala 102', 'Conciliação'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-10-10'::date, '16:20'::time, 'Fórum Central - Sala 203', 'Una'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-08-20'::date, '11:00'::time, 'Fórum Central - Sala 104', 'Instrução'::audiencia_tipo, 'Realizada'::audiencia_status),
    ('2025-10-15'::date, '13:30'::time, 'Fórum Central - Sala 206', 'Julgamento'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-08-25'::date, '14:45'::time, 'Fórum Central - Sala 105', 'Conciliação'::audiencia_tipo, 'Realizada'::audiencia_status),
    ('2025-10-20'::date, '10:00'::time, 'Fórum Central - Sala 207', 'Instrução'::audiencia_tipo, 'Agendada'::audiencia_status),
    ('2025-10-25'::date, '15:15'::time, 'Fórum Central - Sala 103', 'Una'::audiencia_tipo, 'Agendada'::audiencia_status)
) AS audiencia_data(data, hora, local, tipo, status)
LIMIT 10;

-- 5. TAREFAS
INSERT INTO public.tarefas (user_id, descricao, data_conclusao, prioridade, status, responsavel) VALUES
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Elaborar petição inicial para ação de cobrança', '2025-09-01'::date, 'Alta'::tarefa_prioridade, 'Concluída'::tarefa_status, 'Dr. Carlos Silva'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Revisar documentos do processo de divórcio', '2025-09-05'::date, 'Média'::tarefa_prioridade, 'Concluída'::tarefa_status, 'Dra. Ana Costa'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Preparar defesa para ação trabalhista', '2025-09-10'::date, 'Alta'::tarefa_prioridade, 'Em Andamento'::tarefa_status, 'Dra. Ana Costa'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Organizar documentos para inventário', '2025-09-15'::date, 'Baixa'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Maria Oliveira'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Notificar inquilino sobre despejo', '2025-09-20'::date, 'Média'::tarefa_prioridade, 'Pendente'::tarefa_status, 'João Santos'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Acompanhar andamento da ação penal', '2025-09-25'::date, 'Alta'::tarefa_prioridade, 'Em Andamento'::tarefa_status, 'João Santos'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Protocolar recurso no TJ', '2025-09-30'::date, 'Alta'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Dr. Carlos Silva'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Reunião com cliente sobre mandado de segurança', '2025-08-30'::date, 'Média'::tarefa_prioridade, 'Concluída'::tarefa_status, 'Dra. Ana Costa'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Calcular pensão alimentícia', '2025-10-05'::date, 'Média'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Dra. Ana Costa'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Elaborar laudo pericial', '2025-10-10'::date, 'Baixa'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Pedro Ferreira'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Agendar audiência de conciliação', '2025-08-25'::date, 'Alta'::tarefa_prioridade, 'Concluída'::tarefa_status, 'Maria Oliveira'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Revisar contrato de honorários', '2025-10-15'::date, 'Baixa'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Dr. Carlos Silva'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Preparar alegações finais', '2025-10-20'::date, 'Alta'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Dra. Ana Costa'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Atualizar sistema processual', '2025-10-25'::date, 'Média'::tarefa_prioridade, 'Pendente'::tarefa_status, 'Pedro Ferreira'),
('f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b', 'Enviar relatório mensal ao cliente', '2025-08-31'::date, 'Baixa'::tarefa_prioridade, 'Concluída'::tarefa_status, 'Maria Oliveira');

-- 6. LANÇAMENTOS FINANCEIROS
-- Inserir lançamentos relacionados aos clientes
WITH cliente_ids AS (
  SELECT id, nome FROM public.clientes WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b' ORDER BY data_registro
)
INSERT INTO public.financeiro_lancamentos (user_id, cliente_id, descricao, valor, data_vencimento, data_pagamento, status)
SELECT 
  'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b',
  c.id,
  lancamento_data.descricao,
  lancamento_data.valor,
  lancamento_data.data_vencimento,
  lancamento_data.data_pagamento,
  lancamento_data.status
FROM cliente_ids c
CROSS JOIN (
  VALUES
    ('Honorários - Ação de Cobrança', 5000.00, '2025-08-01'::date, '2025-07-28'::date, 'Pago'::lancamento_status),
    ('Honorários - Divórcio Consensual', 3000.00, '2025-08-05'::date, '2025-08-03'::date, 'Pago'::lancamento_status),
    ('Honorários - Ação Trabalhista', 7500.00, '2025-08-10'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Inventário (1ª parcela)', 6000.00, '2025-08-15'::date, '2025-08-12'::date, 'Pago'::lancamento_status),
    ('Honorários - Ação de Despejo', 2500.00, '2025-08-20'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Ação Penal', 8000.00, '2025-08-25'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Ação Civil Pública', 15000.00, '2025-09-01'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Mandado de Segurança', 4000.00, '2025-09-05'::date, '2025-09-02'::date, 'Pago'::lancamento_status),
    ('Honorários - Ação de Alimentos', 3500.00, '2025-09-10'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Ação de Indenização', 9000.00, '2025-09-15'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Consultoria Jurídica', 1500.00, '2025-07-30'::date, '2025-07-25'::date, 'Pago'::lancamento_status),
    ('Honorários - Revisão Contratual', 2000.00, '2025-08-30'::date, '2025-08-28'::date, 'Pago'::lancamento_status),
    ('Honorários - Inventário (2ª parcela)', 6000.00, '2025-10-15'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Acompanhamento Processual', 1200.00, '2025-09-20'::date, NULL, 'Pendente'::lancamento_status),
    ('Honorários - Elaboração de Contrato', 800.00, '2025-08-10'::date, '2025-08-08'::date, 'Pago'::lancamento_status)
) AS lancamento_data(descricao, valor, data_vencimento, data_pagamento, status)
LIMIT 15;

-- Mensagem de conclusão
SELECT 'Dados fictícios inseridos com sucesso!' AS resultado;
SELECT 'IMPORTANTE: Lembre-se de substituir SEU_USER_ID_AQUI pelo seu ID real de usuário!' AS aviso;
SELECT 'Para obter seu user_id, execute: SELECT auth.uid();' AS dica;

-- Estatísticas dos dados inseridos
SELECT 
  'Clientes' AS tabela,
  COUNT(*) AS total_registros
FROM public.clientes 
WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b'
UNION ALL
SELECT 
  'Processos' AS tabela,
  COUNT(*) AS total_registros
FROM public.processos 
WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b'
UNION ALL
SELECT 
  'Audiências' AS tabela,
  COUNT(*) AS total_registros
FROM public.audiencias 
WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b'
UNION ALL
SELECT 
  'Tarefas' AS tabela,
  COUNT(*) AS total_registros
FROM public.tarefas 
WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b'
UNION ALL
SELECT 
  'Lançamentos Financeiros' AS tabela,
  COUNT(*) AS total_registros
FROM public.financeiro_lancamentos 
WHERE user_id = 'f4998ae4-a1f8-4da2-bfc3-10ad7e70b38b';