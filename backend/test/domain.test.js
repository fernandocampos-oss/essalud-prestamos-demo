const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { openDb } = require('../src/db');
const loan = require('../src/loan-service');

function setup() {
  const file = path.join(process.cwd(), 'database', `test-${Date.now()}-${Math.random()}.sqlite`);
  execFileSync(process.execPath, ['database/reset.js'], { env:{...process.env,DATABASE_PATH:file}, stdio:'ignore' });
  const before = process.env.DATABASE_PATH; process.env.DATABASE_PATH=file;
  const db = openDb();
  return {db,file,close(){db.close(); if(before===undefined)delete process.env.DATABASE_PATH;else process.env.DATABASE_PATH=before;fs.rmSync(file,{force:true});fs.rmSync(`${file}-wal`,{force:true});fs.rmSync(`${file}-shm`,{force:true});}};
}
const andrea={id:'worker-andrea',workerId:'andrea',role:'TRABAJADOR'};
test('el catálogo demo usa entidades financieras reconocibles con identificadores estables',()=>{const x=setup();try{const banks=x.db.prepare("SELECT id,name FROM organizations WHERE type='BANCO' ORDER BY id").all().map(row=>({...row}));assert.deepEqual(banks,[{id:'andino',name:'Banco de Crédito del Perú (BCP)'},{id:'horizonte',name:'BBVA Perú'},{id:'pacifico',name:'Interbank'}]);assert.equal(x.db.prepare('SELECT username FROM users WHERE id=?').get('analyst-andino').username,'analista.bcp');assert.equal(x.db.prepare('SELECT username FROM users WHERE id=?').get('analyst-horizonte').username,'analista.bbva');}finally{x.close();}});
test('la capacidad usa parámetro versionado y descuenta cuota vigente',()=>{const x=setup();try{const a=loan.workerCapacity(x.db,'andrea');const b=loan.workerCapacity(x.db,'bruno');assert.equal(a.basePercentage,.35);assert.ok(a.availableCentimos>0);assert.ok(b.existingPaymentsCentimos>0);assert.deepEqual(loan.allowedTypes(x.db,'bruno'),['AMPLIACION','COMPRA_DEUDA']);}finally{x.close();}});
test('la consulta de capacidad permanece disponible cuando el período se cierra',()=>{const x=setup();try{x.db.prepare("UPDATE periods SET status='CERRADO' WHERE id='oct-2026'").run();const capacity=loan.workerCapacity(x.db,'andrea');assert.equal(capacity.period.status,'CERRADO');assert.equal(capacity.allowsNewRequests,false);}finally{x.close();}});
test('la solicitud formal bloquea otra solicitud incompatible',()=>{const x=setup();try{loan.createRequest(x.db,andrea,{bankId:'andino',type:'NUEVO'},'one');assert.throws(()=>loan.createRequest(x.db,andrea,{bankId:'horizonte',type:'NUEVO'},'two'),/solicitud activa/);}finally{x.close();}});
test('un retry con misma clave devuelve una sola solicitud',()=>{const x=setup();try{const one=loan.createRequest(x.db,andrea,{bankId:'andino',type:'NUEVO'},'same');const again=loan.createRequest(x.db,andrea,{bankId:'andino',type:'NUEVO'},'same');assert.equal(one.id,again.id);assert.equal(x.db.prepare('SELECT count(*) n FROM requests WHERE worker_id=?').get('andrea').n,1);}finally{x.close();}});
test('un banco no puede acceder una solicitud de otro banco',()=>{const x=setup();try{const horizonte={id:'analyst-horizonte',organizationId:'horizonte',role:'ANALISTA_BANCO'};assert.throws(()=>loan.bankRequest(x.db,horizonte,'req-activa'),/no encontrada/);}finally{x.close();}});
test('aceptar propuesta superior a capacidad no genera autorización',()=>{const x=setup();try{const r=loan.ownRequest(x.db,{workerId:'diego'},'req-propuesta');assert.equal(r.status,'PROPUESTA_EMITIDA');assert.throws(()=>loan.respond(x.db,{id:'worker-diego',workerId:'diego'},r.id,{action:'ACEPTAR'},'accept'),/trabajador cambió/);assert.equal(x.db.prepare('SELECT count(*) n FROM authorizations WHERE request_id=?').get(r.id).n,0);}finally{x.close();}});
