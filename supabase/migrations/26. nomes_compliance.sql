-- 26. Nomes de usuários no padrão de compliance da Cadore (call 20/10):
-- "Nome + iniciais dos sobrenomes do meio + Sobrenome final" — ex.: Laura B G Mota, Keila C M Cadore.
-- O nome completo continua no card da Equipe; a conta (profiles.full_name), que é o nome exibido
-- em todas as listas/boxes, passa a ser sempre a forma abreviada.

CREATE OR REPLACE FUNCTION public.nome_compliance(p_nome text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  partes text[];
  meio text := '';
  i int;
BEGIN
  IF p_nome IS NULL OR btrim(p_nome) = '' THEN RETURN p_nome; END IF;
  -- preposições não entram na abreviação (da, de, do, das, dos, e)
  SELECT array_agg(w) INTO partes
  FROM unnest(regexp_split_to_array(btrim(p_nome), '\s+')) w
  WHERE lower(w) NOT IN ('da', 'de', 'do', 'das', 'dos', 'e');
  IF partes IS NULL OR array_length(partes, 1) <= 2 THEN
    RETURN array_to_string(COALESCE(partes, ARRAY[btrim(p_nome)]), ' ');
  END IF;
  FOR i IN 2 .. array_length(partes, 1) - 1 LOOP
    meio := meio || ' ' || upper(left(partes[i], 1));
  END LOOP;
  RETURN partes[1] || meio || ' ' || partes[array_length(partes, 1)];
END $$;

-- Conta nova / nome editado: grava sempre no padrão
CREATE OR REPLACE FUNCTION public.profiles_nome_compliance()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.full_name := public.nome_compliance(NEW.full_name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profiles_nome_compliance ON public.profiles;
CREATE TRIGGER trg_profiles_nome_compliance BEFORE INSERT OR UPDATE OF full_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_nome_compliance();

-- Nome completo corrigido no card da Equipe atualiza o nome exibido da conta ligada
CREATE OR REPLACE FUNCTION public.equipe_nome_para_conta()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL AND btrim(COALESCE(NEW.nome, '')) <> '' THEN
    UPDATE public.profiles SET full_name = NEW.nome
    WHERE id = NEW.profile_id AND full_name IS DISTINCT FROM public.nome_compliance(NEW.nome);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_equipe_nome_para_conta ON public.equipe;
CREATE TRIGGER trg_equipe_nome_para_conta AFTER INSERT OR UPDATE OF nome, profile_id ON public.equipe
  FOR EACH ROW EXECUTE FUNCTION public.equipe_nome_para_conta();

-- Converte os nomes atuais (usa o nome completo do card da Equipe quando existe)
CREATE TEMP TABLE _nomes ON COMMIT DROP AS
SELECT p.id, p.full_name AS antigo,
       public.nome_compliance(COALESCE(NULLIF(btrim(e.nome), ''), p.full_name)) AS novo
FROM public.profiles p
LEFT JOIN LATERAL (SELECT nome FROM public.equipe WHERE profile_id = p.id ORDER BY created_at LIMIT 1) e ON true;

UPDATE public.profiles p SET full_name = n.novo
FROM _nomes n WHERE n.id = p.id AND p.full_name IS DISTINCT FROM n.novo;

-- Tarefas antigas guardam o nome do responsável em texto
UPDATE public.tarefas t SET responsavel = n.novo
FROM _nomes n WHERE t.responsavel = n.antigo AND n.antigo IS DISTINCT FROM n.novo;

UPDATE public.tarefas t SET responsavel = public.nome_compliance(t.responsavel)
WHERE t.responsavel IN (SELECT nome FROM public.equipe)
  AND t.responsavel IS DISTINCT FROM public.nome_compliance(t.responsavel);
