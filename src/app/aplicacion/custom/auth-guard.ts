import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const token = localStorage.getItem("token") || "";
  const router = inject(Router);

  // ✅ DEFINIR RUTAS PÚBLICAS (no requieren token)
  const publicRoutes = [
    '/login',
    '/registro', 
    '/auth/cambio-contrasena-obligatorio',
    '/auth/restablecer-contrasena'
  ];

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.includes(state.url)) {
    console.log('🔓 AUTH GUARD: Ruta pública, acceso permitido:', state.url);
    return true;
  }

  // Para rutas protegidas, verificar token
  if (token !== "") {
    console.log('🔐 AUTH GUARD: Token válido, acceso permitido');
    return true;
  } else {
    console.log('🔍 AUTH GUARD: No hay token, redirigiendo a login');
    router.navigateByUrl("/login");
    return false;
  }
};