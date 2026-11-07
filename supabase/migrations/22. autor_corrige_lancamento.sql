-- Financeiro: quem lançou pode editar e excluir o próprio lançamento a qualquer momento
-- (decisão de 19/10/2026, após o Romeu não conseguir corrigir um lançamento duplicado).
-- Gestão e Assistente Financeira continuam alterando tudo; só a Gestão exclui o que é de outros.
-- Toda alteração/exclusão fica registrada no log de auditoria.

DROP POLICY IF EXISTS financeiro_update ON public.financeiro_lancamentos;
CREATE POLICY financeiro_update ON public.financeiro_lancamentos FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_financeiro() OR user_id = auth.uid());

DROP POLICY IF EXISTS financeiro_delete ON public.financeiro_lancamentos;
CREATE POLICY financeiro_delete ON public.financeiro_lancamentos FOR DELETE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
