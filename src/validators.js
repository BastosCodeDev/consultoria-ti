// Validação no servidor. A validação no navegador (atributos HTML) é só conforto:
// quem manda é sempre o servidor.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v) => String(v ?? '').trim();

function validateRegister(body) {
  const v = {
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    password: String(body.password ?? ''),
    password2: String(body.password2 ?? ''),
  };
  const errors = [];
  if (v.name.length < 2 || v.name.length > 100) errors.push('O nome deve ter entre 2 e 100 caracteres.');
  if (!EMAIL_RE.test(v.email) || v.email.length > 150) errors.push('Email inválido.');
  // bcrypt só lê os primeiros 72 bytes da senha, por isso limitamos o tamanho.
  if (Buffer.byteLength(v.password) < 8 || Buffer.byteLength(v.password) > 72)
    errors.push('A senha deve ter entre 8 e 72 caracteres.');
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password))
    errors.push('A senha deve ter pelo menos uma letra e um número.');
  if (v.password !== v.password2) errors.push('As senhas não coincidem.');
  return { values: v, errors };
}

function validateService(body) {
  const v = {
    name: clean(body.name),
    description: clean(body.description),
    price: clean(body.price).replace(',', '.'),
  };
  const errors = [];
  if (v.name.length < 3 || v.name.length > 100) errors.push('O nome deve ter entre 3 e 100 caracteres.');
  if (v.description.length < 10 || v.description.length > 1000)
    errors.push('A descrição deve ter entre 10 e 1000 caracteres.');
  const price = Number(v.price);
  if (v.price === '' || !Number.isFinite(price) || price < 0 || price > 99999999)
    errors.push('Preço inválido.');
  return { values: v, errors, price };
}

function validateQuote(body) {
  const v = { service_id: clean(body.service_id), message: clean(body.message) };
  const errors = [];
  if (!/^\d+$/.test(v.service_id)) errors.push('Escolha um serviço.');
  if (v.message.length < 10 || v.message.length > 1000)
    errors.push('A mensagem deve ter entre 10 e 1000 caracteres.');
  return { values: v, errors };
}

module.exports = { validateRegister, validateService, validateQuote, EMAIL_RE };
