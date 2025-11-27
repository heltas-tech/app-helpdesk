import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild, AfterViewInit } from '@angular/core';
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

import { PrioridadesInterface } from '../../interfaces/prioridades.interface';
import { PrioridadesModal } from '../prioridades-modal/prioridades-modal';
import { PrioridadesService } from '../../services/prioridades.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';

@Component({
  selector: 'app-prioridades',
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './prioridades.html',
  styleUrls: ['./prioridades.scss']
})
export class PrioridadesComponent implements AfterViewInit {
  // AGREGAMOS COLUMNAS DE TIEMPO
  displayedColumns: string[] = ['nombre', 'descripcion', 'nivel', 'tiempo_respuesta', 'tiempo_resolucion', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<PrioridadesInterface>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private prioridadService: PrioridadesService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarPrioridades();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  cargarPrioridades() {
    this.cargando.show();
    this.prioridadService.lista().subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess === false) {
          if (res.status === 401) {
            this.router.navigate(['/login']);
            return;
          }
          Swal.fire('Error', res.message || 'Error al cargar prioridades', 'error');
          return;
        }
        
        this.dataSource.data = res.data || [];
        
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      },
      error: (err) => {
        this.cargando.hide();
        if (err.status === 401) this.router.navigate(['/login']);
        else console.error('Error al obtener prioridades:', err);
      }
    });
  }

  actualizarPaginator() {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator._changePageSize(this.paginator.pageSize);
      }
    }, 0);
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openModal(data?: PrioridadesInterface) {
    const dialogRef = this.dialog.open(PrioridadesModal, {
      width: '500px', // Un poco más ancho para los nuevos campos
      data: data ? { ...data } : { 
        id: 0, 
        nombre: '', 
        descripcion: '', 
        nivel: 1,
        tiempo_respuesta: null,
        tiempo_resolucion: null,
        activo: true 
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;

      const obj = {
        nombre: result.nombre,
        descripcion: result.descripcion,
        nivel: result.nivel,
        tiempo_respuesta: result.tiempo_respuesta,
        tiempo_resolucion: result.tiempo_resolucion,
        activo: result.activo
      };

      if (result.id === 0) {
        this.prioridadService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Creado!', res.message || 'La prioridad ha sido creada.', 'success');
              this.cargarPrioridades();
              this.actualizarPaginator();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear la prioridad', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al crear la prioridad', 'error')
        });
      } else {
        this.prioridadService.actualizar(result.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'La prioridad ha sido actualizada.', 'success');
              this.cargarPrioridades();
              this.actualizarPaginator();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar la prioridad', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al actualizar la prioridad', 'error')
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
        this.prioridadService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'La prioridad ha sido eliminada.', 'success');
              this.cargarPrioridades();
              this.actualizarPaginator();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar la prioridad', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al eliminar la prioridad', 'error')
        });
      }
    });
  }

  cambiarEstado(prioridad: PrioridadesInterface) {
    const nuevoEstado = !prioridad.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} la prioridad?`,
      text: `La prioridad "${prioridad.nombre}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const obj = {
          nombre: prioridad.nombre,
          descripcion: prioridad.descripcion,
          nivel: prioridad.nivel,
          tiempo_respuesta: prioridad.tiempo_respuesta,
          tiempo_resolucion: prioridad.tiempo_resolucion,
          activo: nuevoEstado
        };

        this.prioridadService.actualizar(prioridad.id!, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarPrioridades();
              this.actualizarPaginator();
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado', 'error');
            }
          },
          error: () => Swal.fire('Error', 'Error al cambiar el estado', 'error')
        });
      }
    });
  }

  // Función para formatear minutos a texto legible
  formatearTiempo(minutos: number): string {
    if (!minutos) return 'No definido';
    
    if (minutos < 60) {
      return `${minutos} min`;
    } else if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      const minsRestantes = minutos % 60;
      return minsRestantes > 0 ? `${horas}h ${minsRestantes}min` : `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      const horas = Math.floor((minutos % 1440) / 60);
      if (horas > 0) {
        return `${dias}d ${horas}h`;
      }
      return `${dias}d`;
    }
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(p => ({
        'Nombre': p.nombre || '',
        'Descripción': p.descripcion || '',
        'Nivel': p.nivel || '',
        'Tiempo Respuesta': p.tiempo_respuesta ? this.formatearTiempo(p.tiempo_respuesta) : '',
        'Tiempo Resolución': p.tiempo_resolucion ? this.formatearTiempo(p.tiempo_resolucion) : '',
        'Estado': p.activo ? 'Activo' : 'Inactivo'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Prioridades');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `prioridades_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Prioridades', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Descripción', 'Nivel', 'T. Respuesta', 'T. Resolución', 'Estado']],
      body: this.dataSource.data.map(p => [
        p.nombre || '',
        p.descripcion || '',
        p.nivel?.toString() || '',
        p.tiempo_respuesta ? this.formatearTiempo(p.tiempo_respuesta) : '',
        p.tiempo_resolucion ? this.formatearTiempo(p.tiempo_resolucion) : '',
        p.activo ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`prioridades_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}