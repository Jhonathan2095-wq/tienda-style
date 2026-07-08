const { Pool } = require('pg');
require('dotenv').config();

// Railway te da esta variable automáticamente: DATABASE_URL
// La encuentras en tu servicio Postgres -> pestaña "Variables"
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // necesario para conectarse a Railway
});

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Error inesperado en PostgreSQL:', err);
});

module.exports = pool;
