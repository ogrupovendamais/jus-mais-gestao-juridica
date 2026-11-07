-- =====================================================================
-- Ajuste das travas por classificação (revisão de 15/10/2026)
--  1. Financeiro: só Gestão e Assistente Financeira alteram lançamentos;
--     só Gestão exclui; parceiros 1, 2 e 3 veem os lançamentos em que participam.
--  2. Controladoria Jurídica: consulta (sem editar) processos, audiências e
--     tarefas de todos, para controle de prazos.
-- =====================================================================

-- ---------- 1. Financeiro ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid = 'public.financeiro_lancamentos'::regclass LOOP
    EXECUTE format('DROP POLICY %I ON public.financeiro_lancamentos', r.polname);
  END LOOP;
END $$;

CREATE POLICY financeiro_select ON public.financeiro_lancamentos FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_financeiro() OR user_id = auth.uid()
         OR auth.uid() IN (parceiro_beneficiario_id, parceiro_id_1, parceiro_id_2, parceiro_id_3));
CREATE POLICY financeiro_insert ON public.financeiro_lancamentos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin() OR public.is_financeiro());
CREATE POLICY financeiro_update ON public.financeiro_lancamentos FOR UPDATE TO authenticated
  USING (public.is_admin() OR public.is_financeiro());
CREATE POLICY financeiro_delete ON public.financeiro_lancamentos FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------- 2. Controladoria Jurídica ----------
CREATE OR REPLACE FUNCTION public.is_controladoria()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND classificacao = 'controladoria_juridica' AND ativo IS NOT FALSE);
$$;

DROP POLICY IF EXISTS processos_select_controladoria ON public.processos;
DROP POLICY IF EXISTS audiencias_select_controladoria ON public.audiencias;
DROP POLICY IF EXISTS tarefas_select_controladoria ON public.tarefas;
DROP POLICY IF EXISTS clientes_select_controladoria ON public.clientes;
DROP POLICY IF EXISTS nichos_select_controladoria ON public.cliente_nichos;
CREATE POLICY processos_select_controladoria ON public.processos FOR SELECT TO authenticated USING (public.is_controladoria());
CREATE POLICY audiencias_select_controladoria ON public.audiencias FOR SELECT TO authenticated USING (public.is_controladoria());
CREATE POLICY tarefas_select_controladoria ON public.tarefas FOR SELECT TO authenticated USING (public.is_controladoria());
-- nome do cliente e do nicho para identificar os prazos (sem documentos, anotações ou financeiro)
CREATE POLICY clientes_select_controladoria ON public.clientes FOR SELECT TO authenticated USING (public.is_controladoria());
CREATE POLICY nichos_select_controladoria ON public.cliente_nichos FOR SELECT TO authenticated USING (public.is_controladoria());

NOTIFY pgrst, 'reload schema';
