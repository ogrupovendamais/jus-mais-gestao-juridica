const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const containerCmd = `
    docker exec -i supabase-db-1779540862 psql -U postgres -d postgres -c "
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_mae TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_pai TEXT;
      NOTIFY pgrst, 'reload schema';
    " &&
    docker exec -i supabase-db-1779541198 psql -U postgres -d postgres -c "
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_mae TEXT;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_pai TEXT;
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
