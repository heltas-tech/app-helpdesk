import { Component, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { NgxSpinnerService } from 'ngx-spinner';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { SlaModal } from '../slas-modal/slas-modal';
import { SlasService } from '../../services/slas.service';
import { PrioridadesService } from '../../services/prioridades.service';
import { SlaInterface, PrioridadInterface } from '../../interfaces/slas.interface';

@Component({
  selector: 'app-slas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ],
  templateUrl: './slas.html',
  styleUrls: ['./slas.scss']
})
export class SlasComponent implements OnInit {
  displayedColumns: string[] = ['nombre', 'descripcion', 'prioridades_incluidas', 'tipo_sla', 'estado', 'acciones'];
  dataSource = new MatTableDataSource<SlaInterface>([]);

  prioridades: PrioridadInterface[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private slaService: SlasService,
    private prioridadService: PrioridadesService
  ) {}

  ngOnInit() {
    this.cargarPrioridadesBase();
    this.cargarSlas();
  }

  cargarPrioridadesBase() {
    this.prioridadService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.prioridades = (res.data || []).filter((p: PrioridadInterface) => 
            p.activo && !p.eliminado
          );
        }
      },
      error: (err) => {
        console.error('Error al cargar prioridades:', err);
      }
    });
  }

  cargarSlas() {
    this.cargando.show();
    this.slaService.lista().subscribe({
      next: (resSla: any) => {
        this.cargando.hide();
        if (resSla.isSuccess) {
          this.procesarDatosSlas(resSla.data || []);
        } else {
          Swal.fire('Error', resSla.message || 'Error al cargar SLAs', 'error');
        }
      },
      error: (err) => {
        this.cargando.hide();
        console.error('Error al obtener SLAs:', err);
        if (err.status === 401) {
          Swal.fire('Sesión expirada', 'Por favor inicie sesión nuevamente', 'warning');
        } else {
          Swal.fire('Error', 'Error al cargar SLAs', 'error');
        }
      }
    });
  }

  procesarDatosSlas(slasData: any[]) {
  console.log('🔄 Procesando datos de SLAs:', slasData);
  
  this.dataSource.data = slasData.map((sla: any) => {
    // sla.prioridades viene del backend transformado
    const prioridades = sla.prioridades || [];
    const prioridades_ids = prioridades.map((p: any) => p.id);
    
    console.log(`📊 SLA: ${sla.nombre}, Prioridades:`, prioridades);
    
    return {
      ...sla,
      tipo_sla_nombre: sla.tipo_sla?.nombre || 'No asignado',
      prioridades_incluidas: prioridades,
      prioridades_count: prioridades.length,
      prioridades_ids: prioridades_ids,
      tiempos_ejemplo: this.obtenerTiemposEjemplo(prioridades)
    };
  });
  
  this.actualizarPaginator();
}

  private obtenerTiemposEjemplo(prioridades: PrioridadInterface[]): string {
    if (prioridades.length === 0) return 'Sin tiempos definidos';
    
    const tiempos = prioridades.map(p => 
      `${p.nombre}: ${this.formatearTiempo(p.tiempo_respuesta)} / ${this.formatearTiempo(p.tiempo_resolucion)}`
    );
    return tiempos.join(' • ');
  }

  formatearTiempo(minutos: number | undefined | null): string {
    if (!minutos) return 'N/D';
    
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
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

  openModal(data?: SlaInterface) {
    const tiposSlaDisponibles = [
      { id: 1, nombre: 'Bronce' },
      { id: 2, nombre: 'Plata' }, 
      { id: 3, nombre: 'Oro' },
      { id: 4, nombre: 'Platinum' }
    ];

    // USAR LOS DATOS QUE YA TENEMOS DE LA TABLA - NO hacer petición al backend
    if (data?.id) {
      console.log('📋 Datos del SLA desde la tabla:', data);
      
      // Usar prioridades_incluidas que SÍ tienen datos
      const prioridades_ids = (data.prioridades_incluidas || []).map((p: any) => p.id);
      
      const modalData = {
        id: data.id,
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo_sla_id: data.tipo_sla_id,
        estado: data.estado,
        prioridades_ids: prioridades_ids
      };

      console.log('🎯 Datos para modal:', modalData);

      const dialogRef = this.dialog.open(SlaModal, {
        width: '800px',
        data: {
          ...modalData,
          prioridadesDisponibles: this.prioridades,
          tiposSlaDisponibles: tiposSlaDisponibles
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (!result) return;
        this.guardarSLA(result);
      });
    } else {
      // Para crear nuevo SLA
      this.abrirModalConDatos(null, tiposSlaDisponibles);
    }
  }

  // Método auxiliar para nuevo SLA
  private abrirModalConDatos(slaData: any, tiposSlaDisponibles: any[]) {
    const modalData = slaData ? {
      id: slaData.id,
      nombre: slaData.nombre,
      descripcion: slaData.descripcion,
      tipo_sla_id: slaData.tipo_sla_id,
      estado: slaData.estado,
      prioridades_ids: slaData.prioridades_ids || []
    } : {
      id: 0,
      nombre: '',
      descripcion: '',
      tipo_sla_id: null,
      estado: true,
      prioridades_ids: []
    };

    const dialogRef = this.dialog.open(SlaModal, {
      width: '800px',
      data: {
        ...modalData,
        prioridadesDisponibles: this.prioridades,
        tiposSlaDisponibles: tiposSlaDisponibles
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.guardarSLA(result);
    });
  }

  private guardarSLA(result: any) {
    // Determinar si es creación o edición
    const esCreacion = !result.id || result.id === 0;

    // Preparar datos para enviar
    const datosParaEnviar = {
      nombre: result.nombre,
      descripcion: result.descripcion,
      tipo_sla_id: Number(result.tipo_sla_id),
      estado: result.estado,
      prioridades_ids: result.prioridades_ids || []
    };

    if (esCreacion) {
      this.slaService.crear(datosParaEnviar).subscribe({
        next: (res: any) => {
          if (res.isSuccess) {
            Swal.fire('¡Creado!', 'El SLA ha sido creado correctamente.', 'success');
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
      this.slaService.actualizar(result.id, datosParaEnviar).subscribe({
        next: (res: any) => {
          if (res.isSuccess) {
            Swal.fire('¡Actualizado!', 'El SLA ha sido actualizado correctamente.', 'success');
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
              Swal.fire('Eliminado!', 'El SLA ha sido eliminado.', 'success');
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

  cambiarEstado(sla: SlaInterface) {
    const nuevoEstado = !sla.estado;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    
    Swal.fire({
      title: `¿Deseas ${accion} el SLA?`,
      text: `El SLA "${sla.nombre}" cambiará de estado.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Sí, ${accion}`,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: nuevoEstado ? '#28a745' : '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        // SOLO ENVIAR EL ESTADO - nada más
        const datosParaEnviar = { estado: nuevoEstado };

        this.slaService.actualizar(sla.id, datosParaEnviar).subscribe({
          next: (res: any) => {
            if (res.isSuccess) {
              Swal.fire('¡Actualizado!', `El SLA ha sido ${accion}do.`, 'success');
              // Actualizar localmente
              sla.estado = nuevoEstado;
            } else {
              Swal.fire('Error', res.message || 'No se pudo cambiar el estado.', 'error');
              // Revertir visualmente
              sla.estado = !nuevoEstado;
            }
          },
          error: (error) => {
            const errorMessage = this.handleError(error, 'Error al cambiar el estado');
            Swal.fire('Error', errorMessage, 'error');
            // Revertir visualmente
            sla.estado = !nuevoEstado;
          }
        });
      } else {
        // Si cancela, revertir el toggle
        sla.estado = !nuevoEstado;
      }
    });
  }

  getPrioridadColor(nivel: number): string {
    switch(nivel) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getTipoSlaColor(tipoSla: string | undefined): string {
    if (!tipoSla) return 'bg-gray-100 text-gray-800';
    
    switch(tipoSla.toLowerCase()) {
      case 'bronce': return 'bg-amber-100 text-amber-800 border border-amber-300';
      case 'plata': return 'bg-gray-100 text-gray-800 border border-gray-300';
      case 'oro': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'platinum': return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'golden': return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  }

  // Nuevo método para el color del dot en el tipo SLA
  getTipoSlaDotColor(tipoSla: string | undefined): string {
    if (!tipoSla) return 'bg-gray-400';
    
    switch(tipoSla.toLowerCase()) {
      case 'bronce': return 'bg-amber-500';
      case 'plata': return 'bg-gray-400';
      case 'oro': return 'bg-yellow-500';
      case 'platinum': return 'bg-blue-400';
      case 'golden': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(s => ({
        'Nombre': s.nombre || '',
        'Descripción': s.descripcion || '',
        'Prioridades Incluidas': s.prioridades_incluidas?.map((p: PrioridadInterface) => p.nombre).join(', ') || '',
        'Cantidad Prioridades': s.prioridades_count || 0,
        'Tipo SLA': s.tipo_sla_nombre || '',
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
      head: [['Nombre', 'Descripción', 'Prioridades', 'Tipo SLA', 'Estado']],
      body: this.dataSource.data.map(s => [
        s.nombre || '',
        s.descripcion || '',
        s.prioridades_incluidas?.map((p: PrioridadInterface) => p.nombre).join(', ') || '',
        s.tipo_sla_nombre || '',
        s.estado ? 'Activo' : 'Inactivo'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });
    
    doc.save(`slas_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  // Método para actualizar el paginador
  actualizarPaginator() {
    setTimeout(() => {
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
        this.paginator._changePageSize(this.paginator.pageSize);
      }
    }, 0);
  }
}