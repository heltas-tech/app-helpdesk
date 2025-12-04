import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  NotificacionSistema, 
  CreateNotificacionSistema, 
  UpdateNotificacionSistema,
  NotificacionResponse,
  NotificacionesPaginadas,
  ContadorNotificaciones 
} from '../interfaces/notificacion-sistema.interface';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesSistemaService {
  private apiUrl = `${environment.apiUrl}/notificaciones-sistema`;

  constructor(private http: HttpClient) {}

  // OBTENER MIS NOTIFICACIONES
  obtenerMisNotificaciones(pagina: number = 1, limite: number = 20): Observable<NotificacionesPaginadas> {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('limite', limite.toString());

    console.log('🔍 [SERVICE] Obteniendo mis notificaciones...');
    return this.http.get<NotificacionesPaginadas>(`${this.apiUrl}/mis-notificaciones`, { params });
  }

  // OBTENER CONTADOR DE NO LEÍDAS
  obtenerContador(): Observable<ContadorNotificaciones> {
    return this.http.get<ContadorNotificaciones>(`${this.apiUrl}/contador`);
  }

  // CREAR NOTIFICACIÓN
  crearNotificacion(data: CreateNotificacionSistema): Observable<NotificacionSistema> {
    return this.http.post<NotificacionSistema>(this.apiUrl, data);
  }

  // MARCAR COMO LEÍDA
  marcarComoLeida(id: number): Observable<NotificacionSistema> {
    return this.http.patch<NotificacionSistema>(`${this.apiUrl}/${id}/leer`, {});
  }

  // MARCAR TODAS COMO LEÍDAS
  marcarTodasComoLeidas(): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/leer-todas`, {});
  }

  // ELIMINAR NOTIFICACIÓN
  eliminarNotificacion(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  // 🔍 MÉTODO: DIAGNÓSTICO DE FILTRADO
  obtenerDiagnosticoFiltrado(): Observable<any> {
    console.log('🔍 [SERVICE] Solicitando diagnóstico de filtrado...');
    return this.http.get<any>(`${this.apiUrl}/diagnostico-filtrado`);
  }

  // 🔍 NUEVO MÉTODO: VERIFICACIÓN DIRECTA DE BD
  verificarBaseDatos(): Observable<any> {
    console.log('🔍 [SERVICE] Solicitando verificación directa de BD...');
    return this.http.get<any>(`${this.apiUrl}/verificar-bd`);
  }
}