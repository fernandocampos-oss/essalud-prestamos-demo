import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, Routes } from '@angular/router';
import { filter, forkJoin, switchMap, finalize } from 'rxjs';
import { Api } from './core/api.service';
import { Session } from './core/session.service';
import { SomosDashboardComponent } from './features/somos/somos-dashboard.component';
import { DemoHomeComponent } from './features/demo/demo-home.component';

@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule,SomosDashboardComponent,DemoHomeComponent],templateUrl:'./app.component.html',styleUrls:['./app.component.css','./somos-login.css','./worker-loans-shell.css','./worker-loans-overview.css','./worker-loans-details.css','./worker-loans-form.css','./worker-loans-requests.css','./worker-loans-verification.css']})
export class AppComponent implements OnInit {
  api=inject(Api); session=inject(Session); router=inject(Router);
  path=signal(location.pathname); data=signal<any>(null); error=signal(''); verificationError=signal(''); notice=signal(''); noticeRoute=signal<string|null>(null); loading=signal(false); requestFormLoading=signal(false); requestFormError=signal(''); demoMode=signal(false); configLoaded=signal(false); cancellationRequest:any=null;
  registrationBusy=signal(false); registrationError=signal('');
  username=''; password=''; somosDocument=''; somosPassword=''; somosPasswordVisible=false; somosDocumentFocused=false; somosPasswordFocused=false; somosDocumentTouched=false; somosPasswordTouched=false; somosSubmitted=false; somosNotice=''; selectedBank=''; requestFormSubmitted=false; requestType='NUEVO'; search=''; proposal={amount:4500,term:18,rate:14.5,payment:210}; capacityValue=35; reason='';
  ngOnInit(){this.router.events.pipe(filter(e=>e instanceof NavigationEnd)).subscribe(()=>{const nextPath=location.pathname;if(this.notice()&&this.noticeRoute()!==nextPath)this.clearNotice();this.path.set(nextPath);this.load();});this.loadConfig();this.load();}
  nav(path:string){this.router.navigateByUrl(path);}
  home(){const r=this.session.user()?.role; return r==='TRABAJADOR'?'/somos/portal':r?.includes('BANCO')?'/prestamos/banco':r==='CONSULTA_PLANILLA'?'/sap-web':'/prestamos/admin';}
  login(){this.submit('/auth/login',{username:this.username,password:this.password},false,(r:any)=>{this.session.set(r);this.nav(this.home());});}
  demo(profile:string){if(!this.demoMode())return;this.submit('/demo/access',{profile},false,(r:any)=>{this.session.set(r);this.nav(profile==='trabajador'?'/somos/login':this.home());});}
  somosLogin(){this.somosSubmitted=true;if(this.session.user()?.role==='TRABAJADOR'){this.nav('/somos/portal');return;}if(this.somosInvalid('document')||this.somosInvalid('password'))return;this.submit('/auth/login',{username:this.somosDocument,password:this.somosPassword},false,(r:any)=>{this.session.set(r);this.nav('/somos/portal');});}
  toggleSomosPassword(){this.somosPasswordVisible=!this.somosPasswordVisible;}
  somosInvalid(field:'document'|'password'){const value=field==='document'?this.somosDocument:this.somosPassword;const touched=field==='document'?this.somosDocumentTouched:this.somosPasswordTouched;return (this.somosSubmitted||touched)&&!value.trim();}
  showSomosNotice(action:'recovery'|'registration'){this.somosNotice=action==='recovery'?'La recuperación de contraseña no está disponible en este entorno de demostración.':'El registro no está disponible en este entorno de demostración.';}
  logout(){this.session.clear();this.nav(this.demoMode()?'/':'/login');}
  loadConfig(){this.api.public<{demoMode:boolean}>('/config').subscribe({next:c=>{this.demoMode.set(c.demoMode);this.configLoaded.set(true);if(!c.demoMode&&['/','/demo/access'].includes(this.path()))this.nav('/login');},error:()=>this.configLoaded.set(true)});}
  load(){this.registrationError.set('');this.error.set(''); const p=this.path(); if(p==='/'||p==='/login'||p==='/dev/ui')return; if(p==='/somos'){this.nav('/somos/login');return;} if(p==='/somos/login'){return;} if(p==='/demo/access'){if(this.configLoaded()&&!this.demoMode())this.nav('/login');return;} if(p.startsWith('/prestamos/verificar/')) return this.getPublic(p.split('/').pop()!); if(!this.session.user()){this.nav('/login');return;} if(p.startsWith('/sap-web/personal'))this.get('/sap/workers'); else if(p.startsWith('/sap-web'))this.get('/sap/workers'); else if(p==='/prestamos/banco')this.get('/bank/requests'); else if(p.startsWith('/prestamos/admin/periodos'))this.get('/admin/periods'); else if(p.startsWith('/prestamos/admin/parametros'))this.get('/admin/parameters'); else if(p.startsWith('/prestamos/admin/operaciones'))this.get('/admin/operations'); else if(p.startsWith('/prestamos/admin/audit'))this.get('/admin/audit'); else if(p.startsWith('/prestamos/admin'))this.get('/admin/dashboard'); else if(p==='/prestamos/solicitudes/nueva')this.loadRequestForm(); else if(p==='/prestamos/mis-constancias')this.get('/worker/certificates'); else if(p.startsWith('/prestamos/mis-solicitudes/'))this.get(`/worker/requests/${p.split('/').pop()}`); else if(p==='/prestamos/mis-solicitudes')this.get('/worker/requests'); else this.get('/worker/overview'); }
  get(url:string){this.loading.set(true);this.api.get<any>(url).subscribe({next:d=>{this.data.set(d);this.loading.set(false); if(url==='/worker/overview'){this.requestType=d.allowedTypes[0];} if(url==='/admin/parameters')this.capacityValue=Math.round(Number(d.items[0].value)*100);},error:e=>{this.error.set(e.message);this.loading.set(false);}});}
  loadRequestForm(){this.data.set(null);this.requestFormError.set('');this.requestFormLoading.set(true);forkJoin({banks:this.api.get<any>('/banks'),overview:this.api.get<any>('/worker/overview')}).subscribe({next:result=>{this.data.set({...result.banks,...result.overview});this.selectedBank='';this.requestFormSubmitted=false;this.requestType=result.overview.allowedTypes[0]||'NUEVO';this.requestFormLoading.set(false);},error:()=>{this.requestFormError.set('No fue posible consultar su capacidad ni las entidades financieras disponibles. Verifique su conexión e intente nuevamente.');this.requestFormLoading.set(false);}});}
  getPublic(code:string){this.loading.set(true);this.data.set(null);this.verificationError.set('');this.api.public<any>(`/certificates/${code}`).subscribe({next:d=>{this.data.set(d);this.loading.set(false);},error:e=>{this.verificationError.set(e.status===404?'Código inexistente. No se encontró una constancia con ese código.':'No fue posible conectar con el servicio de verificación. Intente nuevamente.');this.loading.set(false);}});}
  retryVerification(){const code=this.path().split('/').pop();if(code)this.getPublic(code);}
  submit(url:string,body:any,idempotent:boolean,done:(result:any)=>void,message?:string,targetPath=this.path()){this.loading.set(true);this.error.set('');this.api.post<any>(url,body,idempotent).subscribe({next:r=>{this.loading.set(false);if(message)this.showNotice(message,targetPath);done(r);},error:e=>{this.loading.set(false);this.error.set(e.message);}});}
  showNotice(message:string,targetPath=this.path()){this.notice.set(message);this.noticeRoute.set(targetPath);}
  clearNotice(){this.notice.set('');this.noticeRoute.set(null);}
  createRequest(){this.requestFormSubmitted=true;if(!this.selectedBank)return;this.submit('/worker/requests',{bankId:this.selectedBank,type:this.requestType},true,()=>this.nav('/prestamos/mis-solicitudes'),'La solicitud fue registrada y enviada a la entidad financiera.','/prestamos/mis-solicitudes');}
  requestCancellation(r:any){this.cancellationRequest=r;}
  closeCancellation(){this.cancellationRequest=null;}
  cancel(){const request=this.cancellationRequest;if(!request)return;this.submit(`/worker/requests/${request.id}/cancel`,{},true,()=>{this.cancellationRequest=null;this.load();},'La solicitud fue cancelada.');}
  respond(r:any,action:string){this.submit(`/worker/requests/${r.id}/respond`,{action},true,()=>this.load(),action==='ACEPTAR'?'La aceptación de la propuesta fue registrada.':'La propuesta fue rechazada.');}
  downloadRegistrationCertificate(r:any){
    if(this.registrationBusy())return;
    this.registrationBusy.set(true);this.registrationError.set('');
    let publicCode='';
    this.api.post<any>(`/worker/requests/${r.id}/registration-certificate`,{},true).pipe(
      switchMap(record=>{publicCode=record.public_code;return this.api.getFile(`/worker/requests/${r.id}/registration-certificate.pdf`);}),
      finalize(()=>this.registrationBusy.set(false))
    ).subscribe({next:blob=>this.saveFile(blob,`constancia-solicitud-${publicCode}.pdf`),
      error:()=>this.registrationError.set('No fue posible descargar la constancia de solicitud. Verifique su conexión e intente nuevamente.')});
  }
  downloadCertificate(r:any){this.loading.set(true);this.error.set('');this.api.getFile(`/worker/requests/${r.id}/constancia.pdf`).subscribe({next:blob=>{this.saveFile(blob,`constancia-${r.authorization.public_code}.pdf`);this.loading.set(false);},error:e=>{this.error.set(e.message);this.loading.set(false);}});}
  downloadCapacityCertificate(){this.loading.set(true);this.error.set('');this.api.post<any>('/worker/capacity-certificates',{},true).subscribe({next:record=>this.api.getFile(`/worker/capacity-certificates/${record.id}/pdf`).subscribe({next:blob=>{this.saveFile(blob,`constancia-capacidad-${record.public_code}.pdf`);this.loading.set(false);},error:e=>{this.error.set(e.message);this.loading.set(false);}}),error:e=>{this.error.set(e.message);this.loading.set(false);}});}
  saveFile(blob:Blob,name:string){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);}
  take(r:any){this.submit(`/bank/requests/${r.id}/take`,{},true,()=>this.load(),'La solicitud fue asignada.');}
  reject(r:any){this.submit(`/bank/requests/${r.id}/reject`,{reason:this.reason||'Evaluación no favorable'},true,()=>this.load(),'La solicitud fue rechazada.');}
  propose(r:any){this.submit(`/bank/requests/${r.id}/proposal`,{amountCentimos:Math.round(this.proposal.amount*100),termMonths:this.proposal.term,annualRate:this.proposal.rate,paymentCentimos:Math.round(this.proposal.payment*100),notes:'Propuesta demostrativa del banco.'},true,()=>this.load(),'La propuesta fue emitida.');}
  setPeriod(p:any,status:string){this.submit(`/admin/periods/${p.id}/status`,{status},true,()=>this.load(),'El período fue actualizado.');}
  setCapacity(){this.submit('/admin/parameters/capacity',{value:this.capacityValue/100,reason:'Ajuste demostrativo'},true,()=>this.load(),'El parámetro de capacidad fue actualizado.');}
  finish(loan:any){this.submit(`/admin/loans/${loan.id}/finalize`,{},true,()=>this.load(),'El préstamo fue marcado como finalizado.');}
  workers(){this.get(`/sap/workers${this.search?`?q=${encodeURIComponent(this.search)}`:''}`);}
  worker(id:string){this.nav(`/sap-web/personal/${id}`);}
  money(value:number|undefined){return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format((value||0)/100);}
  publicDate(value:string|undefined){if(!value)return 'No determinada';const normalized=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T12:00:00-05:00`:value;return new Intl.DateTimeFormat('es-PE',{day:'numeric',month:'long',year:'numeric',timeZone:'America/Lima'}).format(new Date(normalized));}
  verificationLabel(value:string){return ({VIGENTE:'Registro verificado y vigente',VENCIDA:'Registro verificado, pero vencido',VIGENCIA_NO_DETERMINADA:'Registro verificado; vigencia no determinada',REGISTRO_INVALIDADO:'Registro invalidado'} as Record<string,string>)[value]||'Registro verificado';}
  verificationTone(value:string){return ({VIGENTE:'is-valid',VENCIDA:'is-expired',VIGENCIA_NO_DETERMINADA:'is-unknown',REGISTRO_INVALIDADO:'is-invalid'} as Record<string,string>)[value]||'is-unknown';}
  isPublicVerification(){return this.path().startsWith('/prestamos/verificar/');}
  label(value:string){return value?.replaceAll('_',' ')||'';}
  operationLabel(value:string){return ({NUEVO:'Préstamo nuevo',AMPLIACION:'Ampliación',COMPRA_DEUDA:'Compra de deuda'} as Record<string,string>)[value]||this.label(value);}
  workerStatusLabel(value:string){return ({CREADA:'Pendiente de evaluación',EN_EVALUACION_BANCO:'En evaluación',PROPUESTA_EMITIDA:'Propuesta recibida',ACEPTADA_POR_TRABAJADOR:'Aceptación registrada',AUTORIZADA:'Autorizada',RECHAZADA_POR_BANCO:'No aprobada por la entidad financiera',RECHAZADA_POR_TRABAJADOR:'Propuesta rechazada',CANCELADA_POR_TRABAJADOR:'Solicitud cancelada',ANULADA_POR_ADMINISTRACION:'Solicitud anulada'} as Record<string,string>)[value]||this.label(value);}
  historyLabel(value:string){return ({SOLICITUD_CREADA:'Solicitud registrada',SOLICITUD_CANCELADA:'Solicitud cancelada',SOLICITUD_ASIGNADA:'Solicitud en evaluación',SOLICITUD_RECHAZADA:'Solicitud rechazada',PROPUESTA_EMITIDA:'Propuesta registrada',OPERACION_AUTORIZADA:'Operación autorizada'} as Record<string,string>)[value]||this.label(value);}
  certificateAvailable(request:any){return request?.authorization?.public_code&&request.authorization.status==='VIGENTE'&&request.authorization.certificate_status==='VIGENTE';}
  badge(value:string){return ['AUTORIZADA','VIGENTE','ABIERTO','ACEPTADA'].includes(value)?'good':['RECHAZADA_POR_BANCO','RECHAZADA_POR_TRABAJADOR','CERRADO','CANCELADA_POR_TRABAJADOR'].includes(value)?'bad':'warn';}
  is(path:string){return this.path()===path;}
}
export const routes:Routes=[{path:'**',component:AppComponent}];
