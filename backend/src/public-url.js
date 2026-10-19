function publicAppUrl() {
  const value = process.env.PUBLIC_APP_URL || process.env.APP_BASE_URL;
  if (value) {
    try { return new URL(value).toString().replace(/\/$/, ''); }
    catch { throw Object.assign(new Error('PUBLIC_APP_URL debe ser una URL absoluta válida.'), {status:500}); }
  }
  if (process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('PUBLIC_APP_URL es obligatoria en producción para emitir constancias verificables.'), {status:500});
  }
  return 'http://localhost:4200';
}

module.exports = { publicAppUrl };
