-- Redefinir trigger de novos usuários para usar os novos perfis
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    CASE WHEN NEW.email = 'ogrupovendamais@gmail.com' THEN 'desenvolvedor' ELSE 'parceiro' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar usuários de teste na auth.users se não existirem
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
VALUES 
('11111111-1111-1111-1111-111111111111', 'karolina@cadore.com.br', '$2a$10$abcdefghijklmnopqrstuv', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karolina Galiani"}', now(), now(), 'authenticated', 'authenticated'),
('22222222-2222-2222-2222-222222222222', 'heitor@cadore.com.br', '$2a$10$abcdefghijklmnopqrstuv', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Heitor Cesar"}', now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Criar perfis dos parceiros se não existirem
INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
('11111111-1111-1111-1111-111111111111', 'karolina@cadore.com.br', 'Karolina Galiani', 'parceiro'),
('22222222-2222-2222-2222-222222222222', 'heitor@cadore.com.br', 'Heitor Cesar', 'parceiro')
ON CONFLICT (id) DO NOTHING;

-- Limpar dados anteriores (respeitando a integridade das FKs)
DELETE FROM public.financeiro_lancamentos;
DELETE FROM public.tarefas;
DELETE FROM public.audiencias;
DELETE FROM public.documentos;
DELETE FROM public.processos;
DELETE FROM public.clientes;
DELETE FROM public.equipe;

-- Definir UUIDs dos usuários
DO $$
DECLARE
    v_admin_id UUID := '3428ee26-057b-41c8-b86b-9772a1ca3173';
    v_karolina_id UUID := '11111111-1111-1111-1111-111111111111';
    v_heitor_id UUID := '22222222-2222-2222-2222-222222222222';
    v_cli_1_id UUID := gen_random_uuid();
    v_cli_2_id UUID := gen_random_uuid();
    v_cli_3_id UUID := gen_random_uuid();
    v_proc_1_id UUID := gen_random_uuid();
    v_proc_2_id UUID := gen_random_uuid();
    v_proc_3_id UUID := gen_random_uuid();
BEGIN

    -- 2. Inserir Clientes (vinculados ao Admin Master)
    INSERT INTO public.clientes (id, user_id, nome, email, telefone, status) VALUES
    (v_cli_1_id, v_admin_id, 'João da Silva', 'joao.silva@email.com', '(11) 98765-4321', 'Ativo'),
    (v_cli_2_id, v_admin_id, 'Maria de Souza', 'maria.souza@email.com', '(21) 99888-7777', 'Ativo'),
    (v_cli_3_id, v_admin_id, 'Carlos Alberto Ferreira', 'carlos.alberto@email.com', '(31) 98888-2222', 'Ativo');

    -- 3. Inserir Membros da Equipe (vinculando aos perfis de parceiros)
    INSERT INTO public.equipe (id, user_id, nome, email, cargo, departamento, status) VALUES
    (v_karolina_id, v_karolina_id, 'Karolina Galiani', 'karolina@cadore.com.br', 'Sócia Parceira', 'Trabalhista', 'Ativo'),
    (v_heitor_id, v_heitor_id, 'Heitor Cesar', 'heitor@cadore.com.br', 'Sócio Parceiro', 'Previdenciário', 'Ativo');

    -- 4. Inserir Processos Judiciais (de propriedade dos parceiros correspondentes)
    INSERT INTO public.processos (id, user_id, cliente_id, numero, assunto, status, data_inicio, prioridade, responsavel, valor_causa, instancia) VALUES
    (v_proc_1_id, v_karolina_id, v_cli_1_id, '5001234-56.2026.8.26.0100', 'Ação Trabalhista - Horas Extras', 'Em Andamento', '2026-01-15', 'Alta', 'Karolina Galiani', 150000.00, '1ª Instância'),
    (v_proc_2_id, v_karolina_id, v_cli_2_id, '0009876-54.2026.4.01.3400', 'Ação Previdenciária', 'Em Andamento', '2026-02-10', 'Média', 'Karolina Galiani', 80000.00, '1ª Instância'),
    (v_proc_3_id, v_heitor_id, v_cli_3_id, '3004567-89.2026.8.19.0001', 'Ação Cível - Indenização', 'Aguardando', '2026-03-05', 'Baixa', 'Heitor Cesar', 45000.00, '2ª Instância');

    -- 5. Inserir Audiências
    INSERT INTO public.audiencias (id, user_id, processo_id, data, hora, local, tipo, status, processo_numero) VALUES
    (gen_random_uuid(), v_karolina_id, v_proc_1_id, '2026-07-25', '14:00', 'PJE TRT - 15ª Vara SP', 'Instrução', 'Agendada', '5001234-56.2026.8.26.0100'),
    (gen_random_uuid(), v_karolina_id, v_proc_2_id, '2026-08-10', '09:30', 'Justiça Federal Previdenciária', 'Conciliação', 'Agendada', '0009876-54.2026.4.01.3400'),
    (gen_random_uuid(), v_heitor_id, v_proc_3_id, '2026-07-15', '15:15', 'Fórum Central Cível BH', 'Una', 'Agendada', '3004567-89.2026.8.19.0001');

    -- 6. Inserir Tarefas
    INSERT INTO public.tarefas (id, user_id, descricao, data_conclusao, prioridade, status, responsavel) VALUES
    (gen_random_uuid(), v_karolina_id, 'Protocolar Réplica à Contestação - Processo João da Silva', '2026-07-12', 'Alta', 'Pendente', 'Dr. Carlos Silva'),
    (gen_random_uuid(), v_karolina_id, 'Reunir Documentos e CTPS da cliente Maria de Souza', '2026-07-18', 'Média', 'Em Andamento', 'Karolina Galiani'),
    (gen_random_uuid(), v_heitor_id, 'Preparar Testemunhas para Audiência de Instrução', '2026-07-24', 'Alta', 'Pendente', 'Dr. Carlos Silva');

    -- 7. Inserir Lançamentos Financeiros (vinculados ao advogado responsável)
    INSERT INTO public.financeiro_lancamentos 
    (id, user_id, cliente_id, descricao, valor, data_vencimento, status, tipo_lancamento, data_pagamento) VALUES
    (gen_random_uuid(), v_karolina_id, v_cli_1_id, 'Honorários Contratuais Iniciais', 5000.00, '2026-07-10', 'Pago', 'Receita', '2026-07-09'),
    (gen_random_uuid(), v_admin_id, v_cli_2_id, 'Aluguel do Escritório e Condomínio', 1800.00, '2026-07-05', 'Pago', 'Despesa', '2026-07-05'),
    (gen_random_uuid(), v_admin_id, v_cli_3_id, 'Compra de Tokens Certificado Digital', 350.00, '2026-07-15', 'Pendente', 'Despesa', NULL);

    -- Lançamento tipo ACORDO - Heitor Cesar
    INSERT INTO public.financeiro_lancamentos 
    (id, user_id, cliente_id, descricao, valor, data_vencimento, status, tipo_lancamento,
     valor_cliente, valor_escritorio, valor_parceiro, valor_reserva, status_cliente, status_parceiro) VALUES
    (gen_random_uuid(), v_heitor_id, v_cli_3_id, 'Acordo Homologado - Processo Carlos Alberto Ferreira', 50000.00, '2026-07-25', 'Pendente', 'Acordo',
     30000.00, 20000.00, 4000.00, 1000.00, 'Pendente', 'Pendente');

    -- Lançamento tipo ACORDO - Karolina Galiani
    INSERT INTO public.financeiro_lancamentos 
    (id, user_id, cliente_id, descricao, valor, data_vencimento, status, tipo_lancamento, data_pagamento,
     valor_cliente, valor_escritorio, valor_parceiro, valor_reserva, status_cliente, status_parceiro, data_pgto_cliente, data_pgto_parceiro) VALUES
    (gen_random_uuid(), v_karolina_id, v_cli_1_id, 'Acordo Homologado - Processo João da Silva (Pago)', 30000.00, '2026-07-08', 'Pago', 'Acordo', '2026-07-08',
     18000.00, 12000.00, 2400.00, 600.00, 'Pago', 'Pago', '2026-07-08', '2026-07-08');

END $$;
