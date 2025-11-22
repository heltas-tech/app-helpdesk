// entidades/entidades.ts
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

import { EntidadInterface } from '../../interfaces/entidades.interface';
import { EntidadModal } from '../entidades-modal/entidades-modal';
import { EntidadesService } from '../../services/entidades.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';

@Component({
  selector: 'app-entidades',
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  templateUrl: './entidades.html',
  styleUrls: ['./entidades.scss']
})
export class EntidadesComponent {
  displayedColumns: string[] = ['denominacion', 'nit', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<EntidadInterface>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private entidadesService: EntidadesService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarEntidades();
  }

  cargarEntidades() {
    this.cargando.show();
    this.entidadesService.lista().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          if (res.status === 401) {
            this.router.navigate(['/login']);
            return;
          }
          Swal.fire('Error', res.message || 'Error al cargar entidades', 'error');
          return;
        }
        
        // Tu API devuelve los datos en res.data
        this.dataSource.data = res.data || [];
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => {
        this.cargando.hide();
        if (err.status === 401) {
          this.router.navigate(['/login']);
        } else {
          console.error('Error al obtener entidades:', err);
          Swal.fire('Error', 'Error al cargar entidades', 'error');
        }
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openModal(data?: EntidadInterface) {
    const dialogRef = this.dialog.open(EntidadModal, {
      width: '600px',
      data: data ? { ...data } : { 
        id: 0, 
        denominacion: '', 
        nit: '', 
        estado: true 
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      const obj = {
        denominacion: result.denominacion,
        nit: result.nit,
        estado: result.estado
      };

      if (result.id === 0) {
        // Crear
        this.entidadesService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Creado!', res.message || 'La entidad ha sido creada.', 'success');
              this.cargarEntidades();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear la entidad', 'error');
            }
          },
          error: (err) => {
            console.error('Error al crear:', err);
            Swal.fire('Error', 'Error al crear la entidad', 'error');
          }
        });
      } else {
        // Actualizar
        this.entidadesService.actualizar(result.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'La entidad ha sido actualizada.', 'success');
              this.cargarEntidades();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar la entidad', 'error');
            }
          },
          error: (err) => {
            console.error('Error al actualizar:', err);
            Swal.fire('Error', 'Error al actualizar la entidad', 'error');
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
      confirmButtonText: 'Sí, eliminar!',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.entidadesService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'La entidad ha sido eliminada.', 'success');
              this.cargarEntidades();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar la entidad', 'error');
            }
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            Swal.fire('Error', 'Error al eliminar la entidad', 'error');
          }
        });
      }
    });
  }

  cambiarEstado(entidad: EntidadInterface) {
    const nuevoEstado = !entidad.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} la entidad?`,
      text: `La entidad "${entidad.denominacion}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const obj = {
          denominacion: entidad.denominacion,
          nit: entidad.nit,
          estado: nuevoEstado
        };

        this.entidadesService.actualizar(entidad.id!, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarEntidades();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado', 'error');
            }
          },
          error: (err) => {
            console.error('Error al cambiar estado:', err);
            Swal.fire('Error', 'Error al cambiar el estado', 'error');
          }
        });
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(e => ({
        'Denominación': e.denominacion || '',
        'NIT': e.nit || '',
        'Estado': e.estado ? 'Activo' : 'Inactivo',
        'Fecha Creación': e.created_at ? new Date(e.created_at).toLocaleDateString() : ''
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entidades');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `entidades_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Reporte de Entidades', 14, 15);
    
    // Fecha
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Denominación', 'NIT', 'Estado']],
      body: this.dataSource.data.map(e => [
        e.denominacion || '',
        e.nit || '',
        e.estado ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 133, 244] }
    });
    
    doc.save(`entidades_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}