-- Processo pode ser cadastrado antes de ter número (ex.: antes do ajuizamento).
-- Número vazio passa a ser NULL, então vários processos "sem número" não conflitam
-- com a regra de número único por usuário.
ALTER TABLE public.processos ALTER COLUMN numero DROP NOT NULL;
UPDATE public.processos SET numero = NULL WHERE trim(numero) = '';

NOTIFY pgrst, 'reload schema';
