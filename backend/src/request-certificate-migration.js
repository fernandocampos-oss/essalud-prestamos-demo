// Additive migration: safe for existing requests and repeated application.
function migrateRequestCertificates(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS request_certificates (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL UNIQUE REFERENCES requests(id),
    public_code TEXT NOT NULL UNIQUE CHECK(public_code LIKE 'SOL-%'),
    snapshot_json TEXT NOT NULL,
    issued_at TEXT NOT NULL
  );`);
}
module.exports = { migrateRequestCertificates };
