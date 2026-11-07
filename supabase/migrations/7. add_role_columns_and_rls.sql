-- 1. Adicionar colunas em public.clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Adicionar colunas em public.processos
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS responsavel_a_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS responsavel_b_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Adicionar coluna em public.financeiro_lancamentos
ALTER TABLE public.financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_beneficiario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Atualizar políticas RLS da tabela clientes
DROP POLICY IF EXISTS "Users can view their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clientes" ON public.clientes;

CREATE POLICY "Allow select on clientes"
ON public.clientes
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR responsavel_id = auth.uid()
);

CREATE POLICY "Allow insert on clientes"
ON public.clientes
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow update on clientes"
ON public.clientes
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR responsavel_id = auth.uid()
);

CREATE POLICY "Allow delete on clientes"
ON public.clientes
FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

-- 5. Atualizar políticas RLS da tabela processos
DROP POLICY IF EXISTS "Users can view their own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can insert their own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can update their own processos" ON public.processos;
DROP POLICY IF EXISTS "Users can delete their own processos" ON public.processos;

CREATE POLICY "Allow select on processos"
ON public.processos
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR responsavel_a_id = auth.uid()
  OR responsavel_b_id = auth.uid()
);

CREATE POLICY "Allow insert on processos"
ON public.processos
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow update on processos"
ON public.processos
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR responsavel_a_id = auth.uid()
  OR responsavel_b_id = auth.uid()
);

CREATE POLICY "Allow delete on processos"
ON public.processos
FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

-- 6. Atualizar políticas RLS da tabela financeiro_lancamentos
DROP POLICY IF EXISTS "Users can view their own lancamentos" ON public.financeiro_lancamentos;
DROP POLICY IF EXISTS "Users can insert their own lancamentos" ON public.financeiro_lancamentos;
DROP POLICY IF EXISTS "Users can update their own lancamentos" ON public.financeiro_lancamentos;
DROP POLICY IF EXISTS "Users can delete their own lancamentos" ON public.financeiro_lancamentos;

CREATE POLICY "Allow select on financeiro_lancamentos"
ON public.financeiro_lancamentos
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR parceiro_beneficiario_id = auth.uid()
);

CREATE POLICY "Allow insert on financeiro_lancamentos"
ON public.financeiro_lancamentos
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow update on financeiro_lancamentos"
ON public.financeiro_lancamentos
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR parceiro_beneficiario_id = auth.uid()
);

CREATE POLICY "Allow delete on financeiro_lancamentos"
ON public.financeiro_lancamentos
FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

-- 7. Atualizar políticas RLS da tabela audiencias
DROP POLICY IF EXISTS "Users can view their own audiencias" ON public.audiencias;
DROP POLICY IF EXISTS "Users can insert their own audiencias" ON public.audiencias;
DROP POLICY IF EXISTS "Users can update their own audiencias" ON public.audiencias;
DROP POLICY IF EXISTS "Users can delete their own audiencias" ON public.audiencias;

CREATE POLICY "Allow select on audiencias"
ON public.audiencias
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR processo_id IN (SELECT id FROM public.processos)
);

CREATE POLICY "Allow insert on audiencias"
ON public.audiencias
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow update on audiencias"
ON public.audiencias
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
  OR processo_id IN (SELECT id FROM public.processos)
);

CREATE POLICY "Allow delete on audiencias"
ON public.audiencias
FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

-- 8. Atualizar políticas RLS da tabela tarefas
DROP POLICY IF EXISTS "Users can view their own tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Users can insert their own tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Users can update their own tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Users can delete their own tarefas" ON public.tarefas;

CREATE POLICY "Allow select on tarefas"
ON public.tarefas
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow insert on tarefas"
ON public.tarefas
FOR INSERT
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow update on tarefas"
ON public.tarefas
FOR UPDATE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);

CREATE POLICY "Allow delete on tarefas"
ON public.tarefas
FOR DELETE
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('desenvolvedor', 'master')
  OR user_id = auth.uid()
);
