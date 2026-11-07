-- Migração para permitir exclusão em cascata de clientes
-- Remove as restrições RESTRICT e adiciona CASCADE

-- 1. Alterar a tabela processos para permitir CASCADE na exclusão de clientes
ALTER TABLE public.processos 
DROP CONSTRAINT IF EXISTS processos_cliente_id_fkey;

ALTER TABLE public.processos 
ADD CONSTRAINT processos_cliente_id_fkey 
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- 2. Alterar a tabela financeiro_lancamentos para permitir CASCADE na exclusão de clientes
ALTER TABLE public.financeiro_lancamentos 
DROP CONSTRAINT IF EXISTS financeiro_lancamentos_cliente_id_fkey;

ALTER TABLE public.financeiro_lancamentos 
ADD CONSTRAINT financeiro_lancamentos_cliente_id_fkey 
FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

-- Nota: A tabela documentos já usa SET NULL, que é apropriado para manter o histórico
-- A tabela audiencias não tem referência direta ao cliente, apenas ao processo