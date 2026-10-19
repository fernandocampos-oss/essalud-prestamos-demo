const express = require('express');
const { session, roles, login, present } = require('./auth');
const { audit, now } = require('./db');
const loan = require('./loan-service');
const { calculate } = require('./capacity');
const { certificateData, renderCertificatePdf } = require('./certificate-pdf');
const capacityCertificate = require('./capacity-certificate');
const requestCertificate = require('./request-certificate');
const { createPdf } = require('./request-certificate-pdf');
const { publicAppUrl } = require('./public-url');

const mutate = fn => async (req,res) => { try { res.json(await fn(req)); } catch (e) { res.status(e.status || 500).json({message:e.message || 'Error inesperado.'}); } };
function bankInbox(db, actor, query) {
  const where=['r.bank_id=?']; const values=[actor.organizationId]; const search=String(query.q||'').trim();
  if (search) { where.push('(r.id LIKE ? OR w.name LIKE ? OR w.code LIKE ?)'); const value=`%${search}%`; values.push(value,value,value); }
  for (const [key,column] of [['status','r.status'],['type','r.type'],['periodId','r.period_id']]) if (query[key]) { where.push(`${column}=?`); values.push(query[key]); }
  const page=Math.max(1,Number.parseInt(query.page,10)||1); const pageSize=Math.min(50,Math.max(5,Number.parseInt(query.pageSize,10)||15));
  const filter=where.join(' AND '); const total=db.prepare(`SELECT count(*) n FROM requests r JOIN workers w ON w.id=r.worker_id WHERE ${filter}`).get(...values).n;
  const rows=db.prepare(`SELECT r.* FROM requests r JOIN workers w ON w.id=r.worker_id WHERE ${filter} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`).all(...values,pageSize,(page-1)*pageSize);
  const counts=db.prepare('SELECT status,count(*) n FROM requests WHERE bank_id=? GROUP BY status').all(actor.organizationId);
  const summary={total:counts.reduce((sum,row)=>sum+row.n,0),created:0,evaluation:0,proposals:0,authorized:0,rejected:0};
  for (const row of counts) { if(row.status==='CREADA')summary.created+=row.n; else if(row.status==='EN_EVALUACION_BANCO')summary.evaluation+=row.n; else if(row.status==='PROPUESTA_EMITIDA')summary.proposals+=row.n; else if(row.status==='AUTORIZADA')summary.authorized+=row.n; else if(row.status.startsWith('RECHAZADA'))summary.rejected+=row.n; }
  const periods=db.prepare('SELECT DISTINCT p.id,p.label FROM requests r JOIN periods p ON p.id=r.period_id WHERE r.bank_id=? ORDER BY p.starts_on DESC').all(actor.organizationId);
  const organization=db.prepare("SELECT id,name FROM organizations WHERE id=? AND type='BANCO'").get(actor.organizationId);
  return {organization,items:rows.map(row=>loan.requestSummary(db,row)),summary,filters:{periods},pagination:{page,pageSize,total,totalPages:Math.max(1,Math.ceil(total/pageSize))}};
}
function bankRequestDetail(db, actor, requestId) {
  const request=loan.bankRequest(db,actor,requestId);
  const history=db.prepare(`SELECT action,created_at FROM audit_events WHERE (entity='LOAN_REQUEST' AND entity_id=?) OR (entity='LOAN_PROPOSAL' AND entity_id=(SELECT id FROM proposals WHERE request_id=?)) OR (entity='AUTHORIZATION' AND entity_id=(SELECT id FROM authorizations WHERE request_id=?)) ORDER BY created_at ASC`).all(request.id,request.id,request.id);
  return {request:loan.requestSummary(db,request),history};
}
function api(db) {
  const router = express.Router();
  router.get('/health', (req,res) => { try { db.prepare('SELECT 1').get(); res.json({status:'ok',database:'accessible'}); } catch { res.status(503).json({status:'unavailable',database:'unavailable'}); } });
  router.post('/auth/login', mutate(req => { const result=login(db,req.body.username||'',req.body.password||''); if(!result) throw Object.assign(new Error('Usuario o contraseña inválidos.'),{status:401}); return result; }));
  router.post('/demo/access', mutate(req => { if(process.env.DEMO_MODE === 'false') throw Object.assign(new Error('El acceso rápido está deshabilitado.'),{status:404}); const map={trabajador:['andrea.demo'],vigente:['bruno.demo'],admin:['admin.essalud'],analista:['analista.bcp','analista.andino'],adminBanco:['admin.bcp','admin.andino'],sap:['sap.demo'],otroBanco:['analista.bbva','analista.horizonte'],interbank:['analista.interbank']}; const usernames=map[req.body.profile]; if(!usernames)throw Object.assign(new Error('Perfil de demo no disponible.'),{status:422}); const result=usernames.map(username=>login(db,username,'Demo2026!')).find(Boolean); if(!result)throw Object.assign(new Error('La cuenta de demostración no está disponible. Restaure los datos de la demo.'),{status:404}); return result; }));
  router.get('/auth/me', session(db), (req,res)=> { const user=db.prepare('SELECT * FROM users WHERE id=?').get(req.actor.sub); res.json({user:present(user)}); });
  router.use(session(db));
  router.get('/worker/overview', roles('TRABAJADOR'), mutate(req => { const worker=db.prepare('SELECT * FROM workers WHERE id=?').get(req.actor.workerId); const capacity=loan.workerCapacity(db,worker.id); const activeLoan=db.prepare("SELECT * FROM loans WHERE worker_id=? AND status='VIGENTE'").get(worker.id); const activeRequest=db.prepare('SELECT * FROM requests WHERE worker_id=? AND blocking=1').get(worker.id); return {worker,capacity,activeLoan,activeRequest:activeRequest?loan.requestSummary(db,activeRequest):null,allowedTypes:loan.allowedTypes(db,worker.id)}; }));
  router.post('/worker/capacity-certificates', roles('TRABAJADOR'), mutate(req => capacityCertificate.create(db, req.actor, {}, req.get('Idempotency-Key'), publicAppUrl())));
  router.get('/worker/capacity-certificates/:id/pdf', roles('TRABAJADOR'), async (req,res) => { try { const record=capacityCertificate.summary(capacityCertificate.ownRecord(db,req.actor.workerId,req.params.id),publicAppUrl()); audit(db,req.actor.sub,'CONSTANCIA_CAPACIDAD_DESCARGADA','CAPACITY_CERTIFICATE',record.id,{}); res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="constancia-capacidad-${record.public_code}.pdf"`}); await capacityCertificate.renderPdf(res,record); } catch (error) { if (!res.headersSent) res.status(error.status||500).json({message:error.message||'No fue posible generar la constancia de capacidad.'}); } });
  router.get('/worker/requests', roles('TRABAJADOR'), (req,res)=> { const rows=db.prepare('SELECT * FROM requests WHERE worker_id=? ORDER BY created_at DESC').all(req.actor.workerId).map(r=>loan.requestSummary(db,r)); res.json({items:rows}); });
  router.post('/worker/requests/:id/registration-certificate', roles('TRABAJADOR'), mutate(req => {
    publicAppUrl();
    return requestCertificate.issue(db, req.actor, req.params.id, req.get('Idempotency-Key'));
  }));
  router.get('/worker/requests/:id/registration-certificate.pdf', roles('TRABAJADOR'), async (req,res) => {
    try {
      const record = requestCertificate.ownRecord(db, req.actor, req.params.id, publicAppUrl());
      const pdf = await createPdf(record);
      audit(db, req.actor.id, 'CONSTANCIA_SOLICITUD_DESCARGADA', 'REQUEST_CERTIFICATE', record.id, {requestId:req.params.id});
      res.set({'Content-Type':'application/pdf','Cache-Control':'no-store',
        'Content-Disposition':`attachment; filename="constancia-solicitud-${record.public_code}.pdf"`}).send(pdf);
    } catch (error) { res.status(error.status||500).json({message:error.message||'No fue posible generar la constancia de solicitud.'}); }
  });
  router.get('/worker/requests/:id/constancia.pdf', roles('TRABAJADOR'), async (req,res) => { try { const certificate=certificateData(db,req.actor.workerId,req.params.id,publicAppUrl()); audit(db,req.actor.sub,'CONSTANCIA_DESCARGADA','CERTIFICATE',certificate.certificate_id,{requestId:req.params.id}); res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="constancia-${certificate.public_code}.pdf"`}); await renderCertificatePdf(res,certificate); } catch (error) { if (!res.headersSent) res.status(error.status||500).json({message:error.message||'No fue posible generar la constancia.'}); } });
  router.get('/worker/requests/:id', roles('TRABAJADOR'), mutate(req=> { const request=loan.ownRequest(db,req.actor,req.params.id); const history=db.prepare(`SELECT action,created_at FROM audit_events
    WHERE (entity='LOAN_REQUEST' AND entity_id=?)
      OR (entity='LOAN_PROPOSAL' AND entity_id=(SELECT id FROM proposals WHERE request_id=?))
      OR (entity='AUTHORIZATION' AND entity_id=(SELECT id FROM authorizations WHERE request_id=?))
    ORDER BY created_at ASC`).all(request.id,request.id,request.id); return {request:loan.requestSummary(db,request),history}; }));
  router.get('/worker/certificates', roles('TRABAJADOR'), (req,res)=> { const rows=db.prepare("SELECT c.public_code,c.status,c.issued_at,c.valid_until,r.type,o.name bank_name FROM certificates c JOIN authorizations a ON a.id=c.authorization_id JOIN requests r ON r.id=a.request_id JOIN organizations o ON o.id=r.bank_id WHERE r.worker_id=?").all(req.actor.workerId); res.json({items:rows}); });
  router.get('/banks', roles('TRABAJADOR'), (req,res)=>res.json({items:db.prepare("SELECT id,name FROM organizations WHERE type='BANCO' ORDER BY name").all()}));
  router.post('/worker/requests', roles('TRABAJADOR'), mutate(req=>loan.createRequest(db,req.actor,{bankId:req.body.bankId,type:req.body.type},req.get('Idempotency-Key'))));
  router.post('/worker/requests/:id/cancel', roles('TRABAJADOR'), mutate(req=>loan.cancel(db,req.actor,req.params.id,req.body,req.get('Idempotency-Key'))));
  router.post('/worker/requests/:id/respond', roles('TRABAJADOR'), mutate(req=>loan.respond(db,req.actor,req.params.id,req.body,req.get('Idempotency-Key'))));
  router.get('/bank/requests', roles('ANALISTA_BANCO','ADMIN_BANCO'), (req,res)=>res.json(bankInbox(db,req.actor,req.query)));
  router.get('/bank/requests/:id', roles('ANALISTA_BANCO','ADMIN_BANCO'), mutate(req=>bankRequestDetail(db,req.actor,req.params.id)));
  router.post('/bank/requests/:id/take', roles('ANALISTA_BANCO','ADMIN_BANCO'), mutate(req=>loan.take(db,req.actor,req.params.id,req.body,req.get('Idempotency-Key'))));
  router.post('/bank/requests/:id/reject', roles('ANALISTA_BANCO','ADMIN_BANCO'), mutate(req=>loan.reject(db,req.actor,req.params.id,req.body,req.get('Idempotency-Key'))));
  router.post('/bank/requests/:id/proposal', roles('ANALISTA_BANCO','ADMIN_BANCO'), mutate(req=>loan.propose(db,req.actor,req.params.id,{amountCentimos:Number(req.body.amountCentimos),termMonths:Number(req.body.termMonths),annualRate:req.body.annualRate,paymentCentimos:Number(req.body.paymentCentimos),notes:req.body.notes},req.get('Idempotency-Key'))));
  router.get('/sap/workers', roles('CONSULTA_PLANILLA','ADMIN_ESSALUD','OPERADOR_ESSALUD'), (req,res)=> { const q=`%${req.query.q||''}%`; const rows=db.prepare('SELECT * FROM workers WHERE name LIKE ? OR code LIKE ? ORDER BY name').all(q,q); audit(db,req.actor.sub,'CONSULTA_SAP','WORKER',null,{count:rows.length}); res.json({items:rows}); });
  router.get('/sap/workers/:id', roles('CONSULTA_PLANILLA','ADMIN_ESSALUD','OPERADOR_ESSALUD'), mutate(req=> { const worker=db.prepare('SELECT * FROM workers WHERE id=?').get(req.params.id); if(!worker)throw Object.assign(new Error('Trabajador no encontrado.'),{status:404}); const periods=db.prepare('SELECT * FROM periods ORDER BY starts_on DESC').all(); const period=periods.find(p=>p.id===(req.query.periodId||periods[0].id)); const snapshot=db.prepare('SELECT * FROM payroll_snapshots WHERE worker_id=? AND period_id=?').get(worker.id,period.id); const capacity=calculate(db,worker.id,period.id); const loans=db.prepare('SELECT * FROM loans WHERE worker_id=?').all(worker.id); return {worker,period,periods,snapshot:{...snapshot,concepts:JSON.parse(snapshot.concepts_json)},capacity,loans}; }));
  router.get('/admin/dashboard', roles('ADMIN_ESSALUD'), (req,res)=> { const count=s=>db.prepare('SELECT COUNT(*) n FROM requests WHERE status=?').get(s).n; res.json({activeRequests:db.prepare('SELECT COUNT(*) n FROM requests WHERE blocking=1').get().n,proposals:count('PROPUESTA_EMITIDA'),authorized:count('AUTORIZADA'),openPeriod:db.prepare("SELECT * FROM periods WHERE status='ABIERTO'").get(),finalizedLoans:db.prepare("SELECT COUNT(*) n FROM loans WHERE status='FINALIZADO'").get().n}); });
  router.get('/admin/periods', roles('ADMIN_ESSALUD'), (req,res)=>res.json({items:db.prepare('SELECT * FROM periods ORDER BY starts_on DESC').all()}));
  router.post('/admin/periods/:id/status', roles('ADMIN_ESSALUD'), mutate(req=> { if(!['PREPARACION','ABIERTO','RESTRINGIDO','CERRADO'].includes(req.body.status))throw Object.assign(new Error('Estado de período inválido.'),{status:422}); const p=db.prepare('SELECT * FROM periods WHERE id=?').get(req.params.id);if(!p)throw Object.assign(new Error('Período no encontrado.'),{status:404});db.prepare('UPDATE periods SET status=? WHERE id=?').run(req.body.status,p.id);audit(db,req.actor.sub,'PERIODO_ACTUALIZADO','PERIOD',p.id,{from:p.status,to:req.body.status});return { ...p,status:req.body.status}; }));
  router.get('/admin/parameters', roles('ADMIN_ESSALUD'), (req,res)=>res.json({items:db.prepare('SELECT * FROM parameters').all()}));
  router.post('/admin/parameters/capacity', roles('ADMIN_ESSALUD'), mutate(req=> { const value=Number(req.body.value);if(!(value>0&&value<=1))throw Object.assign(new Error('El porcentaje debe estar entre 0 y 1.'),{status:422});const old=db.prepare("SELECT * FROM parameters WHERE key='capacidad.porcentaje_base'").get();db.prepare("UPDATE parameters SET value=?,version=version+1,updated_at=?,updated_by=? WHERE key='capacidad.porcentaje_base'").run(String(value),now(),req.actor.sub);audit(db,req.actor.sub,'PARAMETRO_ACTUALIZADO','PARAMETER',old.key,{from:old.value,to:value,reason:req.body.reason||'Actualización demostrativa'});return db.prepare("SELECT * FROM parameters WHERE key='capacidad.porcentaje_base'").get(); }));
  router.get('/admin/operations', roles('ADMIN_ESSALUD'), (req,res)=>res.json({requests:db.prepare('SELECT * FROM requests ORDER BY created_at DESC').all().map(r=>loan.requestSummary(db,r)),loans:db.prepare('SELECT l.*,w.name worker_name FROM loans l JOIN workers w ON w.id=l.worker_id ORDER BY l.status').all()}));
  router.post('/admin/loans/:id/finalize', roles('ADMIN_ESSALUD'), mutate(req=> { const l=db.prepare('SELECT * FROM loans WHERE id=?').get(req.params.id);if(!l)throw Object.assign(new Error('Préstamo no encontrado.'),{status:404});if(l.status!=='VIGENTE')throw Object.assign(new Error('Solo un préstamo vigente puede finalizarse.'),{status:409});db.prepare("UPDATE loans SET status='FINALIZADO',ended_at=? WHERE id=?").run(now(),l.id);audit(db,req.actor.sub,'PRESTAMO_FINALIZADO','LOAN',l.id,{});return {...l,status:'FINALIZADO'}; }));
  router.get('/admin/audit', roles('ADMIN_ESSALUD'), (req,res)=>res.json({items:db.prepare('SELECT a.*,u.name actor_name FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY created_at DESC LIMIT 50').all()}));
  return router;
}
function publicApi(db) { const router=express.Router(); router.get('/config',(req,res)=>res.json({demoMode:process.env.DEMO_MODE!=='false'})); router.use('/certificates/:code',(req,res,next)=>{res.set('Cache-Control','no-store');next();}); router.get('/certificates/:code', mutate(async req=>{const baseUrl=publicAppUrl();const registration=await requestCertificate.publicRecord(db,req.params.code,baseUrl);if(registration)return registration;const authorization=await loan.certificate(db,req.params.code,baseUrl);if(authorization)return authorization;const capacity=await capacityCertificate.publicRecord(db,req.params.code,baseUrl);if(capacity)return capacity;throw Object.assign(new Error('Constancia no encontrada.'),{status:404});})); return router; }
module.exports = { api, publicApi };
