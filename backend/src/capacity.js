const { id, now } = require('./db');

function calculate(db, workerId, periodId) {
  const snapshot = db.prepare('SELECT * FROM payroll_snapshots WHERE worker_id=? AND period_id=?').get(workerId, periodId);
  if (!snapshot) throw Object.assign(new Error('No existe un snapshot de planilla para este período.'), {status:404});
  const parameter = db.prepare("SELECT * FROM parameters WHERE key='capacidad.porcentaje_base'").get();
  const base = Number(parameter.value);
  const income = snapshot.gross_centimos + snapshot.variable_centimos - snapshot.legal_discount_centimos - snapshot.other_discount_centimos;
  const loans = db.prepare("SELECT COALESCE(SUM(monthly_payment_centimos),0) value FROM loans WHERE worker_id=? AND status='VIGENTE'").get(workerId).value;
  const available = Math.max(0, Math.floor(income * base) - loans);
  return { workerId, periodId, ruleVersion:`CAP-DEMO-${parameter.version}`, basePercentage:base, eligibleIncomeCentimos:income, existingPaymentsCentimos:loans, availableCentimos:available, calculatedAt:now(), formula:'Regla demostrativa versionada: (ingreso neto del snapshot × parámetro) − cuotas vigentes.' };
}
function workerCapacity(db, workerId) {
  const period = db.prepare(`SELECT p.* FROM periods p
    WHERE p.status IN ('ABIERTO','RESTRINGIDO','CERRADO')
      AND EXISTS (SELECT 1 FROM payroll_snapshots s WHERE s.period_id=p.id AND s.worker_id=?)
    ORDER BY CASE p.status WHEN 'ABIERTO' THEN 0 WHEN 'RESTRINGIDO' THEN 1 ELSE 2 END, p.starts_on DESC
    LIMIT 1`).get(workerId);
  if (!period) throw Object.assign(new Error('No existe un período con información de capacidad disponible.'), {status:404});
  const assessment = calculate(db, workerId, period.id);
  return { ...assessment, period:{id:period.id, code:period.code,label:period.label,status:period.status,endsOn:period.ends_on}, allowsNewRequests:period.status === 'ABIERTO' };
}
function allowedTypes(db, workerId) {
  const active = db.prepare("SELECT 1 FROM loans WHERE worker_id=? AND status='VIGENTE'").get(workerId);
  return active ? ['AMPLIACION','COMPRA_DEUDA'] : ['NUEVO'];
}
module.exports = { calculate, workerCapacity, allowedTypes };
