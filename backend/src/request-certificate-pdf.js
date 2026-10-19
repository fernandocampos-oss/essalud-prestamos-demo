const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('node:fs');
const path = require('node:path');
const { DISCLAIMER } = require('./request-certificate');

const money = n => new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n / 100);
const date = value => new Intl.DateTimeFormat('es-PE',{dateStyle:'long',timeZone:'America/Lima'}).format(new Date(value));

async function createPdf(data) {
  const qr = await QRCode.toBuffer(data.verificationUrl,{margin:4,width:300});
  const doc = new PDFDocument({size:'A4',margin:48,bufferPages:true,info:{
    Title:'Constancia de registro de solicitud de préstamo por convenio',Author:'Sistema de demostración de préstamos por convenio'
  }});
  const chunks = [];
  const result = new Promise((resolve,reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  const ink='#17324d', muted='#46637b', blue='#0077c8';
  const logo = ['frontend/dist/essalud-demo/browser/assets/essalud/essalud-logo.jpg',
    'frontend/src/assets/essalud/essalud-logo.jpg'].map(p=>path.resolve(p)).find(fs.existsSync);
  if (logo) doc.image(logo,48,35,{fit:[116,40]});
  doc.fillColor(ink).font('Helvetica-Bold').fontSize(11).text('Préstamos por convenio',275,39,{width:272,align:'right'});
  doc.font('Helvetica').fontSize(9).fillColor(muted).text('Entorno de demostración',275,57,{width:272,align:'right'});
  doc.moveTo(48,92).lineTo(547,92).lineWidth(3).strokeColor(blue).stroke();
  doc.fillColor(ink).font('Helvetica-Bold').fontSize(16).text('CONSTANCIA DE REGISTRO DE SOLICITUD DE PRÉSTAMO POR CONVENIO',48,113,{width:499,lineGap:3});
  doc.font('Helvetica').fontSize(9).fillColor(muted).text(`Código de verificación: ${data.public_code}`,48,174,{width:499});
  doc.text(`Emitida el ${date(data.issued_at)}`,48,191);
  function section(title,y) {
    doc.roundedRect(48,y,499,26,4).fill('#edf6fc');
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(10).text(title,60,y+8);
  }
  function row(label,value,y) {
    doc.font('Helvetica').fontSize(9).fillColor(muted).text(label,60,y,{width:170});
    doc.font('Helvetica-Bold').fontSize(10).fillColor(ink).text(String(value),235,y,{width:300});
  }
  section('Datos del trabajador',221);
  row('Nombre',data.worker_name,260);
  row('Documento enmascarado',data.worker_code_masked,286);
  section('Información de la solicitud registrada',316);
  [['Tipo de préstamo',data.operation_label],['Entidad destinataria',data.bank_name],
    ['Fecha de registro',date(data.registered_at)],['Período',data.period_label],
    ['Capacidad mensual registrada',money(data.capacity_centimos)],['Estado al emitir',data.issued_status_label]
  ].forEach(([label,value],i)=>row(label,value,355+i*26));
  doc.roundedRect(48,521,499,128,6).fill('#f4f8fb');
  doc.image(qr,57,530,{width:108,height:108});
  doc.font('Helvetica-Bold').fontSize(11).fillColor(ink).text('Verifique el registro y su estado actual',180,537,{width:350});
  doc.font('Helvetica').fontSize(9).fillColor(muted).text('El PDF conserva los datos de emisión. La consulta en línea refleja cancelaciones, rechazos y autorizaciones posteriores.',180,558,{width:350,lineGap:2});
  doc.fontSize(8).fillColor(blue).text(data.verificationUrl,180,601,{width:350,link:data.verificationUrl,underline:true});
  doc.font('Helvetica').fontSize(9).fillColor(ink).text(DISCLAIMER,48,671,{width:499,lineGap:3});
  doc.font('Helvetica-Bold').fontSize(10).fillColor(blue).text('DOCUMENTO DE DEMOSTRACIÓN — SIN VALIDEZ OFICIAL',48,745,{width:499,align:'center'});
  doc.font('Helvetica').fontSize(8).fillColor(muted).text('No es un documento emitido oficialmente por EsSalud. Datos ficticios.',48,764,{width:499,align:'center'});
  doc.end();
  return result;
}
module.exports = { createPdf };
