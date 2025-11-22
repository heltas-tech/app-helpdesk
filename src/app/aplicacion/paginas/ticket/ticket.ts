import { Component, ViewChild, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { TicketModalComponent } from '../ticket-modal/ticket-modal';
import { TicketsService } from '../../services/ticket.service';
import { UsuariosService } from '../../services/usuarios.service';
import { CategoriasService } from '../../services/categorias.service';
import { SubcategoriasService } from '../../services/subcategorias.service';
import { PrioridadesService } from '../../services/prioridades.service';
import { SlasService } from '../../services/slas.service';
import { ContratosService } from '../../services/contratos.service';
import { EntidadesUsuariosService } from '../../services/entidades-usuarios.service';
import { GlobalFuntions } from '../../services/global-funtions';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule
  ],
  templateUrl: './ticket.html'
})
export class TicketsComponent implements OnInit {
  displayedColumns: string[] = [
    'titulo', 
    'descripcion', 
    'entidad_usuario', 
    'tecnico', 
    'categoria', 
    'prioridad', 
    'sla', 
    'contrato',
    'fecha_creacion',
    'estado', 
    'acciones'
  ];
  dataSource = new MatTableDataSource<any>([]);
  private router = inject(Router);

  // Filtros
  filtroEstado: string = 'todos';
  filtroPrioridad: string = 'todas';
  filtroTecnico: string = 'todos';

  // Datos para filtros
  tecnicos: any[] = [];
  prioridades: any[] = [];
  categorias: any[] = [];
  subcategorias: any[] = []; // Para el modal
  slas: any[] = [];
  contratos: any[] = [];
  entidadesUsuarios: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFuntions,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private ticketsService: TicketsService,
    private usuariosService: UsuariosService,
    private categoriasService: CategoriasService,
    private subcategoriasService: SubcategoriasService,
    private prioridadesService: PrioridadesService,
    private slasService: SlasService,
    private contratosService: ContratosService,
    private entidadesUsuariosService: EntidadesUsuariosService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarDatosIniciales();
    this.cargarTickets();
  }

  cargarDatosIniciales() {
    // Cargar técnicos (usuarios con rol TECNICO) - SIGUIENDO TU PATRÓN
    this.cargarTecnicos();

    // Cargar subcategorías para el modal
    this.subcategoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.subcategorias = res.data || [];
          console.log('Subcategorías cargadas:', this.subcategorias.length);
        }
      },
      error: (err: any) => console.error('Error cargando subcategorías:', err)
    });

    // Cargar prioridades
    this.prioridadesService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.prioridades = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando prioridades:', err)
    });

    // Cargar categorías
    this.categoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.categorias = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando categorías:', err)
    });

    // Cargar SLAs
    this.slasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.slas = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando SLAs:', err)
    });

    // Cargar contratos activos
    this.contratosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.contratos = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando contratos:', err)
    });

    // Cargar entidades usuarios
    this.entidadesUsuariosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.entidadesUsuarios = res.data || [];
        }
      },
      error: (err: any) => console.error('Error cargando entidades usuarios:', err)
    });
  }

  // NUEVO MÉTODO para cargar técnicos siguiendo tu patrón
  cargarTecnicos() {
    this.usuariosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          let dataArray: any[] = [];
          
          // Manejar diferentes estructuras de respuesta (igual que tu ejemplo)
          if (Array.isArray(res.data)) {
            dataArray = res.data;
          } else if (res.data && typeof res.data === 'object') {
            if (res.data.activos || res.data.eliminados) {
              dataArray = [...(res.data.activos || []), ...(res.data.eliminados || [])];
            } else {
              dataArray = Object.values(res.data);
            }
          }
          
          // ✅ SOLO usuarios TECNICO y no eliminados (igual que tu filtro para CLIENTE)
          this.tecnicos = dataArray.filter((u: any) => 
            !u.eliminado && u.rol === 'TECNICO'
          );
          
          console.log('Técnicos cargados:', this.tecnicos.length);
          this.tecnicos.forEach(tec => {
            console.log(`Técnico: ${tec.nombre_usuario} - ${tec.correo_electronico} - Rol: ${tec.rol} - Activo: ${tec.activo}`);
          });
        } else {
          console.warn('No se pudieron cargar los técnicos:', res.message);
          this.tecnicos = [];
        }
      },
      error: (err: any) => {
        console.error('Error cargando técnicos:', err);
        this.global.mostrarMensaje('Error al cargar técnicos', 'error');
        this.tecnicos = [];
      }
    });
  }

  cargarTickets(mostrarEliminados: boolean = false) {
    this.cargando.show();
    
    this.ticketsService.lista(mostrarEliminados).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          Swal.fire('Error', res.message || 'Error al cargar tickets', 'error');
          return;
        }
        
        this.dataSource.data = res.data || [];
        this.dataSource.paginator = this.paginator;
        
        // Aplicar filtros iniciales
        this.aplicarFiltros();
      },
      error: (err: any) => {
        this.cargando.hide();
        console.error('Error al obtener tickets:', err);
        Swal.fire('Error', 'Error al cargar tickets', 'error');
      }
    });
  }

  aplicarFiltros() {
    this.dataSource.filterPredicate = (data: any, filter: string) => {
      const searchStr = filter.toLowerCase();
      return (
        data.titulo?.toLowerCase().includes(searchStr) ||
        data.descripcion?.toLowerCase().includes(searchStr) ||
        data.entidad_usuario?.entidad?.denominacion?.toLowerCase().includes(searchStr) ||
        data.tecnico?.nombre_usuario?.toLowerCase().includes(searchStr) ||
        data.categoria?.nombre?.toLowerCase().includes(searchStr) ||
        data.prioridad?.nombre?.toLowerCase().includes(searchStr)
      );
    };
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onFiltroChange() {
    let filteredData = this.dataSource.data;

    // Filtrar por estado
    if (this.filtroEstado !== 'todos') {
      if (this.filtroEstado === 'activos') {
        filteredData = filteredData.filter((ticket: any) => ticket.estado);
      } else if (this.filtroEstado === 'eliminados') {
        filteredData = filteredData.filter((ticket: any) => !ticket.estado);
      } else if (this.filtroEstado === 'resueltos') {
        filteredData = filteredData.filter((ticket: any) => ticket.fecha_resolucion);
      } else if (this.filtroEstado === 'asignados') {
        filteredData = filteredData.filter((ticket: any) => ticket.tecnico_id);
      }
    }

    // Filtrar por prioridad
    if (this.filtroPrioridad !== 'todas') {
      filteredData = filteredData.filter((ticket: any) => 
        ticket.prioridad?.nivel?.toString() === this.filtroPrioridad
      );
    }

    // Filtrar por técnico
    if (this.filtroTecnico !== 'todos') {
      filteredData = filteredData.filter((ticket: any) => 
        ticket.tecnico_id?.toString() === this.filtroTecnico
      );
    }

    this.dataSource.data = filteredData;
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  // Función helper para manejar errores
  private handleError(error: any, defaultMessage: string): string {
    if (error.error?.message) {
      if (Array.isArray(error.error.message)) {
        return error.error.message[0];
      } else {
        return error.error.message;
      }
    } else if (error.message) {
      return error.message;
    }
    return defaultMessage;
  }

  openModal(data?: any) {
    const dialogRef = this.dialog.open(TicketModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { 
        ticket: data ? { ...data } : null,
        tecnicos: this.tecnicos,
        categorias: this.categorias,
        subcategorias: this.subcategorias, // PASAMOS LAS SUBCATEGORÍAS
        prioridades: this.prioridades,
        slas: this.slas,
        contratos: this.contratos,
        entidadesUsuarios: this.entidadesUsuarios
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.cargarTickets();
      }
    });
  }

  asignarTecnico(ticket: any) {
    if (!ticket.estado) {
      Swal.fire('Error', 'No se puede asignar técnico a un ticket eliminado', 'error');
      return;
    }

    Swal.fire({
      title: 'Asignar Técnico',
      input: 'select',
      inputOptions: this.tecnicos.reduce((options, tecnico) => {
        options[tecnico.id] = `${tecnico.nombre_usuario} - ${tecnico.correo_electronico}`;
        return options;
      }, {} as any),
      inputPlaceholder: 'Selecciona un técnico',
      showCancelButton: true,
      confirmButtonText: 'Asignar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const tecnicoId = Number(result.value);
        this.ticketsService.asignarTecnico(ticket.id, tecnicoId).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Asignado!', 'Técnico asignado correctamente', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al asignar técnico', 'error');
            }
          },
          error: (error: any) => {
            const errorMessage = this.handleError(error, 'Error al asignar técnico');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  cambiarEstado(ticket: any) {
    const nuevoEstado = !ticket.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} el ticket?`,
      text: `El ticket "${ticket.titulo}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ticketsService.cambiarEstado(ticket.id, nuevoEstado).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', 'El estado ha sido cambiado.', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado.', 'error');
            }
          },
          error: (error: any) => {
            const errorMessage = this.handleError(error, 'Error al cambiar el estado');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
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
      text: 'Esta acción no se puede deshacer',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como resuelto',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const fechaResolucion = new Date().toISOString();
        this.ticketsService.marcarResuelto(ticket.id, fechaResolucion).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Resuelto!', 'Ticket marcado como resuelto', 'success');
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al marcar como resuelto', 'error');
            }
          },
          error: (error: any) => {
            const errorMessage = this.handleError(error, 'Error al marcar como resuelto');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  delete(id?: number) {
    if (!id) return;
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'El ticket se marcará como eliminado (soft delete)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
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
            const errorMessage = this.handleError(error, 'Error al eliminar el ticket');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  restaurar(id?: number) {
    if (!id) return;
    Swal.fire({
      title: '¿Restaurar ticket?',
      text: 'El ticket volverá a estar activo',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar'
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
            const errorMessage = this.handleError(error, 'Error al restaurar el ticket');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map((t: any) => ({
        'Título': t.titulo || '',
        'Descripción': t.descripcion || '',
        'Entidad': t.entidad_usuario?.entidad?.denominacion || '',
        'Reportado por': t.entidad_usuario?.usuario?.nombre_usuario || '',
        'Técnico': t.tecnico?.nombre_usuario || 'No asignado',
        'Categoría': t.categoria?.nombre || '',
        'Subcategoría': t.subcategoria?.nombre || '',
        'Prioridad': t.prioridad?.nombre || '',
        'SLA': t.sla?.nombre || '',
        'Contrato': t.contrato?.numero_contrato || '',
        'Fecha Creación': new Date(t.fecha_creacion).toLocaleDateString(),
        'Fecha Resolución': t.fecha_resolucion ? new Date(t.fecha_resolucion).toLocaleDateString() : 'Pendiente',
        'Estado': t.estado ? (t.fecha_resolucion ? 'Resuelto' : 'Activo') : 'Eliminado',
        'Creado por': t.created_by || ''
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
    doc.text(`Total tickets: ${this.dataSource.data.length}`, 14, 28);
    
    autoTable(doc, {
      startY: 35,
      head: [['Título', 'Entidad', 'Técnico', 'Prioridad', 'Estado', 'Fecha Creación']],
      body: this.dataSource.data.map((t: any) => [
        t.titulo?.substring(0, 30) + (t.titulo?.length > 30 ? '...' : '') || '',
        t.entidad_usuario?.entidad?.denominacion?.substring(0, 20) + (t.entidad_usuario?.entidad?.denominacion?.length > 20 ? '...' : '') || '',
        t.tecnico?.nombre_usuario?.substring(0, 15) + (t.tecnico?.nombre_usuario?.length > 15 ? '...' : '') || 'No asignado',
        t.prioridad?.nombre || '',
        t.estado ? (t.fecha_resolucion ? 'Resuelto' : 'Activo') : 'Eliminado',
        new Date(t.fecha_creacion).toLocaleDateString()
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`tickets_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Utilidades
  getTiempoTranscurrido(fecha: string): string {
    const creado = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - creado.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 0) {
      return `${diffDias} día${diffDias > 1 ? 's' : ''}`;
    } else if (diffHoras > 0) {
      return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    } else {
      return 'Menos de 1 hora';
    }
  }

  getColorPrioridad(nivel: number): string {
    if (nivel >= 4) return 'bg-red-100 text-red-800 border-red-200';
    if (nivel >= 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (nivel >= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  }

  getUrgenciaPrioridad(nivel: number): string {
    if (nivel >= 4) return 'Crítica';
    if (nivel >= 3) return 'Alta';
    if (nivel >= 2) return 'Media';
    return 'Baja';
  }
}