-- =====================================================================
-- Esteira de honorários
--   1. Responsável do nicho registra a proposta (valores, parcelas, divisão)
--      -> tarefa automática para a Dra. Keila confirmar a distribuição
--   2. Gestão aprova (ou devolve com motivo)
--      -> tarefa automática para a Assistente Financeira gerar os boletos
--   3. Assistente financeira registra os boletos emitidos (PDF opcional)
--      -> parcelas lançadas no Financeiro como receitas pendentes
-- Assistente Financeira: vê o Financeiro inteiro e o cadastro dos clientes
-- (não vê processos, documentos de nicho nem anotações).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.is_financeiro()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND classificacao = 'assistente_financeiro' AND ativo IS NOT FALSE);
$$;

-- ---------- acesso da Assistente Financeira ----------
DROP POLICY IF EXISTS clientes_select_financeiro ON public.clientes;
CREATE POLICY clientes_select_financeiro ON public.clientes FOR SELECT TO authenticated USING (public.is_financeiro());
DROP POLICY IF EXISTS nichos_select_financeiro ON public.cliente_nichos;
CREATE POLICY nichos_select_financeiro ON public.cliente_nichos FOR SELECT TO authenticated USING (public.is_financeiro());

DROP POLICY IF EXISTS financeiro_select_assistente ON public.financeiro_lancamentos;
DROP POLICY IF EXISTS financeiro_update_assistente ON public.financeiro_lancamentos;
CREATE POLICY financeiro_select_assistente ON public.financeiro_lancamentos FOR SELECT TO authenticated USING (public.is_financeiro());
CREATE POLICY financeiro_update_assistente ON public.financeiro_lancamentos FOR UPDATE TO authenticated USING (public.is_financeiro());

-- ---------- propostas ----------
CREATE TABLE IF NOT EXISTS public.honorarios_propostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  cliente_nicho_id uuid REFERENCES public.cliente_nichos(id) ON DELETE SET NULL,
  nicho text,
  descricao text NOT NULL DEFAULT 'Honorários iniciais',
  valor_total numeric(14,2) NOT NULL CHECK (valor_total > 0),
  valor_entrada numeric(14,2) NOT NULL DEFAULT 0 CHECK (valor_entrada >= 0),
  data_entrada date,
  num_parcelas int NOT NULL DEFAULT 0 CHECK (num_parcelas >= 0 AND num_parcelas <= 120),
  primeiro_vencimento date,
  forma_pagamento text NOT NULL DEFAULT 'Boleto',
  -- divisão: [{ "parceiro_id": uuid, "pct": 20 }, ...] (até 3) + reserva
  distribuicao jsonb NOT NULL DEFAULT '[]'::jsonb,
  pct_reserva numeric(5,2) NOT NULL DEFAULT 5,
  observacoes text,
  status text NOT NULL DEFAULT 'aguardando_aprovacao'
    CHECK (status IN ('aguardando_aprovacao', 'aprovada', 'devolvida', 'boletos_emitidos', 'cancelada')),
  motivo_devolucao text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  aprovado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  aprovado_em timestamptz,
  emitido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  emitido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valor_entrada <= valor_total),
  CHECK (num_parcelas > 0 OR valor_entrada = valor_total)
);
CREATE INDEX IF NOT EXISTS idx_honorarios_status ON public.honorarios_propostas (status);
CREATE INDEX IF NOT EXISTS idx_honorarios_cliente ON public.honorarios_propostas (cliente_id);

DROP TRIGGER IF EXISTS update_honorarios_updated_at ON public.honorarios_propostas;
CREATE TRIGGER update_honorarios_updated_at BEFORE UPDATE ON public.honorarios_propostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trigger_audit_honorarios ON public.honorarios_propostas;
CREATE TRIGGER trigger_audit_honorarios AFTER INSERT OR UPDATE OR DELETE ON public.honorarios_propostas
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS proposta_id uuid REFERENCES public.honorarios_propostas(id) ON DELETE CASCADE;
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS proposta_id uuid REFERENCES public.honorarios_propostas(id) ON DELETE SET NULL;

ALTER TABLE public.honorarios_propostas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS honorarios_select ON public.honorarios_propostas;
DROP POLICY IF EXISTS honorarios_insert ON public.honorarios_propostas;
DROP POLICY IF EXISTS honorarios_update ON public.honorarios_propostas;
DROP POLICY IF EXISTS honorarios_delete ON public.honorarios_propostas;
CREATE POLICY honorarios_select ON public.honorarios_propostas FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_financeiro() OR created_by = auth.uid()
         OR (cliente_nicho_id IS NOT NULL AND public.tem_acesso_nicho(cliente_nicho_id)));
CREATE POLICY honorarios_insert ON public.honorarios_propostas FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_admin() OR public.tem_acesso_cliente(cliente_id)));
-- edição direta: autor enquanto aguarda/devolvida (reenviar); mudanças de etapa só pelas funções abaixo
CREATE POLICY honorarios_update ON public.honorarios_propostas FOR UPDATE TO authenticated
  USING (public.is_admin() OR (created_by = auth.uid() AND status IN ('aguardando_aprovacao', 'devolvida')));
CREATE POLICY honorarios_delete ON public.honorarios_propostas FOR DELETE TO authenticated
  USING (public.is_admin() OR (created_by = auth.uid() AND status IN ('aguardando_aprovacao', 'devolvida')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.honorarios_propostas TO authenticated;

-- O autor só pode mudar a etapa para "reenviar" (devolvida -> aguardando)
CREATE OR REPLACE FUNCTION public.honorarios_guarda_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('cadore.esteira', true) IS DISTINCT FROM 'on'
     AND auth.uid() IS NOT NULL
     AND NOT (OLD.status = 'devolvida' AND NEW.status = 'aguardando_aprovacao')
     AND NOT (public.is_admin() AND NEW.status = 'cancelada') THEN
    RAISE EXCEPTION 'Mudança de etapa não permitida por aqui.';
  END IF;
  IF NEW.status = 'aguardando_aprovacao' AND OLD.status = 'devolvida' THEN
    NEW.motivo_devolucao := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_honorarios_guarda ON public.honorarios_propostas;
CREATE TRIGGER trg_honorarios_guarda BEFORE UPDATE ON public.honorarios_propostas
  FOR EACH ROW EXECUTE FUNCTION public.honorarios_guarda_status();

-- ---------- tarefas automáticas ----------
CREATE OR REPLACE FUNCTION public.brl(v numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT 'R$ ' || translate(to_char(v, 'FM999G999G990D00'), ',.', '.,');
$$;

CREATE OR REPLACE FUNCTION public.honorarios_resumo(p public.honorarios_propostas)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT format('%s — %s%s — Total %s%s%s%s',
    (SELECT nome FROM public.clientes WHERE id = p.cliente_id),
    p.descricao,
    CASE WHEN p.nicho IS NOT NULL THEN ' (' || p.nicho || ')' ELSE '' END,
    public.brl(p.valor_total),
    CASE WHEN p.valor_entrada > 0 THEN format(' | Entrada %s em %s', public.brl(p.valor_entrada), to_char(p.data_entrada, 'DD/MM/YYYY')) ELSE '' END,
    CASE WHEN p.num_parcelas > 0 THEN format(' | %s parcela(s) de %s a partir de %s', p.num_parcelas,
         public.brl(round((p.valor_total - p.valor_entrada) / p.num_parcelas, 2)), to_char(p.primeiro_vencimento, 'DD/MM/YYYY')) ELSE '' END,
    ' | ' || p.forma_pagamento ||
    COALESCE(' | Divisão: ' || (
      SELECT string_agg(COALESCE((SELECT full_name FROM public.profiles WHERE id = (d->>'parceiro_id')::uuid), '?') || ' ' || (d->>'pct') || '%', ', ')
      FROM jsonb_array_elements(p.distribuicao) d), '') ||
    format(' | Reserva %s%%', p.pct_reserva)
  );
$$;

CREATE OR REPLACE FUNCTION public.honorarios_tarefas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_aprovador uuid;
  v_fin record;
  v_tem_fin boolean := false;
  v_resumo text := public.honorarios_resumo(NEW);
BEGIN
  -- aprovador: Gestão Administrativa (preferência pela Dra. Keila)
  SELECT id INTO v_aprovador FROM public.profiles
  WHERE classificacao = 'gestao_administrativa' AND ativo IS NOT FALSE
  ORDER BY (full_name ILIKE 'keila%') DESC, full_name LIMIT 1;

  IF TG_OP = 'INSERT' OR (NEW.status = 'aguardando_aprovacao' AND OLD.status IS DISTINCT FROM 'aguardando_aprovacao') THEN
    UPDATE public.tarefas SET status = 'Concluída' WHERE proposta_id = NEW.id AND status <> 'Concluída';
    IF v_aprovador IS NOT NULL THEN
      INSERT INTO public.tarefas (user_id, descricao, data_conclusao, prioridade, status, responsavel_id, responsavel, cliente_id, proposta_id)
      VALUES (COALESCE(NEW.created_by, v_aprovador), 'CONFIRMAR DISTRIBUIÇÃO DE HONORÁRIOS: ' || v_resumo, current_date + 1, 'Alta', 'Pendente',
              v_aprovador, (SELECT full_name FROM public.profiles WHERE id = v_aprovador), NEW.cliente_id, NEW.id);
    END IF;

  ELSIF NEW.status = 'aprovada' AND OLD.status IS DISTINCT FROM 'aprovada' THEN
    UPDATE public.tarefas SET status = 'Concluída' WHERE proposta_id = NEW.id AND status <> 'Concluída';
    FOR v_fin IN SELECT id, full_name FROM public.profiles WHERE classificacao = 'assistente_financeiro' AND ativo IS NOT FALSE LOOP
      v_tem_fin := true;
      INSERT INTO public.tarefas (user_id, descricao, data_conclusao, prioridade, status, responsavel_id, responsavel, cliente_id, proposta_id)
      VALUES (COALESCE(NEW.aprovado_por, v_aprovador), 'GERAR BOLETOS DOS HONORÁRIOS: ' || v_resumo, current_date + 1, 'Alta', 'Pendente',
              v_fin.id, v_fin.full_name, NEW.cliente_id, NEW.id);
    END LOOP;
    IF NOT v_tem_fin AND v_aprovador IS NOT NULL THEN
      INSERT INTO public.tarefas (user_id, descricao, data_conclusao, prioridade, status, responsavel_id, responsavel, cliente_id, proposta_id)
      VALUES (v_aprovador, 'GERAR BOLETOS DOS HONORÁRIOS (nenhuma Assistente Financeira cadastrada): ' || v_resumo, current_date + 1, 'Alta', 'Pendente',
              v_aprovador, (SELECT full_name FROM public.profiles WHERE id = v_aprovador), NEW.cliente_id, NEW.id);
    END IF;

  ELSIF NEW.status = 'devolvida' AND OLD.status IS DISTINCT FROM 'devolvida' THEN
    UPDATE public.tarefas SET status = 'Concluída' WHERE proposta_id = NEW.id AND status <> 'Concluída';
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.tarefas (user_id, descricao, data_conclusao, prioridade, status, responsavel_id, responsavel, cliente_id, proposta_id)
      VALUES (COALESCE(NEW.aprovado_por, v_aprovador, NEW.created_by), 'REVISAR PROPOSTA DE HONORÁRIOS (devolvida): ' || COALESCE(NEW.motivo_devolucao, '') || ' — ' || v_resumo,
              current_date + 1, 'Alta', 'Pendente', NEW.created_by, (SELECT full_name FROM public.profiles WHERE id = NEW.created_by), NEW.cliente_id, NEW.id);
    END IF;

  ELSIF NEW.status IN ('boletos_emitidos', 'cancelada') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.tarefas SET status = 'Concluída' WHERE proposta_id = NEW.id AND status <> 'Concluída';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_honorarios_tarefas ON public.honorarios_propostas;
CREATE TRIGGER trg_honorarios_tarefas AFTER INSERT OR UPDATE OF status ON public.honorarios_propostas
  FOR EACH ROW EXECUTE FUNCTION public.honorarios_tarefas();

-- ---------- etapas ----------
CREATE OR REPLACE FUNCTION public.aprovar_honorarios(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Somente a Gestão Administrativa aprova a distribuição de honorários.'; END IF;
  PERFORM set_config('cadore.esteira', 'on', true);
  UPDATE public.honorarios_propostas SET status = 'aprovada', aprovado_por = auth.uid(), aprovado_em = now()
  WHERE id = p_id AND status = 'aguardando_aprovacao';
  IF NOT FOUND THEN RAISE EXCEPTION 'A proposta não está aguardando aprovação.'; END IF;
  PERFORM set_config('cadore.esteira', 'off', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.devolver_honorarios(p_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Somente a Gestão Administrativa pode devolver a proposta.'; END IF;
  IF COALESCE(trim(p_motivo), '') = '' THEN RAISE EXCEPTION 'Informe o motivo da devolução.'; END IF;
  PERFORM set_config('cadore.esteira', 'on', true);
  UPDATE public.honorarios_propostas SET status = 'devolvida', motivo_devolucao = p_motivo, aprovado_por = auth.uid()
  WHERE id = p_id AND status = 'aguardando_aprovacao';
  IF NOT FOUND THEN RAISE EXCEPTION 'A proposta não está aguardando aprovação.'; END IF;
  PERFORM set_config('cadore.esteira', 'off', true);
END;
$$;

-- Boletos emitidos: lança entrada + parcelas no Financeiro (receitas pendentes com a divisão aprovada)
CREATE OR REPLACE FUNCTION public.emitir_boletos_honorarios(p_id uuid)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p public.honorarios_propostas;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_pct1 numeric := 0; v_pct2 numeric := 0; v_pct3 numeric := 0;
  v_valor numeric; v_n int := 0; i int;
  v_resto numeric;
BEGIN
  IF NOT (public.is_financeiro() OR public.is_admin()) THEN RAISE EXCEPTION 'Somente a Assistente Financeira (ou Gestão) registra os boletos.'; END IF;
  SELECT * INTO p FROM public.honorarios_propostas WHERE id = p_id FOR UPDATE;
  IF p.id IS NULL OR p.status <> 'aprovada' THEN RAISE EXCEPTION 'A proposta precisa estar aprovada.'; END IF;

  v_p1 := (p.distribuicao->0->>'parceiro_id')::uuid; v_pct1 := COALESCE((p.distribuicao->0->>'pct')::numeric, 0);
  v_p2 := (p.distribuicao->1->>'parceiro_id')::uuid; v_pct2 := COALESCE((p.distribuicao->1->>'pct')::numeric, 0);
  v_p3 := (p.distribuicao->2->>'parceiro_id')::uuid; v_pct3 := COALESCE((p.distribuicao->2->>'pct')::numeric, 0);

  CREATE TEMP TABLE IF NOT EXISTS _parcelas (descr text, valor numeric, venc date) ON COMMIT DROP;
  DELETE FROM _parcelas;
  IF p.valor_entrada > 0 THEN
    INSERT INTO _parcelas VALUES (p.descricao || ' - Entrada', p.valor_entrada, COALESCE(p.data_entrada, current_date));
  END IF;
  IF p.num_parcelas > 0 THEN
    v_resto := p.valor_total - p.valor_entrada;
    FOR i IN 1..p.num_parcelas LOOP
      -- última parcela absorve o arredondamento
      v_valor := CASE WHEN i < p.num_parcelas THEN round(v_resto / p.num_parcelas, 2)
                      ELSE v_resto - round(v_resto / p.num_parcelas, 2) * (p.num_parcelas - 1) END;
      INSERT INTO _parcelas VALUES (format('%s - Parcela %s/%s', p.descricao, i, p.num_parcelas), v_valor,
                                    (COALESCE(p.primeiro_vencimento, current_date) + make_interval(months => i - 1))::date);
    END LOOP;
  END IF;

  INSERT INTO public.financeiro_lancamentos (
    user_id, cliente_id, cliente_nicho_id, proposta_id, descricao, valor, data_vencimento, status, tipo_lancamento,
    forma_recebimento, valor_escritorio, valor_reserva, pct_reserva,
    parceiro_id_1, parceiro_beneficiario_id, valor_parceiro, parceiro_id_2, pct_parceiro2, valor_parceiro2, parceiro_id_3, pct_parceiro3, valor_parceiro3,
    status_parceiro)
  SELECT auth.uid(), p.cliente_id, p.cliente_nicho_id, p.id, x.descr, x.valor, x.venc, 'Pendente', 'Receita',
         p.forma_pagamento, x.valor, round(x.valor * p.pct_reserva / 100, 2), p.pct_reserva,
         v_p1, v_p1, CASE WHEN v_p1 IS NOT NULL THEN round(x.valor * v_pct1 / 100, 2) END,
         v_p2, CASE WHEN v_p2 IS NOT NULL THEN v_pct2 END, CASE WHEN v_p2 IS NOT NULL THEN round(x.valor * v_pct2 / 100, 2) END,
         v_p3, CASE WHEN v_p3 IS NOT NULL THEN v_pct3 END, CASE WHEN v_p3 IS NOT NULL THEN round(x.valor * v_pct3 / 100, 2) END,
         CASE WHEN v_p1 IS NOT NULL THEN 'Pendente' END
  FROM _parcelas x;
  GET DIAGNOSTICS v_n = ROW_COUNT;

  PERFORM set_config('cadore.esteira', 'on', true);
  UPDATE public.honorarios_propostas SET status = 'boletos_emitidos', emitido_por = auth.uid(), emitido_em = now() WHERE id = p_id;
  PERFORM set_config('cadore.esteira', 'off', true);
  RETURN v_n;
END;
$$;

-- Boleto em PDF: guardado na pasta FINANCEIRO_E_FISCAL do cliente no nicho
CREATE OR REPLACE FUNCTION public.registrar_boleto(p_id uuid, p_nome text, p_path text, p_tamanho bigint)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.honorarios_propostas; v_pasta uuid;
BEGIN
  IF NOT (public.is_financeiro() OR public.is_admin()) THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF split_part(p_path, '/', 1) <> auth.uid()::text THEN RAISE EXCEPTION 'Caminho de arquivo inválido.'; END IF;
  SELECT * INTO p FROM public.honorarios_propostas WHERE id = p_id;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Proposta não encontrada.'; END IF;
  SELECT id INTO v_pasta FROM public.documentos
  WHERE is_folder AND cliente_nicho_id IS NOT DISTINCT FROM p.cliente_nicho_id AND cliente_id = p.cliente_id AND nome = 'FINANCEIRO_E_FISCAL'
  ORDER BY created_at LIMIT 1;
  INSERT INTO public.documentos (nome, is_folder, user_id, cliente_id, cliente_nicho_id, parent_id, storage_path, tamanho)
  VALUES (p_nome, false, auth.uid(), p.cliente_id, p.cliente_nicho_id, v_pasta, p_path, p_tamanho);
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_honorarios(uuid), public.devolver_honorarios(uuid, text),
  public.emitir_boletos_honorarios(uuid), public.registrar_boleto(uuid, text, text, bigint) TO authenticated;

NOTIFY pgrst, 'reload schema';
