import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, ElementRef } from '@angular/core';
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

import { UsuarioInterface } from '../../interfaces/usuarios.interface';
import { UsuariosService } from '../../services/usuarios.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';
import { UsuarioModal } from '../usuarios-modal/usuarios-modal';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './usuarios.html'
})
export class UsuariosComponent {
  displayedColumns: string[] = [
    'nombre_usuario',
    'correo_electronico',
    'telefono', 
    'rol',
    'estado',
    'acciones'
  ];
  dataSource = new MatTableDataSource<UsuarioInterface>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('rolFilter') rolFilter!: ElementRef;
  @ViewChild('estadoFilter') estadoFilter!: ElementRef;

  // Variables para filtros avanzados
  filtrosAplicados = false;
  filtroRol: string = '';
  filtroEstado: string = '';

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private usuariosService: UsuariosService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarUsuarios();
  }

  cargarUsuarios() {
    this.cargando.show();
    this.usuariosService.lista().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          if (res.status === 401) {
            this.router.navigate(['/login']);
            return;
          }
          Swal.fire('Error', res.message || 'Error al cargar usuarios', 'error');
          return;
        }

        // Combinar usuarios activos y eliminados
        const usuariosActivos = res.data?.activos || [];
        const usuariosEliminados = res.data?.eliminados || [];
        const todosUsuarios = [...usuariosActivos, ...usuariosEliminados];
        
        this.dataSource.data = todosUsuarios;
        this.dataSource.paginator = this.paginator;

        // Filtro que busque en todos los campos
        this.dataSource.filterPredicate = (data: UsuarioInterface, filter: string) => {
          const dataStr = Object.values(data).join(' ').toLowerCase();
          return dataStr.includes(filter);
        };
      },
      error: (err: any) => {
        this.cargando.hide();
        if (err.status === 401) this.router.navigate(['/login']);
        else console.error('Error al obtener usuarios:', err);
      }
    });
  }

  /** 🔍 APLICAR FILTROS AVANZADOS */
  aplicarFiltrosAvanzados() {
    const rol = this.rolFilter.nativeElement.value;
    const estado = this.estadoFilter.nativeElement.value;

    // Si no hay filtros seleccionados, cargar todos los usuarios
    if (!rol && !estado) {
      this.limpiarFiltros();
      return;
    }

    this.cargando.show();
    this.filtrosAplicados = true;

    // Construir objeto de filtros para el backend
    const filtros: any = {};
    
    if (rol) filtros.rol = rol;
    
    // Mapear estado a los campos correspondientes
    switch (estado) {
      case 'activo':
        filtros.activo = true;
        filtros.eliminado = false;
        break;
      case 'inactivo':
        filtros.activo = false;
        filtros.eliminado = false;
        break;
      case 'bloqueado':
        filtros.bloqueado = true;
        break;
      case 'eliminado':
        filtros.eliminado = true;
        break;
    }

    this.usuariosService.buscarUsuarios(filtros).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          this.dataSource.data = res.data;
          this.dataSource.paginator = this.paginator;
        } else {
          Swal.fire('Info', res.message || 'No se encontraron usuarios', 'info');
        }
      },
      error: (err: any) => {
        this.cargando.hide();
        Swal.fire('Error', 'Error al aplicar filtros', 'error');
        console.error('Error aplicando filtros:', err);
      }
    });
  }

  /** 🗑️ LIMPIAR FILTROS */
  limpiarFiltros() {
    this.filtrosAplicados = false;
    this.filtroRol = '';
    this.filtroEstado = '';
    
    if (this.rolFilter) this.rolFilter.nativeElement.value = '';
    if (this.estadoFilter) this.estadoFilter.nativeElement.value = '';
    
    this.cargarUsuarios();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openModal(data?: UsuarioInterface) {
    const dialogRef = this.dialog.open(UsuarioModal, {
      width: '500px',
      panelClass: 'custom-modal',
      data: data ? { ...data } : { 
        id: 0, 
        nombre_usuario: '', 
        correo_electronico: '', 
        telefono: '', 
        rol: 'CLIENTE', 
        activo: true 
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      
      const obj = {
        nombre_usuario: result.nombre_usuario,
        correo_electronico: result.correo_electronico,
        telefono: result.telefono,
        rol: result.rol
      };

      if (result.id === 0) {
        // ✅ CREAR USUARIO - SIN PASSWORD
        console.log('enviados al backend:', obj);
        this.usuariosService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              const mensaje = res.data.emailEnviado 
                ? 'Usuario creado. Las credenciales se enviaron por email.' 
                : 'Usuario creado, pero falló el envío de email. Contacte al administrador.';
              
              Swal.fire({
                icon: 'success',
                title: '¡Creado!',
                html: mensaje,
                confirmButtonColor: '#2563eb'
              });
              this.cargarUsuarios();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear el usuario', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al crear el usuario', 'error')
        });
      } else {
        // ✅ ACTUALIZAR USUARIO - SIN PASSWORD
        const updateObj: any = { 
          nombre_usuario: result.nombre_usuario,
          correo_electronico: result.correo_electronico,
          telefono: result.telefono,
          rol: result.rol,
          activo: result.activo
        };
        
        this.usuariosService.actualizar(result.id, updateObj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'El usuario ha sido actualizado.', 'success');
              this.cargarUsuarios();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar el usuario', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al actualizar el usuario', 'error')
        });
      }
    });
  }

  delete(id?: number) {
    if (!id) return;
    Swal.fire({
      title: '¿Estás seguro?',
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.usuariosService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'El usuario ha sido eliminado.', 'success');
              this.cargarUsuarios();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar el usuario', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al eliminar el usuario', 'error')
        });
      }
    });
  }

  cambiarEstado(usuario: UsuarioInterface) {
    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} el usuario?`,
      text: `El usuario "${usuario.nombre_usuario}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const obj = {
          nombre_usuario: usuario.nombre_usuario,
          correo_electronico: usuario.correo_electronico,
          telefono: usuario.telefono,
          rol: usuario.rol,
          activo: nuevoEstado
        };

        this.usuariosService.actualizar(usuario.id!, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarUsuarios();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al cambiar el estado', 'error')
        });
      }
    });
  }

  /** 🔓 DESBLOQUEAR USUARIO */
  desbloquearUsuario(usuario: UsuarioInterface) {
    Swal.fire({
      title: '¿Desbloquear usuario?',
      html: `¿Estás seguro de desbloquear a <strong>${usuario.nombre_usuario}</strong>?<br>
             <small class="text-gray-600">Podrá volver a acceder al sistema inmediatamente.</small>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f97316',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, desbloquear',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        
        this.usuariosService.desbloquearUsuario(usuario.id!).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            
            if (res.isSuccess) {
              Swal.fire({
                icon: 'success',
                title: '¡Desbloqueado!',
                text: res.message || 'El usuario ha sido desbloqueado correctamente.',
                confirmButtonColor: '#22c55e'
              });
              this.cargarUsuarios(); // Recargar la lista
            } else {
              Swal.fire('Error', res.message || 'No se pudo desbloquear el usuario', 'error');
            }
          },
          error: (err) => {
            this.cargando.hide();
            Swal.fire('Error', 'Error al desbloquear el usuario', 'error');
            console.error('Error desbloqueando usuario:', err);
          }
        });
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(u => ({
        'Nombre': u.nombre_usuario || '',
        'Correo': u.correo_electronico || '',
        'Teléfono': u.telefono || '',
        'Rol': u.rol || '',
        'Estado': u.activo ? 'Activo' : 'Inactivo',
        'Bloqueado': u.bloqueado ? 'Sí' : 'No',
        'Eliminado': u.eliminado ? 'Sí' : 'No'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Usuarios', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Correo', 'Teléfono', 'Rol', 'Estado', 'Bloqueado']],
      body: this.dataSource.data.map(u => [
        u.nombre_usuario || '',
        u.correo_electronico || '',
        u.telefono || '',
        u.rol || '',
        u.activo ? 'Activo' : 'Inactivo',
        u.bloqueado ? 'Sí' : 'No'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`usuarios_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}