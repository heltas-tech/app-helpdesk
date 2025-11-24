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

import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { TicketsService } from '../../../services/ticket.service';
import { TicketDetalleService } from '../../../services/ticket-detalle.service';
import { 
  TicketInterface, 
  TicketUtils, 
  EstadoTicket,
  ESTADOS_TICKET_UI 
} from '../../../interfaces/ticket.interface';
import { GlobalFuntions } from '../../../services/global-funtions';

import { DetalleTicketModalComponent } from '../../detalle-ticket-modal/detalle-ticket-modal';

@Component({
  selector: 'app-tickets-tecnico',
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
  templateUrl: './tickets-tecnico.html'
})
export class TicketsTecnicoComponent implements OnInit {
  // ✅ EXPONER TicketUtils para usar en el template
  TicketUtils = TicketUtils;
  EstadoTicket = EstadoTicket;
  
  displayedColumns: string[] = [
    'id',
    'asunto', 
    'cliente',
    'estado',
    'prioridad', 
    'categoria',
    'fecha_creacion',
    'tiempo_espera',
    'acciones'
  ];
  dataSource = new MatTableDataSource<any>([]);

  textoBusqueda: string = '';
  usuarioActual: any = { id: 0, nombre: 'Técnico', rol: 'TECNICO' };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private global = inject(GlobalFuntions);
  private cargando = inject(NgxSpinnerService);
  private ticketsService = inject(TicketsService);
  private ticketDetalleService = inject(TicketDetalleService);
  private dialog = inject(MatDialog);

  ngOnInit() {
    this.global.validacionToken();
    this.obtenerUsuarioActual();
    this.cargarTicketsAsignados();
  }

  /** Obtener usuario actual */
  private obtenerUsuarioActual() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.usuarioActual = {
          id: payload.userId,
          nombre: payload.email,
          rol: payload.rol
        };
      } catch (error) {
        console.error('Error al decodificar token:', error);
        this.usuarioActual = { id: 0, nombre: 'Técnico', rol: 'TECNICO' };
      }
    }
  }

  cargarTicketsAsignados() {
    this.cargando.show();
    
    this.ticketsService.listaActivos().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          // FILTRAR: Solo tickets asignados a este técnico
          const ticketsAsignados = (res.data || []).filter((ticket: any) => 
            ticket.tecnico_id === this.usuarioActual.id
          );
          
          this.dataSource.data = ticketsAsignados;
          this.dataSource.paginator = this.paginator;
          this.configurarFiltros();
          
          console.log('✅ Tickets activos del técnico cargados:', ticketsAsignados.length);
        } else {
          Swal.fire('Error', res.message || 'Error al cargar tickets', 'error');
        }
      },
      error: (err: any) => {
        this.cargando.hide();
        console.error('Error al obtener tickets del técnico:', err);
        Swal.fire('Error', 'Error al cargar tickets asignados', 'error');
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
        data.entidad_usuario?.usuario?.nombre_usuario?.toLowerCase() || '',
        data.entidad_usuario?.entidad?.denominacion?.toLowerCase() || '',
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
    console.log('✅ Técnico abriendo modal para ticket:', ticket.id);

    const dialogRef = this.dialog.open(DetalleTicketModalComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'full-screen-modal',
      data: { ticketId: ticket.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('🔔 Modal cerrado con resultado:', result);
      if (result === 'updated') {
        console.log('🔄 Recargando lista de tickets...');
        this.cargarTicketsAsignados();
      }
    });
  }

  // ================== MÉTODOS MEJORADOS PARA TÉCNICO ==================

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

  /** Verificar si el ticket está esperando cliente */
  esEsperaCliente(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.EN_ESPERA_CLIENTE;
  }

  /** Verificar si el ticket está esperando técnico */
  esEsperaTecnico(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.EN_ESPERA_TECNICO;
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
    
    return `Reabierto ${veces} vez${veces > 1 ? 'es' : ''}`;
  }

  /** Obtener nombre del cliente */
  getNombreCliente(ticket: any): string {
    return ticket.entidad_usuario?.usuario?.nombre_usuario || 'Cliente';
  }

  /** Obtener email del cliente */
  getEmailCliente(ticket: any): string {
    return ticket.entidad_usuario?.usuario?.correo_electronico || '';
  }

  /** Obtener entidad del cliente */
  getEntidadCliente(ticket: any): string {
    return ticket.entidad_usuario?.entidad?.denominacion || '';
  }

  /** Obtener información de contacto del cliente */
  getContactoCliente(ticket: any): string {
    const telefono = ticket.entidad_usuario?.usuario?.telefono;
    const email = this.getEmailCliente(ticket);
    
    if (telefono && email) {
      return `${telefono} • ${email}`;
    } else if (telefono) {
      return telefono;
    } else if (email) {
      return email;
    }
    
    return 'Sin información de contacto';
  }

  /** Obtener texto descriptivo del estado para técnico */
  getDescripcionEstado(ticket: any): string {
    switch(ticket.estado_ticket) {
      case EstadoTicket.NUEVO:
        return 'Ticket nuevo asignado - Requiere atención inicial';
      case EstadoTicket.EN_PROCESO:
        return 'Estás trabajando en la solución de este ticket';
      case EstadoTicket.RESUELTO:
        return 'Ticket resuelto - Esperando confirmación del cliente';
      case EstadoTicket.REABIERTO:
        return 'Cliente reabrió el ticket - Requiere seguimiento adicional';
      case EstadoTicket.EN_ESPERA_CLIENTE:
        return 'Esperando respuesta del cliente para continuar';
      case EstadoTicket.EN_ESPERA_TECNICO:
        return 'Necesitas realizar una acción para continuar';
      case EstadoTicket.CERRADO:
        return 'Ticket cerrado definitivamente';
      default:
        return 'Estado del ticket';
    }
  }

  /** Verificar si es urgente por prioridad */
  esUrgente(ticket: any): boolean {
    const prioridad = ticket.prioridad?.nivel || 1;
    return prioridad >= 4; // Nivel 4 o mayor es urgente
  }

  /** Verificar si es alta prioridad */
  esAltaPrioridad(ticket: any): boolean {
    const prioridad = ticket.prioridad?.nivel || 1;
    return prioridad >= 3; // Nivel 3 o mayor es alta prioridad
  }

  /** Obtener indicador de urgencia */
  getIndicadorUrgencia(ticket: any): string {
    const prioridad = ticket.prioridad?.nivel || 1;
    
    if (prioridad >= 4) {
      return 'Alta Urgencia - Requiere atención inmediata';
    } else if (prioridad >= 3) {
      return 'Urgente - Atender lo antes posible';
    } else if (prioridad >= 2) {
      return 'Prioridad Media';
    } else {
      return 'Prioridad Normal';
    }
  }

  /** Obtener color del indicador de urgencia */
  getColorUrgencia(ticket: any): string {
    const prioridad = ticket.prioridad?.nivel || 1;
    
    if (prioridad >= 4) {
      return 'bg-red-500';
    } else if (prioridad >= 3) {
      return 'bg-orange-500';
    } else if (prioridad >= 2) {
      return 'bg-yellow-500';
    } else {
      return 'bg-green-500';
    }
  }

  /** Verificar si el ticket es antiguo (más de 7 días) */
  esTicketAntiguo(ticket: any): boolean {
    if (!ticket.fecha_creacion) return false;
    
    const fechaCreacion = new Date(ticket.fecha_creacion);
    const ahora = new Date();
    const diferenciaDias = (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 3600 * 24);
    
    return diferenciaDias > 7; // Más de 7 días es considerado antiguo
  }

  /** Obtener información de antigüedad del ticket */
  getInfoAntiguedad(ticket: any): string {
    if (!ticket.fecha_creacion) return 'Fecha no disponible';
    
    const fechaCreacion = new Date(ticket.fecha_creacion);
    const ahora = new Date();
    const diferenciaDias = Math.floor((ahora.getTime() - fechaCreacion.getTime()) / (1000 * 3600 * 24));
    
    if (diferenciaDias > 14) {
      return `Muy antiguo (${diferenciaDias} días)`;
    } else if (diferenciaDias > 7) {
      return `Antiguo (${diferenciaDias} días)`;
    } else {
      return `${diferenciaDias} días`;
    }
  }

  // Utilidades
  getTiempoTranscurrido(fecha: string): string {
    return TicketUtils.getTiempoTranscurrido(fecha);
  }

  getColorPrioridad(nivel: number): string {
    return TicketUtils.getColorPrioridad(nivel);
  }

  /** Obtener texto de la prioridad */
  getTextoPrioridad(ticket: any): string {
    const nivel = ticket.prioridad?.nivel || 1;
    
    switch(nivel) {
      case 1: return 'Baja';
      case 2: return 'Media';
      case 3: return 'Alta';
      case 4: return 'Crítica';
      case 5: return 'Emergencia';
      default: return 'Normal';
    }
  }

  /** Obtener tiempo de creación formateado */
  getFechaCreacionCompleta(ticket: any): string {
    if (!ticket.fecha_creacion) return 'Fecha no disponible';
    
    const fecha = new Date(ticket.fecha_creacion);
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Obtener información del ticket para debug */
  getInfoTicket(ticket: any): string {
    return `ID: ${ticket.id} | Estado: ${this.getEstadoTexto(ticket)} | Prioridad: ${ticket.prioridad?.nivel || 'N/A'}`;
  }
}