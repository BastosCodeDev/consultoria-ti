// Cria (ou promove) o utilizador administrador a partir de variáveis do .env.
// Assim nenhuma senha fica escrita no código nem no GitHub.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

(async () => {
  const name = process.env.ADMIN_NAME || 'Administrador';
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!email || password.length < 8) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 8 caracteres) no .env.');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin'`,
    [name, email, hash]
  );
  console.log(`Administrador pronto: ${email}`);
  console.log('Agora apague ADMIN_PASSWORD do .env.');
  await db.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
