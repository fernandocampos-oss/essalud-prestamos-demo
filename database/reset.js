const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const root = path.resolve(__dirname, '..');
const configuredPath = process.env.DB_PATH || process.env.DATABASE_PATH;
const file = configuredPath ? path.resolve(root, configuredPath) : path.join(__dirname, 'demo.sqlite');
fs.mkdirSync(path.dirname(file), { recursive: true });
if (fs.existsSync(file)) fs.unlinkSync(file);
const db = new DatabaseSync(file);
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
const now = '2026-10-17T12:00:00.000Z';
const hash = bcrypt.hashSync('Demo2026!', 10);
const add = (sql, rows) => { const stmt = db.prepare(sql); rows.forEach(row => stmt.run(row)); };
add('INSERT INTO organizations VALUES (@id,@name,@type)', [
  { id: 'essalud', name: 'EsSalud Demo', type: 'ESSALUD' },
  { id: 'andino', name: 'Banco de Crédito del Perú (BCP)', type: 'BANCO' },
  { id: 'horizonte', name: 'BBVA Perú', type: 'BANCO' },
  { id: 'pacifico', name: 'Interbank', type: 'BANCO' }
]);
add('INSERT INTO workers VALUES (@id,@code,@name,@group_name,@status)', [
  { id:'andrea',code:'DEM-1001',name:'Andrea Salazar',group_name:'Administrativo',status:'ACTIVO' }, { id:'bruno',code:'DEM-1002',name:'Bruno Cárdenas',group_name:'Asistencial',status:'ACTIVO' },
  { id:'carmen',code:'DEM-1003',name:'Carmen Rivas',group_name:'Administrativo',status:'ACTIVO' }, { id:'diego',code:'DEM-1004',name:'Diego Paredes',group_name:'Asistencial',status:'ACTIVO' },
  { id:'elena',code:'DEM-1005',name:'Elena Torres',group_name:'Administrativo',status:'ACTIVO' }, { id:'fabio',code:'DEM-1006',name:'Fabio Mendoza',group_name:'Técnico',status:'ACTIVO' },
  { id:'gabriela',code:'DEM-1007',name:'Gabriela Núñez',group_name:'Asistencial',status:'ACTIVO' }, { id:'hugo',code:'DEM-1008',name:'Hugo Valdez',group_name:'Técnico',status:'ACTIVO' }, { id:'ines',code:'DEM-1009',name:'Inés Castro',group_name:'Administrativo',status:'ACTIVO' }
]);
add('INSERT INTO periods VALUES (@id,@code,@label,@status,@starts_on,@ends_on)', [
  {id:'oct-2026',code:'2026-10',label:'Octubre 2026',status:'ABIERTO',starts_on:'2026-10-01',ends_on:'2026-10-31'}, {id:'nov-2026',code:'2026-11',label:'Noviembre 2026',status:'RESTRINGIDO',starts_on:'2026-11-01',ends_on:'2026-11-30'}
]);
const payroll = [['andrea',520000,0,62000,38000],['bruno',610000,20000,72000,42000],['carmen',250000,0,72000,118000],['diego',420000,85000,55000,33000],['elena',480000,0,68000,96000],['fabio',460000,0,62000,25000],['gabriela',540000,15000,74000,42000],['hugo',500000,0,65000,38000],['ines',450000,0,56000,40000]];
add('INSERT INTO payroll_snapshots VALUES (@id,@worker_id,@period_id,@gross_centimos,@variable_centimos,@legal_discount_centimos,@other_discount_centimos,@concepts_json)', payroll.map(([worker,gross,variable,legal,other]) => ({ id:`snap-${worker}`,worker_id:worker,period_id:'oct-2026',gross_centimos:gross,variable_centimos:variable,legal_discount_centimos:legal,other_discount_centimos:other,concepts_json:JSON.stringify([{name:'Remuneración base',category:'Ingreso permanente',amount_centimos:gross},{name:'Ingresos variables demostrativos',category:'Ingreso variable',amount_centimos:variable},{name:'Descuentos de ley',category:'Descuento legal',amount_centimos:legal},{name:'Otros descuentos',category:'Descuento adicional',amount_centimos:other}]) })));
db.prepare('INSERT INTO parameters VALUES (?,?,?,?,?)').run('capacidad.porcentaje_base','0.35',1,now,'admin-essalud');
db.prepare('INSERT INTO parameters VALUES (?,?,?,?,?)').run('constancia.capacidad.vigencia_regla','FIN_PERIODO',1,now,'admin-essalud');
const users = [
  ['worker-andrea','andrea.demo','Andrea Salazar','TRABAJADOR',null,'andrea'], ['worker-bruno','bruno.demo','Bruno Cárdenas','TRABAJADOR',null,'bruno'], ['worker-carmen','carmen.demo','Carmen Rivas','TRABAJADOR',null,'carmen'], ['worker-diego','diego.demo','Diego Paredes','TRABAJADOR',null,'diego'], ['worker-elena','elena.demo','Elena Torres','TRABAJADOR',null,'elena'], ['worker-fabio','fabio.demo','Fabio Mendoza','TRABAJADOR',null,'fabio'], ['worker-gabriela','gabriela.demo','Gabriela Núñez','TRABAJADOR',null,'gabriela'], ['worker-hugo','hugo.demo','Hugo Valdez','TRABAJADOR',null,'hugo'], ['worker-ines','ines.demo','Inés Castro','TRABAJADOR',null,'ines'],
  ['admin-essalud','admin.essalud','Marina Ponce','ADMIN_ESSALUD','essalud',null], ['analyst-andino','analista.bcp','Luis Vega','ANALISTA_BANCO','andino',null], ['admin-andino','admin.bcp','Rosa Marín','ADMIN_BANCO','andino',null], ['analyst-horizonte','analista.bbva','Nora Gil','ANALISTA_BANCO','horizonte',null], ['analyst-pacifico','analista.interbank','Carlos Mena','ANALISTA_BANCO','pacifico',null], ['sap-operator','sap.demo','Samuel Ríos','CONSULTA_PLANILLA','essalud',null]
];
add('INSERT INTO users VALUES (@id,@username,@password_hash,@name,@role,@organization_id,@worker_id,1)', users.map(([id,username,name,role,organization_id,worker_id])=>({id,username,password_hash:hash,name,role,organization_id,worker_id})));
add('INSERT INTO loans VALUES (@id,@worker_id,@request_id,@status,@monthly_payment_centimos,@label,@ended_at)', [
  {id:'loan-bruno',worker_id:'bruno',request_id:null,status:'VIGENTE',monthly_payment_centimos:85000,label:'Préstamo vigente demostrativo',ended_at:null}, {id:'loan-fabio',worker_id:'fabio',request_id:null,status:'FINALIZADO',monthly_payment_centimos:60000,label:'Finalizado pendiente de cierre administrativo',ended_at:'2026-10-12'}
]);
const capacity = (gross,variable,legal,other) => Math.max(0, Math.floor((gross + variable - legal - other) * .35));
const reqs = [
  ['req-activa','ines','andino','NUEVO','CREADA',capacity(...payroll[8].slice(1)),'Solicitud activa para demostrar bandeja'], ['req-rechazada','elena','horizonte','NUEVO','RECHAZADA_POR_BANCO',capacity(...payroll[4].slice(1)),'Información incompleta'],
  ['req-propuesta','diego','andino','NUEVO','PROPUESTA_EMITIDA',capacity(...payroll[3].slice(1)),'Propuesta pendiente'], ['req-autorizada','gabriela','andino','AMPLIACION','AUTORIZADA',capacity(...payroll[6].slice(1)),'Operación autorizada'], ['req-compra','hugo','horizonte','COMPRA_DEUDA','EN_EVALUACION_BANCO',capacity(...payroll[7].slice(1)),'Compra de deuda representativa']
];
add('INSERT INTO requests VALUES (@id,@worker_id,@bank_id,@type,@status,@blocking,@assessment_centimos,@period_id,@assigned_to,@version,@created_at,@reason)', reqs.map(([id,worker,bank,type,status,assessment,reason])=>({id,worker_id:worker,bank_id:bank,type,status,blocking:['RECHAZADA_POR_BANCO'].includes(status)?0:1,assessment_centimos:assessment,period_id:'oct-2026',assigned_to: status === 'CREADA' ? null : 'analyst-andino',version:1,created_at:now,reason})));
add('INSERT INTO proposals VALUES (@id,@request_id,@amount_centimos,@term_months,@annual_rate,@payment_centimos,@notes,@status,@version,@created_at)', [
  {id:'proposal-diego',request_id:'req-propuesta',amount_centimos:420000,term_months:18,annual_rate:'14.50',payment_centimos:160000,notes:'Oferta demostrativa que excede la capacidad actual.',status:'EMITIDA',version:1,created_at:now}
]);
db.prepare('INSERT INTO authorizations VALUES (?,?,?,?,?,?)').run('auth-gabriela','req-autorizada',capacity(...payroll[6].slice(1)),28000,'VIGENTE',now);
db.prepare('INSERT INTO certificates VALUES (?,?,?,?,?,?)').run('cert-gabriela','auth-gabriela','DEMO-8K4Z-Q2M7','VIGENTE',now,'2026-10-31');
db.close();
console.log(`Base demo restaurada: ${file}`);
