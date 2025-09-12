import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),   // Conecta las rutas definidas en app.routes.ts
    provideHttpClient()      // Permite usar HttpClient para llamadas al backend
  ]
}).catch(err => console.error(err));
