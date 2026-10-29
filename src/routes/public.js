const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res) => {
  const [services] = await db.query('SELECT id, name, description, price FROM services ORDER BY id LIMIT 6');
  res.render('home', { title: 'Início', services });
});

router.get('/servicos', async (req, res) => {
  const [services] = await db.query('SELECT id, name, description, price FROM services ORDER BY name');
  res.render('services', { title: 'Serviços', services });
});

module.exports = router;
