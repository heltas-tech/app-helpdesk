import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SlasService {
  private apiUrl = `${environment.apiAuthUrl}/slas`;

  constructor(private http: HttpClient) {}

  // ================== MÉTODOS GENERALES ==================

  lista(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  disponibles(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/disponibles`);
  }

  crear(sla: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, sla);
  }

  actualizar(id: number, sla: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, sla);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  listaEliminados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/eliminados`);
  }

  restaurar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/restaurar`, {});
  }

  obtenerPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  obtenerCompletoPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // ✅ MÉTODO CORREGIDO: Obtener prioridades de un SLA
  obtenerPrioridadesSLA(slaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${slaId}/prioridades`).pipe(
      catchError(error => {
        console.error('Error al cargar prioridades del SLA:', error);
        
        // Si falla, intentar obtener el SLA completo y extraer prioridades
        return this.http.get<any>(`${this.apiUrl}/${slaId}`).pipe(
          map((res: any) => {
            if (res.isSuccess && res.data) {
              // Extraer prioridades del SLA
              const prioridades = res.data.prioridades || [];
              return {
                isSuccess: true,
                message: 'Prioridades obtenidas del SLA',
                data: prioridades
              };
            }
            return res;
          }),
          catchError(secondError => {
            console.error('Error alternativo también falló:', secondError);
            // Si todo falla, devolver error claro
            return of({
              isSuccess: false,
              message: 'No se pudieron cargar las prioridades',
              data: []
            });
          })
        );
      })
    );
  }

  // ================== MÉTODOS PARA EMPRESAS ==================

  crearParaEmpresa(entidadId: number, sla: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/empresa/${entidadId}`, sla);
  }

  obtenerPorEmpresa(entidadId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/empresa/${entidadId}`);
  }

  obtenerPorContrato(contratoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contrato/${contratoId}`);
  }
}