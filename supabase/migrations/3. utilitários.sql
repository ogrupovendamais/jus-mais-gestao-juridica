-- 1) Função utilitária com search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processo_status') THEN
    CREATE TYPE public.processo_status AS ENUM ('Em Andamento', 'Aguardando', 'Concluído');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'processo_prioridade') THEN
    CREATE TYPE public.processo_prioridade AS ENUM ('Alta', 'Média', 'Baixa');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audiencia_tipo') THEN
    CREATE TYPE public.audiencia_tipo AS ENUM ('Instrução', 'Conciliação', 'Julgamento', 'Una');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audiencia_status') THEN
    CREATE TYPE public.audiencia_status AS ENUM ('Agendada', 'Realizada', 'Cancelada', 'Reagendada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tarefa_prioridade') THEN
    CREATE TYPE public.tarefa_prioridade AS ENUM ('Baixa', 'Média', 'Alta');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tarefa_status') THEN
    CREATE TYPE public.tarefa_status AS ENUM ('Pendente', 'Em Andamento', 'Concluída');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lancamento_status') THEN
    CREATE TYPE public.lancamento_status AS ENUM ('Pago', 'Pendente');
  END IF;
END $$;

-- 3) Processos
CREATE TABLE IF NOT EXISTS public.processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  numero TEXT NOT NULL,
  assunto TEXT NOT NULL,
  status public.processo_status NOT NULL DEFAULT 'Em Andamento',
  data_inicio DATE NOT NULL,
  data_limite DATE,
  prioridade public.processo_prioridade NOT NULL DEFAULT 'Média',
  responsavel TEXT,
  valor_causa NUMERIC(14,2),
  instancia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_processo_numero_per_user UNIQUE (user_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_processos_user ON public.processos(user_id);
CREATE INDEX IF NOT EXISTS idx_processos_cliente ON public.processos(cliente_id);
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processos' AND policyname='Users can view their own processos') THEN
    CREATE POLICY "Users can view their own processos" ON public.processos FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processos' AND policyname='Users can insert their own processos') THEN
    CREATE POLICY "Users can insert their own processos" ON public.processos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processos' AND policyname='Users can update their own processos') THEN
    CREATE POLICY "Users can update their own processos" ON public.processos FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='processos' AND policyname='Users can delete their own processos') THEN
    CREATE POLICY "Users can delete their own processos" ON public.processos FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE TRIGGER update_processos_updated_at BEFORE UPDATE ON public.processos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Audiências
CREATE TABLE IF NOT EXISTS public.audiencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  processo_numero TEXT NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local TEXT NOT NULL,
  tipo public.audiencia_tipo NOT NULL,
  status public.audiencia_status NOT NULL DEFAULT 'Agendada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audiencias_user ON public.audiencias(user_id);
CREATE INDEX IF NOT EXISTS idx_audiencias_processo ON public.audiencias(processo_id);
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audiencias' AND policyname='Users can view their own audiencias') THEN
    CREATE POLICY "Users can view their own audiencias" ON public.audiencias FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audiencias' AND policyname='Users can insert their own audiencias') THEN
    CREATE POLICY "Users can insert their own audiencias" ON public.audiencias FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audiencias' AND policyname='Users can update their own audiencias') THEN
    CREATE POLICY "Users can update their own audiencias" ON public.audiencias FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audiencias' AND policyname='Users can delete their own audiencias') THEN
    CREATE POLICY "Users can delete their own audiencias" ON public.audiencias FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE TRIGGER update_audiencias_updated_at BEFORE UPDATE ON public.audiencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Tarefas
CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  data_conclusao DATE NOT NULL,
  prioridade public.tarefa_prioridade NOT NULL,
  status public.tarefa_status NOT NULL DEFAULT 'Pendente',
  responsavel TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tarefas_user ON public.tarefas(user_id);
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tarefas' AND policyname='Users can view their own tarefas') THEN
    CREATE POLICY "Users can view their own tarefas" ON public.tarefas FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tarefas' AND policyname='Users can insert their own tarefas') THEN
    CREATE POLICY "Users can insert their own tarefas" ON public.tarefas FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tarefas' AND policyname='Users can update their own tarefas') THEN
    CREATE POLICY "Users can update their own tarefas" ON public.tarefas FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tarefas' AND policyname='Users can delete their own tarefas') THEN
    CREATE POLICY "Users can delete their own tarefas" ON public.tarefas FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE TRIGGER update_tarefas_updated_at BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Lançamentos Financeiros
CREATE TABLE IF NOT EXISTS public.financeiro_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status public.lancamento_status NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user ON public.financeiro_lancamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_cliente ON public.financeiro_lancamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_status ON public.financeiro_lancamentos(status);
CREATE INDEX IF NOT EXISTS idx_lancamentos_vencimento ON public.financeiro_lancamentos(data_vencimento);
ALTER TABLE public.financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financeiro_lancamentos' AND policyname='Users can view their own lancamentos') THEN
    CREATE POLICY "Users can view their own lancamentos" ON public.financeiro_lancamentos FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financeiro_lancamentos' AND policyname='Users can insert their own lancamentos') THEN
    CREATE POLICY "Users can insert their own lancamentos" ON public.financeiro_lancamentos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financeiro_lancamentos' AND policyname='Users can update their own lancamentos') THEN
    CREATE POLICY "Users can update their own lancamentos" ON public.financeiro_lancamentos FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='financeiro_lancamentos' AND policyname='Users can delete their own lancamentos') THEN
    CREATE POLICY "Users can delete their own lancamentos" ON public.financeiro_lancamentos FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;
CREATE TRIGGER update_fin_lanc_updated_at BEFORE UPDATE ON public.financeiro_lancamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Documentos (tabela + Storage bucket e políticas)
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  processo_id UUID REFERENCES public.processos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  tamanho BIGINT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documentos_user ON public.documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON public.documentos(cliente_id);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='documentos' AND policyname='Users can view their own documentos') THEN
    CREATE POLICY "Users can view their own documentos" ON public.documentos FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='documentos' AND policyname='Users can insert their own documentos') THEN
    CREATE POLICY "Users can insert their own documentos" ON public.documentos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='documentos' AND policyname='Users can delete their own documentos') THEN
    CREATE POLICY "Users can delete their own documentos" ON public.documentos FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Bucket de Storage para documentos (privado)
INSERT INTO storage.buckets (id, name, public)
SELECT 'documentos', 'documentos', false
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documentos');

-- Políticas do Storage
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can view own docs in documentos bucket'
  ) THEN
    CREATE POLICY "Users can view own docs in documentos bucket"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload to own folder in documentos bucket'
  ) THEN
    CREATE POLICY "Users can upload to own folder in documentos bucket"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update own docs in documentos bucket'
  ) THEN
    CREATE POLICY "Users can update own docs in documentos bucket"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete own docs in documentos bucket'
  ) THEN
    CREATE POLICY "Users can delete own docs in documentos bucket"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'documentos' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;