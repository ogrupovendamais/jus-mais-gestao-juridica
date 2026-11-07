-- Gestão Administrativa (acesso total) pode lançar tarefas e chamados de suporte
-- em nome de outro usuário (ex.: ao usar "simular acesso", ou ao lançar para a equipe).
-- Os demais continuam lançando só em nome próprio.

DROP POLICY IF EXISTS tarefas_insert ON public.tarefas;
CREATE POLICY tarefas_insert ON public.tarefas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- remove as regras de criação existentes (o nome antigo tem acentuação corrompida)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.suporte_chamados'::regclass AND polcmd = 'a' LOOP
    EXECUTE format('DROP POLICY %I ON public.suporte_chamados', r.polname);
  END LOOP;
END $$;
CREATE POLICY suporte_insert ON public.suporte_chamados FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

NOTIFY pgrst, 'reload schema';
