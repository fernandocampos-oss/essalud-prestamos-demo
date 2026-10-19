const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const appRoot = path.join(__dirname, '..', 'src', 'app');
const source = fs.readFileSync(path.join(appRoot, 'app.component.ts'), 'utf8');
const template = fs.readFileSync(path.join(appRoot, 'app.component.html'), 'utf8');
const formStyles = fs.readFileSync(path.join(appRoot, 'worker-loans-form.css'), 'utf8');
const requestStyles = fs.readFileSync(path.join(appRoot, 'worker-loans-requests.css'), 'utf8');
const detailStyles = fs.readFileSync(path.join(appRoot, 'worker-loans-details.css'), 'utf8');
const apiSource = fs.readFileSync(path.join(appRoot, 'core', 'api.service.ts'), 'utf8');

test('la autenticación no genera una confirmación de operación', () => {
  assert.doesNotMatch(source, /Operación registrada correctamente/);
  assert.match(source, /if\(message\)this\.showNotice\(message,targetPath\)/);
  assert.match(source, /createRequest\(\).*La solicitud fue registrada y enviada a la entidad financiera/);
});

test('la confirmación de solicitud es temporal, cerrable y solo se emite tras la respuesta exitosa', () => {
  assert.match(source, /if\(message\)this\.showNotice\(message,targetPath\)/);
  assert.match(source, /noticeRoute\(\)!==nextPath\)this\.clearNotice\(\)/);
  assert.match(template, /aria-label="Cerrar notificación"/);
  assert.match(template, /\(click\)="clearNotice\(\)"/);
});

test('la nueva solicitud consulta el estado vigente y conserva una ruta funcional', () => {
  assert.match(source, /loadRequestForm\(\).*\/banks.*\/worker\/overview/s);
  assert.match(template, /data\(\)\.capacity\.availableCentimos/);
  assert.match(template, /Tu capacidad disponible/);
  assert.match(template, /Solicitudes habilitadas/);
  assert.match(template, /data\(\)\.capacity\.allowsNewRequests/);
  assert.match(template, /nav\('\/prestamos\/solicitudes\/nueva'\)/);
  assert.match(template, /data\(\)\.activeRequest.*Ver mi solicitud/s);
  assert.match(template, /\*ngFor="let type of data\(\)\.allowedTypes"/);
});

test('la solicitud muestra estados de carga y error de la misma consulta de capacidad', () => {
  assert.match(source, /requestFormLoading=signal\(false\)/);
  assert.match(source, /requestFormError=signal\(''\)/);
  assert.match(template, /Consultando información de la solicitud/);
  assert.match(template, /No se pudo cargar la solicitud/);
  assert.match(template, /loadRequestForm\(\)/);
  assert.match(template, /no corresponde al monto total del préstamo ni implica una aprobación/);
});

test('el formulario exige una entidad financiera y comunica la exclusividad antes de registrar', () => {
  assert.match(source, /requestFormSubmitted=true;if\(!this\.selectedBank\)return/);
  assert.match(template, /Seleccione una entidad financiera/);
  assert.match(template, /loan-exclusivity-alert/);
  assert.match(template, /no podrá presentar otra ante una entidad financiera diferente/);
});

test('los selectores comparten un control accesible y una flecha institucional', () => {
  assert.equal((template.match(/loan-select-wrap/g) || []).length, 2);
  assert.match(template, /aria-invalid/);
  assert.match(formStyles, /appearance: none/);
  assert.match(formStyles, /\.loan-select-wrap svg/);
  assert.match(formStyles, /select:focus-visible/);
});

test('el seguimiento ofrece detalle, confirmación de cancelación y PDF solo para una autorización', () => {
  assert.match(template, /nav\('\/prestamos\/mis-solicitudes\/'\+r\.id\)/);
  assert.match(template, /¿Desea cancelar esta solicitud\?/);
  assert.match(template, /Confirmar cancelación/);
  assert.match(source, /certificateAvailable\(request:any\)/);
  assert.match(template, /certificateAvailable\(data\(\)\.request\)/);
  assert.match(template, /Descargar constancia PDF/);
  assert.match(source, /getFile\(`\/worker\/requests\/\$\{r\.id\}\/constancia\.pdf`\)/);
});

test('el seguimiento conserva una tarjeta de tres zonas sin cuadrículas heredadas del detalle', () => {
  assert.match(template, /loan-request-card-header[\s\S]*operationLabel\(r\.type\)[\s\S]*r\.bankName[\s\S]*workerStatusLabel\(r\.status\)/);
  assert.match(template, /loan-request-facts[\s\S]*Período[\s\S]*Capacidad mensual registrada[\s\S]*Registro/);
  assert.match(template, /loan-request-actions[\s\S]*class="primary"[\s\S]*Cancelar solicitud/);
  assert.match(template, /Cancelada por el trabajador\. Esta solicitud ya no se encuentra en evaluación\./);
  assert.match(requestStyles, /\.loan-request-facts\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(requestStyles, /\.loan-request-actions\s*\{[\s\S]*justify-content:\s*flex-end/);
  assert.doesNotMatch(detailStyles, /\.loan-request-card/);
});

test('la constancia informativa de capacidad se descarga fuera de las solicitudes y usa la verificación pública', () => {
  assert.match(source, /downloadCapacityCertificate\(\)/);
  assert.match(source, /\/worker\/capacity-certificates/);
  assert.match(template, /Descargar constancia de capacidad/);
  assert.match(template, /Consultar mi capacidad/);
  assert.match(template, /documentType==='CAPACIDAD_MENSUAL'/);
  assert.match(template, /Constancia informativa de capacidad mensual/);
  assert.doesNotMatch(template, /Solicitud<\/dt><dd>\{\{r\.id\}\}/);
});

test('las mutaciones de solicitud y constancia usan el generador central de idempotencia compatible con HTTP', () => {
  assert.match(apiSource, /idempotencyHeaders\(idempotent,idempotencyKey\)/);
  assert.doesNotMatch(apiSource, /crypto\.randomUUID/);
  assert.match(source, /createRequest\(\).*\/worker\/requests.*true/s);
  assert.match(source, /downloadCapacityCertificate\(\).*\/worker\/capacity-certificates.*,\{\},true/s);
});


test('constancia de solicitud: una acción en detalle, carga independiente y verificación diferenciada', () => {
  assert.equal((template.match(/Descargar constancia de solicitud/g)||[]).length,1);
  assert.match(template,/Información de la solicitud[\s\S]*downloadRegistrationCertificate/);
  assert.match(template,/\[disabled\]="registrationBusy\(\)"/);
  assert.match(template,/aria-describedby="registration-scope"/);
  assert.match(template,/registrationError\(\)" role="alert"/);
  assert.match(template,/documentType==='REGISTRO_SOLICITUD'/);
  assert.match(template,/data\(\)\.current_status_label/);
  assert.match(source,/if\(this.registrationBusy\(\)\)return/);
  assert.match(source,/registration-certificate`,\{\},true/);
  assert.match(source,/Código inexistente/);
});

test('el portal bancario usa rutas propias, filtros operativos y una vista de evaluación', () => {
  assert.match(source, /brandDestination\(\).*role\?\.includes\('BANCO'\)\?'\/prestamos\/banco'/s);
  assert.match(source, /p\.startsWith\('\/prestamos\/banco\/solicitudes\/'\).*\/bank\/requests/s);
  assert.match(source, /loadBankInbox\(page=1\).*URLSearchParams/s);
  assert.match(source, /query\.set\('q'/);
  assert.match(source, /query\.set\('status'/);
  assert.match(source, /query\.set\('type'/);
  assert.match(source, /query\.set\('periodId'/);
  assert.match(source, /openBankRequest\(request:any\).*\/prestamos\/banco\/solicitudes/s);
  assert.match(template, /Resumen operativo/);
  assert.match(template, /Buscar solicitudes/);
  assert.match(template, /bank-request-table/);
  assert.match(template, /Información del trabajador/);
  assert.match(template, /Capacidad registrada/);
  assert.match(template, /Historial de movimientos/);
  assert.match(template, /Portal de entidades financieras/);
  assert.match(template, /Código, trabajador o documento/);
  assert.match(template, /Evaluación de solicitud/);
  assert.match(template, /Emitir propuesta/);
  assert.match(template, /Rechazar solicitud/);
  assert.doesNotMatch(template, /La bandeja está aislada por organización en el backend/);
});

test('SAP Web consulta el detalle individual y presenta planilla por período', () => {
  assert.match(source, /p\.startsWith\('\/sap-web\/personal\/'\).*loadSapWorker\(\)/s);
  assert.match(source, /loadSapWorker\(periodId=''.*\/sap\/workers\/\$\{id\}/s);
  assert.match(source, /loadSapWorkers\(page=1\).*pageSize/s);
  assert.match(template, /Consulta de personal y planilla/);
  assert.match(template, /Consultar planilla/);
  assert.match(template, /No se dispone de información de planilla para el período seleccionado/);
  assert.match(template, /Capacidad mensual disponible/);
  assert.match(template, /Conceptos de planilla/);
  assert.match(template, /Préstamos asociados/);
});
