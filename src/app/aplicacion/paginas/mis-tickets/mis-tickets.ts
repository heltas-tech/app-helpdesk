import { Component, ViewChild, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
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

import { TicketsService } from '../../services/ticket.service';
import { TicketDetalleService } from '../../services/ticket-detalle.service';
import { 
  TicketInterface, 
  TicketUtils, 
  EstadoTicket 
} from '../../interfaces/ticket.interface';
import { GlobalFuntions } from '../../services/global-funtions';

import { DetalleTicketModalComponent } from '../detalle-ticket-modal/detalle-ticket-modal';

// Define un tipo parcial que incluya solo las propiedades que necesitas
type TicketMinimal = Partial<TicketInterface> & {
  id: number;
  titulo: string;
  descripcion?: string;
  estado_ticket: string;
  fecha_creacion: string;
  categoria?: { nombre: string };
  subcategoria?: { nombre: string };
  prioridad?: { nivel: number; nombre: string };
  tecnico?: { nombre_usuario: string; correo_electronico: string };
  
  // Propiedades requeridas por TicketUtils
  estado?: boolean;
  entidad_usuario_id?: number;
  categoria_id?: number;
  prioridad_id?: number;
  sla_id?: number;
  contrato_id?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

@Component({
  selector: 'app-mis-tickets',
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
  templateUrl: './mis-tickets.html',
  styleUrls: ['./mis-tickets.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MisTicketsComponent implements OnInit {
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
  dataSource = new MatTableDataSource<TicketMinimal>([]);
  textoBusqueda: string = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private global = inject(GlobalFuntions);
  private cargando = inject(NgxSpinnerService);
  private ticketsService = inject(TicketsService);
  private dialog = inject(MatDialog);

  // Cache para información de estado
  private estadoCache = new Map<string, any>();

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
          const ticketsProcesados = (res.data || []).map((ticket: any) => {
            // Normaliza el ticket para que tenga la estructura requerida
            const ticketNormalizado: TicketMinimal = {
              ...ticket,
              estado_ticket: this.normalizarEstado(ticket.estado_ticket),
              // Asegura que las propiedades requeridas existan
              estado: ticket.estado ?? true,
              entidad_usuario_id: ticket.entidad_usuario_id ?? 0,
              categoria_id: ticket.categoria_id ?? 0,
              prioridad_id: ticket.prioridad_id ?? 0,
              sla_id: ticket.sla_id ?? 0,
              contrato_id: ticket.contrato_id ?? 0,
              created_by: ticket.created_by ?? '',
              created_at: ticket.created_at ?? new Date().toISOString(),
              updated_at: ticket.updated_at ?? new Date().toISOString(),
              // Asegura que las relaciones existan como objetos
              categoria: ticket.categoria || { nombre: 'General' },
              subcategoria: ticket.subcategoria || undefined,
              prioridad: ticket.prioridad || { nivel: 3, nombre: 'Media' },
              tecnico: ticket.tecnico || undefined
            };
            return ticketNormalizado;
          });
          
          this.dataSource.data = ticketsProcesados;
          this.dataSource.paginator = this.paginator;
          this.configurarFiltros();
          this.estadoCache.clear();
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

  private normalizarEstado(estado: string): EstadoTicket {
    if (!estado) return EstadoTicket.NUEVO;
    
    const estadoLimpio = estado.toString().trim().toUpperCase();
    
    // Mapeo de estados
    const estadoMap: Record<string, EstadoTicket> = {
      'NUEVO': EstadoTicket.NUEVO,
      'PENDIENTE': EstadoTicket.NUEVO,
      'EN PROCESO': EstadoTicket.EN_PROCESO,
      'PROCESANDO': EstadoTicket.EN_PROCESO,
      'RESUELTO': EstadoTicket.RESUELTO,
      'CERCADO': EstadoTicket.CERRADO,
      'REABIERTO': EstadoTicket.REABIERTO,
      'EN ESPERA CLIENTE': EstadoTicket.EN_ESPERA_CLIENTE,
      'ESPERANDO CLIENTE': EstadoTicket.EN_ESPERA_CLIENTE,
      'EN ESPERA TECNICO': EstadoTicket.EN_ESPERA_TECNICO,
      'ESPERANDO TECNICO': EstadoTicket.EN_ESPERA_TECNICO,
    };

    // Buscar coincidencia exacta
    for (const [key, value] of Object.entries(estadoMap)) {
      if (estadoLimpio === key || estadoLimpio.includes(key.replace(' ', '_'))) {
        return value;
      }
    }
    
    return EstadoTicket.NUEVO;
  }

  private crearTicketCompleto(ticket: TicketMinimal): TicketInterface {
    // Crea un objeto TicketInterface completo a partir del parcial
    return {
      id: ticket.id,
      titulo: ticket.titulo,
      descripcion: ticket.descripcion,
      estado: ticket.estado ?? true,
      estado_ticket: this.normalizarEstado(ticket.estado_ticket),
      entidad_usuario_id: ticket.entidad_usuario_id ?? 0,
      tecnico_id: ticket.tecnico?.id,
      categoria_id: ticket.categoria_id ?? 0,
      subcategoria_id: ticket.subcategoria?.id,
      prioridad_id: ticket.prioridad_id ?? 0,
      sla_id: ticket.sla_id ?? 0,
      contrato_id: ticket.contrato_id ?? 0,
      fecha_creacion: ticket.fecha_creacion,
      fecha_resolucion: undefined,
      created_by: ticket.created_by ?? '',
      updated_by: '',
      created_at: ticket.created_at ?? new Date().toISOString(),
      updated_at: ticket.updated_at ?? new Date().toISOString(),
      veces_reabierto: 0,
      ultima_reapertura: undefined,
      motivo_reapertura: undefined,
      
      // Relaciones
      entidad_usuario: ticket.entidad_usuario,
      tecnico: ticket.tecnico,
      categoria: ticket.categoria,
      subcategoria: ticket.subcategoria,
      prioridad: ticket.prioridad,
      sla: ticket.sla,
      contrato: ticket.contrato
    } as TicketInterface;
  }

  private getTicketCacheKey(ticket: TicketMinimal): string {
    return `${ticket.id}_${ticket.estado_ticket}`;
  }

  private getEstadoInfoCached(ticket: TicketMinimal): any {
    const cacheKey = this.getTicketCacheKey(ticket);
    
    if (!this.estadoCache.has(cacheKey)) {
      // Crea un ticket completo para pasarlo a TicketUtils
      const ticketCompleto = this.crearTicketCompleto(ticket);
      const estadoInfo = TicketUtils.getEstadoInfo(ticketCompleto);
      this.estadoCache.set(cacheKey, estadoInfo);
    }
    
    return this.estadoCache.get(cacheKey);
  }

  configurarFiltros() {
    this.dataSource.filterPredicate = (data: TicketMinimal, filter: string) => {
      if (!filter.trim()) return true;
      
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

  abrirDetalleTicket(ticket: TicketMinimal) {
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

  getDescripcionCorta(ticket: TicketMinimal): string {
    if (!ticket.descripcion) return '';
    
    const descripcionLimpia = ticket.descripcion
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return descripcionLimpia.length > 60 
      ? descripcionLimpia.substring(0, 60) + '…' 
      : descripcionLimpia;
  }

  getEstadoTexto(ticket: TicketMinimal): string {
    const estadoInfo = this.getEstadoInfoCached(ticket);
    return estadoInfo?.label || 'Desconocido';
  }

  getEstadoClase(ticket: TicketMinimal): string {
    const estadoInfo = this.getEstadoInfoCached(ticket);
    return estadoInfo?.badgeClass || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getPrioridadClase(ticket: TicketMinimal): string {
    const nivel = ticket.prioridad?.nivel;
    const clases: Record<number, string> = {
      1: 'bg-green-100 text-green-800 border-green-200',
      2: 'bg-blue-100 text-blue-800 border-blue-200',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      4: 'bg-orange-100 text-orange-800 border-orange-200',
      5: 'bg-red-100 text-red-800 border-red-200'
    };
    return clases[nivel as number] || 'bg-gray-100 text-gray-800 border-gray-200';
  }

  getPrioridadPuntoClase(ticket: TicketMinimal): string {
    const nivel = ticket.prioridad?.nivel;
    const clases: Record<number, string> = {
      1: 'bg-green-500',
      2: 'bg-blue-500',
      3: 'bg-yellow-500',
      4: 'bg-orange-500',
      5: 'bg-red-500'
    };
    return clases[nivel as number] || 'bg-gray-500';
  }

  getPrioridadTexto(nivel?: number): string {
    const niveles: Record<number, string> = {
      1: 'Muy Baja',
      2: 'Baja',
      3: 'Media',
      4: 'Alta',
      5: 'Crítica'
    };
    return niveles[nivel as number] || 'Sin prioridad';
  }

  tieneTecnico(ticket: TicketMinimal): boolean {
    return !!ticket.tecnico?.nombre_usuario?.trim();
  }

  getNombreTecnico(ticket: TicketMinimal): string {
    const nombre = ticket.tecnico?.nombre_usuario;
    return (nombre && nombre.trim()) || 'Sin asignar';
  }

  getEmailTecnico(ticket: TicketMinimal): string {
    return ticket.tecnico?.correo_electronico || '';
  }

  getTiempoTranscurrido(fecha: string): string {
    return TicketUtils.getTiempoTranscurrido(fecha);
  }
}