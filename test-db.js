require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.query('SELECT NOW() AS now');
    console.log('✅ Connessione riuscita. Ora del server MySQL:', rows[0].now);

    await connection.end();
  } catch (err) {
    console.error('❌ Errore nella connessione al database:', err.message);
  }
})();