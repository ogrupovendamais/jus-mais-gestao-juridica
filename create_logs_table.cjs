const { Client } = require('ssh2');

const sql = `
-- 1. Criar a tabela logs_sistema
CREATE TABLE IF NOT EXISTS public.logs_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  acao text NOT NULL,
  descricao text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb
);

-- 2. Habilitar RLS na logs_sistema
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS
DROP POLICY IF EXISTS "Allow developers to read logs" ON public.logs_sistema;
CREATE POLICY "Allow developers to read logs"
ON public.logs_sistema
FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'desenvolvedor'
);

DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.logs_sistema;
CREATE POLICY "Allow authenticated users to insert logs"
ON public.logs_sistema
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

-- 4. Função auxiliar para pegar o e-mail do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Função de trigger genérica para logar alterações
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS trigger AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_acao text;
  v_descricao text;
  v_detalhes jsonb;
BEGIN
  -- Identifica o usuário logado
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  ELSE
    v_user_email := 'sistema@cadore.com';
  END IF;

  v_acao := TG_OP;
  
  IF (TG_OP = 'INSERT') THEN
    v_descricao := 'Registro criado na tabela ' || TG_TABLE_NAME;
    v_detalhes := to_jsonb(NEW);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_descricao := 'Registro atualizado na tabela ' || TG_TABLE_NAME;
    v_detalhes := jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    v_descricao := 'Registro excluído na tabela ' || TG_TABLE_NAME;
    v_detalhes := to_jsonb(OLD);
  END IF;

  INSERT INTO public.logs_sistema (user_id, user_email, acao, descricao, detalhes)
  VALUES (v_user_id, v_user_email, v_acao, v_descricao, v_detalhes);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Aplicar triggers nas tabelas principais
-- Tabela Clientes
DROP TRIGGER IF EXISTS trigger_audit_clientes ON public.clientes;
CREATE TRIGGER trigger_audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Tabela Processos
DROP TRIGGER IF EXISTS trigger_audit_processos ON public.processos;
CREATE TRIGGER trigger_audit_processos
AFTER INSERT OR UPDATE OR DELETE ON public.processos
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Tabela Financeiro
DROP TRIGGER IF EXISTS trigger_audit_financeiro ON public.financeiro_lancamentos;
CREATE TRIGGER trigger_audit_financeiro
AFTER INSERT OR UPDATE OR DELETE ON public.financeiro_lancamentos
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Tabela Perfis (Equipe / Roles)
DROP TRIGGER IF EXISTS trigger_audit_profiles ON public.profiles;
CREATE TRIGGER trigger_audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Tabela Tarefas
DROP TRIGGER IF EXISTS trigger_audit_tarefas ON public.tarefas;
CREATE TRIGGER trigger_audit_tarefas
AFTER INSERT OR UPDATE OR DELETE ON public.tarefas
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
`;

const containerSuffix = '1779540862';
const dbContainer = `supabase-db-${containerSuffix}`;
const restContainer = `supabase-rest-${containerSuffix}`;

const conn = new Client();
conn.on('ready', () => {
  console.log(`SSH connection ready. Running Logs migration on ${dbContainer}...`);
  const cmd = `docker exec -i ${dbContainer} psql -U postgres -d postgres`;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    
    let stdout = '';
    let stderr = '';
    
    stream.on('close', (code) => {
      console.log(`Logs migration finished with code: ${code}`);
      if (stdout) console.log(`STDOUT:\n${stdout}`);
      if (stderr) console.log(`STDERR:\n${stderr}`);
      
      console.log('Restarting PostgREST container...');
      conn.exec(`docker restart ${restContainer}`, (err2, streamR) => {
        if (err2) throw err2;
        streamR.on('close', () => {
          console.log('PostgREST restarted.');
          conn.end();
        });
      });
    }).on('data', (data) => {
      stdout += data;
    }).stderr.on('data', (data) => {
      stderr += data;
    });
    
    stream.write(sql);
    stream.end();
  });
}).connect({
  host: '2.24.102.120',
  port: 22,
  username: 'root',
  password: '@06130517Gvm'
});
