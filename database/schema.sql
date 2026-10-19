PRAGMA foreign_keys = ON;

CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL);
CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, organization_id TEXT REFERENCES organizations(id), worker_id TEXT, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE workers (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, group_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVO');
CREATE TABLE periods (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL, starts_on TEXT NOT NULL, ends_on TEXT NOT NULL);
CREATE TABLE payroll_snapshots (id TEXT PRIMARY KEY, worker_id TEXT REFERENCES workers(id), period_id TEXT REFERENCES periods(id), gross_centimos INTEGER NOT NULL, variable_centimos INTEGER NOT NULL, legal_discount_centimos INTEGER NOT NULL, other_discount_centimos INTEGER NOT NULL, concepts_json TEXT NOT NULL);
CREATE TABLE parameters (key TEXT PRIMARY KEY, value TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, updated_by TEXT);
CREATE TABLE loans (id TEXT PRIMARY KEY, worker_id TEXT REFERENCES workers(id), request_id TEXT, status TEXT NOT NULL, monthly_payment_centimos INTEGER NOT NULL, label TEXT NOT NULL, ended_at TEXT);
CREATE TABLE requests (id TEXT PRIMARY KEY, worker_id TEXT REFERENCES workers(id), bank_id TEXT REFERENCES organizations(id), type TEXT NOT NULL, status TEXT NOT NULL, blocking INTEGER NOT NULL DEFAULT 1, assessment_centimos INTEGER NOT NULL, period_id TEXT REFERENCES periods(id), assigned_to TEXT REFERENCES users(id), version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, reason TEXT);
CREATE UNIQUE INDEX one_blocking_request_per_worker ON requests(worker_id) WHERE blocking = 1;
CREATE TABLE proposals (id TEXT PRIMARY KEY, request_id TEXT UNIQUE REFERENCES requests(id), amount_centimos INTEGER NOT NULL, term_months INTEGER NOT NULL, annual_rate TEXT NOT NULL, payment_centimos INTEGER NOT NULL, notes TEXT, status TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
CREATE TABLE authorizations (id TEXT PRIMARY KEY, request_id TEXT UNIQUE REFERENCES requests(id), capacity_centimos INTEGER NOT NULL, payment_centimos INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE certificates (id TEXT PRIMARY KEY, authorization_id TEXT UNIQUE REFERENCES authorizations(id), public_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, issued_at TEXT NOT NULL, valid_until TEXT);
CREATE TABLE capacity_certificates (id TEXT PRIMARY KEY, worker_id TEXT NOT NULL REFERENCES workers(id), period_id TEXT NOT NULL REFERENCES periods(id), worker_name TEXT NOT NULL, worker_code TEXT NOT NULL, capacity_centimos INTEGER NOT NULL, public_code TEXT UNIQUE NOT NULL, status TEXT NOT NULL, calculated_at TEXT NOT NULL, issued_at TEXT NOT NULL, valid_until TEXT);
CREATE INDEX capacity_certificates_worker_issued ON capacity_certificates(worker_id, issued_at DESC);
CREATE TABLE idempotency (actor_id TEXT NOT NULL, key TEXT NOT NULL, body_hash TEXT NOT NULL, response TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(actor_id, key));
CREATE TABLE audit_events (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, metadata TEXT, created_at TEXT NOT NULL);
