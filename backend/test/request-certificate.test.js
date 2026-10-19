const test = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Worker } = require('node:worker_threads');
const express = require('express');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { api, publicApi } = require('../src/api');
const { migrateRequestCertificates } = require('../src/request-certificate-migration');
const cert = require('../src/request-certificate');
const { createPdf } = require('../src/request-certificate-pdf');
const actor = {id:'test-user',workerId:'test-worker',role:'TRABAJADOR'};

function fixture(file=':memory:') {
  const db = new DatabaseSync(file);
  db.exec(fs.readFileSync(path.resolve('database/schema.sql'),'utf8'));
  db.exec(`INSERT INTO organizations VALUES ('bank','BBVA Perú','BANCO');
    INSERT INTO workers VALUES ('test-worker','DEMO-12345678','Andrea Salazar','Demo','ACTIVO');
    INSERT INTO workers VALUES ('other','DEMO-87654321','Otro Trabajador','Demo','ACTIVO');
    INSERT INTO periods VALUES ('period','2026-10','Octubre 2026','ABIERTO','2026-10-01','2026-10-31');
    INSERT INTO requests VALUES ('legacy','test-worker','bank','NUEVO','CREADA',1,147000,'period',NULL,1,'2026-10-01T15:00:00Z',NULL);`);
  return db;
}

function token(workerId='test-worker',role='TRABAJADOR') {
  return jwt.sign({sub:'test-user',workerId,role},process.env.SESSION_SECRET||'local-demo-secret-only');
}

test('migración aditiva repetible conserva solicitudes, emite snapshot único y no altera el estado', async () => {
  const db=fixture();
  try {
    const before={...db.prepare('SELECT * FROM requests').get()};
    migrateRequestCertificates(db);migrateRequestCertificates(db);
    assert.deepEqual({...db.prepare('SELECT * FROM requests').get()},before);
    assert.throws(()=>cert.issue(db,actor,'legacy',''),/Idempotency/);
    const first=cert.issue(db,actor,'legacy','emit');
    assert.match(first.public_code,/^SOL-[A-F0-9]{32}$/);
    assert.notEqual(first.public_code,'legacy');
    assert.deepEqual(cert.issue(db,actor,'legacy','emit'),first);
    assert.deepEqual(cert.issue(db,actor,'legacy','retry'),first);
    assert.equal(db.prepare('SELECT count(*) n FROM request_certificates').get().n,1);
    assert.equal(db.prepare("SELECT count(*) n FROM audit_events WHERE action='CONSTANCIA_SOLICITUD_EMITIDA'").get().n,1);
    assert.deepEqual({...db.prepare('SELECT * FROM requests').get()},before);
    assert.equal(db.prepare('SELECT count(*) n FROM authorizations').get().n,0);
    const record=cert.ownRecord(db,actor,'legacy','https://demo.example');
    assert.equal(record.bank_name,'BBVA Perú');assert.equal(record.type,'NUEVO');
    assert.equal(record.capacity_centimos,147000);assert.equal(record.period_label,'Octubre 2026');
    assert.equal(record.worker_name,'Andrea Salazar');assert.equal(record.worker_code_masked,'***678');
    assert.equal(record.issued_status,'CREADA');
    db.prepare("UPDATE requests SET status='CANCELADA_POR_TRABAJADOR',blocking=0,assessment_centimos=1 WHERE id='legacy'").run();
    const again=cert.ownRecord(db,actor,'legacy','https://demo.example');
    assert.deepEqual(again,record);
    assert.throws(()=>cert.ownRecord(db,{workerId:'other'},'legacy','https://demo.example'),/no encontrada/);
    assert.throws(()=>db.prepare('INSERT INTO request_certificates SELECT ?,request_id,?,snapshot_json,issued_at FROM request_certificates').run('duplicate','SOL-OTHER'),/UNIQUE/);
  } finally {db.close();}
});

test('verificación pública: estado actual, identidad mínima, enlace y QR del mismo registro',async()=>{
  const db=fixture();migrateRequestCertificates(db);
  try {
    const record=cert.issue(db,actor,'legacy','public');
    for(const [status,label] of [['CREADA','Solicitud activa'],['CANCELADA_POR_TRABAJADOR','Solicitud cancelada'],['RECHAZADA_POR_BANCO','Solicitud rechazada'],['RECHAZADA_POR_TRABAJADOR','Solicitud rechazada'],['AUTORIZADA','Operación autorizada'],['ANULADA_POR_ADMINISTRACION','Solicitud anulada']]) {
      db.prepare('UPDATE requests SET status=? WHERE id=?').run(status,'legacy');
      const found=await cert.publicRecord(db,record.public_code,'https://demo.example');
      assert.equal(found.verification_label,`Registro auténtico — ${label}`);
      assert.equal(found.current_status,status);assert.equal(found.issued_status,'CREADA');
      assert.equal(found.id,undefined);assert.equal(found.request_id,undefined);assert.equal(found.worker_name,undefined);
      assert.equal(found.worker_display,'A*** S***');
      assert.equal(found.verificationUrl,`https://demo.example/prestamos/verificar/${record.public_code}`);
      assert.equal(found.qrDataUrl,await QRCode.toDataURL(found.verificationUrl,{margin:4,width:220}));
    }
    assert.equal(await cert.publicRecord(db,'SOL-INEXISTENTE','https://demo.example'),null);
  } finally {db.close();}
});

test('los tres tipos emiten códigos distintos y PDF A4 de una página con URL enlazada',async()=>{
  const db=fixture();migrateRequestCertificates(db);
  try {
    const codes=new Set();
    for(const type of ['NUEVO','AMPLIACION','COMPRA_DEUDA']) {
      db.prepare('UPDATE requests SET blocking=0').run();
      db.prepare(`INSERT INTO requests SELECT ?,worker_id,bank_id,?,'CREADA',0,assessment_centimos,period_id,NULL,1,created_at,NULL FROM requests WHERE id='legacy'`).run(type,type);
      const issued=cert.issue(db,actor,type,type);codes.add(issued.public_code);
      const data=cert.ownRecord(db,actor,type,'https://demo.example');
      assert.equal(data.type,type);
      const pdf=await createPdf(data);
      assert.equal(pdf.subarray(0,4).toString(),'%PDF');
      assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1);
      assert.match(pdf.toString('latin1'),/MediaBox \[0 0 595.28 841.89\]/);
      assert.ok(pdf.includes(Buffer.from(data.verificationUrl)));
      assert.ok(pdf.includes(Buffer.from('/Subtype /Image')));
    }
    assert.equal(codes.size,3);
  } finally {db.close();}
});

test('dos conexiones concurrentes y reapertura conservan una sola emisión',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'request-cert-'));const file=path.join(dir,'fixture.sqlite');
  const db=fixture(file);migrateRequestCertificates(db);db.close();
  const gate=new SharedArrayBuffer(4);
  const source=`const {workerData,parentPort}=require('node:worker_threads');
    const {DatabaseSync}=require('node:sqlite'); const cert=require(workerData.service);
    const db=new DatabaseSync(workerData.file); db.exec('PRAGMA busy_timeout=5000');
    parentPort.postMessage({ready:true}); Atomics.wait(new Int32Array(workerData.gate),0,0);
    try {parentPort.postMessage(cert.issue(db,workerData.actor,'legacy',workerData.key));}finally{db.close();}`;
  const workers=[];
  try {
    let ready=0;
    const results=await Promise.all(['one','two'].map(key=>new Promise((resolve,reject)=>{
      const w=new Worker(source,{eval:true,workerData:{file,actor,key,gate,service:path.resolve('backend/src/request-certificate.js')}});workers.push(w);
      w.on('error',reject);w.on('message',m=>{if(m.ready){if(++ready===2){Atomics.store(new Int32Array(gate),0,1);Atomics.notify(new Int32Array(gate),0);}}else resolve(m);});
    })));
    assert.equal(results[0].public_code,results[1].public_code);
    const reopened=new DatabaseSync(file);
    assert.equal(reopened.prepare('SELECT count(*) n FROM request_certificates').get().n,1);
    assert.equal(cert.issue(reopened,actor,'legacy','after-restart').public_code,results[0].public_code);
    reopened.close();
  } finally {await Promise.all(workers.map(w=>w.terminate()));fs.rmSync(dir,{recursive:true,force:true});}
});

test('API exige propietario, reutiliza emisión y entrega PDF sin mutar solicitud',async()=>{
  const db=fixture();migrateRequestCertificates(db);
  const app=express();app.use(express.json());app.use('/api/public',publicApi(db));app.use('/api',api(db));
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api`;
  const endpoint='/worker/requests/legacy/registration-certificate';
  const headers={authorization:`Bearer ${token()}`,'Idempotency-Key':'api'};
  try {
    assert.equal((await fetch(base+endpoint,{method:'POST'})).status,401);
    assert.equal((await fetch(base+endpoint,{method:'POST',headers:{...headers,authorization:`Bearer ${token('other')}`}})).status,404);
    assert.equal((await fetch(base+endpoint,{method:'POST',headers:{...headers,authorization:`Bearer ${token('test-worker','ANALISTA_BANCO')}`}})).status,403);
    const emitted=await fetch(base+endpoint,{method:'POST',headers});assert.equal(emitted.status,200);
    const record=await emitted.json();
    const response=await fetch(base+endpoint+'.pdf',{headers});assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/application\/pdf/);
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,4).toString(),'%PDF');
    assert.equal((await fetch(base+endpoint+'.pdf',{headers:{authorization:`Bearer ${token('other')}`}})).status,404);
    assert.equal(db.prepare('SELECT status FROM requests').get().status,'CREADA');
    assert.equal(db.prepare("SELECT count(*) n FROM audit_events WHERE action='CONSTANCIA_SOLICITUD_DESCARGADA'").get().n,1);
    const pub=await fetch(base+'/public/certificates/'+record.public_code);assert.equal(pub.status,200);
    assert.equal(pub.headers.get('cache-control'),'no-store');
    assert.equal((await pub.json()).documentType,'REGISTRO_SOLICITUD');
    assert.equal((await fetch(base+'/public/certificates/not-found')).status,404);
  } finally {await new Promise(r=>server.close(r));db.close();}
});
