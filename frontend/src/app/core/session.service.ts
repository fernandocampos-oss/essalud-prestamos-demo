import { Injectable, signal } from '@angular/core';
import { User } from './api.service';
@Injectable({providedIn:'root'}) export class Session {
  user=signal<User|null>(this.read());
  set(result:any){sessionStorage.setItem('demo_token',result.token);sessionStorage.setItem('demo_user',JSON.stringify(result.user));this.user.set(result.user);}
  clear(){sessionStorage.clear();this.user.set(null);}
  private read(){try{return JSON.parse(sessionStorage.getItem('demo_user')||'null')}catch{return null}}
}
