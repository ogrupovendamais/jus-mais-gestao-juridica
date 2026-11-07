-- Novos status de processo (pedido da Dra. Keila, 19/10/2026), nesta ordem.
-- Substituem "Em Andamento", "Aguardando" e "Concluído".
-- A coluna deixa de ser um tipo fixo (enum) e passa a texto com lista controlada.

ALTER TABLE public.processos ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.processos ALTER COLUMN status TYPE text USING status::text;

UPDATE public.processos SET status = CASE status
  WHEN 'Em Andamento' THEN 'Aguardando movimentação'
  WHEN 'Aguardando'   THEN 'Aguardando movimentação'
  WHEN 'Concluído'    THEN 'Arquivado'
  ELSE status END;

ALTER TABLE public.processos DROP CONSTRAINT IF EXISTS processos_status_check;
ALTER TABLE public.processos ADD CONSTRAINT processos_status_check CHECK (status IN (
  'A protocolar (pendente)',
  'Em confecção inicial',
  'Protocolado petição inicial',
  'Aguardando citação',
  'Aguardando audiência inicial',
  'Prazo recursal',
  'Aguardando movimentação',
  'Aguardando audiência instrução',
  'Preparar audiência',
  'Aguardando sentença',
  'Impulsionar',
  'Acordo em andamento',
  'Aguardando alvará',
  'Aguardando audiência',
  'Arquivado'
));
ALTER TABLE public.processos ALTER COLUMN status SET DEFAULT 'A protocolar (pendente)';
ALTER TABLE public.processos ALTER COLUMN status SET NOT NULL;

DROP TYPE IF EXISTS public.processo_status;

NOTIFY pgrst, 'reload schema';
