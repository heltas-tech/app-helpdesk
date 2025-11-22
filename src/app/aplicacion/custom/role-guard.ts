// src/app/aplicacion/custom/role-guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Acceso } from '../services/acceso';

export const roleGuard: CanActivateFn = (route, state) => {
  const acceso = inject(Acceso);
  const router = inject(Router);

  const usuario = acceso.obtenerUsuario();
  const rolRequerido = route.data?.['rol'];

  console.log('🔍 ROLE GUARD: Usuario:', usuario?.rol, 'Rol requerido:', rolRequerido);

  if (!usuario) {
    console.log('🔍 ROLE GUARD: No hay usuario, redirigiendo a login');
    router.navigate(['/login']);
    return false;
  }

  if (rolRequerido && usuario.rol !== rolRequerido) {
    console.log('🔍 ROLE GUARD: Rol no coincide, redirigiendo según rol actual:', usuario.rol);
    
    // Redirigir según el rol actual del usuario - USANDO TUS RUTAS EXISTENTES
    switch (usuario.rol) {
      case 'ADMINISTRADOR':
        router.navigate(['/admin/dashboard']);
        break;
      case 'TECNICO':
        router.navigate(['/tecnico/inicio']);
        break;
      case 'CLIENTE':
        router.navigate(['/cliente/inicio']);
        break;
      default:
        router.navigate(['/login']);
        break;
    }
    return false;
  }

  console.log('🔍 ROLE GUARD: Acceso permitido');
  return true;
};