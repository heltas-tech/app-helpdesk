import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import Swal from 'sweetalert2';
import { NgxSpinnerService } from 'ngx-spinner';

import { TicketsService } from '../../../services/ticket.service';
import { 
  TicketUtils, 
  EstadoTicket
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
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './tickets-tecnico.html',
  styleUrls: ['./tickets-tecnico.scss']
})
export class TicketsTecnicoComponent implements OnInit {
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
  private dialog = inject(MatDialog);

  ngOnInit() {
    this.global.validacionToken();
    this.obtenerUsuarioActual();
    this.cargarTicketsAsignados();
  }

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
        const ticketsAsignados = (res.data || []).filter((ticket: any) => 
          ticket.tecnico_id === this.usuarioActual.id
        );
        
        // AQUÍ AGREGAS EL ORDENAMIENTO
        const ticketsOrdenados = this.ordenarTicketsPorPrioridad(ticketsAsignados);
        
        this.dataSource.data = ticketsOrdenados;
        this.dataSource.paginator = this.paginator;
        this.configurarFiltros();
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
/** Ordenar tickets por prioridad de estado */
/** Ordenar tickets por prioridad de estado */
private ordenarTicketsPorPrioridad(tickets: any[]): any[] {
  const ordenPrioridad = {
    'REABIERTO': 1,
    'EN_PROCESO': 2,
    'NUEVO': 3,
    'EN_ESPERA_CLIENTE': 4,
    'RESUELTO': 5,
    'CERRADO': 6
  };

  type EstadoValido = keyof typeof ordenPrioridad;

  return [...tickets].sort((a, b) => {
    const estadoA = (a.estado_ticket || 'NUEVO') as EstadoValido;
    const estadoB = (b.estado_ticket || 'NUEVO') as EstadoValido;
    
    const prioridadA = ordenPrioridad[estadoA] || 7;
    const prioridadB = ordenPrioridad[estadoB] || 7;
    
    if (prioridadA !== prioridadB) {
      return prioridadA - prioridadB;
    }
    
    // Si tienen el mismo estado, ordenar por fecha (más reciente primero)
    const fechaA = new Date(a.fecha_creacion || 0);
    const fechaB = new Date(b.fecha_creacion || 0);
    
    return fechaB.getTime() - fechaA.getTime();
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
        this.getNombreCliente(data)?.toLowerCase() || '',
        this.getEntidadCliente(data)?.toLowerCase() || '',
        this.getEmailCliente(data)?.toLowerCase() || '',
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
    const dialogRef = this.dialog.open(DetalleTicketModalComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'full-screen-modal',
      data: { ticketId: ticket.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.cargarTicketsAsignados();
      }
    });
  }

  // ================== MÉTODOS AUXILIARES ==================

  getInicialCliente(ticket: any): string {
    return this.getNombreCliente(ticket).charAt(0).toUpperCase();
  }

  getDescripcionCorta(ticket: any): string {
    const descripcion = ticket.descripcion || '';
    if (!descripcion) return 'Sin descripción';
    
    const div = document.createElement('div');
    div.innerHTML = descripcion;
    const text = div.textContent || div.innerText || '';
    return text.length > 60 ? text.substring(0, 60) + '...' : text;
  }

  getEstadoInfo(ticket: any) {
    return TicketUtils.getEstadoInfo(ticket);
  }

  getEstadoTexto(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo.label;
  }

  getEstadoClase(ticket: any): string {
    const estadoInfo = this.getEstadoInfo(ticket);
    return estadoInfo.badgeClass;
  }

  getPrioridadTexto(nivel: number): string {
    switch(nivel) {
      case 4: return 'Urgente';
      case 3: return 'Alta';
      case 2: return 'Media';
      case 1: return 'Baja';
      default: return 'Sin prioridad';
    }
  }

  getPrioridadClase(ticket: any): string {
    const nivel = ticket.prioridad?.nivel || 1;
    switch(nivel) {
      case 4: return 'bg-red-50 text-red-700 border-red-200';
      case 3: return 'bg-orange-50 text-orange-700 border-orange-200';
      case 2: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 1: return 'bg-green-50 text-green-700 border-green-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }

  getPrioridadPuntoClase(ticket: any): string {
    const nivel = ticket.prioridad?.nivel || 1;
    switch(nivel) {
      case 4: return 'bg-red-500';
      case 3: return 'bg-orange-500';
      case 2: return 'bg-yellow-500';
      case 1: return 'bg-green-500';
      default: return 'bg-gray-400';
    }
  }

  esReabierto(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.REABIERTO;
  }

  esResuelto(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.RESUELTO;
  }

  esCerrado(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.CERRADO;
  }

  esEnProceso(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.EN_PROCESO;
  }

  esEsperaCliente(ticket: any): boolean {
    return ticket.estado_ticket === EstadoTicket.EN_ESPERA_CLIENTE;
  }

  getInfoReaperturas(ticket: any): string {
    if (!ticket.veces_reabierto || ticket.veces_reabierto === 0) {
      return '';
    }
    
    const veces = ticket.veces_reabierto;
    return `Reabierto ${veces} vez${veces > 1 ? 'es' : ''}`;
  }

  getNombreCliente(ticket: any): string {
    return ticket.entidad_usuario?.usuario?.nombre_usuario || 'Cliente';
  }

  getEmailCliente(ticket: any): string {
    return ticket.entidad_usuario?.usuario?.correo_electronico || '';
  }

  getEntidadCliente(ticket: any): string {
    return ticket.entidad_usuario?.entidad?.denominacion || '';
  }

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

  esUrgente(ticket: any): boolean {
    const prioridad = ticket.prioridad?.nivel || 1;
    return prioridad >= 4;
  }

  esAltaPrioridad(ticket: any): boolean {
    const prioridad = ticket.prioridad?.nivel || 1;
    return prioridad >= 3;
  }

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

  esTicketAntiguo(ticket: any): boolean {
    if (!ticket.fecha_creacion) return false;
    
    const fechaCreacion = new Date(ticket.fecha_creacion);
    const ahora = new Date();
    const diferenciaDias = (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 3600 * 24);
    
    return diferenciaDias > 7;
  }

  getTiempoTranscurrido(fecha: string): string {
    return TicketUtils.getTiempoTranscurrido(fecha);
  }

  getColorPrioridad(nivel: number): string {
    return TicketUtils.getColorPrioridad(nivel);
  }
}