import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { TicketModalComponent } from '../ticket-modal/ticket-modal';
import { DetalleTicketModalComponent } from '../detalle-ticket-modal/detalle-ticket-modal';
import { TicketsService } from '../../services/ticket.service';
import { UsuariosService } from '../../services/usuarios.service';
import { CategoriasService } from '../../services/categorias.service';
import { SubcategoriasService } from '../../services/subcategorias.service';
import { PrioridadesService } from '../../services/prioridades.service';
import { GlobalFuntions } from '../../services/global-funtions';
import { EstadoTicket, TicketUtils } from '../../interfaces/ticket.interface';
import { SlaCalculatorService, SlaEstado } from '../../services/sla-calculator.service';

interface FiltrosEspeciales {
  sinAsignar: boolean;
  urgentes: boolean;
  proximosVencer: boolean;
  vencidos: boolean;
  resueltosHoy: boolean;
}

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ],
  templateUrl: './ticket.html',
  styleUrls: ['./ticket.scss']
})
export class TicketsComponent implements OnInit {
  TicketUtils = TicketUtils;
  EstadoTicket = EstadoTicket;

  displayedColumns: string[] = [
    'id',
    'titulo', 
    'descripcion', 
    'estado',
    'sla',
    'tecnico', 
    'categoria', 
    'prioridad', 
    'fecha_creacion',
    'acciones'
  ];
  dataSource = new MatTableDataSource<any>([]);

  filtroEstado: string = 'activos';
  filtroEstadoTicket: string = 'todos';
  filtroPrioridad: string = 'todas';
  filtroTecnico: string = 'todos';
  filtroCategoria: string = 'todas';
  textoBusqueda: string = '';

  tecnicos: any[] = [];
  prioridades: any[] = [];
  categorias: any[] = [];
  subcategorias: any[] = [];

  filtrosEspeciales: FiltrosEspeciales = {
    sinAsignar: false,
    urgentes: false,
    proximosVencer: false,
    vencidos: false,
    resueltosHoy: false
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private slaCalculator = inject(SlaCalculatorService);

  constructor(
    private global: GlobalFuntions,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private ticketsService: TicketsService,
    private usuariosService: UsuariosService,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private prioridadesService: PrioridadesService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarDatosIniciales();
    this.cargarTickets();
    this.configurarFiltros();
  }

  cargarDatosIniciales() {
    this.cargarTecnicos();
    this.cargarCategorias();
    this.cargarSubcategorias();
    this.cargarPrioridades();
  }

  cargarTecnicos() {
    this.usuariosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          let dataArray: any[] = [];
          
          if (Array.isArray(res.data)) {
            dataArray = res.data;
          } else if (res.data && typeof res.data === 'object') {
            dataArray = [...(res.data.activos || []), ...(res.data.eliminados || [])];
          }
          
          this.tecnicos = dataArray.filter((u: any) => 
            !u.eliminado && u.rol === 'TECNICO' && u.activo
          );
        } else {
          this.tecnicos = [];
        }
      },
      error: (err: any) => {
        console.error('Error cargando técnicos:', err);
        this.tecnicos = [];
      }
    });
  }

  cargarCategorias() {
    this.categoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.categorias = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando categorías:', err)
    });
  }

  cargarSubcategorias() {
    this.subcategoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.subcategorias = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando subcategorías:', err)
    });
  }

  cargarPrioridades() {
    this.prioridadesService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.prioridades = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando prioridades:', err)
    });
  }

  configurarFiltros() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const filters = JSON.parse(filter);
      
      return this.aplicarFiltroTexto(data, filters.textoBusqueda) &&
             this.aplicarFiltroEstado(data, filters.filtroEstado) &&
             this.aplicarFiltroEstadoTicket(data, filters.filtroEstadoTicket) &&
             this.aplicarFiltroPrioridad(data, filters.filtroPrioridad) &&
             this.aplicarFiltroTecnico(data, filters.filtroTecnico) &&
             this.aplicarFiltroCategoria(data, filters.filtroCategoria) &&
             this.aplicarFiltrosEspeciales(data, filters.filtrosEspeciales);
    };
  }

  aplicarFiltroTexto(data: any, texto: string): boolean {
    if (!texto) return true;
    
    const searchStr = texto.toLowerCase();
    const searchableFields = [
      data.titulo?.toLowerCase() || '',
      data.descripcion?.toLowerCase() || '',
      data.categoria?.nombre?.toLowerCase() || '',
      data.subcategoria?.nombre?.toLowerCase() || '',
      data.prioridad?.nombre?.toLowerCase() || '',
      data.tecnico?.nombre_usuario?.toLowerCase() || '',
      data.id?.toString() || '',
      data.estado_ticket?.toLowerCase() || ''
    ];
    
    return searchableFields.some(field => field.includes(searchStr));
  }

  aplicarFiltroEstado(data: any, estado: string): boolean {
    if (estado === 'todos') return true;
    if (estado === 'activos') return data.estado === true;
    if (estado === 'eliminados') return data.estado === false;
    return true;
  }

  aplicarFiltroEstadoTicket(data: any, estadoTicket: string): boolean {
    if (estadoTicket === 'todos') return true;
    return data.estado_ticket === estadoTicket;
  }

  aplicarFiltroPrioridad(data: any, prioridad: string): boolean {
    if (prioridad === 'todas') return true;
    return data.prioridad_id?.toString() === prioridad;
  }

  aplicarFiltroTecnico(data: any, tecnico: string): boolean {
    if (tecnico === 'todos') return true;
    if (tecnico === 'sin-asignar') return !data.tecnico_id;
    return data.tecnico_id?.toString() === tecnico;
  }

  aplicarFiltroCategoria(data: any, categoria: string): boolean {
    if (categoria === 'todas') return true;
    return data.categoria_id?.toString() === categoria;
  }

  aplicarFiltrosEspeciales(data: any, filtrosEspeciales: FiltrosEspeciales): boolean {
    const hayFiltrosActivos = Object.values(filtrosEspeciales).some(valor => valor === true);
    if (!hayFiltrosActivos) return true;

    if (filtrosEspeciales.sinAsignar && data.tecnico_id) {
      return false;
    }

    if (filtrosEspeciales.urgentes && (!data.prioridad || data.prioridad.nivel < 3)) {
      return false;
    }

    if (filtrosEspeciales.proximosVencer) {
      const estadoSLA = this.getSlaInfo(data);
      if (estadoSLA.estado !== 'POR_VENCER') {
        return false;
      }
    }

    if (filtrosEspeciales.vencidos) {
      const estadoSLA = this.getSlaInfo(data);
      if (estadoSLA.estado !== 'VENCIDO') {
        return false;
      }
    }

    if (filtrosEspeciales.resueltosHoy) {
      const hoy = new Date();
      const fechaResolucion = data.fecha_resolucion ? new Date(data.fecha_resolucion) : null;
      if (!fechaResolucion || fechaResolucion.toDateString() !== hoy.toDateString()) {
        return false;
      }
    }

    return true;
  }

  aplicarTodosLosFiltros() {
    const filterObj = {
      textoBusqueda: this.textoBusqueda,
      filtroEstado: this.filtroEstado,
      filtroEstadoTicket: this.filtroEstadoTicket,
      filtroPrioridad: this.filtroPrioridad,
      filtroTecnico: this.filtroTecnico,
      filtroCategoria: this.filtroCategoria,
      filtrosEspeciales: this.filtrosEspeciales
    };
    
    this.dataSource.filter = JSON.stringify(filterObj);
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  limpiarFiltros() {
    this.textoBusqueda = '';
    this.filtroEstado = 'activos';
    this.filtroEstadoTicket = 'todos';
    this.filtroPrioridad = 'todas';
    this.filtroTecnico = 'todos';
    this.filtroCategoria = 'todas';
    this.filtrosEspeciales = {
      sinAsignar: false,
      urgentes: false,
      proximosVencer: false,
      vencidos: false,
      resueltosHoy: false
    };
    this.aplicarTodosLosFiltros();
  }

  aplicarFiltroEspecial(tipo: keyof FiltrosEspeciales) {
    const keys: (keyof FiltrosEspeciales)[] = ['sinAsignar', 'urgentes', 'proximosVencer', 'vencidos', 'resueltosHoy'];
    keys.forEach(key => {
      this.filtrosEspeciales[key] = false;
    });
    
    this.filtrosEspeciales[tipo] = true;
    
    this.aplicarTodosLosFiltros();
  }

  cargarTickets() {
    this.cargando.show();
    
    const mostrarEliminados = this.filtroEstado === 'eliminados';
    
    this.ticketsService.lista(mostrarEliminados).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          Swal.fire('Error', res.message || 'Error al cargar tickets', 'error');
          return;
        }
        
        // 🆕 ORDENAR POR SLA - Tickets vencidos aparecen primero
        const ticketsOrdenados = this.slaCalculator.ordenarTicketsPorSLA(res.data || []);
        this.dataSource.data = ticketsOrdenados;
        this.dataSource.paginator = this.paginator;
        this.aplicarTodosLosFiltros();
      },
      error: (err: any) => {
        this.cargando.hide();
        console.error('Error al obtener tickets:', err);
        Swal.fire('Error', 'Error al cargar tickets', 'error');
      }
    });
  }

  // 🆕 NUEVO MÉTODO para obtener información del SLA
  getSlaInfo(ticket: any): SlaEstado {
    return this.slaCalculator.calcularEstadoSLA(ticket);
  }

  openModal(data?: any) {
    const dialogRef = this.dialog.open(TicketModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { 
        ticket: data ? { ...data } : null,
        tecnicos: this.tecnicos,
        categorias: this.categorias,
        subcategorias: this.subcategorias,
        prioridades: this.prioridades
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.actualizarTicket(result);
      }
    });
  }

  private actualizarTicket(ticketData: any) {
    this.cargando.show();
    
    this.ticketsService.actualizar(ticketData.id, ticketData).subscribe({
      next: (response) => {
        this.cargando.hide();
        if (response.isSuccess) {
          Swal.fire({
            title: '✅ Ticket Actualizado',
            text: 'El ticket se ha actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Continuar'
          });
          this.cargarTickets();
        } else {
          Swal.fire('Error', response.message || 'Error al actualizar ticket', 'error');
        }
      },
      error: (error) => {
        this.cargando.hide();
        let errorMessage = 'Error al actualizar ticket';
        
        if (error.error?.message) {
          errorMessage = Array.isArray(error.error.message) 
            ? error.error.message.join(', ') 
            : error.error.message;
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  abrirConversacion(ticket: any) {
    const dialogRef = this.dialog.open(DetalleTicketModalComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'full-screen-modal',
      data: { ticketId: ticket.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.cargarTickets();
      }
    });
  }

  asignarTecnico(ticket: any) {
    if (!ticket.estado) {
      Swal.fire('Error', 'No se puede asignar técnico a un ticket eliminado', 'error');
      return;
    }

    const tecnicosActivos = this.tecnicos.filter(tec => tec.activo && !tec.eliminado);

    if (tecnicosActivos.length === 0) {
      Swal.fire('Error', 'No hay técnicos activos disponibles', 'error');
      return;
    }

    Swal.fire({
      title: 'Asignar Técnico',
      html: `
        <div class="text-left">
          <p class="mb-3 text-gray-600">Selecciona un técnico para el ticket: <strong>${ticket.titulo}</strong></p>
          <select id="tecnicoSelect" class="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">Sin técnico</option>
            ${tecnicosActivos.map(tecnico => `
              <option value="${tecnico.id}" ${ticket.tecnico_id === tecnico.id ? 'selected' : ''}>
                ${tecnico.nombre_usuario} - ${tecnico.correo_electronico}
              </option>
            `).join('')}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Asignar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const select = document.getElementById('tecnicoSelect') as HTMLSelectElement;
        return select.value;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const tecnicoIdValue = result.value;
        
        this.cargando.show();
        
        if (tecnicoIdValue === '') {
          this.ticketsService.actualizar(ticket.id, { tecnico_id: null }).subscribe({
            next: (res: any) => {
              this.cargando.hide();
              if (res.isSuccess) {
                Swal.fire('¡Éxito!', 'Técnico removido correctamente', 'success');
                this.cargarTickets();
              } else {
                Swal.fire('Error', res.message || 'Error al remover técnico', 'error');
              }
            },
            error: (error: any) => {
              this.cargando.hide();
              Swal.fire('Error', 'Error al remover técnico', 'error');
            }
          });
        } else {
          const tecnicoId = Number(tecnicoIdValue);
          this.ticketsService.asignarTecnico(ticket.id, tecnicoId).subscribe({
            next: (res: any) => {
              this.cargando.hide();
              if (res.isSuccess) {
                Swal.fire('¡Éxito!', 'Técnico asignado correctamente', 'success');
                this.cargarTickets();
              } else {
                Swal.fire('Error', res.message || 'Error al asignar técnico', 'error');
              }
            },
            error: (error: any) => {
              this.cargando.hide();
              Swal.fire('Error', 'Error al asignar técnico', 'error');
            }
          });
        }
      }
    });
  }

  marcarResuelto(ticket: any) {
    if (!ticket.estado) {
      Swal.fire('Error', 'No se puede marcar como resuelto un ticket eliminado', 'error');
      return;
    }

    Swal.fire({
      title: '¿Marcar como resuelto?',
      html: `
        <div class="text-left">
          <p class="mb-3">¿Estás seguro de marcar este ticket como resuelto?</p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-sm text-yellow-800">
              <strong>Ticket:</strong> ${ticket.titulo}
            </p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como resuelto',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    }).then((result) => {
      if (result.isConfirmed) {
        const fechaResolucion = new Date().toISOString();
        this.ticketsService.marcarResuelto(ticket.id, fechaResolucion).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Éxito!', 'Ticket marcado como resuelto', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al marcar como resuelto', 'error');
            }
          },
          error: (error: any) => {
            Swal.fire('Error', 'Error al marcar como resuelto', 'error');
          }
        });
      }
    });
  }

  reabrirTicket(ticket: any) {
    Swal.fire({
      title: 'Reabrir Ticket',
      input: 'text',
      inputLabel: 'Motivo de reapertura',
      inputPlaceholder: 'Ingresa el motivo por el cual reabres este ticket...',
      showCancelButton: true,
      confirmButtonText: 'Reabrir',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => {
        if (!value) {
          return 'Debes ingresar un motivo para reabrir el ticket';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        this.ticketsService.reabrirTicket(ticket.id, result.value).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            if (res.isSuccess) {
              Swal.fire('¡Éxito!', 'Ticket reabierto correctamente', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al reabrir ticket', 'error');
            }
          },
          error: (error: any) => {
            this.cargando.hide();
            Swal.fire('Error', 'Error al reabrir ticket', 'error');
          }
        });
      }
    });
  }

  delete(id?: number) {
    if (!id) return;
    Swal.fire({
      title: '¿Eliminar ticket?',
      text: 'El ticket se marcará como eliminado',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ticketsService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', 'El ticket ha sido eliminado.', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar el ticket.', 'error');
            }
          },
          error: (error: any) => {
            Swal.fire('Error', 'Error al eliminar el ticket', 'error');
          }
        });
      }
    });
  }

  restaurar(id?: number) {
    if (!id) return;
    Swal.fire({
      title: '¿Restaurar ticket?',
      text: 'El ticket volverá a estar activo en el sistema',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ticketsService.restaurar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Restaurado!', 'El ticket ha sido restaurado.', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'No se pudo restaurar el ticket.', 'error');
            }
          },
          error: (error: any) => {
            Swal.fire('Error', 'Error al restaurar el ticket', 'error');
          }
        });
      }
    });
  }

  getEstadoInfo(ticket: any) {
    return TicketUtils.getEstadoInfo(ticket);
  }

  getPrioridadClase(ticket: any): string {
    const nivel = ticket.prioridad?.nivel;
    return TicketUtils.getColorPrioridad(nivel);
  }

  getTiempoTranscurrido(fecha: string): string {
    return TicketUtils.getTiempoTranscurrido(fecha);
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.filteredData.map((t: any) => ({
        'ID': t.id || '',
        'Título': t.titulo || '',
        'Descripción': t.descripcion || '',
        'Estado': this.getEstadoInfo(t).label,
        'SLA': this.getSlaInfo(t).texto,
        'Técnico': t.tecnico?.nombre_usuario || 'No asignado',
        'Categoría': t.categoria?.nombre || '',
        'Subcategoría': t.subcategoria?.nombre || '',
        'Prioridad': t.prioridad?.nombre || '',
        'Fecha Creación': new Date(t.fecha_creacion).toLocaleDateString(),
        'Fecha Resolución': t.fecha_resolucion ? new Date(t.fecha_resolucion).toLocaleDateString() : 'Pendiente'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tickets');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `tickets_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Tickets', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Total tickets: ${this.dataSource.filteredData.length}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Título', 'Estado', 'SLA', 'Técnico', 'Prioridad', 'Fecha']],
      body: this.dataSource.filteredData.map((t: any) => [
        t.id || '',
        t.titulo?.substring(0, 25) + (t.titulo?.length > 25 ? '...' : '') || '',
        this.getEstadoInfo(t).label,
        this.getSlaInfo(t).texto,
        t.tecnico?.nombre_usuario?.substring(0, 12) + (t.tecnico?.nombre_usuario?.length > 12 ? '...' : '') || 'No asignado',
        t.prioridad?.nombre || '',
        new Date(t.fecha_creacion).toLocaleDateString()
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`tickets_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}