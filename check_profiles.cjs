const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const containerCmd = "CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'db|postgres' | grep -v 'pgbouncer' | grep -v 'pgmeta' | head -n 1) && docker exec -i $CONTAINER psql -U postgres -d postgres -c \"SELECT id, full_name, role FROM profiles;\"";
  conn.exec(containerCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (data) => console.log('Saída: ' + data)).stderr.on('data', (data) => console.error('Erro: ' + data));
  });
}).connect({
  host: '2.24.102.120',
  port: 22,
  username: 'root',
  password: '@06130517Gvm'
});
