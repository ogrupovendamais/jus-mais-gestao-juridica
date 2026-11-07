-- =====================================================================
-- Equipe e convites alinhados à classificação da conta (20/10/2026)
--  - card da Equipe ligado à conta de acesso (profile_id)
--  - cargo e departamento do card seguem a classificação, inclusive quando ela muda
--  - correção de e-mails copiados errado e convites sem classificação
-- =====================================================================

ALTER TABLE public.equipe ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.cargo_da_classificacao(c text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE c
    WHEN 'gestao_administrativa' THEN 'Gestão Administrativa'
    WHEN 'controladoria_juridica' THEN 'Controladoria Jurídica'
    WHEN 'assistente_juridico' THEN 'Assistente Jurídico(a)'
    WHEN 'parceiro_juridico' THEN 'Parceiro(a) Jurídico(a)'
    WHEN 'assistente_financeiro' THEN 'Assistente Financeiro(a)'
  END;
$$;

CREATE OR REPLACE FUNCTION public.departamento_da_classificacao(c text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE c
    WHEN 'gestao_administrativa' THEN 'Gestão Administrativa'
    WHEN 'controladoria_juridica' THEN 'Controladoria Jurídica'
    WHEN 'assistente_juridico' THEN 'Jurídico'
    WHEN 'parceiro_juridico' THEN 'Jurídico'
    WHEN 'assistente_financeiro' THEN 'Financeiro'
  END;
$$;

-- 1. Liga cada card à conta (pelo primeiro nome, que é único na equipe atual)
UPDATE public.equipe e SET profile_id = p.id
FROM public.profiles p
WHERE e.profile_id IS NULL AND p.role <> 'desenvolvedor'
  AND lower(split_part(e.nome, ' ', 1)) IN (lower(split_part(p.full_name, ' ', 1)), CASE WHEN lower(p.full_name) LIKE 'karolin%' THEN 'karoline' END);

-- 2. E-mails copiados errado (vários cards com o e-mail da Laura): usa o e-mail da conta
UPDATE public.equipe e SET email = p.email
FROM public.profiles p
WHERE e.profile_id = p.id AND e.email = 'lauralb3k@gmail.com' AND p.email <> 'lauralb3k@gmail.com';

-- 3. Cargo e departamento conforme a classificação da conta
UPDATE public.equipe e SET cargo = public.cargo_da_classificacao(p.classificacao),
                          departamento = public.departamento_da_classificacao(p.classificacao)
FROM public.profiles p
WHERE e.profile_id = p.id AND p.classificacao IS NOT NULL;

-- 3b. Quem ainda não aceitou o convite (sem conta): usa e-mail e classificação do convite
UPDATE public.equipe e SET email = c.email,
                          cargo = public.cargo_da_classificacao(c.classificacao),
                          departamento = public.departamento_da_classificacao(c.classificacao)
FROM public.convites c
WHERE e.profile_id IS NULL AND NOT c.usado AND c.classificacao IS NOT NULL
  AND lower(split_part(e.nome, ' ', 1)) = lower(split_part(c.full_name, ' ', 1));

-- 4. Convites antigos/desatualizados mostram a classificação atual da conta
UPDATE public.convites c SET classificacao = p.classificacao
FROM public.profiles p
WHERE lower(c.email) = lower(p.email) AND p.classificacao IS NOT NULL AND c.classificacao IS DISTINCT FROM p.classificacao;

-- 5. Mudou a classificação da conta -> card da Equipe acompanha
CREATE OR REPLACE FUNCTION public.equipe_segue_classificacao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.classificacao IS DISTINCT FROM OLD.classificacao AND NEW.classificacao IS NOT NULL THEN
    UPDATE public.equipe SET cargo = public.cargo_da_classificacao(NEW.classificacao),
                             departamento = public.departamento_da_classificacao(NEW.classificacao)
    WHERE profile_id = NEW.id;
    UPDATE public.convites SET classificacao = NEW.classificacao WHERE lower(email) = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_equipe_segue_classificacao ON public.profiles;
CREATE TRIGGER trg_equipe_segue_classificacao AFTER UPDATE OF classificacao ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.equipe_segue_classificacao();

-- 6. Conta nova (convite aceito) -> liga ao card da Equipe com o mesmo e-mail
CREATE OR REPLACE FUNCTION public.equipe_liga_conta_nova()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.equipe SET profile_id = NEW.id,
         cargo = COALESCE(public.cargo_da_classificacao(NEW.classificacao), cargo),
         departamento = COALESCE(public.departamento_da_classificacao(NEW.classificacao), departamento)
  WHERE profile_id IS NULL AND lower(email) = lower(NEW.email);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_equipe_liga_conta_nova ON public.profiles;
CREATE TRIGGER trg_equipe_liga_conta_nova AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.equipe_liga_conta_nova();

NOTIFY pgrst, 'reload schema';
