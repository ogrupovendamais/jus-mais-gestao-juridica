-- =====================================================================
-- FASES 2 e 3 — Cliente por CPF/CNPJ com vários nichos + permissões por aba
-- (itens 6.1 e 6.2 do Procedimento Operacional)
--
-- Modelo:
--   clientes          = dados cadastrais (comuns a todos os nichos), CPF/CNPJ único
--   cliente_nichos    = um "atendimento" por nicho, com responsável principal + secundários
--   processos / documentos / contratos passam a pertencer a um nicho (cliente_nicho_id)
--   Quem não é responsável de um nicho não enxerga os dados daquele nicho.
--   Gestão Administrativa (role master) e desenvolvedor enxergam tudo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Funções utilitárias
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.so_digitos(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(COALESCE(p, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.is_dev()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'desenvolvedor');
$$;

-- ---------------------------------------------------------------------
-- 1. Mesclar clientes duplicados (mesmo CPF/CNPJ e mesmo nome)
--    Mantém o registro mais completo; move processos, documentos e
--    lançamentos financeiros para ele; preenche campos vazios.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE _dup_map ON COMMIT DROP AS
WITH base AS (
  SELECT c.*,
         public.so_digitos(c.cpf) AS doc,
         lower(trim(c.nome)) AS nome_norm,
         ( (c.nicho IS NOT NULL AND c.nicho <> '')::int * 100
         + (SELECT count(*) FROM public.documentos d WHERE d.cliente_id = c.id) * 10
         + (SELECT count(*) FROM public.processos p WHERE p.cliente_id = c.id) * 10
         + (SELECT count(*) FROM public.financeiro_lancamentos f WHERE f.cliente_id = c.id) * 10
         + num_nonnulls(c.email, c.telefone, c.logradouro, c.cidade, c.rg, c.data_nascimento,
                        c.estado_civil, c.nome_mae, c.nome_pai, c.chave_pix, c.responsavel_id)
         ) AS score
  FROM public.clientes c
),
ranked AS (
  SELECT id, doc, nome_norm,
         first_value(id) OVER (PARTITION BY doc, nome_norm ORDER BY score DESC, created_at ASC) AS keeper
  FROM base WHERE doc IS NOT NULL
)
SELECT id AS dup_id, keeper AS keep_id FROM ranked WHERE id <> keeper;

UPDATE public.clientes k SET
  email = COALESCE(k.email, d.email), telefone = COALESCE(k.telefone, d.telefone),
  endereco = COALESCE(k.endereco, d.endereco), logradouro = COALESCE(k.logradouro, d.logradouro),
  numero = COALESCE(k.numero, d.numero), bairro = COALESCE(k.bairro, d.bairro),
  referencia = COALESCE(k.referencia, d.referencia), cidade = COALESCE(k.cidade, d.cidade),
  uf = COALESCE(k.uf, d.uf), rg = COALESCE(k.rg, d.rg), cnh = COALESCE(k.cnh, d.cnh),
  data_nascimento = COALESCE(k.data_nascimento, d.data_nascimento),
  estado_civil = COALESCE(k.estado_civil, d.estado_civil), nome_mae = COALESCE(k.nome_mae, d.nome_mae),
  nome_pai = COALESCE(k.nome_pai, d.nome_pai), chave_pix = COALESCE(k.chave_pix, d.chave_pix),
  instituicao_financeira = COALESCE(k.instituicao_financeira, d.instituicao_financeira),
  nicho = COALESCE(NULLIF(k.nicho, ''), d.nicho), responsavel_id = COALESCE(k.responsavel_id, d.responsavel_id)
FROM _dup_map m JOIN public.clientes d ON d.id = m.dup_id
WHERE k.id = m.keep_id;

UPDATE public.processos p SET cliente_id = m.keep_id FROM _dup_map m WHERE p.cliente_id = m.dup_id;
UPDATE public.documentos x SET cliente_id = m.keep_id FROM _dup_map m WHERE x.cliente_id = m.dup_id;
UPDATE public.financeiro_lancamentos f SET cliente_id = m.keep_id FROM _dup_map m WHERE f.cliente_id = m.dup_id;
DELETE FROM public.clientes c USING _dup_map m WHERE c.id = m.dup_id;

-- ---------------------------------------------------------------------
-- 2. CPF/CNPJ único (bloqueia novos duplicados; conflitos antigos com
--    nomes diferentes ficam listados para correção manual)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clientes_doc ON public.clientes (public.so_digitos(cpf));

CREATE OR REPLACE FUNCTION public.clientes_doc_unico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nome text;
BEGIN
  IF public.so_digitos(NEW.cpf) IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND public.so_digitos(NEW.cpf) IS NOT DISTINCT FROM public.so_digitos(OLD.cpf) THEN
    RETURN NEW;
  END IF;
  SELECT nome INTO v_nome FROM public.clientes
  WHERE public.so_digitos(cpf) = public.so_digitos(NEW.cpf) AND id <> NEW.id LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'CPF/CNPJ já cadastrado para o cliente "%".', v_nome USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clientes_doc_unico ON public.clientes;
CREATE TRIGGER trg_clientes_doc_unico
  BEFORE INSERT OR UPDATE OF cpf ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.clientes_doc_unico();

-- ---------------------------------------------------------------------
-- 3. Nichos por cliente
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cliente_nichos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nicho text NOT NULL,
  responsavel_principal_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsaveis_secundarios uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Encerrado')),
  observacoes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cliente_nichos_unico UNIQUE (cliente_id, nicho)
);
CREATE INDEX IF NOT EXISTS idx_cliente_nichos_cliente ON public.cliente_nichos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_nichos_principal ON public.cliente_nichos (responsavel_principal_id);
CREATE INDEX IF NOT EXISTS idx_cliente_nichos_secundarios ON public.cliente_nichos USING gin (responsaveis_secundarios);

DROP TRIGGER IF EXISTS update_cliente_nichos_updated_at ON public.cliente_nichos;
CREATE TRIGGER update_cliente_nichos_updated_at BEFORE UPDATE ON public.cliente_nichos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_audit_cliente_nichos ON public.cliente_nichos;
CREATE TRIGGER trigger_audit_cliente_nichos AFTER INSERT OR UPDATE OR DELETE ON public.cliente_nichos
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

ALTER TABLE public.processos  ADD COLUMN IF NOT EXISTS cliente_nicho_id uuid REFERENCES public.cliente_nichos(id) ON DELETE SET NULL;
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS cliente_nicho_id uuid REFERENCES public.cliente_nichos(id) ON DELETE CASCADE;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS cliente_nicho_id uuid REFERENCES public.cliente_nichos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_processos_nicho ON public.processos (cliente_nicho_id);
CREATE INDEX IF NOT EXISTS idx_documentos_nicho ON public.documentos (cliente_nicho_id);

-- Padronização dos nomes de nicho existentes
UPDATE public.clientes SET nicho = 'DIREITO CÍVEL' WHERE upper(trim(nicho)) IN ('CÍVIL', 'CIVIL', 'CÍVEL');
UPDATE public.clientes SET nicho = 'DIREITO PREVIDENCIÁRIO' WHERE upper(trim(nicho)) IN ('DIREITO PREVIDENCIARIO', 'PREVIDENCIARIO', 'PREVIDENCIÁRIO');
UPDATE public.documentos SET nome = 'DIREITO CÍVEL' WHERE parent_id IS NULL AND is_folder AND upper(trim(nome)) IN ('CÍVIL', 'CIVIL');
UPDATE public.documentos SET nome = 'DIREITO PREVIDENCIÁRIO' WHERE parent_id IS NULL AND is_folder AND upper(trim(nome)) = 'DIREITO PREVIDENCIARIO';

-- Migração: cada cliente com nicho ganha seu registro em cliente_nichos
INSERT INTO public.cliente_nichos (cliente_id, nicho, responsavel_principal_id, created_by, created_at)
SELECT c.id, upper(trim(c.nicho)), COALESCE(c.responsavel_id, c.user_id), c.user_id, c.created_at
FROM public.clientes c
WHERE NULLIF(trim(c.nicho), '') IS NOT NULL
ON CONFLICT (cliente_id, nicho) DO NOTHING;

UPDATE public.processos p SET cliente_nicho_id = n.id
FROM public.cliente_nichos n
WHERE p.cliente_nicho_id IS NULL AND n.cliente_id = p.cliente_id
  AND (SELECT count(*) FROM public.cliente_nichos x WHERE x.cliente_id = p.cliente_id) = 1;

UPDATE public.financeiro_lancamentos f SET cliente_nicho_id = n.id
FROM public.cliente_nichos n
WHERE f.cliente_nicho_id IS NULL AND n.cliente_id = f.cliente_id
  AND (SELECT count(*) FROM public.cliente_nichos x WHERE x.cliente_id = f.cliente_id) = 1;

UPDATE public.documentos d SET cliente_nicho_id = n.id
FROM public.cliente_nichos n
WHERE d.cliente_nicho_id IS NULL AND n.cliente_id = d.cliente_id
  AND (SELECT count(*) FROM public.cliente_nichos x WHERE x.cliente_id = d.cliente_id) = 1;

-- Propaga o nicho para subpastas/arquivos dentro da pasta do cliente
WITH RECURSIVE arvore AS (
  SELECT id, cliente_nicho_id, cliente_id FROM public.documentos WHERE cliente_nicho_id IS NOT NULL
  UNION ALL
  SELECT d.id, a.cliente_nicho_id, a.cliente_id
  FROM public.documentos d JOIN arvore a ON d.parent_id = a.id
  WHERE d.cliente_nicho_id IS NULL
)
UPDATE public.documentos d SET cliente_nicho_id = a.cliente_nicho_id, cliente_id = COALESCE(d.cliente_id, a.cliente_id)
FROM arvore a WHERE d.id = a.id AND d.cliente_nicho_id IS NULL;

-- Novos documentos herdam cliente/nicho da pasta onde foram criados
CREATE OR REPLACE FUNCTION public.documentos_herdar_nicho()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NEW.cliente_nicho_id IS NULL THEN
    SELECT cliente_nicho_id, COALESCE(NEW.cliente_id, cliente_id)
      INTO NEW.cliente_nicho_id, NEW.cliente_id
    FROM public.documentos WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_documentos_herdar_nicho ON public.documentos;
CREATE TRIGGER trg_documentos_herdar_nicho BEFORE INSERT ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.documentos_herdar_nicho();

-- ---------------------------------------------------------------------
-- 4. Funções de acesso (SECURITY DEFINER: não sofrem RLS, evitam recursão)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tem_acesso_nicho(p_nicho_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.cliente_nichos n
    WHERE n.id = p_nicho_id
      AND (n.responsavel_principal_id = auth.uid() OR auth.uid() = ANY (n.responsaveis_secundarios))
  );
$$;

CREATE OR REPLACE FUNCTION public.tem_acesso_cliente(p_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin()
      OR EXISTS (SELECT 1 FROM public.clientes c WHERE c.id = p_cliente_id AND c.user_id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.cliente_nichos n
        WHERE n.cliente_id = p_cliente_id
          AND (n.responsavel_principal_id = auth.uid() OR auth.uid() = ANY (n.responsaveis_secundarios))
      );
$$;

CREATE OR REPLACE FUNCTION public.tem_acesso_processo(p_processo_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.processos p
    WHERE p.id = p_processo_id
      AND ( p.user_id = auth.uid() OR p.responsavel_a_id = auth.uid() OR p.responsavel_b_id = auth.uid()
         OR (p.cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(p.cliente_nicho_id)) )
  );
$$;

-- Pode excluir o cliente inteiro? Admin, ou quem tem acesso a TODOS os nichos dele
CREATE OR REPLACE FUNCTION public.pode_excluir_cliente(p_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR (
    public.tem_acesso_cliente(p_cliente_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.cliente_nichos n
      WHERE n.cliente_id = p_cliente_id AND NOT public.tem_acesso_nicho(n.id)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_documento(p_user_id uuid, p_nicho_id uuid, p_cliente_id uuid, p_parent_id uuid, p_is_folder boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin()
      OR p_user_id = auth.uid()
      OR (p_nicho_id IS NOT NULL AND public.tem_acesso_nicho(p_nicho_id))
      -- pastas-raiz de nicho (ex.: "DIREITO TRABALHISTA") são visíveis a todos
      OR (p_is_folder AND p_parent_id IS NULL AND p_cliente_id IS NULL AND p_nicho_id IS NULL);
$$;

CREATE OR REPLACE FUNCTION public.pode_ver_arquivo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documentos d
    WHERE d.storage_path = p_path
      AND public.pode_ver_documento(d.user_id, d.cliente_nicho_id, d.cliente_id, d.parent_id, d.is_folder)
  );
$$;

-- ---------------------------------------------------------------------
-- 5. RPCs usadas pelo front
-- ---------------------------------------------------------------------
-- Lista de usuários ativos (para escolher responsáveis) sem expor a tabela profiles
CREATE OR REPLACE FUNCTION public.listar_usuarios()
RETURNS TABLE (id uuid, full_name text, email text, role text, classificacao text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, p.email, p.role, p.classificacao
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.ativo IS NOT FALSE AND p.role <> 'desenvolvedor'
  ORDER BY p.full_name;
$$;
GRANT EXECUTE ON FUNCTION public.listar_usuarios() TO authenticated;

-- Busca por CPF/CNPJ: informa se o cliente existe e em quais nichos, sem expor dados de outros nichos
CREATE OR REPLACE FUNCTION public.buscar_cliente_por_documento(p_doc text)
RETURNS TABLE (cliente_id uuid, nome text, tem_acesso boolean, nichos jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.nome, public.tem_acesso_cliente(c.id),
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
                    'id', n.id, 'nicho', n.nicho, 'status', n.status,
                    'responsavel', (SELECT full_name FROM public.profiles WHERE id = n.responsavel_principal_id),
                    'tem_acesso', public.tem_acesso_nicho(n.id)) ORDER BY n.nicho)
           FROM public.cliente_nichos n WHERE n.cliente_id = c.id
         ), '[]'::jsonb)
  FROM public.clientes c
  WHERE auth.uid() IS NOT NULL
    AND public.so_digitos(p_doc) IS NOT NULL
    AND public.so_digitos(c.cpf) = public.so_digitos(p_doc)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.buscar_cliente_por_documento(text) TO authenticated;

-- Abre um novo nicho para um cliente (inclusive cliente cadastrado por outro usuário)
CREATE OR REPLACE FUNCTION public.adicionar_nicho_cliente(
  p_cliente_id uuid, p_nicho text, p_principal uuid, p_secundarios uuid[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid; v_nicho text := upper(trim(p_nicho));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF v_nicho IS NULL OR v_nicho = '' THEN RAISE EXCEPTION 'Informe o nicho.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = p_cliente_id) THEN RAISE EXCEPTION 'Cliente não encontrado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.cliente_nichos WHERE cliente_id = p_cliente_id AND nicho = v_nicho) THEN
    RAISE EXCEPTION 'Este cliente já possui atendimento no nicho %.', v_nicho USING ERRCODE = 'unique_violation';
  END IF;
  -- Quem abre o nicho precisa participar dele (exceto Gestão Administrativa)
  IF NOT public.is_admin() AND COALESCE(p_principal, auth.uid()) <> auth.uid()
     AND NOT (auth.uid() = ANY (COALESCE(p_secundarios, '{}'))) THEN
    p_secundarios := array_append(COALESCE(p_secundarios, '{}'), auth.uid());
  END IF;
  INSERT INTO public.cliente_nichos (cliente_id, nicho, responsavel_principal_id, responsaveis_secundarios, created_by)
  VALUES (p_cliente_id, v_nicho, COALESCE(p_principal, auth.uid()),
          ARRAY(SELECT DISTINCT unnest(COALESCE(p_secundarios, '{}')) EXCEPT SELECT COALESCE(p_principal, auth.uid())),
          auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.adicionar_nicho_cliente(uuid, text, uuid, uuid[]) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Tarefas: responsável vinculado a usuário
-- ---------------------------------------------------------------------
ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
UPDATE public.tarefas t SET responsavel_id = p.id
FROM public.profiles p
WHERE t.responsavel_id IS NULL AND t.responsavel IS NOT NULL
  AND (lower(t.responsavel) = lower(p.full_name)
       OR lower(t.responsavel) LIKE lower(split_part(p.full_name, ' ', 1)) || ' %' AND lower(t.responsavel) LIKE '% ' || lower(split_part(p.full_name, ' ', 2)) || '%');

-- ---------------------------------------------------------------------
-- 7. Agenda: compromissos próprios, visíveis a todos (somente leitura para os demais)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE DEFAULT auth.uid(),
  titulo text NOT NULL,
  descricao text,
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  local text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_data ON public.agenda_eventos (data);
DROP TRIGGER IF EXISTS update_agenda_eventos_updated_at ON public.agenda_eventos;
CREATE TRIGGER update_agenda_eventos_updated_at BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_audit_agenda_eventos ON public.agenda_eventos;
CREATE TRIGGER trigger_audit_agenda_eventos AFTER INSERT OR UPDATE OR DELETE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- ---------------------------------------------------------------------
-- 8. RLS — remove políticas antigas (duplicadas) e recria
-- ---------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT polname, c.relname FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
           WHERE c.relnamespace = 'public'::regnamespace
             AND c.relname IN ('clientes','cliente_nichos','processos','audiencias','documentos','tarefas','agenda_eventos')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.polname, r.relname);
  END LOOP;
END $$;

ALTER TABLE public.cliente_nichos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

-- CLIENTES: todos lançam; veem/editam os clientes da sua carteira; excluem se têm todos os nichos
CREATE POLICY clientes_select ON public.clientes FOR SELECT TO authenticated USING (public.tem_acesso_cliente(id));
CREATE POLICY clientes_insert ON public.clientes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY clientes_update ON public.clientes FOR UPDATE TO authenticated USING (public.tem_acesso_cliente(id));
CREATE POLICY clientes_delete ON public.clientes FOR DELETE TO authenticated USING (public.pode_excluir_cliente(id));

-- NICHOS: cada um só vê os nichos em que é responsável (criação via RPC adicionar_nicho_cliente)
CREATE POLICY nichos_select ON public.cliente_nichos FOR SELECT TO authenticated USING (public.tem_acesso_nicho(id));
CREATE POLICY nichos_insert ON public.cliente_nichos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY nichos_update ON public.cliente_nichos FOR UPDATE TO authenticated USING (public.tem_acesso_nicho(id));
CREATE POLICY nichos_delete ON public.cliente_nichos FOR DELETE TO authenticated USING (public.is_admin() OR responsavel_principal_id = auth.uid());

-- PROCESSOS
CREATE POLICY processos_select ON public.processos FOR SELECT TO authenticated USING (public.tem_acesso_processo(id));
CREATE POLICY processos_insert ON public.processos FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid() OR public.is_admin()) AND (cliente_nicho_id IS NULL OR public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY processos_update ON public.processos FOR UPDATE TO authenticated USING (public.tem_acesso_processo(id));
CREATE POLICY processos_delete ON public.processos FOR DELETE TO authenticated USING (public.tem_acesso_processo(id));

-- AUDIÊNCIAS: seguem o processo
CREATE POLICY audiencias_select ON public.audiencias FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR (processo_id IS NOT NULL AND public.tem_acesso_processo(processo_id)));
CREATE POLICY audiencias_insert ON public.audiencias FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY audiencias_update ON public.audiencias FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR (processo_id IS NOT NULL AND public.tem_acesso_processo(processo_id)));
CREATE POLICY audiencias_delete ON public.audiencias FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR (processo_id IS NOT NULL AND public.tem_acesso_processo(processo_id)));

-- DOCUMENTOS: seguem o nicho
CREATE POLICY documentos_select ON public.documentos FOR SELECT TO authenticated
  USING (public.pode_ver_documento(user_id, cliente_nicho_id, cliente_id, parent_id, is_folder));
CREATE POLICY documentos_insert ON public.documentos FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid() OR public.is_admin()) AND (cliente_nicho_id IS NULL OR public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY documentos_update ON public.documentos FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY documentos_delete ON public.documentos FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin() OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));

-- TAREFAS: visão individual (autor ou responsável); só o AUTOR exclui
CREATE POLICY tarefas_select ON public.tarefas FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR responsavel_id = auth.uid() OR public.is_admin());
CREATE POLICY tarefas_insert ON public.tarefas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY tarefas_update ON public.tarefas FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR responsavel_id = auth.uid() OR public.is_dev());
CREATE POLICY tarefas_delete ON public.tarefas FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_dev());

-- AGENDA: todos veem; cada um lança/edita/exclui só o que é seu
CREATE POLICY agenda_select ON public.agenda_eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY agenda_insert ON public.agenda_eventos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY agenda_update ON public.agenda_eventos FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_dev());
CREATE POLICY agenda_delete ON public.agenda_eventos FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_dev());

-- STORAGE (bucket documentos): baixar arquivos dos nichos a que se tem acesso
DROP POLICY IF EXISTS "Users can view own docs in documentos bucket" ON storage.objects;
DROP POLICY IF EXISTS "documentos_bucket_select" ON storage.objects;
CREATE POLICY "documentos_bucket_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos' AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.pode_ver_arquivo(name)));
DROP POLICY IF EXISTS "Users can delete own docs in documentos bucket" ON storage.objects;
DROP POLICY IF EXISTS "documentos_bucket_delete" ON storage.objects;
CREATE POLICY "documentos_bucket_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documentos' AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin()
         OR EXISTS (SELECT 1 FROM public.documentos d WHERE d.storage_path = name AND d.cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(d.cliente_nicho_id))));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_nichos, public.agenda_eventos TO authenticated;

NOTIFY pgrst, 'reload schema';
