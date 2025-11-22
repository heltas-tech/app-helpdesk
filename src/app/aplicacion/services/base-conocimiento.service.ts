import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  BaseConocimientoResponse, 
  CreateBaseConocimiento, 
  UpdateBaseConocimiento 
} from '../interfaces/base-conocimiento.interface';

@Injectable({ providedIn: 'root' })
export class BaseConocimientoService {
  private apiUrl = `${environment.apiAuthUrl}/base-conocimiento`;

  constructor(private http: HttpClient) {}

  /** Listar todas las bases de conocimiento (activas y eliminadas) */
  getAll(): Observable<BaseConocimientoResponse> {
    return this.http.get<BaseConocimientoResponse>(this.apiUrl);
  }

  /** Obtener base por ID */
  getById(id: number): Observable<BaseConocimientoResponse> {
    return this.http.get<BaseConocimientoResponse>(`${this.apiUrl}/${id}`);
  }

  /** Crear nueva base de conocimiento */
  create(base: CreateBaseConocimiento): Observable<BaseConocimientoResponse> {
    return this.http.post<BaseConocimientoResponse>(this.apiUrl, base);
  }

  /** Crear desde ticket */
  createFromTicket(ticketId: number): Observable<BaseConocimientoResponse> {
    return this.http.post<BaseConocimientoResponse>(`${this.apiUrl}/from-ticket/${ticketId}`, {});
  }

  /** Actualizar base de conocimiento */
  update(id: number, base: UpdateBaseConocimiento): Observable<BaseConocimientoResponse> {
    return this.http.patch<BaseConocimientoResponse>(`${this.apiUrl}/${id}`, base);
  }

  /** Eliminar (soft delete) */
  delete(id: number): Observable<BaseConocimientoResponse> {
    return this.http.delete<BaseConocimientoResponse>(`${this.apiUrl}/${id}`);
  }

  /** Reactivar base eliminada */
  restore(id: number): Observable<BaseConocimientoResponse> {
    return this.http.patch<BaseConocimientoResponse>(`${this.apiUrl}/restore/${id}`, {});
  }
  
  /** Votar por un artículo */
  votar(id: number, util: boolean): Observable<BaseConocimientoResponse> {
    const params = new HttpParams().set('util', util.toString());
    return this.http.post<BaseConocimientoResponse>(`${this.apiUrl}/${id}/votar`, {}, { params });
  }

  /** Obtener artículos populares (más útiles) - Método auxiliar */
  obtenerPopulares(): Observable<BaseConocimientoResponse> {
    return this.http.get<BaseConocimientoResponse>(this.apiUrl);
  }
}