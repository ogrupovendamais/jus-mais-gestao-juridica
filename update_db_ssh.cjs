const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH conectado com a VPS. Executando atualização no Banco de Dados...');
  
  const dockerCmd = `CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'db|postgres' | grep -v 'pgbouncer' | grep -v 'pgmeta' | head -n 1) && docker exec -i $CONTAINER psql -U postgres -d postgres -c "ALTER TABLE clientes ALTER COLUMN nome DROP NOT NULL, ALTER COLUMN email DROP NOT NULL, ALTER COLUMN telefone DROP NOT NULL, ALTER COLUMN endereco DROP NOT NULL; NOTIFY pgrst, 'reload schema';"`;
  
  conn.exec(dockerCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      if (code === 0) {
        console.log('🚀 BANCO DE DADOS ATUALIZADO COM SUCESSO! O Supabase agora reconhece as novas colunas.');
      } else {
        console.log('❌ Ocorreu algum erro ao rodar o SQL na VPS (Código: ' + code + ')');
      }
      conn.end();
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
