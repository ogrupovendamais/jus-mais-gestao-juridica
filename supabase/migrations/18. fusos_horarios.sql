-- Fuso horário em audiências e compromissos da agenda.
-- O horário gravado ("hora") vale no fuso indicado; o escritório fica em Mato Grosso (America/Cuiaba).
-- Registros existentes foram lançados no horário local do escritório.

ALTER TABLE public.audiencias ADD COLUMN IF NOT EXISTS fuso text NOT NULL DEFAULT 'America/Cuiaba';
ALTER TABLE public.agenda_eventos ADD COLUMN IF NOT EXISTS fuso text NOT NULL DEFAULT 'America/Cuiaba';

ALTER TABLE public.audiencias DROP CONSTRAINT IF EXISTS audiencias_fuso_check;
ALTER TABLE public.audiencias ADD CONSTRAINT audiencias_fuso_check
  CHECK (fuso IN ('America/Noronha', 'America/Sao_Paulo', 'America/Cuiaba', 'America/Rio_Branco'));
ALTER TABLE public.agenda_eventos DROP CONSTRAINT IF EXISTS agenda_eventos_fuso_check;
ALTER TABLE public.agenda_eventos ADD CONSTRAINT agenda_eventos_fuso_check
  CHECK (fuso IN ('America/Noronha', 'America/Sao_Paulo', 'America/Cuiaba', 'America/Rio_Branco'));

NOTIFY pgrst, 'reload schema';
