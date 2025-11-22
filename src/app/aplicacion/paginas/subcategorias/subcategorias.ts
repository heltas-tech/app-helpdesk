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
  
import { SubcategoriaModal } from '../subcategorias-modal/subcategorias-modal';
import { SubcategoriasService } from '../../services/subcategorias.service';
import { CategoriasService } from '../../services/categorias.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subcategorias',
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './subcategorias.html'
})
export class SubcategoriasComponent {
  displayedColumns: string[] = ['nombre', 'descripcion', 'categoria', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<any>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private subcategoriaService: SubcategoriasService,
    private categoriaService: CategoriasService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarSubcategorias();
  }

  cargarSubcategorias() {
    this.cargando.show();

    // Primero obtenemos categorías activas
    this.categoriaService.lista().subscribe({
      next: (resCat: any) => {
        const categoriasActivas = (resCat.data || []).filter((c: any) => c.estado);

        // Luego subcategorías
        this.subcategoriaService.lista().subscribe({
          next: (resSub: any) => {
            this.cargando.hide();
            if (resSub.isSuccess === false) {
              Swal.fire('Error', resSub.message || 'Error al cargar subcategorías', 'error');
              return;
            }
            
            this.dataSource.data = (resSub.data || []).map((sub: any) => {
              const cat = categoriasActivas.find((c: any) => c.id === sub.categoria_id);
              return { 
                ...sub, 
                categoria_nombre: cat ? cat.nombre : 'No asignada',
                categoria_estado: cat ? cat.estado : false
              };
            });
            this.dataSource.paginator = this.paginator;
          },
          error: (err) => {
            this.cargando.hide();
            console.error('Error al obtener subcategorías:', err);
            Swal.fire('Error', 'Error al cargar subcategorías', 'error');
          }
        });
      },
      error: (err) => {
        this.cargando.hide();
        console.error('Error al obtener categorías:', err);
        Swal.fire('Error', 'Error al cargar categorías', 'error');
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  // Función helper para manejar errores
  private handleError(error: any, defaultMessage: string): string {
    if (error.error?.message) {
      // Si es un array, tomar el primer mensaje
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
    const dialogRef = this.dialog.open(SubcategoriaModal, {
      width: '500px',
      data: data ? { ...data } : { 
        id: 0, 
        nombre: '', 
        descripcion: '', 
        estado: true, 
        categoria_id: null 
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      const categoria_id  = Number(result.categoria_id);

      const obj = {
        nombre: result.nombre,
        descripcion: result.descripcion,
        estado: result.estado,
        categoria_id: categoria_id
      };

      if (result.id === 0) {
        // Crear nueva subcategoría
        this.subcategoriaService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Creado!', res.message || 'La subcategoría ha sido creada.', 'success');
              this.cargarSubcategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear la subcategoría.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al crear la subcategoría');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      } else {
        // Actualizar subcategoría existente
        this.subcategoriaService.actualizar(result.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'La subcategoría ha sido actualizada.', 'success');
              this.cargarSubcategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar la subcategoría.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al actualizar la subcategoría');
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
      text: '¡No podrás revertir esto!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subcategoriaService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'La subcategoría ha sido eliminada.', 'success');
              this.cargarSubcategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar la subcategoría.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al eliminar la subcategoría');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  cambiarEstado(subcategoria: any) {
    const nuevoEstado = !subcategoria.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} la subcategoría?`,
      text: `La subcategoría "${subcategoria.nombre}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const categoria_id = Number(subcategoria.categoria_id);
        const obj = {
          nombre: subcategoria.nombre,
          descripcion: subcategoria.descripcion,
          estado: nuevoEstado,
          categoria_id: categoria_id
        };

        this.subcategoriaService.actualizar(subcategoria.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarSubcategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al cambiar el estado');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(s => ({
        'Nombre': s.nombre || '',
        'Descripción': s.descripcion || '',
        'Categoría': s.categoria_nombre || '',
        'Estado': s.estado ? 'Activo' : 'Inactivo'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subcategorías');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `subcategorias_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Subcategorías', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Descripción', 'Categoría', 'Estado']],
      body: this.dataSource.data.map(s => [
        s.nombre || '',
        s.descripcion || '',
        s.categoria_nombre || '',
        s.estado ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`subcategorias_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}