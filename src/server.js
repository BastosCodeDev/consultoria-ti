require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const config = require('./config');
const { attachLocals, verifyCsrf } = require('./middleware');

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
  console.error('Falta SESSION_SECRET no .env (mínimo 16 caracteres). Veja o .env.example.');
  process.exit(1);
}

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
if (isProd) app.set('trust proxy', 1); // necessário atrás de proxy HTTPS (Render, etc.)

app.use(helmet());
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // JavaScript do navegador não consegue ler o cookie
      sameSite: 'lax',
      secure: isProd, // só por HTTPS em produção
      maxAge: 1000 * 60 * 60 * 2, // 2 horas
    },
  })
);

app.locals.company = config.company;
app.locals.partners = config.partners;
app.locals.fmtDate = (d) =>
  d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }) : '';
app.locals.fmtMoney = (v) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
app.locals.statusLabel = { pendente: 'Pendente', em_analise: 'Em análise', respondido: 'Respondido' };
app.locals.eventLabel = { login: 'Login', logout: 'Logout', login_falhado: 'Login falhado' };

app.use(attachLocals);
app.use(verifyCsrf);

app.use('/', require('./routes/public'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/client'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'Não encontrado', code: 404, message: 'Página não encontrada.' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    title: 'Erro',
    code: 500,
    message: 'Ocorreu um erro interno. Tente novamente mais tarde.',
  });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Servidor a correr em http://localhost:${port}`));
