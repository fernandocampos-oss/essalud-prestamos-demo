const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { migrateCatalog } = require('../src/catalog-migration');
const { openDb } = require('../src/db');

function setup() {
  const file = path.join(process.cwd(), 'database', `migration-test-${Date.now()}-${Math.random()}.sqlite`);
  execFileSync(process.execPath, ['database/reset.js'], { env: { ...process.env, DATABASE_PATH: file }, stdio: 'ignore' });
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = file;
  const db = openDb();
  return { db, file, close() { db.close(); if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous; for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${file}${suffix}`, { force: true }); } };
}

test('la migración actualiza un catálogo existente sin perder solicitudes ni duplicar bancos', () => {
  const context = setup();
  try {
    context.db.exec("UPDATE organizations SET name='Banco Andino Ficticio' WHERE id='andino'; UPDATE organizations SET name='Banco Horizonte Ficticio' WHERE id='horizonte'; UPDATE organizations SET name='Banco Pacífico Ficticio' WHERE id='pacifico'; UPDATE users SET username='analista.andino' WHERE id='analyst-andino'; UPDATE users SET username='admin.andino' WHERE id='admin-andino'; UPDATE users SET username='analista.horizonte' WHERE id='analyst-horizonte'; DELETE FROM users WHERE id='analyst-pacifico';");
    const requestCount = context.db.prepare('SELECT count(*) AS count FROM requests').get().count;
    const result = migrateCatalog(context.db);
    const names = context.db.prepare("SELECT name FROM organizations WHERE type='BANCO' ORDER BY name").all().map(row => row.name);
    assert.deepEqual(names, ['BBVA Perú', 'Banco de Crédito del Perú (BCP)', 'Interbank']);
    assert.equal(context.db.prepare('SELECT count(*) AS count FROM requests').get().count, requestCount);
    assert.equal(context.db.prepare("SELECT bank_id FROM requests WHERE id='req-activa'").get().bank_id, 'andino');
    assert.equal(context.db.prepare("SELECT username FROM users WHERE id='analyst-andino'").get().username, 'analista.bcp');
    assert.equal(context.db.prepare("SELECT username FROM users WHERE id='admin-andino'").get().username, 'admin.bcp');
    assert.equal(context.db.prepare("SELECT username FROM users WHERE id='analyst-pacifico'").get().username, 'analista.interbank');
    assert.deepEqual(migrateCatalog(context.db), { namesUpdated: 0, usersRenamed: 0, usersCreated: 0, conflicts: [] });
    assert.equal(result.namesUpdated, 3);
    assert.equal(result.usersRenamed, 3);
  } finally { context.close(); }
});
