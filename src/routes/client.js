const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware');
const { validateQuote } = require('../validators');
const router = express.Router();

router.use('/pedidos', requireAuth);

router.get('/pedidos', async (req, res) => {
  const [quotes] = await db.query(
    `SELECT q.id, q.message, q.status, q.created_at, s.name AS service_name
       FROM quotes q JOIN services s ON s.id = q.service_id
      WHERE q.user_id = ? ORDER BY q.created_at DESC, q.id DESC`,
    [req.session.user.id]
  );
  res.render('quotes', { title: 'Meus pedidos', quotes });
});

async function renderForm(res, status, { errors = [], values = {} } = {}) {
  const [services] = await db.query('SELECT id, name FROM services ORDER BY name');
  res.status(status).render('quote-form', { title: 'Pedir orçamento', services, errors, values });
}

router.get('/pedidos/novo', (req, res) => {
  const pre = /^\d+$/.test(String(req.query.servico ?? '')) ? String(req.query.servico) : '';
  return renderForm(res, 200, { values: { service_id: pre, message: '' } });
});

router.post('/pedidos', async (req, res) => {
  const { values, errors } = validateQuote(req.body);
  if (!errors.length) {
    const [found] = await db.query('SELECT id FROM services WHERE id = ?', [values.service_id]);
    if (!found.length) errors.push('Serviço inexistente.');
  }
  if (errors.length) return renderForm(res, 400, { errors, values });

  // O user_id vem da SESSÃO, nunca do formulário.
  await db.query('INSERT INTO quotes (user_id, service_id, message) VALUES (?, ?, ?)', [
    req.session.user.id,
    values.service_id,
    values.message,
  ]);
  req.session.flash = { type: 'ok', msg: 'Pedido de orçamento enviado.' };
  res.redirect('/pedidos');
});

module.exports = router;
