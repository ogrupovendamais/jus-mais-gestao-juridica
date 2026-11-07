-- =====================================================================
-- FASE 1 — Classificação de Usuários (item 6 do Procedimento Operacional)
--
-- Classificações:
--   gestao_administrativa  -> Keila, Laura Beatriz   (acesso total / role master)
--   controladoria_juridica -> Karolina              (role parceiro)
--   assistente_juridico    -> Heitor                (role parceiro)
--   parceiro_juridico      -> Alexia, Romeu, Daiane (role parceiro) — com ou sem OAB
--   assistente_financeiro  -> Natalia               (role parceiro)
--
-- A coluna "role" continua sendo usada pelo sistema e pelas políticas RLS;
-- ela passa a ser derivada automaticamente da classificação (exceto desenvolvedor).
-- Script idempotente: pode ser executado mais de uma vez.
-- =====================================================================

-- 1. Novas colunas em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS classificacao text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS possui_oab boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS numero_oab text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_classificacao_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_classificacao_check CHECK (
  classificacao IS NULL OR classificacao IN (
    'gestao_administrativa',
    'controladoria_juridica',
    'assistente_juridico',
    'parceiro_juridico',
    'assistente_financeiro'
  )
);

-- 2. Convites também carregam a classificação
ALTER TABLE public.convites ADD COLUMN IF NOT EXISTS classificacao text;

-- 2b. Segurança dos convites: só administradores criam/listam/excluem;
--     visitantes validam um token específico via RPC (sem listar a tabela).
DROP POLICY IF EXISTS "Allow all actions for authenticated users on convites" ON public.convites;
DROP POLICY IF EXISTS "Allow select for anonymous users on convites" ON public.convites;
DROP POLICY IF EXISTS "Admins manage convites" ON public.convites;
CREATE POLICY "Admins manage convites" ON public.convites
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_convite_by_token(p_token text)
RETURNS TABLE (email text, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.email, c.full_name FROM public.convites c
  WHERE c.token = p_token AND c.usado = false AND c.expires_at > now()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_convite_by_token(text) TO anon, authenticated;

-- 3. Helper: usuário atual é administrador? (SECURITY DEFINER evita recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('desenvolvedor', 'master')
  );
$$;

-- 4. Trigger: deriva role da classificação e impede auto-promoção
CREATE OR REPLACE FUNCTION public.sync_role_from_classificacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.classificacao IS DISTINCT FROM OLD.classificacao OR NEW.role IS DISTINCT FROM OLD.role)
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar a classificação ou o nível de acesso.';
  END IF;

  -- Desenvolvedor nunca é rebaixado pela classificação
  IF NEW.role = 'desenvolvedor' THEN
    RETURN NEW;
  END IF;

  IF NEW.classificacao IS NOT NULL THEN
    NEW.role := CASE WHEN NEW.classificacao = 'gestao_administrativa' THEN 'master' ELSE 'parceiro' END;
  END IF;

  IF NEW.possui_oab IS NOT TRUE THEN
    NEW.numero_oab := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_from_classificacao ON public.profiles;
CREATE TRIGGER trg_sync_role_from_classificacao
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_role_from_classificacao();

-- 5. Cadastro via convite passa a copiar a classificação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'parceiro';
  v_classificacao text;
  v_convite_id uuid;
BEGIN
  SELECT id, role, classificacao INTO v_convite_id, v_role, v_classificacao
  FROM public.convites
  WHERE email = NEW.email AND usado = false AND expires_at > now()
  LIMIT 1;

  v_role := COALESCE(v_role, 'parceiro');

  IF NEW.email = 'ogrupovendamais@gmail.com' THEN
    v_role := 'desenvolvedor';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, classificacao, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    v_classificacao,
    true
  );

  IF v_convite_id IS NOT NULL THEN
    UPDATE public.convites SET usado = true WHERE id = v_convite_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Classificação inicial dos usuários existentes (ajuste os e-mails/nomes se necessário)
--    Rode o SELECT abaixo antes para conferir:
--    SELECT id, full_name, email, role, classificacao FROM public.profiles ORDER BY full_name;
UPDATE public.profiles SET classificacao = 'gestao_administrativa'  WHERE classificacao IS NULL AND (full_name ILIKE 'keila%'   OR full_name ILIKE 'laura%');
UPDATE public.profiles SET classificacao = 'controladoria_juridica' WHERE classificacao IS NULL AND  full_name ILIKE 'karolina%';
UPDATE public.profiles SET classificacao = 'assistente_juridico'    WHERE classificacao IS NULL AND  full_name ILIKE 'heitor%';
UPDATE public.profiles SET classificacao = 'parceiro_juridico'      WHERE classificacao IS NULL AND (full_name ILIKE '%alexia%' OR full_name ILIKE '%romeu%' OR full_name ILIKE 'daiane%');
UPDATE public.profiles SET classificacao = 'assistente_financeiro'  WHERE classificacao IS NULL AND  full_name ILIKE 'natalia%';

NOTIFY pgrst, 'reload schema';
