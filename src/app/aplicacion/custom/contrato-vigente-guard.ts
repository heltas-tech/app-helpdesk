// src/app/aplicacion/custom/contrato-vigente-guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AccessControlService } from '../services/access-control.service';
import { map } from 'rxjs';

export const contratoVigenteGuard: CanActivateFn = (route, state) => {
  const accessControl = inject(AccessControlService);
  const router = inject(Router);

  return accessControl.checkAccess().pipe(
    map(access => {
      if (access.hasAccess) {
        return true;
      } else {
        router.navigate(['/acceso-denegado']);
        return false;
      }
    })
  );
};