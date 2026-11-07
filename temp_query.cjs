const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:3ca585032be1b608f7476ba5fee047a1@31.97.247.37:5458/postgres' });
async function run() {
  await client.connect();
  const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'financeiro_lancamentos'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();
