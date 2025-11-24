import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { TicketsService } from '../../services/ticket.service';
import { TicketDetalleService } from '../../services/ticket-detalle.service';
import { 
  TicketInterface, 
  TicketUtils, 
  EstadoTicket,
  ESTADOS_TICKET_UI 
} from '../../interfaces/ticket.interface';
import { GlobalFuntions } from '../../services/global-funtions';

import { DetalleTicketModalComponent } from '../detalle-ticket-modal/detalle-ticket-modal';

@Component({
  selector: 'app-mis-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule,
  ],
  templateUrl: './mis-tickets.html'
})
export class MisTicketsComponent implements OnInit {
  // ✅ EXPONER TicketUtils para usar en el template
  TicketUtils = TicketUtils;
  EstadoTicket = EstadoTicket;
  
  displayedColumns: string[] = [
    'id',
    'asunto', 
    'estado',
    'tecnico_asignado',
    'prioridad', 
    'categoria',
    'fecha_creacion',
    'tiempo_espera',
    'acciones'
  ];
  dataSource = new MatTableDataSource<any>([]);

  textoBusqueda: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private global = inject(GlobalFuntions);
  private cargando = inject(NgxSpinnerService);
  private ticketsService = inject(TicketsService);
  private ticketDetalleService = inject(TicketDetalleService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  ngOnInit() {
    this.global.validacionToken();
    this.cargarMisTickets();
  }

  cargarMisTickets() {
    this.cargando.show();
    
    this.ticketsService.listaMisTicketsCliente().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          this.dataSource.data = res.data || [];
          this.dataSource.paginator = this.paginator;
          this.configurarFiltros();
          
          console.log('✅ Tickets cargados:', this.dataSource.data.length);
        } else {
          Swal.fire('Error', res.message || 'Error al cargar tickets', 'error');
        }
      },
      error: (err: any) => {
        this.cargando.hide();
        console.error('Error al obtener mis tickets:', err);
        Swal.fire('Error', 'Error al cargar mis tickets', 'error');
      }
    });
  }

  configurarFiltros() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      if (!filter) return true;
      
      const searchStr = filter.toLowerCase();
      const searchableFields = [
        data.titulo?.toLowerCase() || '',
        data.descripcion?.toLowerCase() || '',
        data.categoria?.nombre?.toLowerCase() || '',
        data.subcategoria?.nombre?.toLowerCase() || '',
        data.prioridad?.nombre?.toLowerCase() || '',
        data.tecnico?.nombre_usuario?.toLowerCase() || '',
        data.id?.toString() || '',
        this.getEstadoInfo(data)?.label?.toLowerCase() || ''
      ];
      
      return searchableFields.some(field => field.includes(searchStr));
    };
  }

  aplicarBusqueda() {
    this.dataSource.filter = this.textoBusqueda.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  limpiarBusqueda() {
    this.textoBusqueda = '';
    this.aplicarBusqueda();
  }

  abrirDetalleTicket(ticket: any) {
    console.log('✅ Abriendo modal para ticket:', ticket.id);

    const dialogRef = this.dialog.open(DetalleTicketModalComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'full-screen-modal',
      data: { ticketId: ticket.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.cargarMisTickets();
      }
    });
  }

  // ==================== MÉTODO CERRAR TICKET MEJORADO ====================
  cerrarTicket(ticket: any) {
    console.log('🔒 Intentando cerrar ticket:', {
      id: ticket.id,
      titulo: ticket.titulo,
      estado_actual: ticket.estado_ticket
    });

    // Solo permitir cerrar tickets que no estén ya cerrados
    if (this.esCerrado(ticket)) {
      Swal.fire({
        title: 'Ticket ya cerrado',
        html: `
          <div class="text-center">
            <div class="text-gray-500 text-6xl mb-4">🔒</div>
            <p class="text-gray-700 mb-2 font-semibold">Este ticket ya está cerrado</p>
            <p class="text-sm text-gray-500">
              El ticket #${ticket.id} fue cerrado el ${ticket.fecha_cierre ? (new Date(ticket.fecha_cierre)).toLocaleDateString() : 'fecha no disponible'}.
            </p>
          </div>
        `,
        icon: 'info',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#6b7280'
      });
      return;
    }

    let configCierre: any;

    switch(ticket.estado_ticket) {
      case EstadoTicket.RESUELTO:
        configCierre = {
          titulo: '¿Cerrar Ticket Resuelto?',
          mensaje: `
            <div class="text-left">
              <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 text-green-800 mb-2">
                  <mat-icon class="text-green-500" style="font-size: 20px;">check_circle</mat-icon>
                  <span class="font-semibold">Ticket Resuelto - Listo para Cerrar</span>
                </div>
                <p class="text-green-700 text-sm">
                  El técnico ha marcado este ticket como resuelto. Al cerrarlo definitivamente:
                </p>
                <ul class="text-green-600 text-sm mt-2 space-y-1">
                  <li>• ✅ Se archivarán todos los comentarios y soluciones</li>
                  <li>• ✅ El ticket se marcará como completado</li>
                  <li>• ✅ Podrás consultarlo en tu historial de tickets cerrados</li>
                </ul>
              </div>
              <p class="text-gray-600 font-semibold">¿Confirmas que el problema ha sido solucionado satisfactoriamente?</p>
            </div>
          `,
          icono: 'success' as const,
          textoConfirmacion: 'Sí, cerrar definitivamente',
          colorConfirmacion: '#10b981'
        };
        break;

      case EstadoTicket.EN_ESPERA_CLIENTE:
        configCierre = {
          titulo: '¿Cerrar Ticket Pendiente?',
          mensaje: `
            <div class="text-left">
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 text-yellow-800 mb-2">
                  <mat-icon class="text-yellow-500" style="font-size: 20px;">schedule</mat-icon>
                  <span class="font-semibold">Esperando tu Respuesta</span>
                </div>
                <p class="text-yellow-700 text-sm">
                  Este ticket está esperando información adicional por tu parte. Al cerrarlo ahora:
                </p>
                <ul class="text-yellow-600 text-sm mt-2 space-y-1">
                  <li>• ⚠️ El técnico no podrá continuar con la solución</li>
                  <li>• ⚠️ Se considerará que no necesitas más ayuda</li>
                  <li>• ⚠️ Podrías perder la solución al problema</li>
                </ul>
              </div>
              <p class="text-gray-600 font-semibold">¿Estás seguro de cerrar sin proporcionar la información solicitada?</p>
            </div>
          `,
          icono: 'warning' as const,
          textoConfirmacion: 'Sí, cerrar sin responder',
          colorConfirmacion: '#eab308'
        };
        break;

      case EstadoTicket.EN_PROCESO:
        configCierre = {
          titulo: '¿Cerrar Ticket en Proceso?',
          mensaje: `
            <div class="text-left">
              <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div class="flex items-center gap-2 text-blue-800 mb-2">
                  <mat-icon class="text-blue-500" style="font-size: 20px;">build</mat-icon>
                  <span class="font-semibold">En Proceso de Solución</span>
                </div>
                <p class="text-blue-700 text-sm">
                  Un técnico está trabajando activamente en la solución de tu problema. Al cerrarlo ahora:
                </p>
                <ul class="text-blue-600 text-sm mt-2 space-y-1">
                  <li>• ❌ Interrumpirás el trabajo del técnico</li>
                  <li>• ❌ Podrías no recibir la solución completa</li>
                  <li>• ❌ El problema podría permanecer sin resolver</li>
                </ul>
              </div>
              <p class="text-gray-600 font-semibold">¿Realmente quieres detener el proceso de soporte?</p>
            </div>
          `,
          icono: 'info' as const,
          textoConfirmacion: 'Sí, detener proceso',
          colorConfirmacion: '#3b82f6'
        };
        break;

      default:
        configCierre = {
          titulo: '¿Cerrar Ticket?',
          mensaje: `
            <div class="text-left">
              <p class="text-gray-700 mb-3">¿Estás seguro de que quieres cerrar definitivamente este ticket?</p>
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p class="text-sm text-gray-600">
                  Al cerrarlo, no podrás realizar más acciones sobre este ticket y se archivará en tu historial.
                </p>
              </div>
            </div>
          `,
          icono: 'question' as const,
          textoConfirmacion: 'Sí, cerrar definitivamente',
          colorConfirmacion: '#dc2626'
        };
    }

    Swal.fire({
      title: configCierre.titulo,
      html: configCierre.mensaje,
      icon: configCierre.icono,
      showCancelButton: true,
      confirmButtonText: configCierre.textoConfirmacion,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: configCierre.colorConfirmacion,
      cancelButtonColor: '#6b7280',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        return this.ticketsService.cerrarTicket(ticket.id).toPromise();
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const res = result.value;
        
        if (res.isSuccess) {
          let mensajeExito = '';
          
          switch(ticket.estado_ticket) {
            case EstadoTicket.RESUELTO:
              mensajeExito = `
                <div class="text-center">
                  <div class="text-green-500 text-6xl mb-4">✅</div>
                  <p class="text-gray-700 mb-2 font-semibold">¡Ticket Cerrado Correctamente!</p>
                  <p class="text-sm text-gray-500 mb-3">
                    El ticket #${ticket.id} ha sido archivado en tu historial de tickets resueltos.
                  </p>
                  <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p class="text-sm text-green-700">
                      <strong>Estado:</strong> Cerrado - Problema solucionado
                    </p>
                  </div>
                </div>
              `;
              break;
            case EstadoTicket.EN_ESPERA_CLIENTE:
              mensajeExito = `
                <div class="text-center">
                  <div class="text-yellow-500 text-6xl mb-4">⚠️</div>
                  <p class="text-gray-700 mb-2 font-semibold">Ticket Pendiente Cerrado</p>
                  <p class="text-sm text-gray-500">
                    Has cerrado el ticket sin proporcionar la información solicitada.
                  </p>
                </div>
              `;
              break;
            case EstadoTicket.EN_PROCESO:
              mensajeExito = `
                <div class="text-center">
                  <div class="text-blue-500 text-6xl mb-4">⏹️</div>
                  <p class="text-gray-700 mb-2 font-semibold">Proceso de Soporte Detenido</p>
                  <p class="text-sm text-gray-500">
                    Has interrumpido el trabajo del técnico. Si necesitas ayuda nuevamente, crea un nuevo ticket.
                  </p>
                </div>
              `;
              break;
            default:
              mensajeExito = `
                <div class="text-center">
                  <div class="text-gray-500 text-6xl mb-4">🔒</div>
                  <p class="text-gray-700 mb-2 font-semibold">Ticket Cerrado</p>
                  <p class="text-sm text-gray-500">
                    El ticket #${ticket.id} ha sido archivado en tu historial.
                  </p>
                </div>
              `;
          }

          Swal.fire({
            title: '¡Operación Exitosa!',
            html: mensajeExito,
            icon: 'success',
            confirmButtonText: 'Continuar',
            confirmButtonColor: '#10b981'
          }).then(() => {
            this.cargarMisTickets();
          });
        } else {
          Swal.fire({
            title: 'Error al cerrar',
            html: `
              <div class="text-center">
                <div class="text-red-500 text-6xl mb-4">❌</div>
                <p class="text-gray-700 mb-2">No se pudo cerrar el ticket</p>
                <p class="text-sm text-gray-500">${res.message || 'Error desconocido'}</p>
              </div>
            `,
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#ef4444'
          });
        }
      }
    });
  }

  // ==================== MÉTODOS MEJORADOS PARA ESTADOS ====================

  /** Obtener información del estado para UI */
  getEstadoInfo(ticket: any) {
    return TicketUtils.getEstadoInfo(ticket);
  }

  /** Obtener texto del estado */
  getEstadoTexto(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo.label;
  }

  /** Obtener clase CSS para el estado */
  getEstadoClase(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo.badgeClass;
  }

  /** Obtener icono del estado */
  getEstadoIcono(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo.icon;
  }

  /** Verificar si el ticket está reabierto */
  esReabierto(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.REABIERTO;
  }

  /** Verificar si el ticket está resuelto */
  esResuelto(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.RESUELTO;
  }

  /** Verificar si el ticket está cerrado */
  esCerrado(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.CERRADO;
  }

  /** Verificar si el ticket está en proceso */
  esEnProceso(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.EN_PROCESO;
  }

  /** Verificar si el ticket está nuevo */
  esNuevo(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.NUEVO;
  }

  /** Verificar si el ticket puede ser cerrado */
  puedeCerrar(ticket: any): boolean {
    // Solo permitir cerrar tickets que no estén ya cerrados y estén en estados específicos
    const estadosPermitidosCliente = [
      EstadoTicket.RESUELTO,           // Cuando ya está resuelto
      EstadoTicket.EN_ESPERA_CLIENTE,  // Cuando espera respuesta del cliente
      EstadoTicket.EN_PROCESO          // Si quiere cerrarlo antes
    ];
    
    return !this.esCerrado(ticket) && 
           estadosPermitidosCliente.includes(ticket.estado_ticket);
  }

  /** Obtener información de reaperturas */
  getInfoReaperturas(ticket: any): string {
    if (!ticket.veces_reabierto || ticket.veces_reabierto === 0) {
      return '';
    }
    
    const veces = ticket.veces_reabierto;
    const ultimaReapertura = ticket.ultima_reapertura 
      ? TicketUtils.formatearFecha(ticket.ultima_reapertura)
      : 'No disponible';
    
    return `Reabierto ${veces} vez${veces > 1 ? 'es' : ''}. Última: ${ultimaReapertura}`;
  }

  tieneTecnico(ticket: any): boolean {
    return !!ticket.tecnico;
  }

  getNombreTecnico(ticket: any): string {
    return ticket.tecnico?.nombre_usuario || 'Sin asignar';
  }

  getEmailTecnico(ticket: any): string {
    return ticket.tecnico?.correo_electronico || '';
  }

  // Utilidades
  getTiempoTranscurrido(fecha: string): string {
    return TicketUtils.getTiempoTranscurrido(fecha);
  }

  getColorPrioridad(nivel: number): string {
    return TicketUtils.getColorPrioridad(nivel);
  }

  /** Obtener texto descriptivo del estado */
  getDescripcionEstado(ticket: any): string {
    switch(ticket.estado_ticket) {
      case EstadoTicket.NUEVO:
        return 'Tu ticket ha sido creado y está esperando ser asignado a un técnico';
      case EstadoTicket.EN_PROCESO:
        return 'Un técnico está trabajando activamente en la solución de tu ticket';
      case EstadoTicket.RESUELTO:
        return 'El ticket ha sido resuelto. Puedes cerrarlo definitivamente';
      case EstadoTicket.REABIERTO:
        return 'Has reabierto este ticket para seguimiento adicional. El técnico revisará tu solicitud';
      case EstadoTicket.EN_ESPERA_CLIENTE:
        return 'Estamos esperando tu respuesta para continuar con el proceso de solución';
      case EstadoTicket.EN_ESPERA_TECNICO:
        return 'El técnico está gestionando información adicional para resolver tu ticket';
      case EstadoTicket.CERRADO:
        return 'Este ticket ha sido cerrado definitivamente y archivado en tu historial';
      default:
        return 'Estado del ticket';
    }
  }

  /** Obtener información de quién cerró el ticket */
  getInfoCierre(ticket: any): string {
    if (!this.esCerrado(ticket)) return '';
    
    const fechaCierre = ticket.fecha_cierre ? 
      TicketUtils.formatearFecha(ticket.fecha_cierre) : 'Fecha no disponible';
    
    return `Cerrado el ${fechaCierre}`;
  }
}