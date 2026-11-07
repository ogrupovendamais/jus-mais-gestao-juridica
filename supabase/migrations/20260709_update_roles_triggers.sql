-- Adicionar coluna ativo na tabela public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- Atualizar handle_new_user para considerar convites
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text := 'parceiro';
  v_convite_id uuid;
BEGIN
  -- Verificar se existe convite válido para o e-mail
  SELECT id, role INTO v_convite_id, v_role
  FROM public.convites
  WHERE email = NEW.email AND usado = false AND expires_at > now()
  LIMIT 1;

  -- Email do desenvolvedor sempre desenvolvedor
  IF NEW.email = 'ogrupovendamais@gmail.com' THEN
    v_role := 'desenvolvedor';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    v_role,
    true
  );

  -- Se havia convite, marcar como usado
  IF v_convite_id IS NOT NULL THEN
    UPDATE public.convites SET usado = true WHERE id = v_convite_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
