-- Recados (comentários) nas tarefas: quem vê a tarefa pode ler e deixar recado;
-- cada um só apaga o próprio recado.

CREATE TABLE IF NOT EXISTS public.tarefa_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id uuid NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  texto text NOT NULL CHECK (length(trim(texto)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tarefa_comentarios_tarefa ON public.tarefa_comentarios (tarefa_id, created_at);

DROP TRIGGER IF EXISTS trigger_audit_tarefa_comentarios ON public.tarefa_comentarios;
CREATE TRIGGER trigger_audit_tarefa_comentarios AFTER INSERT OR UPDATE OR DELETE ON public.tarefa_comentarios
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE OR REPLACE FUNCTION public.pode_ver_tarefa(p_tarefa_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.tarefas t
    WHERE t.id = p_tarefa_id AND (t.user_id = auth.uid() OR t.responsavel_id = auth.uid())
  );
$$;

ALTER TABLE public.tarefa_comentarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tarefa_comentarios_select ON public.tarefa_comentarios;
DROP POLICY IF EXISTS tarefa_comentarios_insert ON public.tarefa_comentarios;
DROP POLICY IF EXISTS tarefa_comentarios_delete ON public.tarefa_comentarios;
CREATE POLICY tarefa_comentarios_select ON public.tarefa_comentarios FOR SELECT TO authenticated
  USING (public.pode_ver_tarefa(tarefa_id));
CREATE POLICY tarefa_comentarios_insert ON public.tarefa_comentarios FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.pode_ver_tarefa(tarefa_id));
CREATE POLICY tarefa_comentarios_delete ON public.tarefa_comentarios FOR DELETE TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT, INSERT, DELETE ON public.tarefa_comentarios TO authenticated;

-- Processos: "Assunto Principal" (campo curto) — a Data Limite deixa de ser usada na tela
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS assunto_principal text;

NOTIFY pgrst, 'reload schema';
