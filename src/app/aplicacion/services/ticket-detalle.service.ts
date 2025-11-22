// src/app/services/ticket-detalle.service.ts
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, of } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';

import { TicketsService } from './ticket.service';
import { MensajesTicketsService } from './mensajes-tickets.service';
import { TicketHistoryService } from './ticket-history.service';
import { FileUploadService } from './file-upload.service';
import { TicketDetalle, TicketModalState } from '../interfaces/ticket.interface';

@Injectable({
  providedIn: 'root'
})
export class TicketDetalleService {
  private ticketsService = inject(TicketsService);
  private mensajesService = inject(MensajesTicketsService);
  private historyService = inject(TicketHistoryService);
  private fileUploadService = inject(FileUploadService);

  // Estado del modal
  private modalState = new BehaviorSubject<TicketModalState>({
    ticketId: null,
    activoTab: 'info',
    cargando: false,
    enviandoMensaje: false,
    subiendoArchivo: false
  });

  // Datos del ticket actual
  private ticketDetalle = new BehaviorSubject<TicketDetalle | null>(null);

  // Observables públicos
  public modalState$ = this.modalState.asObservable();
  public ticketDetalle$ = this.ticketDetalle.asObservable();

  /** Cargar todos los datos de un ticket - VERSIÓN CORREGIDA */
  cargarDetalleTicket(ticketId: number): Observable<TicketDetalle> {
    console.log('🔄 Cargando detalle del ticket:', ticketId);
    this.actualizarEstado({ 
      ticketId, 
      cargando: true 
    });

    return forkJoin({
      ticket: this.ticketsService.obtener(ticketId).pipe(
        map(response => {
          console.log('✅ Ticket cargado:', response);
          return response.data || response;
        }),
        catchError(error => {
          console.error('❌ Error cargando ticket:', error);
          return of(null);
        })
      ),
      mensajes: this.mensajesService.getMensajesByTicketId(ticketId).pipe(
        map(response => {
          console.log('✅ Mensajes cargados:', response);
          return response.data || [];
        }),
        catchError(error => {
          console.error('❌ Error cargando mensajes:', error);
          return of([]);
        })
      ),
      archivos: this.fileUploadService.getTicketFiles(ticketId).pipe(
        map(response => {
          console.log('✅ Archivos cargados:', response);
          return response?.data || response || [];
        }),
        catchError(error => {
          console.error('❌ Error cargando archivos:', error);
          return of([]);
        })
      ),
      logs: this.historyService.getHistorialByTicketId(ticketId).pipe(
        map(response => {
          console.log('✅ Logs cargados:', response);
          return response.data || [];
        }),
        catchError(error => {
          console.error('❌ Error cargando logs:', error);
          return of([]);
        })
      )
    }).pipe(
      map(({ ticket, mensajes, archivos, logs }) => {
        console.log('📦 Consolidando datos del ticket:', {
          ticket: !!ticket,
          mensajesCount: mensajes.length,
          archivosCount: archivos.length,
          logsCount: logs.length
        });

        const detalle: TicketDetalle = {
          ticket: ticket,
          mensajes: mensajes,
          archivos: archivos,
          logs: logs,
          cargando: false
        };

        this.ticketDetalle.next(detalle);
        this.actualizarEstado({ 
          ticketId, 
          cargando: false 
        });

        console.log('✅ Detalle del ticket listo:', detalle);
        return detalle;
      }),
      catchError(error => {
        console.error('❌ Error crítico al cargar detalle del ticket:', error);
        this.actualizarEstado({ cargando: false });
        
        const detalleError: TicketDetalle = {
          ticket: null,
          mensajes: [],
          archivos: [],
          logs: [],
          cargando: false,
          error: 'Error al cargar los datos del ticket: ' + error.message
        };
        
        this.ticketDetalle.next(detalleError);
        return of(detalleError);
      })
    );
  }

  /** Actualizar estado del modal */
  actualizarEstado(nuevoEstado: Partial<TicketModalState>): void {
    const estadoActual = this.modalState.value;
    const nuevoEstadoCompleto = { ...estadoActual, ...nuevoEstado };
    console.log('🔄 Actualizando estado del modal:', nuevoEstadoCompleto);
    this.modalState.next(nuevoEstadoCompleto);
  }

  /** Cambiar pestaña activa */
  cambiarTab(tab: 'info' | 'chat' | 'archivos' | 'logs'): void {
    console.log('📑 Cambiando a pestaña:', tab);
    this.actualizarEstado({ activoTab: tab });
  }

  /** Enviar mensaje de texto - VERSIÓN MEJORADA */
  enviarMensaje(mensaje: string, usuarioId: number, usuario: string): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket seleccionado para enviar mensaje');
      return of({ 
        isSuccess: false, 
        message: 'No hay ticket seleccionado' 
      });
    }

    console.log('💬 Enviando mensaje:', { ticketId, usuarioId, mensaje });
    this.actualizarEstado({ enviandoMensaje: true });

    return this.mensajesService.enviarMensajeTexto(ticketId, usuarioId, mensaje, usuario).pipe(
      switchMap((response) => {
        console.log('✅ Mensaje enviado:', response);
        this.actualizarEstado({ enviandoMensaje: false });
        
        // Recargar mensajes y retornar el resultado
        return this.recargarMensajes().pipe(
          map(() => response) // Retornar la respuesta original
        );
      }),
      catchError(error => {
        console.error('❌ Error enviando mensaje:', error);
        this.actualizarEstado({ enviandoMensaje: false });
        throw error; // Propagar el error
      })
    );
  }

  /** Subir archivo al chat - VERSIÓN CORREGIDA */
  subirArchivoChat(file: File, usuarioId: number, usuario: string, mensaje?: string): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket seleccionado para subir archivo');
      return of({ 
        isSuccess: false, 
        message: 'No hay ticket seleccionado' 
      });
    }

    console.log('📎 Subiendo archivo:', { 
      ticketId, 
      fileName: file.name, 
      fileSize: file.size 
    });
    
    this.actualizarEstado({ subiendoArchivo: true });

    // Primero subir el archivo
    return this.fileUploadService.uploadChatFile(ticketId, file).pipe(
      switchMap((event: any) => {
        console.log('📊 Evento de subida:', event.type);

        if (event.type === HttpEventType.Response) {
          const response = event.body;
          console.log('✅ Archivo subido - Respuesta completa:', response);

          if (response && (response.success || response.isSuccess || response.url)) {
            // Determinar los datos del archivo
            const fileData = response.data || response;
            const archivoUrl = fileData.url || fileData.archivo_url;
            const nombreArchivo = fileData.nombre_archivo || file.name;
            const tipoArchivo = fileData.tipo_archivo || file.type;
            const tamanioArchivo = fileData.tamanio_archivo || fileData.tamaño_archivo || file.size;

            // Validar que tenemos los datos mínimos necesarios
            if (!archivoUrl || !nombreArchivo) {
              console.error('❌ Datos de archivo incompletos:', fileData);
              throw new Error('Datos de archivo incompletos en la respuesta del servidor');
            }

            console.log('📁 Datos del archivo procesados:', {
              archivoUrl,
              nombreArchivo,
              tipoArchivo,
              tamanioArchivo
            });

            // Luego crear el mensaje con el archivo
            return this.mensajesService.enviarMensajeArchivo(
              ticketId,
              usuarioId,
              {
                archivo_url: archivoUrl,
                nombre_archivo: nombreArchivo,
                tipo_archivo: tipoArchivo,
                tamanio_archivo: tamanioArchivo,
                mensaje: mensaje || `Archivo: ${nombreArchivo}`
              },
              usuario
            ).pipe(
              tap((mensajeResponse) => {
                console.log('✅ Mensaje con archivo creado:', mensajeResponse);
                this.actualizarEstado({ subiendoArchivo: false });
                // Recargar tanto mensajes como archivos
                this.recargarMensajes();
                this.recargarArchivos();
              }),
              catchError(mensajeError => {
                console.error('❌ Error creando mensaje con archivo:', mensajeError);
                this.actualizarEstado({ subiendoArchivo: false });
                // Aunque falle el mensaje, el archivo se subió correctamente
                return of({
                  isSuccess: true,
                  message: 'Archivo subido correctamente, pero hubo un error creando el mensaje',
                  data: fileData
                });
              })
            );
          } else {
            const errorMsg = response?.message || 'Error en la subida del archivo';
            console.error('❌ Error en respuesta de subida:', errorMsg);
            throw new Error(errorMsg);
          }
        } else {
          // Para eventos de progreso, retornar un observable vacío que no emite valores
          // pero mantiene la suscripción activa para el siguiente evento
          return of(); // ← CORRECCIÓN: of() sin parámetros en lugar de of(null)
        }
      }),
      catchError(error => {
        console.error('❌ Error subiendo archivo:', error);
        this.actualizarEstado({ subiendoArchivo: false });
        // Propagar el error para que el componente lo maneje
        throw error;
      })
    );
  }

  /** Recargar mensajes - VERSIÓN MEJORADA */
  recargarMensajes(): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket para recargar mensajes');
      return of(null);
    }

    console.log('🔄 Recargando mensajes para ticket:', ticketId);
    
    return this.mensajesService.getMensajesByTicketId(ticketId).pipe(
      tap(response => {
        const mensajes = response.data || [];
        console.log('✅ Mensajes recargados:', mensajes.length);
        
        const detalleActual = this.ticketDetalle.value;
        if (detalleActual) {
          const nuevoDetalle: TicketDetalle = {
            ...detalleActual,
            mensajes: mensajes
          };
          this.ticketDetalle.next(nuevoDetalle);
        }
      }),
      catchError(error => {
        console.error('❌ Error al recargar mensajes:', error);
        return of(null);
      })
    );
  }

  /** Recargar archivos - VERSIÓN MEJORADA */
  recargarArchivos(): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket para recargar archivos');
      return of(null);
    }

    console.log('🔄 Recargando archivos para ticket:', ticketId);
    
    return this.fileUploadService.getTicketFiles(ticketId).pipe(
      tap(response => {
        const archivos = response?.data || response || [];
        console.log('✅ Archivos recargados:', archivos.length);
        
        const detalleActual = this.ticketDetalle.value;
        if (detalleActual) {
          const nuevoDetalle: TicketDetalle = {
            ...detalleActual,
            archivos: archivos
          };
          this.ticketDetalle.next(nuevoDetalle);
        }
      }),
      catchError(error => {
        console.error('❌ Error al recargar archivos:', error);
        return of(null);
      })
    );
  }

  /** Recargar logs - VERSIÓN MEJORADA */
  recargarLogs(): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket para recargar logs');
      return of(null);
    }

    console.log('🔄 Recargando logs para ticket:', ticketId);
    
    return this.historyService.getHistorialByTicketId(ticketId).pipe(
      tap(response => {
        const logs = response.data || [];
        console.log('✅ Logs recargados:', logs.length);
        
        const detalleActual = this.ticketDetalle.value;
        if (detalleActual) {
          const nuevoDetalle: TicketDetalle = {
            ...detalleActual,
            logs: logs
          };
          this.ticketDetalle.next(nuevoDetalle);
        }
      }),
      catchError(error => {
        console.error('❌ Error al recargar logs:', error);
        return of(null);
      })
    );
  }

  /** Recargar todo - NUEVO MÉTODO */
  recargarTodo(): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) return of (null);
    
    console.log('🔄 Recargando todos los datos del ticket:', ticketId);
     return this.cargarDetalleTicket(ticketId);
  }

  /** Limpiar datos al cerrar modal */
  limpiarDatos(): void {
    console.log('🧹 Limpiando datos del modal');
    this.ticketDetalle.next(null);
    this.modalState.next({
      ticketId: null,
      activoTab: 'info',
      cargando: false,
      enviandoMensaje: false,
      subiendoArchivo: false
    });
  }

  /** Obtener ticket ID actual */
  getTicketIdActual(): number | null {
    return this.modalState.value.ticketId;
  }

  /** Cerrar ticket */
  cerrarTicket(comentario?: string): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket seleccionado para cerrar');
      return of({ 
        isSuccess: false, 
        message: 'No hay ticket seleccionado' 
      });
    }

    console.log('🔒 Cerrando ticket:', ticketId);
    const fechaResolucion = new Date().toISOString();
    
    return this.ticketsService.marcarResuelto(ticketId, fechaResolucion).pipe(
      switchMap(response => {
        console.log('✅ Ticket cerrado, recargando datos...');
        // Recargar todo y logs
        return forkJoin([
          this.recargarTodo(),
          this.recargarLogs()
        ]).pipe(
          map(() => response)
        );
      })
    );
  }

  /** Reactivar ticket */
  reactivarTicket(): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket seleccionado para reactivar');
      return of({ 
        isSuccess: false, 
        message: 'No hay ticket seleccionado' 
      });
    }

    console.log('🔄 Reactivando ticket:', ticketId);
    
    return this.ticketsService.actualizar(ticketId, { fecha_resolucion: null }).pipe(
      switchMap(response => {
        console.log('✅ Ticket reactivado, recargando datos...');
        // Recargar todo y logs
        return forkJoin([
          this.recargarTodo(),
          this.recargarLogs()
        ]).pipe(
          map(() => response)
        );
      })
    );
  }

  /** Actualizar ticket */
  actualizarTicket(datos: any): Observable<any> {
    const ticketId = this.modalState.value.ticketId;
    if (!ticketId) {
      console.error('❌ No hay ticket seleccionado para actualizar');
      return of({ 
        isSuccess: false, 
        message: 'No hay ticket seleccionado' 
      });
    }

    console.log('✏️ Actualizando ticket:', ticketId, datos);
    
    return this.ticketsService.actualizar(ticketId, datos).pipe(
      switchMap(response => {
        console.log('✅ Ticket actualizado, recargando datos...');
        // Recargar todo y logs
        return forkJoin([
          this.recargarTodo(),
          this.recargarLogs()
        ]).pipe(
          map(() => response)
        );
      })
    );
  }
}