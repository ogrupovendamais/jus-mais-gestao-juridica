const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const containerCmd = `
    docker exec -i supabase-db-1779540862 psql -U postgres -d postgres -c "
      DELETE FROM clientes WHERE id IN (
        SELECT id FROM (
          SELECT id, row_number() over (partition by nome order by created_at asc) as rn
          FROM clientes
          WHERE nome ILIKE '%PEDRO LUCAS%'
        ) t WHERE t.rn > 1
      );
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
