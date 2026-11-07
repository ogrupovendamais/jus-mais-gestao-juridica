const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

const localDist = path.join(__dirname, 'dist');
const remoteDist = '/var/www/cadore/dist';

console.log('Local dist path:', localDist);
console.log('Remote dist path:', remoteDist);

function putFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) {
        console.error(`Failed to upload ${localPath} -> ${remotePath}:`, err);
        reject(err);
      } else {
        console.log(`Uploaded: ${localPath} -> ${remotePath}`);
        resolve();
      }
    });
  });
}

function makeRemoteDir(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.mkdir(remotePath, (err) => {
      // Ignore error if directory already exists
      resolve();
    });
  });
}

async function uploadDir(sftp, localDir, remoteDir) {
  await makeRemoteDir(sftp, remoteDir);
  const entries = fs.readdirSync(localDir, { withFileTypes: true });
  
  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    // Use forward slashes for remote Unix paths
    const remotePath = `${remoteDir}/${entry.name}`;
    
    if (entry.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath);
    } else {
      await putFile(sftp, localPath, remotePath);
    }
  }
}

conn.on('ready', () => {
  console.log('SSH connection ready. Starting SFTP...');
  conn.sftp(async (err, sftp) => {
    if (err) throw err;
    
    try {
      console.log('Uploading dist directory...');
      await uploadDir(sftp, localDist, remoteDist);
      console.log('Upload completed successfully!');
      
      console.log('Reloading Nginx on VPS...');
      conn.exec('nginx -s reload || systemctl reload nginx', (err, stream) => {
        if (err) throw err;
        stream.on('close', () => {
          console.log('Nginx reload attempted.');
          conn.end();
        }).on('data', (data) => {
          console.log('Nginx reload output: ' + data);
        });
      });
    } catch (uploadErr) {
      console.error('Error during SFTP upload:', uploadErr);
      conn.end();
    }
  });
}).connect({
  host: '2.24.102.120',
  port: 22,
  username: 'root',
  password: '@06130517Gvm'
});
