import { Routes } from '@angular/router';
import { RoleGuard } from './role.guard'; // Asegúrate de la ruta correcta


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login.component').then(m => m.LoginComponent)
  },

  // Home / cliente
  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.component').then(m => m.HomeComponent),
    canActivate: [RoleGuard],
    data: { rol: 'CLIENTE' }
  },

  // Admin
  {
    path: 'admin',
    loadComponent: () =>
      import('./admin/admin.component').then(m => m.AdminComponent),
    canActivate: [RoleGuard],
    data: { rol: 'ADMINISTRADOR' }
  },

  // Técnico
  {
    path: 'tecnico',
    loadComponent: () =>
      import('./tecnico/tecnico.component').then(m => m.TecnicoDashboardComponent),
    canActivate: [RoleGuard],
    data: { rol: 'TECNICO' }
  },

  { path: '**', redirectTo: 'login' }
];
