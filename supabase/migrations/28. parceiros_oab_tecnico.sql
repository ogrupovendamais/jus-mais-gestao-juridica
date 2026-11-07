-- 28. Classificação jurídica alinhada ao compliance (pedido da Laura, 2026-10-31):
-- todos os usuários jurídicos passam a ser parceiros, com distinção para Dashboard e procedimentos:
--   Parceiro Jurídico OAB     (antigo "Parceiro(a) Jurídico(a)")  -> acesso: própria carteira
--   Parceiro Jurídico Técnico (antigos "Controladoria Jurídica" e "Assistente Jurídico(a)")
--                             -> acesso: própria carteira + consulta de processos/audiências/tarefas de todos
--                                (o que era da Controladoria; decisão do usuário: Karolina e Heitor com o mesmo acesso)

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_classificacao_check;

-- funções primeiro: os gatilhos da Equipe usam cargo/departamento ao mudar a classificação
-- "Controladoria" nas regras de acesso (RLS) = Parceiro Jurídico Técnico
CREATE OR REPLACE FUNCTION public.is_controladoria()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND classificacao = 'parceiro_juridico_tecnico' AND ativo IS NOT FALSE);
$$;

CREATE OR REPLACE FUNCTION public.cargo_da_classificacao(c text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE c
    WHEN 'gestao_administrativa' THEN 'Gestão Administrativa'
    WHEN 'parceiro_juridico_oab' THEN 'Parceiro Jurídico OAB'
    WHEN 'parceiro_juridico_tecnico' THEN 'Parceiro Jurídico Técnico'
    WHEN 'assistente_financeiro' THEN 'Assistente Financeiro(a)'
  END;
$$;

CREATE OR REPLACE FUNCTION public.departamento_da_classificacao(c text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE c
    WHEN 'gestao_administrativa' THEN 'Gestão Administrativa'
    WHEN 'parceiro_juridico_oab' THEN 'Jurídico'
    WHEN 'parceiro_juridico_tecnico' THEN 'Jurídico'
    WHEN 'assistente_financeiro' THEN 'Financeiro'
  END;
$$;

-- dados atuais
UPDATE public.profiles SET classificacao = 'parceiro_juridico_tecnico'
WHERE classificacao IN ('controladoria_juridica', 'assistente_juridico');
UPDATE public.profiles SET classificacao = 'parceiro_juridico_oab' WHERE classificacao = 'parceiro_juridico';
UPDATE public.convites SET classificacao = 'parceiro_juridico_tecnico'
WHERE classificacao IN ('controladoria_juridica', 'assistente_juridico');
UPDATE public.convites SET classificacao = 'parceiro_juridico_oab' WHERE classificacao = 'parceiro_juridico';

ALTER TABLE public.profiles ADD CONSTRAINT profiles_classificacao_check CHECK (
  classificacao IS NULL OR classificacao IN ('gestao_administrativa', 'parceiro_juridico_oab', 'parceiro_juridico_tecnico', 'assistente_financeiro')
);


-- cards da Equipe acompanham (inclusive quem ainda não aceitou o convite)
UPDATE public.equipe e SET cargo = public.cargo_da_classificacao(p.classificacao),
  departamento = public.departamento_da_classificacao(p.classificacao)
FROM public.profiles p WHERE p.id = e.profile_id AND p.classificacao IS NOT NULL;
UPDATE public.equipe SET cargo = 'Parceiro Jurídico OAB', departamento = 'Jurídico'
WHERE profile_id IS NULL AND cargo = 'Parceiro(a) Jurídico(a)';
UPDATE public.equipe SET cargo = 'Parceiro Jurídico Técnico', departamento = 'Jurídico'
WHERE profile_id IS NULL AND cargo IN ('Assistente Jurídico(a)', 'Controladoria Jurídica');
