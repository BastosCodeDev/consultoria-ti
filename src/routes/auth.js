const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { validateRegister, EMAIL_RE } = require('../validators');
const router = express.Router();

const BCRYPT_ROUNDS = 12;
// Hash falso usado quando o email não existe, para o tempo de resposta ser parecido
// e não revelar quais emails estão registados.
const DUMMY_HASH = bcrypt.hashSync('senha-falsa-para-igualar-tempo', BCRYPT_ROUNDS);

async function logAccess(userId, email, event, ip) {
  await db.query('INSERT INTO access_logs (user_id, email, event, ip) VALUES (?, ?, ?, ?)', [
    userId,
    String(email).slice(0, 150),
    event,
    String(ip || '').slice(0, 45),
  ]);
}

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/pedidos');
  res.render('register', { title: 'Criar conta', errors: [], values: {} });
});

router.post('/register', async (req, res) => {
  const { values, errors } = validateRegister(req.body);
  if (errors.length) return res.status(400).render('register', { title: 'Criar conta', errors, values });

  const hash = await bcrypt.hash(values.password, BCRYPT_ROUNDS);
  try {
    // O papel (role) é SEMPRE 'cliente' aqui: nunca vem do formulário.
    await db.query('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
      values.name,
      values.email,
      hash,
      'cliente',
    ]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).render('register', {
        title: 'Criar conta',
        errors: ['Não foi possível criar a conta com esses dados.'],
        values,
      });
    }
    throw err;
  }
  req.session.flash = { type: 'ok', msg: 'Conta criada! Já pode iniciar sessão.' };
  res.redirect('/login');
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect(req.session.user.role === 'admin' ? '/admin' : '/pedidos');
  res.render('login', { title: 'Entrar', errors: [], values: {} });
});

router.post('/login', async (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  const fail = async (userId) => {
    await logAccess(userId, email || '(vazio)', 'login_falhado', req.ip);
    return res.status(401).render('login', {
      title: 'Entrar',
      errors: ['Email ou senha incorretos.'],
      values: { email },
    });
  };

  if (!EMAIL_RE.test(email) || password.length === 0 || password.length > 72) return fail(null);

  const [rows] = await db.query('SELECT id, name, password_hash, role FROM users WHERE email = ?', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) return fail(user ? user.id : null);

  // Novo ID de sessão após o login (evita session fixation).
  req.session.regenerate(async (err) => {
    if (err) throw err;
    req.session.user = { id: user.id, name: user.name, role: user.role };
    try {
      await logAccess(user.id, email, 'login', req.ip);
    } catch (e) {
      console.error(e);
    }
    res.redirect(user.role === 'admin' ? '/admin' : '/pedidos');
  });
});

// Logout por POST (com token CSRF) para ninguém conseguir deslogar o utilizador por um link.
router.post('/logout', async (req, res) => {
  const u = req.session.user;
  if (u) {
    const [rows] = await db.query('SELECT email FROM users WHERE id = ?', [u.id]);
    await logAccess(u.id, rows[0] ? rows[0].email : '(desconhecido)', 'logout', req.ip);
  }
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/');
  });
});

module.exports = router;
