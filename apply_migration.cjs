const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:3ca585032be1b608f7476ba5fee047a1@31.97.247.37:5458/postgres',
  statement_timeout: 10000,
  connectionTimeoutMillis: 10000
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    await client.query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS chave_pix TEXT,
      ADD COLUMN IF NOT EXISTS contatos_complementares JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Clientes columns added!');

    await client.query(`
      ALTER TABLE financeiro_lancamentos
      ADD COLUMN IF NOT EXISTS caixa_box TEXT;
    `);
    console.log('Financeiro columns added!');

    await client.query(`
      ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS categoria TEXT;
    `);
    console.log('Documentos columns added!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
