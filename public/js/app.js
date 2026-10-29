// Pede confirmação antes de submeter formulários marcados com data-confirm
// (ex.: eliminar um serviço). Fica em ficheiro próprio porque a política de
// segurança (CSP) do Helmet bloqueia JavaScript escrito dentro do HTML.
document.querySelectorAll('form[data-confirm]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    if (!window.confirm(form.dataset.confirm)) e.preventDefault();
  });
});
