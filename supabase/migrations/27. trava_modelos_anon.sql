-- 27. Pente fino de segurança (2026-10-22)
-- Modelos de Documentos estavam liberados para qualquer visitante (role public, sem login):
-- leitura, criação, alteração e exclusão da tabela e do bucket "templates".
-- Agora: usuários logados leem (a geração de documentos precisa), só a Gestão altera.
-- Aplicar com psql -U supabase_admin (policies do schema storage).

DROP POLICY IF EXISTS "Allow select on document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "Allow insert on document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "Allow update on document_templates" ON public.document_templates;
DROP POLICY IF EXISTS "Allow delete on document_templates" ON public.document_templates;

CREATE POLICY modelos_select ON public.document_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY modelos_insert ON public.document_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY modelos_update ON public.document_templates FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY modelos_delete ON public.document_templates FOR DELETE TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Allow select on templates bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow insert on templates bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete on templates bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow update on templates bucket" ON storage.objects;

CREATE POLICY templates_bucket_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'templates');
CREATE POLICY templates_bucket_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'templates' AND public.is_admin());
CREATE POLICY templates_bucket_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'templates' AND public.is_admin());
CREATE POLICY templates_bucket_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'templates' AND public.is_admin());

-- Funções SECURITY DEFINER sem search_path fixo
ALTER FUNCTION public.get_current_user_email() SET search_path = public;
ALTER FUNCTION public.process_audit_log() SET search_path = public;

-- Função interna (usada só pelos gatilhos da esteira) não deve ser chamada pelo site
REVOKE EXECUTE ON FUNCTION public.honorarios_resumo(public.honorarios_propostas) FROM PUBLIC, anon, authenticated;
