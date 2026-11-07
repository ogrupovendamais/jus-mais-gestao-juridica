const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const containerCmd = `
    docker exec -i supabase-db-1779540862 psql -U postgres -d postgres -c "
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS pct_parceiro2 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS pct_parceiro3 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_parceiro2 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_parceiro3 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS pct_reserva NUMERIC DEFAULT 5;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_sucumbencia NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS instituicao_financeira TEXT;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS depositante TEXT;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS data_fato_gerador DATE;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_id_1 UUID REFERENCES profiles(id);
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_id_2 UUID REFERENCES profiles(id);
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_id_3 UUID REFERENCES profiles(id);
      NOTIFY pgrst, 'reload schema';
    " &&
    docker exec -i supabase-db-1779541198 psql -U postgres -d postgres -c "
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS pct_parceiro2 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS pct_parceiro3 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_parceiro2 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_parceiro3 NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS pct_reserva NUMERIC DEFAULT 5;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS valor_sucumbencia NUMERIC;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS instituicao_financeira TEXT;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS depositante TEXT;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS data_fato_gerador DATE;
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_id_1 UUID REFERENCES profiles(id);
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_id_2 UUID REFERENCES profiles(id);
      ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS parceiro_id_3 UUID REFERENCES profiles(id);
      NOTIFY pgrst, 'reload schema';
    "
  `;
  conn.exec(containerCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (data) => process.stdout.write(data)).stderr.on('data', (data) => process.stderr.write(data));
  });
}).connect({
  host: '2.24.102.120',
  port: 22,
  username: 'root',
  password: '@06130517Gvm'
});
