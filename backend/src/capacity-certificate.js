const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { id, now, audit, transaction } = require('./db');
const { workerCapacity } = require('./capacity');

const hash = body => crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
const money = value => new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(Number(value) / 100);
const date = value => new Intl.DateTimeFormat('es-PE', { dateStyle:'long', timeZone:'America/Lima' }).format(new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-05:00` : value));
const code = () => `CAP-${crypto.randomBytes(9).toString('base64url').toUpperCase()}`;
const maskedCode = value => value.length > 3 ? `${value.slice(0, 3)}-***${value.slice(-2)}` : 'No disponible';
const maskedName = value => value.split(' ').filter(Boolean).map(part => `${part[0]}${'*'.repeat(Math.max(2, part.length - 1))}`).join(' ');
const limaDate = value => new Intl.DateTimeFormat('en-CA', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Lima'}).formatToParts(value).reduce((result,part)=>part.type==='literal'?result:{...result,[part.type]:part.value},{});
const isoLimaDate = value => { const parts=limaDate(value); return `${parts.year}-${parts.month}-${parts.day}`; };

function verificationUrl(baseUrl, publicCode) {
  return `${baseUrl.replace(/\/$/, '')}/prestamos/verificar/${encodeURIComponent(publicCode)}`;
}

function verificationStatus(row, currentDate = new Date()) {
  if (row.status !== 'INFORMATIVA') return 'REGISTRO_INVALIDADO';
  if (!row.valid_until) return 'VIGENCIA_NO_DETERMINADA';
  return row.valid_until >= isoLimaDate(currentDate) ? 'VIGENTE' : 'VENCIDA';
}

function summary(row, baseUrl) {
  return {
    id: row.id, documentType:'CAPACIDAD_MENSUAL', public_code:row.public_code, status:row.status,
    period_label:row.period_label, capacity_centimos:row.capacity_centimos, issued_at:row.issued_at,
    calculated_at:row.calculated_at, valid_until:row.valid_until||null, verification_status:verificationStatus(row), worker_display:maskedName(row.worker_name),
    worker_code_masked:maskedCode(row.worker_code), verificationUrl:verificationUrl(baseUrl, row.public_code)
  };
}

function validUntil(db, capacity) {
  const policy = db.prepare("SELECT value FROM parameters WHERE key='constancia.capacidad.vigencia_regla'").get()?.value;
  return policy === 'FIN_PERIODO' ? capacity.period.endsOn : null;
}

function ownRecord(db, workerId, certificateId) {
  const row = db.prepare(`SELECT c.*, p.label period_label FROM capacity_certificates c
    JOIN periods p ON p.id=c.period_id WHERE c.id=? AND c.worker_id=?`).get(certificateId, workerId);
  if (!row) throw Object.assign(new Error('Constancia de capacidad no encontrada.'), {status:404});
  return row;
}

function create(db, actor, body, key, baseUrl) {
  if (!key) throw Object.assign(new Error('Idempotency-Key requerido.'), {status:400});
  return transaction(db, () => {
    const prior = db.prepare('SELECT * FROM idempotency WHERE actor_id=? AND key=?').get(actor.id, key);
    if (prior) {
      if (prior.body_hash !== hash(body)) throw Object.assign(new Error('La clave de idempotencia fue usada con otra intención.'), {status:409});
      return JSON.parse(prior.response);
    }
    if (!actor.workerId) throw Object.assign(new Error('Solo un trabajador puede generar esta constancia.'), {status:403});
    const capacity = workerCapacity(db, actor.workerId);
    const worker = db.prepare('SELECT name,code FROM workers WHERE id=?').get(actor.workerId);
    const record = { id:id('capcert'), worker_id:actor.workerId, period_id:capacity.periodId, worker_name:worker.name,
      worker_code:worker.code, capacity_centimos:capacity.availableCentimos, public_code:code(), status:'INFORMATIVA',
      calculated_at:capacity.calculatedAt, issued_at:now(), valid_until:validUntil(db, capacity) };
    db.prepare(`INSERT INTO capacity_certificates (id,worker_id,period_id,worker_name,worker_code,capacity_centimos,public_code,status,calculated_at,issued_at,valid_until)
      VALUES (@id,@worker_id,@period_id,@worker_name,@worker_code,@capacity_centimos,@public_code,@status,@calculated_at,@issued_at,@valid_until)`).run(record);
    const result = summary({ ...record, period_label:capacity.period.label }, baseUrl);
    db.prepare('INSERT INTO idempotency VALUES (?,?,?,?,?)').run(actor.id, key, hash(body), JSON.stringify(result), now());
    audit(db, actor.id, 'CONSTANCIA_CAPACIDAD_EMITIDA', 'CAPACITY_CERTIFICATE', record.id, { periodId:record.period_id, capacityCentimos:record.capacity_centimos });
    return result;
  });
}

async function publicRecord(db, publicCode, baseUrl) {
  const row = db.prepare(`SELECT c.*, p.label period_label FROM capacity_certificates c
    JOIN periods p ON p.id=c.period_id WHERE c.public_code=?`).get(publicCode);
  if (!row) return null;
  audit(db, null, 'CONSTANCIA_CAPACIDAD_VERIFICADA', 'CAPACITY_CERTIFICATE', row.id, {});
  return { ...summary(row, baseUrl), qrDataUrl:await QRCode.toDataURL(verificationUrl(baseUrl, publicCode), {margin:1,width:180}) };
}

function logoPath() {
  return [
    path.resolve(process.cwd(), 'frontend/dist/essalud-demo/browser/assets/essalud/essalud-logo.jpg'),
    path.resolve(process.cwd(), 'frontend/src/assets/essalud/essalud-logo.jpg')
  ].find(fs.existsSync);
}

function row(doc, label, value, y) {
  doc.fillColor('#5a7082').font('Helvetica').fontSize(9).text(label, 52, y, {width:190});
  doc.fillColor('#17324d').font('Helvetica-Bold').fontSize(10).text(value, 245, y, {width:286});
}

async function renderPdf(res, record) {
  const qr = Buffer.from((await QRCode.toDataURL(record.verificationUrl, {margin:1,width:170})).split(',')[1], 'base64');
  const doc = new PDFDocument({size:'A4',margin:52,info:{Title:'Constancia informativa de capacidad - demostración',Author:'Demo EsSalud'}});
  doc.pipe(res);
  doc.rect(0, 0, 595, 92).fill('#0077c8');
  const logo = logoPath();
  if (logo) doc.image(logo, 52, 28, {fit:[93,32]}); else doc.fillColor('#fff').font('Helvetica-Bold').fontSize(21).text('EsSalud', 52, 34);
  doc.fillColor('#dff2ff').font('Helvetica').fontSize(10).text('Préstamos por convenio', 52, 63);
  doc.roundedRect(370, 31, 173, 24, 4).fillColor('#e7f5ed');
  doc.fillColor('#176b48').font('Helvetica-Bold').fontSize(8).text('DOCUMENTO DE DEMOSTRACIÓN', 382, 39, {width:149,align:'center'});
  doc.fillColor('#17324d').font('Helvetica-Bold').fontSize(17).text('Constancia informativa de capacidad mensual', 52, 126, {width:491});
  doc.font('Helvetica').fontSize(10).fillColor('#46637b').text('Para préstamos por convenio', 52, 150);
  doc.moveTo(52, 177).lineTo(543, 177).lineWidth(1).strokeColor('#c9dfef').stroke();
  const validity = record.valid_until ? `Válida hasta el ${date(record.valid_until)}` : 'Vigencia no determinada';
  [['Código de constancia',record.public_code],['Fecha de emisión',date(record.issued_at)],['Trabajador',record.worker_name],['Documento de identidad',record.worker_code_masked],['Período de consulta',record.period_label],['Capacidad mensual disponible',money(record.capacity_centimos)],['Estado de verificación',record.verification_status==='VIGENTE'?'Registro verificado y vigente':record.verification_status==='VENCIDA'?'Registro verificado, pero vencido':'Registro verificado; vigencia no determinada'],['Vigencia demostrativa',validity],['Código de verificación',record.public_code]].forEach(([label,value],index)=>row(doc,label,String(value),197+index*22));
  doc.roundedRect(52, 419, 491, 83, 8).fillColor('#edf6fc');
  doc.fillColor('#17324d').font('Helvetica-Bold').fontSize(11).text('Alcance de la constancia', 68, 435);
  doc.fillColor('#46637b').font('Helvetica').fontSize(9.5).text(`De acuerdo con la información registrada para el período indicado, el trabajador presenta una capacidad mensual referencial de ${money(record.capacity_centimos)} para la evaluación de operaciones de préstamo por convenio.`, 68, 456, {width:456,lineGap:3});
  doc.fillColor('#805c08').font('Helvetica-Bold').fontSize(8.5).text('Este documento es informativo y no constituye aprobación de crédito ni autorización para efectuar descuentos por planilla.', 68, 487, {width:456});
  doc.roundedRect(52, 524, 491, 132, 8).fillColor('#f7fbfe');
  doc.image(qr, 68, 540, {width:96,height:96});
  doc.fillColor('#17324d').font('Helvetica-Bold').fontSize(12).text('Verificación de la constancia',184,544);
  doc.fillColor('#46637b').font('Helvetica').fontSize(9).text('Escanee el código QR o utilice el código de verificación para consultar el registro emitido.',184,565,{width:320,lineGap:3});
  doc.fillColor('#005f9f').fontSize(8).text(record.verificationUrl,184,606,{width:320,lineBreak:false,ellipsis:true});
  doc.fillColor('#5a7082').font('Helvetica').fontSize(8).text('DOCUMENTO DE DEMOSTRACIÓN - SIN VALIDEZ OFICIAL',52,688,{width:491,align:'center'});
  doc.text('La capacidad puede variar en consultas posteriores. Este documento conserva el importe y período registrados en su emisión.',52,702,{width:491,align:'center'});
  doc.end();
}

module.exports = { create, ownRecord, publicRecord, renderPdf, summary, verificationStatus };
