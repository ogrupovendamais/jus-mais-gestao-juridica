const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const containerCmd = `docker ps`;
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
