import { Component, inject, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxSpinnerService } from 'ngx-spinner';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { EntidadUsuarioModal } from '../entidades-usuarios-modal/entidades-usuarios-modal';
import { EntidadesUsuariosService } from '../../services/entidades-usuarios.service';
import { UsuariosService } from '../../services/usuarios.service';
import { EntidadesService } from '../../services/entidades.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';
import { CommonModule } from '@angular/common';
import { EntidadUsuarioInterface } from '../../interfaces/entidad-usuario.interface';

@Component({
  selector: 'app-entidades-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './entidades-usuarios.html',
  styleUrls: ['./entidades-usuarios.scss']
})
export class EntidadesUsuariosComponent {
  displayedColumns: string[] = ['usuario', 'entidad', 'cargo', 'rol_sistema', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<EntidadUsuarioInterface>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private entidadUsuarioService: EntidadesUsuariosService,
    private usuariosService: UsuariosService,
    private entidadesService: EntidadesService
  ) {
    this.initializeFilterPredicate();
  }

  private initializeFilterPredicate() {
    this.dataSource.filterPredicate = (data: EntidadUsuarioInterface, filter: string): boolean => {
      const searchStr = filter.toLowerCase();
      const usuarioNombre = data.usuario?.nombre_usuario?.toLowerCase() || '';
      const usuarioEmail = data.usuario?.correo_electronico?.toLowerCase() || '';
      const entidadNombre = data.entidad?.denominacion?.toLowerCase() || '';
      const entidadNit = data.entidad?.nit?.toLowerCase() || '';
      const cargo = data.cargo?.toLowerCase() || '';
      const rol = data.usuario?.rol?.toLowerCase() || '';
      
      return (
        usuarioNombre.includes(searchStr) ||
        usuarioEmail.includes(searchStr) ||
        entidadNombre.includes(searchStr) ||
        entidadNit.includes(searchStr) ||
        cargo.includes(searchStr) ||
        rol.includes(searchStr)
      );
    };
  }

  ngOnInit() {
    this.global.validacionToken();
    this.cargarEntidadesUsuarios();
  }

  cargarEntidadesUsuarios() {
    this.cargando.show();

    this.entidadUsuarioService.lista().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          Swal.fire('Error', res.message || 'Error al cargar asignaciones', 'error');
          return;
        }
        
        let dataArray: EntidadUsuarioInterface[] = [];
        
        if (Array.isArray(res.data)) {
          dataArray = res.data;
        } else if (res.data && typeof res.data === 'object') {
          dataArray = Object.values(res.data);
        }
        
        this.dataSource.data = dataArray || [];
        this.dataSource.paginator = this.paginator;
        
        console.log('Asignaciones cargadas:', this.dataSource.data.length);
      },
      error: (err) => {
        this.cargando.hide();
        console.error('Error al obtener asignaciones:', err);
        if (err.status === 401) {
          this.router.navigate(['/login']);
          return;
        }
        Swal.fire('Error', 'Error al cargar asignaciones', 'error');
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Métodos para estadísticas
  getUsuariosUnicos(): number {
    const usuariosIds = new Set(this.dataSource.data.map(item => item.usuarioId));
    return usuariosIds.size;
  }

  getEntidadesUnicas(): number {
    const entidadesIds = new Set(this.dataSource.data.map(item => item.entidadId));
    return entidadesIds.size;
  }

  // Método para ver asignaciones por entidad
  verUsuariosPorEntidad(entidadId: number) {
    const usuariosEntidad = this.dataSource.data.filter(item => 
      item.entidadId === entidadId && item.activo
    );
    
    if (usuariosEntidad.length === 0) {
      Swal.fire('Info', 'Esta entidad no tiene usuarios asignados activos', 'info');
      return;
    }

    const usuariosLista = usuariosEntidad.map(eu => 
      `• ${eu.usuario?.nombre_usuario} - ${eu.cargo} (${eu.usuario?.correo_electronico})`
    ).join('\n');

    const entidad = usuariosEntidad[0].entidad;

    Swal.fire({
      title: `Usuarios de: ${entidad?.denominacion}`,
      html: `
        <div class="text-left">
          <p><strong>NIT:</strong> ${entidad?.nit}</p>
          <p><strong>Total usuarios activos:</strong> ${usuariosEntidad.length}</p>
          <hr class="my-3">
          <div class="max-h-60 overflow-y-auto">
            ${usuariosEntidad.map(eu => 
              `<div class="mb-2 p-2 bg-gray-50 rounded">
                <strong>${eu.usuario?.nombre_usuario}</strong><br>
                <span class="text-sm">${eu.cargo} • ${eu.usuario?.correo_electronico}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: 600
    });
  }

  // Método para ver entidades por usuario
  verEntidadesPorUsuario(usuarioId: number) {
    const entidadesUsuario = this.dataSource.data.filter(item => 
      item.usuarioId === usuarioId && item.activo
    );
    
    if (entidadesUsuario.length === 0) {
      Swal.fire('Info', 'Este usuario no tiene entidades asignadas activas', 'info');
      return;
    }

    const usuario = entidadesUsuario[0].usuario;

    Swal.fire({
      title: `Entidades de: ${usuario?.nombre_usuario}`,
      html: `
        <div class="text-left">
          <p><strong>Email:</strong> ${usuario?.correo_electronico}</p>
          <p><strong>Total entidades activas:</strong> ${entidadesUsuario.length}</p>
          <hr class="my-3">
          <div class="max-h-60 overflow-y-auto">
            ${entidadesUsuario.map(eu => 
              `<div class="mb-2 p-2 bg-gray-50 rounded">
                <strong>${eu.entidad?.denominacion}</strong><br>
                <span class="text-sm">${eu.cargo} • NIT: ${eu.entidad?.nit}</span>
              </div>`
            ).join('')}
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: 600
    });
  }

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

  openModal(data?: EntidadUsuarioInterface) {
    const dialogRef = this.dialog.open(EntidadUsuarioModal, {
      width: '500px',
      maxHeight: '90vh',
      panelClass: 'scrollable-dialog',
      data: data ? { ...data } : { 
        id: 0, 
        entidadId: null, 
        usuarioId: null, 
        cargo: '', 
        activo: true 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.procesarModalResult(result);
      }
    });
  }

  private procesarModalResult(result: any) {
    const obj = {
      entidadId: Number(result.entidadId),
      usuarioId: Number(result.usuarioId),
      cargo: result.cargo,
      activo: result.activo
    };

    if (result.id === 0) {
      this.crearAsignacion(obj);
    } else {
      this.actualizarAsignacion(result.id, obj);
    }
  }

  private crearAsignacion(obj: any) {
    this.cargando.show();
    this.entidadUsuarioService.crear(obj).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          Swal.fire('¡Creado!', res.message || 'La asignación ha sido creada.', 'success');
          this.cargarEntidadesUsuarios();
          this.actualizarEstadosGlobales();
        } else {
          Swal.fire('Error', res.message || 'No se pudo crear la asignación.', 'error');
        }
      },
      error: (error) => {
        this.cargando.hide();
        const errorMessage = this.handleError(error, 'Error al crear la asignación');
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  private actualizarAsignacion(id: number, obj: any) {
    this.cargando.show();
    this.entidadUsuarioService.actualizar(id, obj).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          Swal.fire('¡Actualizado!', res.message || 'La asignación ha sido actualizada.', 'success');
          this.cargarEntidadesUsuarios();
          this.actualizarEstadosGlobales();
        } else {
          Swal.fire('Error', res.message || 'No se pudo actualizar la asignación.', 'error');
        }
      },
      error: (error) => {
        this.cargando.hide();
        const errorMessage = this.handleError(error, 'Error al actualizar la asignación');
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  // 🔄 ACTUALIZAR ESTADOS GLOBALES
  private actualizarEstadosGlobales() {
    console.log('Actualizando estados globales del sistema...');
    // Opcional: Recargar listas maestras si es necesario
    this.usuariosService.lista().subscribe();
    this.entidadesService.lista().subscribe();
  }

  delete(id?: number) {
    if (!id) return;
    
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡Esta acción eliminará la relación entre el usuario y la entidad!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        this.entidadUsuarioService.eliminar(id).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'La asignación ha sido eliminada.', 'success');
              this.cargarEntidadesUsuarios();
              this.actualizarEstadosGlobales();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar la asignación.', 'error');
            }
          },
          error: (error) => {
            this.cargando.hide();
            const errorMessage = this.handleError(error, 'Error al eliminar la asignación');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  cambiarEstado(entidadUsuario: EntidadUsuarioInterface) {
    const nuevoEstado = !entidadUsuario.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} la asignación?`,
      html: `
        <div class="text-left">
          <p><strong>Usuario:</strong> ${entidadUsuario.usuario?.nombre_usuario}</p>
          <p><strong>Entidad:</strong> ${entidadUsuario.entidad?.denominacion}</p>
          <p><strong>Cargo:</strong> ${entidadUsuario.cargo}</p>
          <p class="mt-2 text-${nuevoEstado ? 'green' : 'red'}-600 font-semibold">
            El usuario ${nuevoEstado ? 'tendrá' : 'perderá'} acceso a esta entidad.
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        this.entidadUsuarioService.toggleActivo(entidadUsuario.id).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarEntidadesUsuarios();
              this.actualizarEstadosGlobales();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado.', 'error');
            }
          },
          error: (error) => {
            this.cargando.hide();
            const errorMessage = this.handleError(error, 'Error al cambiar el estado');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  // 🔍 FILTROS ESPECIALES
  filtrarSoloActivos() {
    this.dataSource.filterPredicate = (data: EntidadUsuarioInterface, filter: string): boolean => {
      return data.activo === true && 
             data.usuario?.activo === true && 
             data.entidad?.estado === true;
    };
    this.dataSource.filter = 'activos';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  filtrarSoloInactivos() {
    this.dataSource.filterPredicate = (data: EntidadUsuarioInterface, filter: string): boolean => {
      return data.activo === false || 
             data.usuario?.activo === false || 
             data.entidad?.estado === false;
    };
    this.dataSource.filter = 'inactivos';
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  quitarFiltros() {
    this.dataSource.filter = '';
    this.initializeFilterPredicate();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  exportExcel() {
    const dataToExport = this.dataSource.filteredData.length > 0 ? 
      this.dataSource.filteredData : this.dataSource.data;

    const worksheet = XLSX.utils.json_to_sheet(
      dataToExport.map(eu => ({
        'Usuario': eu.usuario?.nombre_usuario || '',
        'Email': eu.usuario?.correo_electronico || '',
        'Teléfono': eu.usuario?.telefono || '',
        'Entidad': eu.entidad?.denominacion || '',
        'NIT Entidad': eu.entidad?.nit || '',
        'Cargo': eu.cargo || '',
        'Rol Sistema': eu.usuario?.rol || '',
        'Estado Asignación': eu.activo ? 'Activo' : 'Inactivo',
        'Estado Usuario': eu.usuario?.activo ? 'Activo' : 'Inactivo',
        'Estado Entidad': eu.entidad?.estado ? 'Activa' : 'Inactiva',
        'Fecha Creación': eu.created_at ? new Date(eu.created_at).toLocaleDateString() : ''
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entidades-Usuarios');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `asignaciones_entidades_usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const dataToExport = this.dataSource.filteredData.length > 0 ? 
      this.dataSource.filteredData : this.dataSource.data;

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Asignaciones Entidad-Usuario', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    doc.text(`Total asignaciones: ${dataToExport.length}`, 14, 28);
    doc.text(`Usuarios únicos: ${this.getUsuariosUnicos()}`, 14, 34);
    doc.text(`Entidades únicas: ${this.getEntidadesUnicas()}`, 14, 40);
    
    autoTable(doc, {
      startY: 45,
      head: [['Usuario', 'Email', 'Entidad', 'Cargo', 'Rol', 'Estado']],
      body: dataToExport.map(eu => [
        eu.usuario?.nombre_usuario || '',
        eu.usuario?.correo_electronico || '',
        eu.entidad?.denominacion || '',
        eu.cargo || '',
        eu.usuario?.rol || '',
        eu.activo ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    
    doc.save(`asignaciones_entidades_usuarios_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Método para obtener el badge de estado compuesto
  getEstadoCompleto(element: EntidadUsuarioInterface): string {
    if (!element.activo) return 'Asignación Inactiva';
    if (!element.usuario?.activo) return 'Usuario Inactivo';
    if (!element.entidad?.estado) return 'Entidad Inactiva';
    return 'Completamente Activo';
  }
}