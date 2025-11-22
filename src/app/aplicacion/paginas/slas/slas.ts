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

import { SlaModal } from '../slas-modal/slas-modal';
import { SlasService } from '../../services/slas.service';
import { PrioridadesService } from '../../services/prioridades.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-slas',
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './slas.html'
})
export class SlasComponent {
  displayedColumns: string[] = ['nombre', 'descripcion', 'tiempo_respuesta', 'tiempo_resolucion', 'prioridad', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<any>([]);
  private router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private slaService: SlasService,
    private prioridadService: PrioridadesService
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarSlas();
  }

  cargarSlas() {
    this.cargando.show();

    // Primero obtenemos prioridades activas
    this.prioridadService.lista().subscribe({
      next: (resPrior: any) => {
        const prioridadesActivas = (resPrior.data || []).filter((p: any) => p.activo);

        // Luego SLAs
        this.slaService.lista().subscribe({
          next: (resSla: any) => {
            this.cargando.hide();
            if (resSla.isSuccess === false) {
              Swal.fire('Error', resSla.message || 'Error al cargar SLAs', 'error');
              return;
            }
            
            this.dataSource.data = (resSla.data || []).map((sla: any) => {
              const prioridad = prioridadesActivas.find((p: any) => p.id === sla.prioridad_id);
              return { 
                ...sla, 
                prioridad_nombre: prioridad ? prioridad.nombre : 'No asignada',
                prioridad_estado: prioridad ? prioridad.activo : false
              };
            });
            this.dataSource.paginator = this.paginator;
          },
          error: (err) => {
            this.cargando.hide();
            console.error('Error al obtener SLAs:', err);
            Swal.fire('Error', 'Error al cargar SLAs', 'error');
          }
        });
      },
      error: (err) => {
        this.cargando.hide();
        console.error('Error al obtener prioridades:', err);
        Swal.fire('Error', 'Error al cargar prioridades', 'error');
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
    const dialogRef = this.dialog.open(SlaModal, {
      width: '80%',
      maxWidth: 'unset',
      data: data ? { ...data } : { 
        id: 0, 
        nombre: '', 
        descripcion: '', 
        tiempo_respuesta: null,
        tiempo_resolucion: null,
        prioridad_id: null,
        estado: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      const prioridad_id = Number(result.prioridad_id);

      const obj = {
        nombre: result.nombre,
        descripcion: result.descripcion,
        tiempo_respuesta: Number(result.tiempo_respuesta),
        tiempo_resolucion: Number(result.tiempo_resolucion),
        prioridad_id: prioridad_id,
        estado: result.estado
      };

      if (result.id === 0) {
        // Crear nuevo SLA
        this.slaService.crear(obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Creado!', res.message || 'El SLA ha sido creado.', 'success');
              this.cargarSlas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo crear el SLA.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al crear el SLA');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      } else {
        // Actualizar SLA existente
        this.slaService.actualizar(result.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', res.message || 'El SLA ha sido actualizado.', 'success');
              this.cargarSlas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo actualizar el SLA.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al actualizar el SLA');
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
        this.slaService.eliminar(id).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'El SLA ha sido eliminado.', 'success');
              this.cargarSlas();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar el SLA.', 'error');
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al eliminar el SLA');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  cambiarEstado(sla: any) {
    const nuevoEstado = !sla.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} el SLA?`,
      text: `El SLA "${sla.nombre}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const prioridad_id = Number(sla.prioridad_id);
        const obj = {
          nombre: sla.nombre,
          descripcion: sla.descripcion,
          tiempo_respuesta: Number(sla.tiempo_respuesta),
          tiempo_resolucion: Number(sla.tiempo_resolucion),
          prioridad_id: prioridad_id,
          estado: nuevoEstado
        };

        this.slaService.actualizar(sla.id, obj).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('Actualizado!', res.message || 'El estado ha sido cambiado.', 'success');
              this.cargarSlas();
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
        'Tiempo Respuesta (min)': s.tiempo_respuesta || '',
        'Tiempo Resolución (min)': s.tiempo_resolucion || '',
        'Prioridad': s.prioridad_nombre || '',
        'Estado': s.estado ? 'Activo' : 'Inactivo'
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SLAs');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `slas_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de SLAs', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['Nombre', 'Descripción', 'T. Respuesta', 'T. Resolución', 'Prioridad', 'Estado']],
      body: this.dataSource.data.map(s => [
        s.nombre || '',
        s.descripcion || '',
        `${s.tiempo_respuesta} min` || '',
        `${s.tiempo_resolucion} min` || '',
        s.prioridad_nombre || '',
        s.estado ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`slas_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}