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
import { DetalleTicketModalComponent } from '../detalle-ticket-modal/detalle-ticket-modal';
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
    'id',
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

  // Filtros simplificados
  filtroEstado: string = 'activos';
  textoBusqueda: string = '';

  // Datos para filtros
  tecnicos: any[] = [];
  prioridades: any[] = [];
  categorias: any[] = [];
  subcategorias: any[] = [];
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
    // Cargar técnicos activos
    this.cargarTecnicos();

    // Cargar subcategorías
    this.subcategoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.subcategorias = res.data || [];
          console.log('✅ Subcategorías cargadas en TicketsComponent:', this.subcategorias.length);
        console.log('📋 Ejemplo de subcategoría:', this.subcategorias[0]);
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

  cargarTecnicos() {
    this.usuariosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          let dataArray: any[] = [];
          
          if (Array.isArray(res.data)) {
            dataArray = res.data;
          } else if (res.data && typeof res.data === 'object') {
            if (res.data.activos || res.data.eliminados) {
              dataArray = [...(res.data.activos || []), ...(res.data.eliminados || [])];
            } else {
              dataArray = Object.values(res.data);
            }
          }
          
          // ✅ SOLO usuarios TECNICO activos y no eliminados
          this.tecnicos = dataArray.filter((u: any) => 
            !u.eliminado && u.rol === 'TECNICO' && u.activo
          );
          
          console.log('Técnicos activos cargados:', this.tecnicos.length);
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
        
        this.dataSource.data = res.data || [];
        this.dataSource.paginator = this.paginator;
        
        // Aplicar filtro de búsqueda si existe
        if (this.textoBusqueda) {
          this.aplicarBusqueda();
        }
      },
      error: (err: any) => {
        this.cargando.hide();
        console.error('Error al obtener tickets:', err);
        Swal.fire('Error', 'Error al cargar tickets', 'error');
      }
    });
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

  cambiarFiltroEstado() {
    this.cargarTickets();
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
        subcategorias: this.subcategorias,
        prioridades: this.prioridades,
        slas: this.slas,
        contratos: this.contratos,
        entidadesUsuarios: this.entidadesUsuarios
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // ✅ NUEVO: Usar el método actualizarTicket en lugar de cargarTickets directamente
        this.actualizarTicket(result);
      }
    });
  }

  // ✅ NUEVO MÉTODO: Insertar DESPUÉS de openModal
  // En tu TicketsComponent, reemplaza el método actualizarTicket con este:

private actualizarTicket(ticketData: any) {
  this.cargando.show();
  
  console.log('🔍 Datos recibidos del modal:', ticketData);
  
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
        this.cargarTickets(); // Recargar la lista
      } else {
        console.error('❌ Error del backend:', response);
        Swal.fire('Error', response.message || 'Error al actualizar ticket', 'error');
      }
    },
    error: (error) => {
      this.cargando.hide();
      console.error('❌ Error completo al actualizar:', error);
      console.error('🔍 Detalles del error:', error.error);
      
      // Mostrar mensaje más específico
      let errorMessage = 'Error al actualizar ticket';
      
      if (error.error?.message) {
        if (Array.isArray(error.error.message)) {
          errorMessage = error.error.message.join(', ');
        } else {
          errorMessage = error.error.message;
        }
      } else if (error.status === 400) {
        errorMessage = 'Datos inválidos enviados al servidor';
      }
      
      Swal.fire({
        title: '❌ Error',
        html: `
          <div class="text-left">
            <p class="mb-2">${errorMessage}</p>
            <details class="text-xs text-gray-600 mt-2">
              <summary>Ver detalles técnicos</summary>
              <pre class="mt-1 p-2 bg-gray-100 rounded overflow-auto">${JSON.stringify(error.error, null, 2)}</pre>
            </details>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
    }
  });
}

  // MÉTODO CORREGIDO: Abrir conversación del ticket usando el modal existente
  abrirConversacion(ticket: any) {
    console.log('Abriendo modal de detalle para ticket:', ticket.id);
    
    const dialogRef = this.dialog.open(DetalleTicketModalComponent, {
      width: '95vw',
      maxWidth: '1200px',
      height: '90vh',
      panelClass: 'full-screen-modal',
      data: { ticketId: ticket.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('Modal de detalle cerrado con resultado:', result);
      if (result === 'updated') {
        console.log('Recargando lista de tickets...');
        this.cargarTickets();
      }
    });
  }

  asignarTecnico(ticket: any) {
    if (!ticket.estado) {
      Swal.fire('Error', 'No se puede asignar técnico a un ticket eliminado', 'error');
      return;
    }

    // Filtrar técnicos activos
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
            ${tecnicosActivos.map(tecnico => `
              <option value="${tecnico.id}">
                ${tecnico.nombre_usuario} - ${tecnico.correo_electronico} 
                ${tecnico.activo ? '✅' : '❌'}
              </option>
            `).join('')}
          </select>
          <div class="mt-2 text-xs text-gray-500">
            Total técnicos activos: ${tecnicosActivos.length}
          </div>
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
        const tecnicoId = Number(result.value);
        const tecnicoSeleccionado = tecnicosActivos.find(t => t.id === tecnicoId);
        
        this.cargando.show();
        this.ticketsService.asignarTecnico(ticket.id, tecnicoId).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            if (res.isSuccess) {
              Swal.fire({
                title: '¡Técnico Asignado!',
                html: `
                  <div class="text-center">
                    <div class="text-green-500 text-4xl mb-3">✅</div>
                    <p class="text-gray-700 mb-2">Técnico asignado correctamente</p>
                    <p class="text-sm text-gray-600">
                      <strong>${tecnicoSeleccionado?.nombre_usuario}</strong> ha sido asignado al ticket
                    </p>
                  </div>
                `,
                icon: 'success',
                confirmButtonText: 'Continuar'
              });
              this.cargarTickets();
            } else {
              Swal.fire('Error', res.message || 'Error al asignar técnico', 'error');
            }
          },
          error: (error: any) => {
            this.cargando.hide();
            const errorMessage = this.handleError(error, 'Error al asignar técnico');
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
      html: `
        <div class="text-left">
          <p class="mb-3">¿Estás seguro de marcar este ticket como resuelto?</p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p class="text-sm text-yellow-800">
              <strong>Ticket:</strong> ${ticket.titulo}<br>
              <strong>Técnico:</strong> ${ticket.tecnico?.nombre_usuario || 'No asignado'}
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
              Swal.fire({
                title: '¡Ticket Resuelto!',
                html: `
                  <div class="text-center">
                    <div class="text-green-500 text-4xl mb-3">🎉</div>
                    <p class="text-gray-700 mb-2">Ticket marcado como resuelto</p>
                    <p class="text-sm text-gray-600">
                      El ticket ha sido cerrado satisfactoriamente
                    </p>
                  </div>
                `,
                icon: 'success',
                confirmButtonText: 'Continuar'
              });
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
      title: '¿Eliminar ticket?',
      text: 'El ticket se marcará como eliminado (soft delete)',
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
        'ID': t.id || '',
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
        'Estado': this.getEstadoCompleto(t),
        'Reaperturas': t.veces_reabierto || 0
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
      head: [['ID', 'Título', 'Entidad', 'Técnico', 'Prioridad', 'Estado', 'Fecha']],
      body: this.dataSource.data.map((t: any) => [
        t.id || '',
        t.titulo?.substring(0, 25) + (t.titulo?.length > 25 ? '...' : '') || '',
        t.entidad_usuario?.entidad?.denominacion?.substring(0, 15) + (t.entidad_usuario?.entidad?.denominacion?.length > 15 ? '...' : '') || '',
        t.tecnico?.nombre_usuario?.substring(0, 12) + (t.tecnico?.nombre_usuario?.length > 12 ? '...' : '') || 'No asignado',
        t.prioridad?.nombre || '',
        this.getEstadoCompleto(t),
        new Date(t.fecha_creacion).toLocaleDateString()
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`tickets_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // ================== MÉTODOS NUEVOS PARA INFORMACIÓN DETALLADA ==================

  /** Obtener información completa del estado */
  getEstadoCompleto(ticket: any): string {
    if (!ticket.estado) return 'Eliminado';
    if (ticket.fecha_resolucion) return 'Resuelto';
    if (ticket.estado_ticket === 'REABIERTO') return 'Reabierto';
    if (ticket.tecnico_id) return 'Asignado';
    return 'Nuevo';
  }

  /** Verificar si el ticket fue reabierto */
  esReabierto(ticket: any): boolean {
    return ticket.estado_ticket === 'REABIERTO' || ticket.veces_reabierto > 0;
  }

  /** Obtener información de reaperturas */
  getInfoReaperturas(ticket: any): string {
    if (!ticket.veces_reabierto || ticket.veces_reabierto === 0) {
      return '';
    }
    
    const veces = ticket.veces_reabierto;
    const ultimaReapertura = ticket.ultima_reapertura ? 
      new Date(ticket.ultima_reapertura).toLocaleDateString('es-ES') : 'No disponible';
    
    return `Reabierto ${veces} vez${veces > 1 ? 'es' : ''}. Última: ${ultimaReapertura}`;
  }

  /** Obtener información de cierre */
  getInfoCierre(ticket: any): string {
    if (!ticket.fecha_resolucion) return '';
    
    const fechaCierre = new Date(ticket.fecha_resolucion).toLocaleDateString('es-ES');
    return `Cerrado el ${fechaCierre}`;
  }

  /** Obtener tiempo transcurrido desde creación */
  getTiempoTranscurrido(fecha: string): string {
    if (!fecha) return 'Fecha no disponible';
    
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

  /** Obtener color según prioridad */
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

  /** Obtener información del técnico */
  getInfoTecnico(ticket: any): string {
    if (!ticket.tecnico) return 'No asignado';
    
    const tecnico = ticket.tecnico;
    return `${tecnico.nombre_usuario}${tecnico.activo ? ' ✅' : ' ❌'}`;
  }

  /** Obtener información de subcategoría */
  getInfoSubcategoria(ticket: any): string {
    if (!ticket.subcategoria) return 'Sin subcategoría';
    return ticket.subcategoria.nombre;
  }

  /** Obtener clase CSS para el estado */
  getClaseEstado(ticket: any): string {
    if (!ticket.estado) return 'bg-red-100 text-red-800';
    if (ticket.fecha_resolucion) return 'bg-green-100 text-green-800';
    if (this.esReabierto(ticket)) return 'bg-purple-100 text-purple-800';
    if (ticket.tecnico_id) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  }

  /** Obtener icono para el estado */
  getIconoEstado(ticket: any): string {
    if (!ticket.estado) return 'delete';
    if (ticket.fecha_resolucion) return 'check_circle';
    if (this.esReabierto(ticket)) return 'refresh';
    if (ticket.tecnico_id) return 'assignment_ind';
    return 'fiber_new';
  }
}