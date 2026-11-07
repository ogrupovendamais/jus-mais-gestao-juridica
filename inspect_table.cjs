const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec(`docker exec -i supabase-db-1779540862 psql -U postgres -d postgres -c "\\d financeiro_lancamentos"`, (err, stream) => {
    stream.on('close', () => conn.end()).on('data', d => process.stdout.write(d));
  });
}).connect({ host: '2.24.102.120', port: 22, username: 'root', password: '@06130517Gvm' });
