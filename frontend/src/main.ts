import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent, routes } from './app/app.component';
import { authInterceptor } from './app/core/api.service';
bootstrapApplication(AppComponent,{providers:[provideHttpClient(withInterceptors([authInterceptor])),provideRouter(routes)]}).catch(console.error);
