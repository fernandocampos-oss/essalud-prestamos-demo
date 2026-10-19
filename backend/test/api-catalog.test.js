const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { api, publicApi } = require('../src/api');
const { certificateData } = require('../src/certificate-pdf');
const { openDb } = require('../src/db');
const { publicAppUrl } = require('../src/public-url');

function setup() {
  const file = path.join(process.cwd(), 'database', `api-test-${Date.now()}-${Math.random()}.sqlite`);
  execFileSync(process.execPath, ['database/reset.js'], { env: { ...process.env, DATABASE_PATH: file }, stdio: 'ignore' });
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = file;
  const db = openDb();
  const app = express();
  app.use(express.json());
  app.use('/api/public', publicApi(db));
  app.use('/api', api(db));
  const server = app.listen(0, '127.0.0.1');
  return new Promise(resolve => server.on('listening', () => resolve({ db, file, server, previous })));
}

async function close(context) {
  await new Promise(resolve => context.server.close(resolve));
  context.db.close();
  if (context.previous === undefined) delete process.env.DATABASE_PATH;
  else process.env.DATABASE_PATH = context.previous;
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(`${context.file}${suffix}`, { force: true });
}

async function call(base, pathName, options = {}) {
  const response = await fetch(`${base}${pathName}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers }
  });
  return { status: response.status, body: await response.json() };
}

async function callBinary(base, pathName, options = {}) {
  const response = await fetch(`${base}${pathName}`, options);
  return { status: response.status, headers: response.headers, body: Buffer.from(await response.arrayBuffer()) };
}

test('Andrea registra una solicitud para BCP y queda aislada de BBVA Perú', async () => {
  const context = await setup();
  const base = `http://127.0.0.1:${context.server.address().port}/api`;
  try {
    const andrea = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'andrea.demo', password: 'Demo2026!' }) });
    assert.equal(andrea.status, 200);
    const banks = await call(base, '/banks', { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.deepEqual(banks.body.items.map(bank => bank.name), ['BBVA Perú', 'Banco de Crédito del Perú (BCP)', 'Interbank']);
    const created = await call(base, '/worker/requests', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'catalog-flow' }, body: JSON.stringify({ bankId: 'andino', type: 'NUEVO' }) });
    assert.equal(created.status, 200);
    const bcp = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'analista.bcp', password: 'Demo2026!' }) });
    const bcpInbox = await call(base, '/bank/requests', { headers: { authorization: `Bearer ${bcp.body.token}` } });
    assert.ok(bcpInbox.body.items.some(request => request.id === created.body.id));
    const bbva = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'analista.bbva', password: 'Demo2026!' }) });
    const bbvaInbox = await call(base, '/bank/requests', { headers: { authorization: `Bearer ${bbva.body.token}` } });
    assert.ok(!bbvaInbox.body.items.some(request => request.id === created.body.id));
    const interbank = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'analista.interbank', password: 'Demo2026!' }) });
    const interbankInbox = await call(base, '/bank/requests', { headers: { authorization: `Bearer ${interbank.body.token}` } });
    assert.ok(!interbankInbox.body.items.some(request => request.id === created.body.id));
  } finally { await close(context); }
});

test('la constancia PDF solo se descarga para una autorización vigente del trabajador', async () => {
  const context = await setup();
  const base = `http://127.0.0.1:${context.server.address().port}/api`;
  try {
    const gabriela = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'gabriela.demo', password: 'Demo2026!' }) });
    const certificate = certificateData(context.db, 'gabriela', 'req-autorizada', 'https://demo.essalud.test');
    assert.equal(certificate.verificationUrl, 'https://demo.essalud.test/prestamos/verificar/DEMO-8K4Z-Q2M7');
    const localCertificate = certificateData(context.db, 'gabriela', 'req-autorizada', publicAppUrl());
    assert.equal(localCertificate.verificationUrl, 'http://localhost:4200/prestamos/verificar/DEMO-8K4Z-Q2M7');
    const pdf = await callBinary(base, '/worker/requests/req-autorizada/constancia.pdf', { headers: { authorization: `Bearer ${gabriela.body.token}` } });
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get('content-type'), /application\/pdf/);
    assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
    const andrea = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'andrea.demo', password: 'Demo2026!' }) });
    const pending = await call(base, '/worker/requests', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'pending-certificate' }, body: JSON.stringify({ bankId: 'andino', type: 'NUEVO' }) });
    const unavailable = await callBinary(base, `/worker/requests/${pending.body.id}/constancia.pdf`, { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.equal(unavailable.status, 404);
    const denied = await callBinary(base, '/worker/requests/req-rechazada/constancia.pdf', { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.equal(denied.status, 404);
    assert.equal(context.db.prepare("SELECT count(*) count FROM audit_events WHERE action='CONSTANCIA_DESCARGADA'").get().count, 1);
  } finally { await close(context); }
});

test('la constancia de capacidad conserva el snapshot, se verifica en público y no bloquea solicitudes', async () => {
  const context = await setup();
  const base = `http://127.0.0.1:${context.server.address().port}/api`;
  try {
    const andrea = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'andrea.demo', password: 'Demo2026!' }) });
    const overview = await call(base, '/worker/overview', { headers: { authorization: `Bearer ${andrea.body.token}` } });
    const issued = await call(base, '/worker/capacity-certificates', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'capacity-document-andrea' }, body: '{}' });
    assert.equal(issued.status, 200);
    assert.equal(issued.body.documentType, 'CAPACIDAD_MENSUAL');
    assert.equal(issued.body.capacity_centimos, overview.body.capacity.availableCentimos);
    assert.equal(issued.body.period_label, overview.body.capacity.period.label);
    assert.equal(issued.body.valid_until, '2026-10-31');
    assert.equal(issued.body.verification_status, 'VIGENTE');
    assert.equal(issued.body.verificationUrl, `http://localhost:4200/prestamos/verificar/${issued.body.public_code}`);
    const pdf = await callBinary(base, `/worker/capacity-certificates/${issued.body.id}/pdf`, { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get('content-type'), /application\/pdf/);
    assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
    const publicRecord = await call(base, `/public/certificates/${issued.body.public_code}`);
    assert.equal(publicRecord.status, 200);
    assert.equal(publicRecord.body.documentType, 'CAPACIDAD_MENSUAL');
    assert.equal(publicRecord.body.capacity_centimos, overview.body.capacity.availableCentimos);
    assert.equal(publicRecord.body.period_label, overview.body.capacity.period.label);
    assert.equal(publicRecord.body.valid_until, issued.body.valid_until);
    assert.equal(publicRecord.body.verification_status, 'VIGENTE');
    assert.equal(publicRecord.body.worker_name, undefined);
    assert.match(publicRecord.body.verificationUrl, new RegExp(`/prestamos/verificar/${issued.body.public_code}$`));
    context.db.prepare("UPDATE capacity_certificates SET valid_until='2020-01-31' WHERE id=?").run(issued.body.id);
    const expired = await call(base, `/public/certificates/${issued.body.public_code}`);
    assert.equal(expired.body.verification_status, 'VENCIDA');
    context.db.prepare('UPDATE capacity_certificates SET valid_until=NULL WHERE id=?').run(issued.body.id);
    const undetermined = await call(base, `/public/certificates/${issued.body.public_code}`);
    assert.equal(undetermined.body.verification_status, 'VIGENCIA_NO_DETERMINADA');
    const bruno = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'bruno.demo', password: 'Demo2026!' }) });
    const denied = await callBinary(base, `/worker/capacity-certificates/${issued.body.id}/pdf`, { headers: { authorization: `Bearer ${bruno.body.token}` } });
    assert.equal(denied.status, 404);
    const created = await call(base, '/worker/requests', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'request-after-capacity-document' }, body: JSON.stringify({ bankId: 'horizonte', type: 'NUEVO' }) });
    assert.equal(created.status, 200);
    const missing = await call(base, '/public/certificates/no-es-un-codigo-valido');
    assert.equal(missing.status, 404);
  } finally { await close(context); }
});

test('la cancelación libera la exclusividad de la solicitud y queda reflejada en el detalle', async () => {
  const context = await setup();
  const base = `http://127.0.0.1:${context.server.address().port}/api`;
  try {
    const andrea = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'andrea.demo', password: 'Demo2026!' }) });
    const created = await call(base, '/worker/requests', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'cancel-before-bank-review' }, body: JSON.stringify({ bankId: 'andino', type: 'NUEVO' }) });
    const cancelled = await call(base, `/worker/requests/${created.body.id}/cancel`, { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'confirm-cancellation' }, body: '{}' });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'CANCELADA_POR_TRABAJADOR');
    const detail = await call(base, `/worker/requests/${created.body.id}`, { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.ok(detail.body.history.some(item => item.action === 'SOLICITUD_CANCELADA'));
    const nextRequest = await call(base, '/worker/requests', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'request-after-cancellation' }, body: JSON.stringify({ bankId: 'horizonte', type: 'NUEVO' }) });
    assert.equal(nextRequest.status, 200);
  } finally { await close(context); }
});

test('Andrea recibe una propuesta BBVA, la acepta y descarga la constancia de la misma autorización', async () => {
  const context = await setup();
  const base = `http://127.0.0.1:${context.server.address().port}/api`;
  try {
    const andrea = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'andrea.demo', password: 'Demo2026!' }) });
    const created = await call(base, '/worker/requests', { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'andrea-bbva-flow' }, body: JSON.stringify({ bankId: 'horizonte', type: 'NUEVO' }) });
    assert.equal(created.status, 200);
    const analyst = await call(base, '/auth/login', { method: 'POST', body: JSON.stringify({ username: 'analista.bbva', password: 'Demo2026!' }) });
    const taken = await call(base, `/bank/requests/${created.body.id}/take`, { method: 'POST', headers: { authorization: `Bearer ${analyst.body.token}`, 'idempotency-key': 'take-andrea-bbva' }, body: '{}' });
    assert.equal(taken.status, 200);
    const proposed = await call(base, `/bank/requests/${created.body.id}/proposal`, { method: 'POST', headers: { authorization: `Bearer ${analyst.body.token}`, 'idempotency-key': 'proposal-andrea-bbva' }, body: JSON.stringify({ amountCentimos: 360000, termMonths: 18, annualRate: 14.5, paymentCentimos: 100000, notes: 'Propuesta de prueba.' }) });
    assert.equal(proposed.status, 200);
    assert.equal(proposed.body.status, 'PROPUESTA_EMITIDA');
    const accepted = await call(base, `/worker/requests/${created.body.id}/respond`, { method: 'POST', headers: { authorization: `Bearer ${andrea.body.token}`, 'idempotency-key': 'accept-andrea-bbva' }, body: JSON.stringify({ action: 'ACEPTAR' }) });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.status, 'AUTORIZADA');
    const detail = await call(base, `/worker/requests/${created.body.id}`, { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.equal(detail.status, 200);
    assert.ok(detail.body.history.some(item => item.action === 'SOLICITUD_CREADA'));
    assert.ok(detail.body.history.some(item => item.action === 'PROPUESTA_EMITIDA'));
    assert.ok(detail.body.history.some(item => item.action === 'OPERACION_AUTORIZADA'));
    const pdf = await callBinary(base, `/worker/requests/${created.body.id}/constancia.pdf`, { headers: { authorization: `Bearer ${andrea.body.token}` } });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.body.subarray(0, 4).toString(), '%PDF');
    const verification = await call(base, `/public/certificates/${accepted.body.authorization.public_code}`);
    assert.equal(verification.status, 200);
    assert.equal(verification.body.public_code, accepted.body.authorization.public_code);
    assert.equal(verification.body.bank_name, 'BBVA Perú');
    assert.equal(verification.body.worker_name, undefined);
  } finally { await close(context); }
});
