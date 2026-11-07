-- =====================================================================
-- Bloco de notas do cliente + Questionário inicial (entrevista)
-- Vinculados ao nicho do cliente (isolamento por nicho, item 6.2).
-- Cliente sem nicho: as notas ficam no cadastro (visíveis a quem acessa o cliente).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cliente_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cliente_nicho_id uuid REFERENCES public.cliente_nichos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'nota' CHECK (tipo IN ('nota', 'questionario')),
  titulo text,
  conteudo text,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,  -- questionário: { "pergunta": "resposta" }
  importante boolean NOT NULL DEFAULT false,      -- destacar na audiência
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cliente_anotacoes_cliente ON public.cliente_anotacoes (cliente_id, cliente_nicho_id);
-- um questionário por cliente/nicho
CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_questionario
  ON public.cliente_anotacoes (cliente_id, COALESCE(cliente_nicho_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE tipo = 'questionario';

CREATE OR REPLACE FUNCTION public.anotacao_set_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_anotacao_updated ON public.cliente_anotacoes;
CREATE TRIGGER trg_anotacao_updated BEFORE UPDATE ON public.cliente_anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.anotacao_set_updated();

-- Toda alteração fica no log de auditoria (nada "se perde")
DROP TRIGGER IF EXISTS trigger_audit_cliente_anotacoes ON public.cliente_anotacoes;
CREATE TRIGGER trigger_audit_cliente_anotacoes AFTER INSERT OR UPDATE OR DELETE ON public.cliente_anotacoes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

CREATE OR REPLACE FUNCTION public.pode_ver_anotacao(p_cliente_id uuid, p_nicho_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_nicho_id IS NOT NULL THEN public.tem_acesso_nicho(p_nicho_id)
              ELSE public.tem_acesso_cliente(p_cliente_id) END;
$$;

ALTER TABLE public.cliente_anotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anotacoes_select ON public.cliente_anotacoes;
DROP POLICY IF EXISTS anotacoes_insert ON public.cliente_anotacoes;
DROP POLICY IF EXISTS anotacoes_update ON public.cliente_anotacoes;
DROP POLICY IF EXISTS anotacoes_delete ON public.cliente_anotacoes;
CREATE POLICY anotacoes_select ON public.cliente_anotacoes FOR SELECT TO authenticated
  USING (public.pode_ver_anotacao(cliente_id, cliente_nicho_id));
CREATE POLICY anotacoes_insert ON public.cliente_anotacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.pode_ver_anotacao(cliente_id, cliente_nicho_id));
CREATE POLICY anotacoes_update ON public.cliente_anotacoes FOR UPDATE TO authenticated
  USING (public.pode_ver_anotacao(cliente_id, cliente_nicho_id));
-- excluir: só quem escreveu (ou Gestão Administrativa)
CREATE POLICY anotacoes_delete ON public.cliente_anotacoes FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_anotacoes TO authenticated;

NOTIFY pgrst, 'reload schema';
