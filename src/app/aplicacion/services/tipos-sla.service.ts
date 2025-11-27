import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TiposSlaInterface } from '../interfaces/tipos-sla';

@Injectable({ providedIn: 'root' })
export class TiposSlaService {
  private apiUrl = `${environment.apiAuthUrl}/tipos-sla`;

  constructor(private http: HttpClient) {}

  /** Listar todos los tipos SLA activos */
  lista(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  /** Listar todos los tipos SLA (incluye inactivos) */
  listaCompleta(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/all`);
  }

  /** Listar tipos SLA eliminados */
  listaEliminados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/deleted`);
  }

  /** Obtener tipo SLA por ID */
  obtenerPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  /** Crear tipo SLA */
  crear(tipoSla: TiposSlaInterface): Observable<any> {
    return this.http.post<any>(this.apiUrl, tipoSla);
  }

  /** Actualizar tipo SLA */
  actualizar(id: number, tipoSla: TiposSlaInterface): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, tipoSla);
  }

  /** Eliminar tipo SLA (soft delete) */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Restaurar tipo SLA eliminado */
  restaurar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/restore`, {});
  }

  /** Cambiar estado del tipo SLA */
  cambiarEstado(id: number, activo: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/estado`, { activo });
  }
}