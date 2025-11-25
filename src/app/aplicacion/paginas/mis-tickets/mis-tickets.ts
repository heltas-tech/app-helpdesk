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
          // Limpiar y procesar los datos
          const ticketsProcesados = (res.data || []).map((ticket: any) => ({
            ...ticket,
            // Asegurar que no haya estados duplicados
            estado_ticket: this.limpiarEstado(ticket.estado_ticket)
          }));
          
          this.dataSource.data = ticketsProcesados;
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

  // 🔧 CORRECCIÓN: Limpiar estado para evitar duplicados
  private limpiarEstado(estado: string): string {
    if (!estado) return EstadoTicket.NUEVO;
    
    // Remover texto adicional que pueda causar duplicación
    const estadoLimpio = estado.toString().trim();
    
    // Mapear a estados válidos
    const estadosValidos = [
      EstadoTicket.NUEVO,
      EstadoTicket.EN_PROCESO,
      EstadoTicket.RESUELTO,
      EstadoTicket.CERRADO,
      EstadoTicket.REABIERTO,
      EstadoTicket.EN_ESPERA_CLIENTE,
      EstadoTicket.EN_ESPERA_TECNICO
    ];
    
    // Buscar coincidencia exacta
    const estadoEncontrado = estadosValidos.find(e => 
      estadoLimpio.toLowerCase().includes(e.toLowerCase()) || 
      e.toLowerCase().includes(estadoLimpio.toLowerCase())
    );
    
    return estadoEncontrado || EstadoTicket.NUEVO;
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
        this.getEstadoTexto(data)?.toLowerCase() || ''
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

  // 🔧 CORRECCIÓN: Obtener descripción limpia sin HTML
  getDescripcionCorta(ticket: any): string {
    if (!ticket.descripcion) return '';
    
    // Remover etiquetas HTML
    const descripcionLimpia = ticket.descripcion
      .replace(/<[^>]*>/g, '') // Remover tags HTML
      .replace(/&nbsp;/g, ' ') // Reemplazar espacios HTML
      .trim();
    
    // Limitar longitud
    return descripcionLimpia.length > 60 
      ? descripcionLimpia.substring(0, 60) + '...' 
      : descripcionLimpia;
  }

  // ==================== MÉTODOS MEJORADOS PARA ESTADOS ====================

  /** Obtener información del estado para UI */
  getEstadoInfo(ticket: any) {
    const estadoLimpio = this.limpiarEstado(ticket.estado_ticket);
    const ticketLimpio = { ...ticket, estado_ticket: estadoLimpio };
    return TicketUtils.getEstadoInfo(ticketLimpio);
  }

  /** Obtener texto del estado */
  getEstadoTexto(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo?.label || 'Desconocido';
  }

  /** Obtener clase CSS para el estado */
  getEstadoClase(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo?.badgeClass || 'bg-gray-100 text-gray-800';
  }

  /** Obtener icono del estado (usando emojis como fallback) */
  getEstadoIcono(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    
    // Si el icono es un nombre de Material, usar emoji como fallback
    const icon = estadoInfo?.icon;
    
    if (!icon) return '❓';
    
    // Mapear nombres de Material Icons a emojis
    const iconMap: { [key: string]: string } = {
      'check_circle': '✅',
      'lock': '🔒',
      'fiber_new': '🆕',
      'build': '⚡',
      'autorenew': '🔄',
      'schedule': '⏳',
      'error': '❌'
    };
    
    return iconMap[icon] || '📋';
  }

  // 🔧 CORRECCIÓN: Clases para prioridad
  getPrioridadClase(ticket: any): string {
    const nivel = ticket.prioridad?.nivel;
    switch(nivel) {
      case 1: return 'bg-green-100 text-green-800';
      case 2: return 'bg-blue-100 text-blue-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 5: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getPrioridadPuntoClase(ticket: any): string {
    const nivel = ticket.prioridad?.nivel;
    switch(nivel) {
      case 1: return 'bg-green-500';
      case 2: return 'bg-blue-500';
      case 3: return 'bg-yellow-500';
      case 4: return 'bg-orange-500';
      case 5: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }

  /** Verificar si el ticket está reabierto */
  esReabierto(ticket: any): boolean {
    return this.limpiarEstado(ticket.estado_ticket) === EstadoTicket.REABIERTO;
  }

  /** Verificar si el ticket está resuelto */
  esResuelto(ticket: any): boolean {
    return this.limpiarEstado(ticket.estado_ticket) === EstadoTicket.RESUELTO;
  }

  /** Verificar si el ticket está cerrado */
  esCerrado(ticket: any): boolean {
    return this.limpiarEstado(ticket.estado_ticket) === EstadoTicket.CERRADO;
  }

  /** Verificar si el ticket está en proceso */
  esEnProceso(ticket: any): boolean {
    return this.limpiarEstado(ticket.estado_ticket) === EstadoTicket.EN_PROCESO;
  }

  /** Verificar si el ticket está nuevo */
  esNuevo(ticket: any): boolean {
    return this.limpiarEstado(ticket.estado_ticket) === EstadoTicket.NUEVO;
  }

  /** Verificar si el ticket tiene técnico asignado */
  tieneTecnico(ticket: any): boolean {
    return !!ticket.tecnico && !!ticket.tecnico.nombre_usuario;
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
}