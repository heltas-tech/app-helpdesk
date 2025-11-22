// Crear en: src/app/aplicacion/services/access-control.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccessControlService {
  private baseUrl: string = environment.apiAuthUrl;

  constructor(private http: HttpClient) {}

  // Verificar acceso al sistema
  checkAccess(): Observable<{hasAccess: boolean, rol: string}> {
    return this.http.get<any>(`${this.baseUrl}/auth/check-access`).pipe(
      map(response => ({
        hasAccess: response.data?.hasAccess || false,
        rol: response.data?.rol || 'CLIENTE'
      }))
    );
  }
}