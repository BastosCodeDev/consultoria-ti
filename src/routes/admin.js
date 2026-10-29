const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware');
const { validateService } = require('../validators');
const router = express.Router();

// TODAS as rotas deste ficheiro exigem administrador.
router.use(requireAdmin);

const isId = (v) => /^\d+$/.test(String(v));

router.get('/', async (req, res) => {
  const [[counts]] = await db.query(
    `SELECT (SELECT COUNT(*) FROM users WHERE role = 'cliente') AS clientes,
            (SELECT COUNT(*) FROM services) AS servicos,
            (SELECT COUNT(*) FROM quotes) AS pedidos,
            (SELECT COUNT(*) FROM access_logs) AS acessos`
  );
  res.render('admin/dashboard', { title: 'Painel administrativo', counts });
});

// ---------- CRUD de serviços ----------
router.get('/servicos', async (req, res) => {
  const [services] = await db.query('SELECT * FROM services ORDER BY id');
  res.render('admin/services', { title: 'Serviços (admin)', services });
});

router.get('/servicos/novo', (req, res) => {
  res.render('admin/service-form', {
    title: 'Novo serviço', action: '/admin/servicos', errors: [],
    values: { name: '', description: '', price: '' }, isEdit: false,
  });
});

router.post('/servicos', async (req, res) => {
  const { values, errors, price } = validateService(req.body);
  if (errors.length)
    return res.status(400).render('admin/service-form', {
      title: 'Novo serviço', action: '/admin/servicos', errors, values, isEdit: false,
    });
  await db.query('INSERT INTO services (name, description, price) VALUES (?, ?, ?)', [
    values.name, values.description, price,
  ]);
  req.session.flash = { type: 'ok', msg: 'Serviço criado.' };
  res.redirect('/admin/servicos');
});

router.get('/servicos/:id/editar', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const [rows] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!rows.length) return next();
  res.render('admin/service-form', {
    title: 'Editar serviço', action: `/admin/servicos/${rows[0].id}`, errors: [],
    values: { name: rows[0].name, description: rows[0].description, price: rows[0].price }, isEdit: true,
  });
});

router.post('/servicos/:id/eliminar', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  try {
    const [r] = await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return next();
    req.session.flash = { type: 'ok', msg: 'Serviço eliminado.' };
  } catch (err) {
    // FK ON DELETE RESTRICT: não se apaga um serviço que já tem pedidos de orçamento.
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      req.session.flash = { type: 'error', msg: 'Não é possível eliminar: existem pedidos de orçamento para este serviço.' };
    } else throw err;
  }
  res.redirect('/admin/servicos');
});

router.post('/servicos/:id', async (req, res, next) => {
  if (!isId(req.params.id)) return next();
  const { values, errors, price } = validateService(req.body);
  if (errors.length)
    return res.status(400).render('admin/service-form', {
      title: 'Editar serviço', action: `/admin/servicos/${req.params.id}`, errors, values, isEdit: true,
    });
  const [r] = await db.query('UPDATE services SET name = ?, description = ?, price = ? WHERE id = ?', [
    values.name, values.description, price, req.params.id,
  ]);
  if (!r.affectedRows) return next();
  req.session.flash = { type: 'ok', msg: 'Serviço atualizado.' };
  res.redirect('/admin/servicos');
});

// ---------- Consultas ----------
router.get('/clientes', async (req, res) => {
  const [clients] = await db.query(
    `SELECT u.id, u.name, u.email, u.created_at, COUNT(q.id) AS total_pedidos
       FROM users u LEFT JOIN quotes q ON q.user_id = u.id
      WHERE u.role = 'cliente' GROUP BY u.id ORDER BY u.created_at DESC`
  );
  res.render('admin/clients', { title: 'Clientes', clients });
});

router.get('/pedidos', async (req, res) => {
  const [quotes] = await db.query(
    `SELECT q.id, q.message, q.status, q.created_at,
            u.name AS client_name, u.email AS client_email, s.name AS service_name
       FROM quotes q
       JOIN users u ON u.id = q.user_id
       JOIN services s ON s.id = q.service_id
      ORDER BY q.created_at DESC, q.id DESC`
  );
  res.render('admin/quotes', { title: 'Pedidos de orçamento', quotes });
});

router.get('/acessos', async (req, res) => {
  const [logs] = await db.query(
    'SELECT id, email, event, ip, created_at FROM access_logs ORDER BY created_at DESC, id DESC LIMIT 200'
  );
  res.render('admin/logs', { title: 'Registo de acessos', logs });
});

module.exports = router;
