-- =====================================================================
-- Audiências vinculadas ao cliente/nicho e à tarefa
-- =====================================================================

ALTER TABLE public.audiencias ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
ALTER TABLE public.audiencias ADD COLUMN IF NOT EXISTS cliente_nicho_id uuid REFERENCES public.cliente_nichos(id) ON DELETE SET NULL;
ALTER TABLE public.audiencias ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.audiencias ALTER COLUMN processo_numero DROP NOT NULL;
ALTER TABLE public.audiencias ADD COLUMN IF NOT EXISTS link_reuniao text;
ALTER TABLE public.audiencias ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_audiencias_cliente ON public.audiencias (cliente_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_nicho ON public.audiencias (cliente_nicho_id);

ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS audiencia_id uuid REFERENCES public.audiencias(id) ON DELETE CASCADE;
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tarefas_audiencia ON public.tarefas (audiencia_id);

-- Organiza as audiências já lançadas com o texto colado do Google Agenda:
-- título = texto sem a data; nº do processo = número CNJ (se houver); link = Google Meet
UPDATE public.audiencias SET
  link_reuniao = COALESCE(link_reuniao, 'https://' || substring(processo_numero FROM '(meet\.google\.com/[A-Za-z0-9\-]+)')),
  titulo = COALESCE(titulo, NULLIF(trim(BOTH ' -' FROM regexp_replace(
             regexp_replace(processo_numero, '\s*(Segunda|Terça|Quarta|Quinta|Sexta)-feira,.*$|\s*(Sábado|Domingo),.*$', ''),
             '^Processo:\s*', '')), '')),
  processo_numero = substring(processo_numero FROM '\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}')
WHERE processo_numero !~ '^\s*\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\s*$';

UPDATE public.audiencias SET responsavel_id = user_id WHERE responsavel_id IS NULL;

-- RLS: audiência visível também para os responsáveis do nicho e para o responsável indicado
DROP POLICY IF EXISTS audiencias_select ON public.audiencias;
DROP POLICY IF EXISTS audiencias_update ON public.audiencias;
DROP POLICY IF EXISTS audiencias_delete ON public.audiencias;
CREATE POLICY audiencias_select ON public.audiencias FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR responsavel_id = auth.uid() OR public.is_admin()
         OR (processo_id IS NOT NULL AND public.tem_acesso_processo(processo_id))
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY audiencias_update ON public.audiencias FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR responsavel_id = auth.uid() OR public.is_admin()
         OR (processo_id IS NOT NULL AND public.tem_acesso_processo(processo_id))
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY audiencias_delete ON public.audiencias FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin()
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));

NOTIFY pgrst, 'reload schema';
