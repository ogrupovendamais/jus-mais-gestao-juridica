-- Campos que o sistema trata como opcionais não podem ser obrigatórios no banco
-- (causavam falhas ao salvar tarefas e audiências).

ALTER TABLE public.tarefas ALTER COLUMN responsavel DROP NOT NULL;
ALTER TABLE public.tarefas ALTER COLUMN prioridade SET DEFAULT 'Média';
ALTER TABLE public.tarefas ALTER COLUMN status SET DEFAULT 'Pendente';

ALTER TABLE public.audiencias ALTER COLUMN hora DROP NOT NULL;
ALTER TABLE public.audiencias ALTER COLUMN local DROP NOT NULL;
ALTER TABLE public.audiencias ALTER COLUMN status SET DEFAULT 'Agendada';

-- Excluir cliente com documentos em nicho falhava (conflito entre "soltar" e "apagar" o documento).
-- Ao excluir o cliente, os registros de documentos dele são excluídos junto.
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_cliente_id_fkey;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_cliente_id_fkey
  FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
