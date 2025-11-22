// src/app/services/ticket-history.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, LogTicket } from '../interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketHistoryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiAuthUrl}/historial-tickets`;

  /** Obtener todos los logs de un ticket */
  getHistorialByTicketId(ticketId: number): Observable<ApiResponse<LogTicket[]>> {
    // NOTA: Necesitamos crear este endpoint en el backend
    // Por ahora usamos el endpoint general y filtramos
    return this.http.get<ApiResponse<LogTicket[]>>(this.apiUrl);
  }

  /** Obtener log por ID */
  getLogById(id: number): Observable<ApiResponse<LogTicket>> {
    return this.http.get<ApiResponse<LogTicket>>(`${this.apiUrl}/${id}`);
  }

  /** Crear nuevo log */
  createLog(log: any): Observable<ApiResponse<LogTicket>> {
    return this.http.post<ApiResponse<LogTicket>>(this.apiUrl, log);
  }

  /** Crear log de cambio de estado */
  crearLogCambioEstado(
    ticketId: number, 
    usuarioId: number, 
    estadoAnterior: string, 
    estadoNuevo: string, 
    comentarios?: string,
    usuario?: string
  ): Observable<ApiResponse<LogTicket>> {
    const logData = {
      ticket_id: ticketId,
      usuario_id: usuarioId,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      comentarios: comentarios,
      accion: 'CAMBIO_ESTADO',
      created_by: usuario || 'SISTEMA'
    };
    return this.createLog(logData);
  }

  /** Crear log de asignación */
  crearLogAsignacion(
    ticketId: number, 
    usuarioId: number, 
    tecnicoAnterior: string, 
    tecnicoNuevo: string,
    usuario?: string
  ): Observable<ApiResponse<LogTicket>> {
    const logData = {
      ticket_id: ticketId,
      usuario_id: usuarioId,
      estado_anterior: `Técnico: ${tecnicoAnterior || 'Sin asignar'}`,
      estado_nuevo: `Técnico: ${tecnicoNuevo}`,
      accion: 'ASIGNACION',
      created_by: usuario || 'SISTEMA'
    };
    return this.createLog(logData);
  }
}