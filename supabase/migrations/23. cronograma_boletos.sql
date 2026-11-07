-- Esteira de honorários: cronograma de boletos definido na proposta
-- (vencimentos já em dia útil e ajustáveis um a um). Ao registrar os boletos,
-- as parcelas são lançadas exatamente com essas datas e valores.
-- Propostas antigas (sem cronograma) continuam no cálculo mensal, agora pulando fim de semana.

ALTER TABLE public.honorarios_propostas ADD COLUMN IF NOT EXISTS cronograma jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Próximo dia útil: pula sábado e domingo (feriados ficam a cargo do cronograma da tela)
CREATE OR REPLACE FUNCTION public.proximo_dia_util(d date)
RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE extract(isodow FROM d)::int WHEN 6 THEN d + 2 WHEN 7 THEN d + 1 ELSE d END;
$$;

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

  IF jsonb_array_length(p.cronograma) > 0 THEN
    -- cronograma definido na proposta (datas conferidas/ajustadas na tela)
    INSERT INTO _parcelas
    SELECT p.descricao || ' - ' || (c->>'descricao'), (c->>'valor')::numeric, (c->>'vencimento')::date
    FROM jsonb_array_elements(p.cronograma) c;
  ELSE
    IF p.valor_entrada > 0 THEN
      INSERT INTO _parcelas VALUES (p.descricao || ' - Entrada', p.valor_entrada, public.proximo_dia_util(COALESCE(p.data_entrada, current_date)));
    END IF;
    IF p.num_parcelas > 0 THEN
      v_resto := p.valor_total - p.valor_entrada;
      FOR i IN 1..p.num_parcelas LOOP
        v_valor := CASE WHEN i < p.num_parcelas THEN round(v_resto / p.num_parcelas, 2)
                        ELSE v_resto - round(v_resto / p.num_parcelas, 2) * (p.num_parcelas - 1) END;
        INSERT INTO _parcelas VALUES (format('%s - Parcela %s/%s', p.descricao, i, p.num_parcelas), v_valor,
                                      public.proximo_dia_util((COALESCE(p.primeiro_vencimento, current_date) + make_interval(months => i - 1))::date));
      END LOOP;
    END IF;
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

NOTIFY pgrst, 'reload schema';
