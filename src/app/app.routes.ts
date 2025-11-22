import { Routes } from '@angular/router';
import { authGuard } from './aplicacion/custom/auth-guard';
import { Login } from './aplicacion/seguridad/login/login';
import { Registro } from './aplicacion/seguridad/registro/registro';
import { CambioContrasenaObligatorioComponent } from './aplicacion/seguridad/cambio-contrasena-obligatorio/cambio-contrasena-obligatorio';
import { RestablecerContrasenaComponent } from './aplicacion/seguridad/restablecer-contrasena/restablecer-contrasena';

export const routes: Routes = [
  { 
    path: 'login', 
    component: Login 
  },
  { 
    path: 'registro', 
    component: Registro 
  },
  { 
    path: 'auth/cambio-contrasena-obligatorio', 
    component: CambioContrasenaObligatorioComponent 
  },
  { 
    path: 'auth/restablecer-contrasena', 
    component: RestablecerContrasenaComponent 
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./aplicacion/paginas/paginas.route')
  },
  // Redirección para rutas incorrectas
  { path: 'paginas', redirectTo: '/', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' }
];