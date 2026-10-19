const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

function databasePath() {
  const configuredPath = process.env.DB_PATH || process.env.DATABASE_PATH;
  return configuredPath
    ? path.resolve(process.cwd(), configuredPath)
    : path.resolve(process.cwd(), 'database/demo.sqlite');
}

function openDb() {
  const file = databasePath();
  if (!fs.existsSync(file)) throw new Error(`No existe la base demo: ${file}. Ejecute npm run demo:reset.`);
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  db.exec(`CREATE TABLE IF NOT EXISTS capacity_certificates (
    id TEXT PRIMARY KEY, worker_id TEXT NOT NULL REFERENCES workers(id), period_id TEXT NOT NULL REFERENCES periods(id),
    worker_name TEXT NOT NULL, worker_code TEXT NOT NULL, capacity_centimos INTEGER NOT NULL,
    public_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, calculated_at TEXT NOT NULL, issued_at TEXT NOT NULL, valid_until TEXT
  ); CREATE INDEX IF NOT EXISTS capacity_certificates_worker_issued ON capacity_certificates(worker_id, issued_at DESC);`);
  const capacityFields = db.prepare('PRAGMA table_info(capacity_certificates)').all().map(field => field.name);
  if (!capacityFields.includes('valid_until')) db.exec('ALTER TABLE capacity_certificates ADD COLUMN valid_until TEXT;');
  db.prepare("INSERT OR IGNORE INTO parameters VALUES ('constancia.capacidad.vigencia_regla','FIN_PERIODO',1,?,?)").run(now(), 'system');
  require('./request-certificate-migration').migrateRequestCertificates(db);
  return db;
}

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
function audit(db, actorId, action, entity, entityId, metadata = {}) {
  db.prepare('INSERT INTO audit_events VALUES (?,?,?,?,?,?,?)').run(id('audit'), actorId || null, action, entity, entityId || null, JSON.stringify(metadata), now());
}
function transaction(db, work) { db.exec('BEGIN IMMEDIATE'); try { const result=work(); db.exec('COMMIT'); return result; } catch(error) { db.exec('ROLLBACK'); throw error; } }

module.exports = { openDb, now, id, audit, transaction };
