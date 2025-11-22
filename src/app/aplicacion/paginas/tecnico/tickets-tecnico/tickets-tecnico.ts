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
import { TicketInterface, TicketUtils } from '../../../interfaces/ticket.interface';
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
    
    // USAR listaActivos() para solo tickets activos
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
          console.log('🔍 Tickets asignados al técnico:', ticketsAsignados.map((t: any) => ({
            id: t.id,
            titulo: t.titulo,
            tecnico_id: t.tecnico_id,
            usuario_actual: this.usuarioActual.id
          })));
          
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
        data.id?.toString() || ''
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

  // ================== MÉTODOS ESPECÍFICOS PARA TÉCNICO ==================

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

  // Utilidades (las mismas que el cliente)
  getTiempoTranscurrido(fecha: string): string {
    return TicketUtils.getTiempoTranscurrido(fecha);
  }

  getColorPrioridad(nivel: number): string {
    return TicketUtils.getColorPrioridad(nivel);
  }

  // ✅ MÉTODO PARA DEBUG
  debugTickets() {
    console.log('🐛 DEBUG - Todos los tickets del técnico:', this.dataSource.data);
  }
}