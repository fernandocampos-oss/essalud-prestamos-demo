require('dotenv').config();
const { openDb } = require('../backend/src/db');
const { migrateCatalog } = require('../backend/src/catalog-migration');

const db = openDb();
try {
  const result = migrateCatalog(db);
  console.log(`Catálogo actualizado: ${result.namesUpdated} nombre(s), ${result.usersRenamed} usuario(s) renombrado(s), ${result.usersCreated} usuario(s) creado(s).`);
  if (result.conflicts.length) console.warn(result.conflicts.join('\n'));
} finally { db.close(); }
