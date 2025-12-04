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
    const dataToSend = this.prepararDatosTicket(ticket);
    console.log('📤 Enviando datos de CREACIÓN:', dataToSend);
    return this.http.post<any>(`${this.apiUrl}/tickets`, dataToSend);
  }

  /** Actualizar ticket */
  actualizar(id: number, ticket: any): Observable<any> {
    const dataToSend = this.prepararDatosParaActualizacion(ticket);
    console.log('📤 Enviando datos de ACTUALIZACIÓN:', dataToSend);
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}`, dataToSend);
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

  /** Cerrar ticket definitivamente */
  cerrarTicket(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}/cerrar`, {});
  }

  /** Reabrir ticket */
  reabrirTicket(id: number, motivoReapertura: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tickets/${id}/reabrir`, { 
      motivo_reapertura: motivoReapertura
    });
  }

  // ==================== NUEVOS ENDPOINTS PARA FILTROS ESPECIALIZADOS ====================

  /** Obtener tickets sin asignar */
  getTicketsSinAsignar(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/sin-asignar`);
  }

  /** Obtener tickets urgentes */
  getTicketsUrgentes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/urgentes`);
  }
 
  /** Obtener tickets próximos a vencer */
  getTicketsProximosVencer(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/proximos-vencer`);
  }

  /** Obtener tickets vencidos */
  getTicketsVencidos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/vencidos`);
  }

  /** Obtener tickets resueltos hoy */
  getTicketsResueltosHoy(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/resueltos-hoy`);
  }

  /** Obtener tickets por entidad específica */
  getTicketsPorEntidad(entidadId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/por-entidad/${entidadId}`);
  }

  /** Obtener tickets por técnico específico */
  getTicketsPorTecnico(tecnicoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/filtros/por-tecnico/${tecnicoId}`);
  }

  /** Obtener estadísticas del dashboard */
  getEstadisticasDashboard(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tickets/estadisticas/dashboard`);
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

  // ==================== MÉTODOS PRIVADOS ====================

  /** Preparar datos del ticket para enviar al backend */
  private prepararDatosTicket(ticket: any): any {
    const datosPreparados = { ...ticket };

    // Manejar campos que pueden ser null/undefined/string vacío
    if (datosPreparados.subcategoria_id === '' || datosPreparados.subcategoria_id === undefined) {
      datosPreparados.subcategoria_id = null;
    } else if (datosPreparados.subcategoria_id) {
      datosPreparados.subcategoria_id = Number(datosPreparados.subcategoria_id);
    }

    if (datosPreparados.tecnico_id === '' || datosPreparados.tecnico_id === undefined) {
      datosPreparados.tecnico_id = null;
    } else if (datosPreparados.tecnico_id) {
      datosPreparados.tecnico_id = Number(datosPreparados.tecnico_id);
    }

    // Convertir campos numéricos obligatorios
    if (datosPreparados.entidad_usuario_id) {
      datosPreparados.entidad_usuario_id = Number(datosPreparados.entidad_usuario_id);
    }

    if (datosPreparados.categoria_id) {
      datosPreparados.categoria_id = Number(datosPreparados.categoria_id);
    }

    if (datosPreparados.prioridad_id) {
      datosPreparados.prioridad_id = Number(datosPreparados.prioridad_id);
    }

    if (datosPreparados.sla_id) {
      datosPreparados.sla_id = Number(datosPreparados.sla_id);
    }

    if (datosPreparados.contrato_id) {
      datosPreparados.contrato_id = Number(datosPreparados.contrato_id);
    }

    // Eliminar campos que no deben enviarse
    delete datosPreparados.veces_reabierto;
    delete datosPreparados.ultima_reapertura;
    delete datosPreparados.motivo_reapertura;
    delete datosPreparados.fecha_creacion;
    delete datosPreparados.created_by;
    delete datosPreparados.created_at;
    delete datosPreparados.updated_by;
    delete datosPreparados.updated_at;

    return datosPreparados;
  }

  /** Preparar datos específicos para actualización */
  private prepararDatosParaActualizacion(ticket: any): any {
    const datosParaEnviar: any = {};

    // Campos básicos editables
    if (ticket.titulo !== undefined) datosParaEnviar.titulo = ticket.titulo;
    if (ticket.descripcion !== undefined) datosParaEnviar.descripcion = ticket.descripcion;
    if (ticket.estado !== undefined) datosParaEnviar.estado = ticket.estado;
    if (ticket.estado_ticket !== undefined) datosParaEnviar.estado_ticket = ticket.estado_ticket;

    // Campos de relaciones - convertir explícitamente a número
    if (ticket.entidad_usuario_id !== undefined && ticket.entidad_usuario_id !== null) {
      datosParaEnviar.entidad_usuario_id = Number(ticket.entidad_usuario_id);
    } else if (ticket.entidad_usuario_id === null) {
      datosParaEnviar.entidad_usuario_id = null;
    }

    if (ticket.tecnico_id !== undefined && ticket.tecnico_id !== null) {
      datosParaEnviar.tecnico_id = Number(ticket.tecnico_id);
    } else if (ticket.tecnico_id === null) {
      datosParaEnviar.tecnico_id = null;
    }

    if (ticket.categoria_id !== undefined && ticket.categoria_id !== null) {
      datosParaEnviar.categoria_id = Number(ticket.categoria_id);
    } else if (ticket.categoria_id === null) {
      datosParaEnviar.categoria_id = null;
    }

    if (ticket.subcategoria_id !== undefined && ticket.subcategoria_id !== null && ticket.subcategoria_id !== '') {
      datosParaEnviar.subcategoria_id = Number(ticket.subcategoria_id);
    } else if (ticket.subcategoria_id === null || ticket.subcategoria_id === '') {
      datosParaEnviar.subcategoria_id = null;
    }

    if (ticket.prioridad_id !== undefined && ticket.prioridad_id !== null) {
      datosParaEnviar.prioridad_id = Number(ticket.prioridad_id);
    } else if (ticket.prioridad_id === null) {
      datosParaEnviar.prioridad_id = null;
    }

    if (ticket.sla_id !== undefined && ticket.sla_id !== null) {
      datosParaEnviar.sla_id = Number(ticket.sla_id);
    } else if (ticket.sla_id === null) {
      datosParaEnviar.sla_id = null;
    }

    if (ticket.contrato_id !== undefined && ticket.contrato_id !== null) {
      datosParaEnviar.contrato_id = Number(ticket.contrato_id);
    } else if (ticket.contrato_id === null) {
      datosParaEnviar.contrato_id = null;
    }

    return datosParaEnviar;
  }

  /** Verificar tipos de datos */
  private verificarTiposDatos(data: any): any {
    const tipos: any = {};
    Object.keys(data).forEach(key => {
      tipos[key] = {
        valor: data[key],
        tipo: typeof data[key],
        esNull: data[key] === null,
        esUndefined: data[key] === undefined,
        esNumber: !isNaN(data[key]) && data[key] !== null && data[key] !== '',
        esString: typeof data[key] === 'string',
        esBoolean: typeof data[key] === 'boolean'
      };
    });
    return tipos;
  }
}