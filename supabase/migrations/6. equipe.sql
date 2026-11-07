-- Tabela para gerenciamento de membros da equipe
CREATE TABLE IF NOT EXISTS equipe (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    cargo VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    data_admissao DATE,
    salario DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo', 'Férias')),
    endereco TEXT,
    observacoes TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_equipe_user_id ON equipe(user_id);
CREATE INDEX IF NOT EXISTS idx_equipe_status ON equipe(status);
CREATE INDEX IF NOT EXISTS idx_equipe_departamento ON equipe(departamento);
CREATE INDEX IF NOT EXISTS idx_equipe_cargo ON equipe(cargo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_equipe_updated_at
    BEFORE UPDATE ON equipe
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de segurança RLS (Row Level Security)
ALTER TABLE equipe ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios membros da equipe
CREATE POLICY "Users can view own team members" ON equipe
    FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir que usuários insiram membros da equipe
CREATE POLICY "Users can insert own team members" ON equipe
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para permitir que usuários atualizem seus próprios membros da equipe
CREATE POLICY "Users can update own team members" ON equipe
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para permitir que usuários deletem seus próprios membros da equipe
CREATE POLICY "Users can delete own team members" ON equipe
    FOR DELETE USING (auth.uid() = user_id);

-- Comentários sobre a estrutura da tabela
COMMENT ON TABLE equipe IS 'Tabela para gerenciamento de membros da equipe do escritório de advocacia';
COMMENT ON COLUMN equipe.id IS 'Identificador único do membro da equipe';
COMMENT ON COLUMN equipe.user_id IS 'ID do usuário proprietário (advogado responsável pelo escritório)';
COMMENT ON COLUMN equipe.nome IS 'Nome completo do membro da equipe';
COMMENT ON COLUMN equipe.email IS 'Endereço de e-mail do membro';
COMMENT ON COLUMN equipe.telefone IS 'Número de telefone para contato';
COMMENT ON COLUMN equipe.cargo IS 'Cargo/função do membro na equipe';
COMMENT ON COLUMN equipe.departamento IS 'Departamento ao qual o membro pertence';
COMMENT ON COLUMN equipe.data_admissao IS 'Data de admissão do membro na equipe';
COMMENT ON COLUMN equipe.salario IS 'Salário do membro (opcional, para controle interno)';
COMMENT ON COLUMN equipe.status IS 'Status atual do membro: Ativo, Inativo ou Férias';
COMMENT ON COLUMN equipe.endereco IS 'Endereço residencial do membro';
COMMENT ON COLUMN equipe.observacoes IS 'Observações adicionais sobre o membro';
COMMENT ON COLUMN equipe.foto_url IS 'URL da foto do perfil do membro';
COMMENT ON COLUMN equipe.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN equipe.updated_at IS 'Data e hora da última atualização do registro';

-- Instruções de uso:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Substitua 'YOUR_USER_ID' pelo seu ID de usuário real
-- 3. Para obter seu user_id, execute: SELECT auth.uid();
-- 4. Ou remova os dados fictícios se preferir começar com a tabela vazia