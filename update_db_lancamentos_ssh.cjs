const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH conectado com a VPS. Executando atualização no Banco de Dados...');
  
  const dockerCmd = `CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'db|postgres' | grep -v 'pgbouncer' | grep -v 'pgmeta' | head -n 1) && docker exec -i $CONTAINER psql -U postgres -d postgres -c "ALTER TABLE financeiro_lancamentos ADD COLUMN IF NOT EXISTS forma_recebimento TEXT; NOTIFY pgrst, 'reload schema';"`;
  
  conn.exec(dockerCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      if (code === 0) {
        console.log('🚀 BANCO DE DADOS ATUALIZADO COM SUCESSO! A coluna forma_recebimento foi adicionada e o Supabase agora a reconhece.');
      } else {
        console.log('❌ Ocorreu algum erro ao rodar o SQL na VPS (Código: ' + code + ')');
      }
      conn.end();
      process.exit(code);
    }).on('data', (data) => {
      console.log('Saída: ' + data);
    }).stderr.on('data', (data) => {
      console.error('Erro: ' + data);
    });
  });
}).connect({
  host: '2.24.102.120',
  port: 22,
  username: 'root',
  password: '@06130517Gvm'
});
