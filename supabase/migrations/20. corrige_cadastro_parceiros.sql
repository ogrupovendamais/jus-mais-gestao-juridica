-- =====================================================================
-- CORREÇÃO: parceiros não conseguiam cadastrar clientes nem gravar processos.
-- O sistema grava e pede o registro de volta (INSERT ... RETURNING). A regra de
-- leitura consultava a própria tabela por uma função, que ainda não enxerga a
-- linha recém-criada -> "new row violates row-level security policy" (403).
-- A Gestão não era afetada (is_admin() libera antes).
-- Solução: checar primeiro as colunas da própria linha (autor/responsáveis).
-- =====================================================================

DROP POLICY IF EXISTS clientes_select ON public.clientes;
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR responsavel_id = auth.uid() OR public.tem_acesso_cliente(id));

DROP POLICY IF EXISTS processos_select ON public.processos;
DROP POLICY IF EXISTS processos_update ON public.processos;
DROP POLICY IF EXISTS processos_delete ON public.processos;
CREATE POLICY processos_select ON public.processos FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR responsavel_a_id = auth.uid() OR responsavel_b_id = auth.uid() OR public.is_admin()
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY processos_update ON public.processos FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR responsavel_a_id = auth.uid() OR responsavel_b_id = auth.uid() OR public.is_admin()
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY processos_delete ON public.processos FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR responsavel_a_id = auth.uid() OR responsavel_b_id = auth.uid() OR public.is_admin()
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));

DROP POLICY IF EXISTS nichos_select ON public.cliente_nichos;
CREATE POLICY nichos_select ON public.cliente_nichos FOR SELECT TO authenticated
  USING (responsavel_principal_id = auth.uid() OR auth.uid() = ANY (responsaveis_secundarios) OR public.is_admin());

NOTIFY pgrst, 'reload schema';
