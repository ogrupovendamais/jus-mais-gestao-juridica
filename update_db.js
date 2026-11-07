import pg from 'pg';
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
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS logradouro TEXT,
      ADD COLUMN IF NOT EXISTS cidade TEXT,
      ADD COLUMN IF NOT EXISTS uf TEXT,
      ADD COLUMN IF NOT EXISTS data_inicio_relacionamento DATE,
      ADD COLUMN IF NOT EXISTS cnh TEXT,
      ADD COLUMN IF NOT EXISTS data_nascimento DATE,
      ADD COLUMN IF NOT EXISTS estado_civil TEXT,
      ADD COLUMN IF NOT EXISTS rg TEXT,
      ADD COLUMN IF NOT EXISTS cpf TEXT;
    `);
    console.log('Columns added successfully!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
