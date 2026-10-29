const crypto = require('crypto');

// Disponibiliza dados comuns às views: utilizador, mensagem flash e token CSRF.
function attachLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  next();
}

// Protecção CSRF: todo o POST tem de trazer o token que está na sessão.
function verifyCsrf(req, res, next) {
  if (req.method !== 'POST') return next();
  const sent = Buffer.from(String(req.body?._csrf ?? ''));
  const expected = Buffer.from(String(req.session.csrf ?? ''));
  if (sent.length !== expected.length || !crypto.timingSafeEqual(sent, expected)) {
    return res.status(403).render('error', {
      title: 'Pedido inválido',
      code: 403,
      message: 'Token de segurança inválido. Volte atrás, recarregue a página e tente de novo.',
    });
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'error', msg: 'Inicie sessão para continuar.' };
    return res.redirect('/login');
  }
  next();
}

// Só administradores. Quem não está autenticado vai para o login; quem está
// autenticado mas não é admin recebe 403.
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: 'error', msg: 'Inicie sessão para continuar.' };
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', {
      title: 'Acesso negado',
      code: 403,
      message: 'Esta área é exclusiva para administradores.',
    });
  }
  next();
}

module.exports = { attachLocals, verifyCsrf, requireAuth, requireAdmin };
