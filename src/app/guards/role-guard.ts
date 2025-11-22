import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Acceso } from '../aplicacion/services/acceso';

export const roleGuard: CanActivateFn = (route, state) => {
  const acceso = inject(Acceso);
  const router = inject(Router);

  const usuario = acceso.obtenerUsuario() as { rol: string, [key: string]: any };
  const rolPermitido = route.data['rol'] as string;

  if (!usuario) {
    router.navigate(['/login']);
    return false;
  }

  if (rolPermitido && usuario.rol !== rolPermitido) {
    switch (usuario.rol) {
      case 'ADMINISTRADOR': router.navigate(['/admin/inicio']); break;
      case 'TECNICO': router.navigate(['/tecnico/inicio']); break;
      case 'CLIENTE': router.navigate(['/cliente/inicio']); break;
      default: router.navigate(['/login']); break;
    }
    return false;
  }

  return true;
};
