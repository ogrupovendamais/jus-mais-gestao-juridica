-- Gestão Administrativa (master: Dra. Keila / Laura) com acesso total:
-- pode editar e excluir tarefas, compromissos da agenda e recados de qualquer usuário.
-- Para os demais continua valendo: só o autor exclui o que lançou.

DROP POLICY IF EXISTS tarefas_update ON public.tarefas;
DROP POLICY IF EXISTS tarefas_delete ON public.tarefas;
CREATE POLICY tarefas_update ON public.tarefas FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR responsavel_id = auth.uid() OR public.is_admin());
CREATE POLICY tarefas_delete ON public.tarefas FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS agenda_update ON public.agenda_eventos;
DROP POLICY IF EXISTS agenda_delete ON public.agenda_eventos;
CREATE POLICY agenda_update ON public.agenda_eventos FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY agenda_delete ON public.agenda_eventos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS tarefa_comentarios_delete ON public.tarefa_comentarios;
CREATE POLICY tarefa_comentarios_delete ON public.tarefa_comentarios FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

NOTIFY pgrst, 'reload schema';
