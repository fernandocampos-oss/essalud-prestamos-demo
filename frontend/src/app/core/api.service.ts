import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export type User={id:string;name:string;username:string;role:string;organizationId?:string;workerId?:string};
export const authInterceptor:HttpInterceptorFn=(req,next)=>{const token=sessionStorage.getItem('demo_token');return next(token?req.clone({setHeaders:{Authorization:`Bearer ${token}`}}):req);};
@Injectable({providedIn:'root'})
export class Api {
  private http=inject(HttpClient); private router=inject(Router);
  get<T>(url:string){return this.http.get<T>(`/api${url}`).pipe(catchError(e=>this.handle(e)));}
  getFile(url:string){return this.http.get(`/api${url}`,{responseType:'blob'}).pipe(catchError(e=>this.handle(e)));}
  post<T>(url:string,body:unknown, idempotent=false){const headers:Record<string,string>=idempotent?{'Idempotency-Key':crypto.randomUUID()}:{};return this.http.post<T>(`/api${url}`,body,{headers}).pipe(catchError(e=>this.handle(e)));}
  public<T>(url:string){return this.http.get<T>(`/api/public${url}`).pipe(catchError(e=>this.handle(e)));}
  private handle(e:any){if(e.status===401){sessionStorage.removeItem('demo_token');sessionStorage.removeItem('demo_user');this.router.navigateByUrl('/login');}return throwError(()=>new Error(e.error?.message||'No fue posible completar la operación.'));}
}
