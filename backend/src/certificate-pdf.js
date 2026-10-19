const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

const TYPE_LABELS = { NUEVO:'Préstamo nuevo', AMPLIACION:'Ampliación', COMPRA_DEUDA:'Compra de deuda' };

function money(value) {
  return new Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' }).format(Number(value) / 100);
}

function date(value) {
  return new Intl.DateTimeFormat('es-PE', { dateStyle:'long' }).format(new Date(value));
}

function maskedWorkerCode(code) {
  return code.length > 3 ? `${code.slice(0, 3)}-***${code.slice(-2)}` : 'No disponible';
}

function certificateData(db, workerId, requestId, appBaseUrl) {
  const row = db.prepare(`SELECT r.id request_id, r.type, r.status request_status, r.assessment_centimos,
      w.name worker_name, w.code worker_code, o.name bank_name, p.label period_label,
      pr.amount_centimos, pr.term_months, pr.annual_rate, pr.payment_centimos,
      a.id authorization_id, a.capacity_centimos, a.payment_centimos authorization_payment_centimos, a.status authorization_status, a.created_at authorization_created_at,
      c.id certificate_id, c.public_code, c.status certificate_status, c.issued_at, c.valid_until
    FROM requests r
    JOIN workers w ON w.id=r.worker_id
    JOIN organizations o ON o.id=r.bank_id
    JOIN periods p ON p.id=r.period_id
    JOIN authorizations a ON a.request_id=r.id
    JOIN certificates c ON c.authorization_id=a.id
    LEFT JOIN proposals pr ON pr.request_id=r.id
    WHERE r.id=? AND r.worker_id=?`).get(requestId, workerId);
  if (!row) throw Object.assign(new Error('Constancia de autorización no encontrada.'), {status:404});
  if (row.request_status !== 'AUTORIZADA' || row.authorization_status !== 'VIGENTE' || row.certificate_status !== 'VIGENTE') {
    throw Object.assign(new Error('La constancia solo está disponible para una autorización vigente.'), {status:409});
  }
  return {
    ...row,
    operationLabel: TYPE_LABELS[row.type] || row.type,
    verificationUrl: `${appBaseUrl.replace(/\/$/, '')}/prestamos/verificar/${encodeURIComponent(row.public_code)}`
  };
}

function textRow(doc, label, value, y) {
  doc.fillColor('#5a7082').fontSize(9).font('Helvetica').text(label, 52, y, {width:190});
  doc.fillColor('#17324d').fontSize(10).font('Helvetica-Bold').text(value, 245, y, {width:286});
}

async function renderCertificatePdf(res, data) {
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin:1, width:170 });
  const qrImage = Buffer.from(qrDataUrl.split(',')[1], 'base64');
  const doc = new PDFDocument({ size:'A4', margin:52, info:{ Title:'Constancia de autorización - demostración', Author:'Demo EsSalud' } });
  doc.pipe(res);

  doc.rect(0, 0, 595, 92).fill('#0077c8');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(21).text('EsSalud', 52, 31);
  doc.font('Helvetica').fontSize(10).fillColor('#dff2ff').text('Préstamos por convenio', 52, 58);
  doc.roundedRect(370, 31, 173, 24, 4).fillColor('#e7f5ed');
  doc.fillColor('#176b48').font('Helvetica-Bold').fontSize(8).text('DOCUMENTO DE DEMOSTRACIÓN', 382, 39, {width:149, align:'center'});

  doc.fillColor('#17324d').font('Helvetica-Bold').fontSize(18).text('Constancia de autorización de operación', 52, 126, {width:490});
  doc.font('Helvetica').fontSize(10).fillColor('#46637b').text('Préstamo por convenio', 52, 151);
  doc.moveTo(52, 177).lineTo(543, 177).lineWidth(1).strokeColor('#c9dfef').stroke();

  const rows = [
    ['Código de autorización', data.authorization_id],
    ['Fecha de emisión', date(data.issued_at)],
    ['Trabajador', data.worker_name],
    ['Código de trabajador', maskedWorkerCode(data.worker_code)],
    ['Entidad financiera', data.bank_name],
    ['Tipo de operación', data.operationLabel],
    ['Capacidad considerada', money(data.capacity_centimos)],
    ['Período', data.period_label],
    ['Estado de autorización', 'Vigente'],
    ['Código de verificación', data.public_code]
  ];
  if (data.amount_centimos !== null) rows.splice(6, 0,
    ['Monto propuesto', money(data.amount_centimos)],
    ['Plazo', `${data.term_months} meses`],
    ['Tasa de interés anual', `${data.annual_rate}%`],
    ['Cuota mensual propuesta', money(data.payment_centimos)]
  );
  rows.forEach(([label, value], index) => textRow(doc, label, String(value), 197 + index * 22));

  doc.roundedRect(52, 510, 491, 132, 8).fillColor('#edf6fc');
  doc.image(qrImage, 68, 526, {width:96, height:96});
  doc.fillColor('#17324d').font('Helvetica-Bold').fontSize(12).text('Verificación de la constancia', 184, 529);
  doc.font('Helvetica').fontSize(9).fillColor('#46637b').text('Escanee el código QR o ingrese el código de verificación en el portal para consultar el estado vigente.', 184, 550, {width:320, lineGap:3});
  doc.fillColor('#005f9f').fontSize(8).text(data.verificationUrl, 184, 591, {width:320, lineBreak:false, ellipsis:true});

  doc.font('Helvetica').fontSize(8).fillColor('#5a7082').text('DOCUMENTO DE DEMOSTRACIÓN - SIN VALIDEZ OFICIAL', 52, 688, {align:'center',width:491});
  doc.text('Información ficticia para la demostración del proceso. La verificación en línea es la fuente de estado.', 52, 702, {align:'center',width:491});
  doc.end();
}

module.exports = { certificateData, renderCertificatePdf };
