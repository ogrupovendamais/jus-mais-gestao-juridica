const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:3ca585032be1b608f7476ba5fee047a1@31.97.247.37:5458/postgres',
  // Removendo o timeout para dar tempo suficiente de rodar o ALTER TABLE
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB!');
    
    await client.query(`
      ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES documentos(id) ON DELETE CASCADE;
    `);
    console.log('Documentos columns added!');

    await client.query(`
      ALTER TABLE clientes
      ADD COLUMN IF NOT EXISTS nicho TEXT;
    `);
    console.log('Clientes nicho added!');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
