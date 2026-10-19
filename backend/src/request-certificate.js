const crypto = require('node:crypto');
const QRCode = require('qrcode');
const { id, now, audit, transaction } = require('./db');
const { ownRequest } = require('./loan-service');

const TYPE_LABELS = { NUEVO:'Préstamo nuevo', AMPLIACION:'Ampliación', COMPRA_DEUDA:'Compra de deuda' };
const STATUS_LABELS = {
  CREADA:'Pendiente de evaluación', EN_EVALUACION_BANCO:'En evaluación', PROPUESTA_EMITIDA:'Propuesta recibida',
  ACEPTADA_POR_TRABAJADOR:'Aceptación registrada', AUTORIZADA:'Operación autorizada', PENDIENTE_FIRMA:'Pendiente de firma',
  FIRMADA:'Firmada', CANCELADA_POR_TRABAJADOR:'Solicitud cancelada', RECHAZADA_POR_BANCO:'Solicitud rechazada por el banco',
  RECHAZADA_POR_TRABAJADOR:'Propuesta rechazada por el trabajador', ANULADA_POR_ADMINISTRACION:'Solicitud anulada', VENCIDA:'Solicitud vencida'
};
const DISCLAIMER = 'Esta constancia acredita únicamente el registro de una solicitud ante la entidad financiera indicada. No constituye aprobación crediticia ni autorización para efectuar descuentos por planilla.';
const url = (base, code) => `${base.replace(/\/$/, '')}/prestamos/verificar/${encodeURIComponent(code)}`;
const mask = value => String(value).length > 3 ? `***${String(value).slice(-3)}` : '***';
const maskedName = name => name.split(/\s+/).filter(Boolean).map(word => `${word[0]}***`).join(' ');
const fail = (message, status) => Object.assign(new Error(message), {status});

function issue(db, actor, requestId, key) {
  if (!key || key.length > 200) throw fail('Idempotency-Key requerido y de hasta 200 caracteres.', 400);
  return transaction(db, () => {
    const request = ownRequest(db, actor, requestId);
    const intent = crypto.createHash('sha256').update(JSON.stringify({action:'ISSUE_REQUEST_CERTIFICATE',requestId})).digest('hex');
    const prior = db.prepare('SELECT * FROM idempotency WHERE actor_id=? AND key=?').get(actor.id, key);
    if (prior && prior.body_hash !== intent) throw fail('La clave de idempotencia fue usada con otra intención.', 409);
    let record = db.prepare('SELECT * FROM request_certificates WHERE request_id=?').get(requestId);
    if (!record) {
      const worker = db.prepare('SELECT name,code FROM workers WHERE id=?').get(request.worker_id);
      const bank = db.prepare('SELECT name FROM organizations WHERE id=?').get(request.bank_id);
      const period = db.prepare('SELECT label FROM periods WHERE id=?').get(request.period_id);
      const snapshot = {
        worker_name:worker.name, worker_code_masked:mask(worker.code), bank_name:bank.name,
        type:request.type, operation_label:TYPE_LABELS[request.type] || request.type,
        registered_at:request.created_at, period_label:period.label, capacity_centimos:request.assessment_centimos,
        issued_status:request.status, issued_status_label:STATUS_LABELS[request.status] || request.status
      };
      // 128 random bits. UNIQUE constraints and BEGIN IMMEDIATE cover concurrent first emissions.
      let publicCode;
      do { publicCode = `SOL-${crypto.randomBytes(16).toString('hex').toUpperCase()}`; }
      while (db.prepare('SELECT 1 FROM request_certificates WHERE public_code=?').get(publicCode));
      record = {id:id('solcert'), request_id:requestId, public_code:publicCode, snapshot_json:JSON.stringify(snapshot), issued_at:now()};
      db.prepare('INSERT INTO request_certificates VALUES (@id,@request_id,@public_code,@snapshot_json,@issued_at)').run(record);
      audit(db, actor.id, 'CONSTANCIA_SOLICITUD_EMITIDA', 'REQUEST_CERTIFICATE', record.id, {requestId});
    }
    const result = {public_code:record.public_code, issued_at:record.issued_at, documentType:'REGISTRO_SOLICITUD'};
    if (!prior) db.prepare('INSERT INTO idempotency VALUES (?,?,?,?,?)').run(actor.id, key, intent, JSON.stringify(result), now());
    return result;
  });
}

function ownRecord(db, actor, requestId, baseUrl) {
  ownRequest(db, actor, requestId);
  const row = db.prepare('SELECT * FROM request_certificates WHERE request_id=?').get(requestId);
  if (!row) throw fail('Primero debe emitir la constancia de solicitud.', 404);
  return {...JSON.parse(row.snapshot_json), id:row.id, public_code:row.public_code, issued_at:row.issued_at,
    verificationUrl:url(baseUrl, row.public_code)};
}

function currentLabel(status) {
  const labels = {
    CANCELADA_POR_TRABAJADOR:'Solicitud cancelada', RECHAZADA_POR_BANCO:'Solicitud rechazada',
    RECHAZADA_POR_TRABAJADOR:'Solicitud rechazada', ANULADA_POR_ADMINISTRACION:'Solicitud anulada', VENCIDA:'Solicitud vencida',
    AUTORIZADA:'Operación autorizada', PENDIENTE_FIRMA:'Operación autorizada, pendiente de firma', FIRMADA:'Operación firmada'
  };
  const active = ['CREADA','EN_EVALUACION_BANCO','PROPUESTA_EMITIDA','ACEPTADA_POR_TRABAJADOR'];
  return `Registro auténtico — ${labels[status] || (active.includes(status) ? 'Solicitud activa' : 'Estado no determinado')}`;
}

async function publicRecord(db, code, baseUrl) {
  const row = db.prepare(`SELECT c.*, r.status current_status FROM request_certificates c
    JOIN requests r ON r.id=c.request_id WHERE c.public_code=?`).get(code);
  if (!row) return null;
  const snapshot = JSON.parse(row.snapshot_json);
  const verificationUrl = url(baseUrl, code);
  audit(db, null, 'CONSTANCIA_SOLICITUD_VERIFICADA', 'REQUEST_CERTIFICATE', row.id);
  // Explicit projection: never expose internal IDs, payroll, or full identity publicly.
  return {documentType:'REGISTRO_SOLICITUD', public_code:row.public_code, issued_at:row.issued_at,
    type:snapshot.type, operation_label:snapshot.operation_label, bank_name:snapshot.bank_name,
    registered_at:snapshot.registered_at, period_label:snapshot.period_label, capacity_centimos:snapshot.capacity_centimos,
    worker_display:maskedName(snapshot.worker_name), worker_code_masked:snapshot.worker_code_masked,
    issued_status:snapshot.issued_status, current_status:row.current_status,
    current_status_label:STATUS_LABELS[row.current_status] || row.current_status, verification_label:currentLabel(row.current_status),
    disclaimer:DISCLAIMER, verificationUrl, qrDataUrl:await QRCode.toDataURL(verificationUrl,{margin:4,width:220})};
}
module.exports = { issue, ownRecord, publicRecord, DISCLAIMER };
