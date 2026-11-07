-- Enum para status do cliente
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cliente_status') THEN
    CREATE TYPE public.cliente_status AS ENUM ('Ativo', 'Inativo');
  END IF;
END $$;

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  endereco TEXT,
  data_registro DATE NOT NULL DEFAULT (now()::date),
  processos_ativos INTEGER NOT NULL DEFAULT 0 CHECK (processos_ativos >= 0),
  status public.cliente_status NOT NULL DEFAULT 'Ativo',
  ultimo_contato DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_client_email_per_user UNIQUE (user_id, email)
);

COMMENT ON TABLE public.clientes IS 'Registros de clientes, escopados por usuário (profiles.id).';

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_nome ON public.clientes(user_id, nome);

-- Habilitar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS por usuário
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes' AND policyname = 'Users can view their own clientes'
  ) THEN
    CREATE POLICY "Users can view their own clientes"
    ON public.clientes
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes' AND policyname = 'Users can insert their own clientes'
  ) THEN
    CREATE POLICY "Users can insert their own clientes"
    ON public.clientes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes' AND policyname = 'Users can update their own clientes'
  ) THEN
    CREATE POLICY "Users can update their own clientes"
    ON public.clientes
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clientes' AND policyname = 'Users can delete their own clientes'
  ) THEN
    CREATE POLICY "Users can delete their own clientes"
    ON public.clientes
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger para updated_at
CREATE TRIGGER update_clientes_updated_at
BEFORE UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();