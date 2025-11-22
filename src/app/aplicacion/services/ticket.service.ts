import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private apiUrl = `${environment.apiAuthUrl}`;

  constructor(private http: HttpClient) {}

  // ==================== MÉTODOS PRINCIPALES ====================

  /** Listar todos los tickets con filtro opcional */
  lista(mostrarEliminados: boolean = false): Observable<any> {
    let params = new HttpParams();
    if (mostrarEliminados) {
      params = params.set('mostrarEliminados', 'true');
    }
    return this.http.get<any>(`${this.apiUrl}/tickets`, { params });
  }

  /** Listar solo tickets activos */
  listaActivos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/activos`);
  }

  /** Listar solo tickets eliminados */
  listaEliminados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/eliminados`);
  }

  /** Obtener tickets del CLIENTE logueado */
  listaMisTicketsCliente(mostrarEliminados: boolean = false): Observable<any> {
    let params = new HttpParams();
    if (mostrarEliminados) {
      params = params.set('mostrarEliminados', 'true');
    }
    return this.http.get<any>(`${this.apiUrl}/tickets/cliente/mis-tickets`, { params });
  }

  /** Obtener ticket por ID */
  obtener(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/${id}`);
  }

  /** Crear ticket */
  crear(ticket: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tickets`, ticket);
  }

  /** Actualizar ticket */
  actualizar(id: number, ticket: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}`, ticket);
  }

  /** Eliminar ticket (soft delete) */
  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tickets/${id}`);
  }

  /** Restaurar ticket eliminado */
  restaurar(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}/restaurar`, {});
  }

  /** Marcar como resuelto */
  marcarResuelto(id: number, fechaResolucion: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}/marcar-resuelto`, { 
      fecha_resolucion: fechaResolucion
    });
  }
  // ==================== MÉTODOS DE CIERRE ====================

/** Cerrar ticket definitivamente (tanto cliente como técnico) */
cerrarTicket(id: number): Observable<any> {
  return this.http.patch<any>(`${this.apiUrl}/tickets/${id}/cerrar`, {});
}

  /**  Reabrir ticket */
  reabrirTicket(id: number, motivoReapertura: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}/reabrir`, { 
      motivo_reapertura: motivoReapertura
    });
  }

  // ==================== MÉTODOS PARA ASIGNACIÓN ====================

  /** Asignar técnico al ticket */
  asignarTecnico(id: number, tecnicoId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}`, { 
      tecnico_id: tecnicoId 
    });
  }

  /** Cambiar estado del ticket */
  cambiarEstado(id: number, estado: boolean): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}`, { 
      estado 
    });
  }

  /** Cambiar estado específico del ticket */
  cambiarEstadoTicket(id: number, estadoTicket: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}`, { 
      estado_ticket: estadoTicket 
    });
  }

  // ==================== MÉTODOS PARA PDF ====================

  /** Generar PDF del ticket */
  generarPdfTicket(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tickets/${id}/generar-pdf`, {});
  }

  /** Descargar PDF del ticket */
  descargarPdfTicket(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/tickets/${id}/descargar-pdf`, {
      responseType: 'blob'
    });
  }

  /** Ver PDF del ticket en el navegador */
  verPdfTicket(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/tickets/${id}/ver-pdf`, {
      responseType: 'blob'
    });
  }

  // ==================== MÉTODOS DE BÚSQUEDA Y FILTROS ====================

  /** Buscar tickets por término */
  buscarTickets(termino: string, mostrarEliminados: boolean = false): Observable<any> {
    let params = new HttpParams().set('search', termino);
    if (mostrarEliminados) {
      params = params.set('mostrarEliminados', 'true');
    }
    return this.http.get<any>(`${this.apiUrl}/tickets`, { params });
  }

  /** Filtrar tickets por múltiples criterios */
  filtrarTickets(filtros: any): Observable<any> {
    let params = new HttpParams();
    
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });
    
    return this.http.get<any>(`${this.apiUrl}/tickets`, { params });
  }
}