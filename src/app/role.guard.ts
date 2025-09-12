import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth/auth.service';


@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const rolPermitido = route.data['rol']; // rol que permite la ruta
    const rolUsuario = this.auth.getRole(); // rol del usuario actual

    if (rolUsuario === rolPermitido) {
      return true; // puede acceder
    }

    // si no tiene permiso, redirige al login
    this.router.navigate(['/login']);
    return false;
  }
}
