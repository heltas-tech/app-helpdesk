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

  // ==================== MÉTODO CERRAR TICKET ====================
  cerrarTicket(ticket: any) {
    console.log('🔒 Intentando cerrar ticket:', {
      id: ticket.id,
      titulo: ticket.titulo,
      estado_actual: ticket.estado_ticket
    });

    let mensaje = '';
    let titulo = '';
    
    switch(ticket.estado_ticket) {
      case EstadoTicket.RESUELTO:
        titulo = '¿Confirmar cierre del ticket resuelto?';
        mensaje = 'El ticket ya fue marcado como resuelto. ¿Quieres cerrarlo definitivamente?';
        break;
      case EstadoTicket.EN_ESPERA_CLIENTE:
        titulo = '¿Cerrar ticket pendiente?';
        mensaje = 'El ticket está esperando tu respuesta. ¿Quieres cerrarlo sin responder?';
        break;
      case EstadoTicket.EN_PROCESO:
        titulo = '¿Cerrar ticket en proceso?';
        mensaje = 'El técnico aún está trabajando en tu ticket. ¿Estás seguro de cerrarlo?';
        break;
      default:
        titulo = '¿Cerrar ticket?';
        mensaje = '¿Estás seguro de que quieres cerrar este ticket?';
    }

    Swal.fire({
      title: titulo,
      text: mensaje,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        
        this.ticketsService.cerrarTicket(ticket.id).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            console.log('✅ Respuesta cerrar ticket:', res);
            
            if (res.isSuccess) {
              let mensajeExito = '';
              switch(ticket.estado_ticket) {
                case EstadoTicket.RESUELTO:
                  mensajeExito = 'Ticket resuelto cerrado correctamente';
                  break;
                case EstadoTicket.EN_ESPERA_CLIENTE:
                  mensajeExito = 'Ticket pendiente cerrado correctamente';
                  break;
                default:
                  mensajeExito = 'Ticket cerrado correctamente';
              }

              Swal.fire({
                title: '¡Cerrado!',
                text: mensajeExito,
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              this.cargarMisTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al cerrar el ticket', 'error');
            }
          },
          error: (err: any) => {
            this.cargando.hide();
            console.error('❌ Error al cerrar ticket:', err);
            Swal.fire('Error', 'Error al cerrar el ticket: ' + err.message, 'error');
          }
        });
      }
    });
  }

  reabrirTicket(ticket: any) {
    console.log('🔄 Intentando reabrir ticket:', {
      id: ticket.id,
      titulo: ticket.titulo,
      estado_ticket: ticket.estado_ticket,
      fecha_resolucion: ticket.fecha_resolucion
    });

    Swal.fire({
      title: '¿Reabrir ticket?',
      html: `
        <p>Este ticket volverá a estado <strong>Reabierto</strong> para seguimiento.</p>
        <p class="text-sm text-gray-600 mt-2">Motivo de reapertura:</p>
        <textarea 
          id="motivo-reapertura" 
          class="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          rows="3" 
          placeholder="Describe por qué necesitas reabrir este ticket..."
        ></textarea>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reabrir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      preConfirm: () => {
        const motivo = (document.getElementById('motivo-reapertura') as HTMLTextAreaElement).value;
        if (!motivo.trim()) {
          Swal.showValidationMessage('Por favor ingresa el motivo de la reapertura');
          return false;
        }
        return motivo;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.cargando.show();
        
        console.log('🔄 Reabriendo ticket con motivo:', result.value);

        this.ticketsService.reabrirTicket(ticket.id, result.value).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            console.log('✅ Respuesta reabrir ticket:', res);
            
            if (res.isSuccess) {
              Swal.fire({
                title: '¡Reabierto!',
                html: `El ticket ha sido reabierto correctamente<br>
                      <small class="text-gray-600">Número de reaperturas: ${res.data?.veces_reabierto || 1}</small>`,
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
              this.cargarMisTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al reabrir el ticket', 'error');
            }
          },
          error: (err: any) => {
            this.cargando.hide();
            console.error('❌ Error al reabrir ticket:', err);
            Swal.fire('Error', 'Error al reabrir el ticket: ' + err.message, 'error');
          }
        });
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

  /** Verificar si el ticket puede ser reabierto */
  puedeReabrir(ticket: any): boolean {
    return TicketUtils.puedeReabrir(ticket);
  }

  /** Verificar si el ticket puede ser cerrado */
  puedeCerrar(ticket: any): boolean {
    // Estados que el cliente puede cerrar
    const estadosPermitidosCliente = [
      EstadoTicket.RESUELTO,           // Cuando ya está resuelto
      EstadoTicket.EN_ESPERA_CLIENTE,  // Cuando espera respuesta del cliente
      EstadoTicket.EN_PROCESO          // Si quiere cerrarlo antes
    ];
    
    return ticket.estado && 
           estadosPermitidosCliente.includes(ticket.estado_ticket) &&
           ticket.estado_ticket !== EstadoTicket.CERRADO;
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
        return 'Un técnico está trabajando en la solución de tu ticket';
      case EstadoTicket.RESUELTO:
        return 'El ticket ha sido resuelto. Puedes cerrarlo definitivamente o reabrirlo si necesitas más ayuda';
      case EstadoTicket.REABIERTO:
        return 'Has reabierto este ticket para seguimiento adicional';
      case EstadoTicket.EN_ESPERA_CLIENTE:
        return 'Estamos esperando tu respuesta para continuar con el proceso';
      case EstadoTicket.EN_ESPERA_TECNICO:
        return 'El técnico está gestionando información adicional para resolver tu ticket';
      case EstadoTicket.CERRADO:
        return 'Este ticket ha sido cerrado definitivamente';
      default:
        return 'Estado del ticket';
    }
  }
}