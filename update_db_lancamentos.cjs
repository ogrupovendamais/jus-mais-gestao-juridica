const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:3ca585032be1b608f7476ba5fee047a1@31.97.247.37:5458/postgres',
  statement_timeout: 5000,
  connectionTimeoutMillis: 5000
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB!');
    await client.query(`
      ALTER TABLE financeiro_lancamentos
      ADD COLUMN IF NOT EXISTS forma_recebimento TEXT;
    `);
    console.log('Column forma_recebimento added successfully to financeiro_lancamentos!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
