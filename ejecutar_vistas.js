const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    const sql = fs.readFileSync('sql/vistas.sql', 'utf8');
    await client.query(sql);
    console.log("¡Vistas creadas exitosamente en Neon!");
  } catch (err) {
    console.error("Error al ejecutar las vistas:", err);
  } finally {
    await client.end();
  }
}
run();