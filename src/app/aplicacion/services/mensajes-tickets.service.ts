import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ApiResponse, 
  MensajeTicketResponse, 
  CreateMensajeTicketRequest, 
  UpdateMensajeTicketRequest 
} from '../interfaces';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MensajesTicketsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiAuthUrl}/mensajes-tickets`;

  /** Obtener todos los mensajes de un ticket */
  getMensajesByTicketId(ticketId: number): Observable<ApiResponse<MensajeTicketResponse[]>> {
    return this.http.get<ApiResponse<MensajeTicketResponse[]>>(`${this.apiUrl}/ticket/${ticketId}`);
  }

  /** Obtener archivos de un ticket (mensajes con archivos) */
  getArchivosByTicketId(ticketId: number): Observable<ApiResponse<MensajeTicketResponse[]>> {
    return this.http.get<ApiResponse<MensajeTicketResponse[]>>(`${this.apiUrl}/archivos/ticket/${ticketId}`);
  }

  /** Obtener mensaje por ID */
  getMensajeById(id: number): Observable<ApiResponse<MensajeTicketResponse>> {
    return this.http.get<ApiResponse<MensajeTicketResponse>>(`${this.apiUrl}/${id}`);
  }

  /** Crear nuevo mensaje */
  createMensaje(mensaje: CreateMensajeTicketRequest): Observable<ApiResponse<MensajeTicketResponse>> {
    return this.http.post<ApiResponse<MensajeTicketResponse>>(this.apiUrl, mensaje);
  }

  /** Actualizar mensaje */
  updateMensaje(id: number, mensaje: UpdateMensajeTicketRequest): Observable<ApiResponse<MensajeTicketResponse>> {
    return this.http.patch<ApiResponse<MensajeTicketResponse>>(`${this.apiUrl}/${id}`, mensaje);
  }

  /** Eliminar mensaje (soft delete) */
  deleteMensaje(id: number): Observable<ApiResponse<MensajeTicketResponse>> {
    return this.http.delete<ApiResponse<MensajeTicketResponse>>(`${this.apiUrl}/${id}`);
  }

  /** Enviar mensaje de texto */
  enviarMensajeTexto(ticketId: number, usuarioId: number, mensaje: string, usuario: string): Observable<ApiResponse<MensajeTicketResponse>> {
    const mensajeData: CreateMensajeTicketRequest = {
      ticket_id: ticketId,
      usuario_id: usuarioId,
      mensaje: mensaje,
      tipo_mensaje: 'TEXTO',  // ← STRING SIMPLE, COMPATIBLE CON BACKEND
      created_by: usuario
    };
    return this.createMensaje(mensajeData);
  }

  /** Enviar mensaje con archivo */
  enviarMensajeArchivo(
    ticketId: number, 
    usuarioId: number, 
    archivoData: { 
      archivo_url: string; 
      nombre_archivo: string; 
      tipo_archivo: string; 
      tamanio_archivo: number;
      mensaje?: string;
    },
    usuario: string
  ): Observable<ApiResponse<MensajeTicketResponse>> {
    const mensajeData: CreateMensajeTicketRequest = {
      ticket_id: ticketId,
      usuario_id: usuarioId,
      mensaje: archivoData.mensaje,
      tipo_mensaje: 'ARCHIVO',  // ← STRING SIMPLE, COMPATIBLE CON BACKEND
      archivo_url: archivoData.archivo_url,
      nombre_archivo: archivoData.nombre_archivo,
      tipo_archivo: archivoData.tipo_archivo,
      tamanio_archivo: archivoData.tamanio_archivo,
      created_by: usuario
    };
    return this.createMensaje(mensajeData);
  }

  /** Método helper para mapear tipo de archivo desde MIME type */
  mapTipoArchivo(mimeType: string): string {
    if (!mimeType) return 'OTRO';
    
    const type = mimeType.toLowerCase();
    
    if (type.startsWith('image/')) return 'IMAGEN';
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOCUMENTO';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'EXCEL';
    if (type.includes('video')) return 'VIDEO';
    if (type.includes('audio')) return 'AUDIO';
    if (type.includes('text') || type.includes('csv')) return 'DOCUMENTO';
    if (type.includes('zip') || type.includes('compressed')) return 'OTRO';
    
    return 'OTRO';
  }
}