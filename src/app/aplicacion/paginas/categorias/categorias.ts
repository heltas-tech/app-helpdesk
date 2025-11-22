import { CommonModule } from '@angular/common';
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

import { CategoriaInterface } from '../../interfaces/categoria.interface';
import { CategoriaModal } from '../categorias-modal/categorias-modal';
import { CategoriasService } from '../../services/categorias.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';

@Component({
  selector: 'app-categorias',
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './categorias.html'
})
export class CategoriasComponent {
  displayedColumns: string[] = ['nombre', 'descripcion', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<CategoriaInterface>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private categoriaService: CategoriasService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarCategorias();
  }

  cargarCategorias() {
    this.cargando.show();
    this.categoriaService.lista().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          if (res.status === 401) {
            this.router.navigate(['/login']);
            return;
          }
          Swal.fire('Error', res.message || 'Error al cargar categorías', 'error');
          return;
        }
        this.dataSource.data = res.data || [];
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => {
        this.cargando.hide();
        if (err.status === 401) this.router.navigate(['/login']);
        else console.error('Error al obtener categorías:', err);
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  openModal(data?: CategoriaInterface) {
    const dialogRef = this.dialog.open(CategoriaModal, {
      width: '500px',
      data: data ? { ...data } : { id: 0, nombre: '', descripcion: '', estado: true }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      const obj = {
        nombre: result.nombre,
        descripcion: result.descripcion,
        estado: result.estado
      };

      if (result.id === 0) {
        this.categoriaService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Creado!', res.message || 'La categoría ha sido creada.', 'success');
              this.cargarCategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear la categoría', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al crear la categoría', 'error')
        });
      } else {
        this.categoriaService.actualizar(result.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'La categoría ha sido actualizada.', 'success');
              this.cargarCategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar la categoría', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al actualizar la categoría', 'error')
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
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categoriaService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'La categoría ha sido eliminada.', 'success');
              this.cargarCategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar la categoría', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al eliminar la categoría', 'error')
        });
      }
    });
  }

  cambiarEstado(categoria: CategoriaInterface) {
    const nuevoEstado = !categoria.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} la categoría?`,
      text: `La categoría "${categoria.nombre}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const obj = {
          nombre: categoria.nombre,
          descripcion: categoria.descripcion,
          estado: nuevoEstado
        };

        this.categoriaService.actualizar(categoria.id!, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarCategorias();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al cambiar el estado', 'error')
        });
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(c => ({
        'Nombre': c.nombre || '',
        'Descripción': c.descripcion || '',
        'Estado': c.estado ? 'Activo' : 'Inactivo'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Categorías');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `categorias_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Categorías', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Descripción', 'Estado']],
      body: this.dataSource.data.map(c => [
        c.nombre || '',
        c.descripcion || '',
        c.estado ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] }
    });
    
    doc.save(`categorias_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}