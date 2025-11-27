import { Component, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxSpinnerService } from 'ngx-spinner';
import { CommonModule, DatePipe } from '@angular/common';

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ContratosModal } from '../contratos-modal/contratos-modal';
import { ContratosService } from '../../services/contratos.service';
import { GlobalFuntions as GlobalFunctionsService } from '../../services/global-funtions';
import { 
  ESTADOS_CONTRATO, 
  ContratoInterface, 
  CreateContratoInterface,
  UpdateContratoInterface,
  EstadoContrato,
  TipoContrato,
  Moneda,
  PeriodoFacturacion,
  ContratoUtils 
} from '../../interfaces/contratos.interface';

@Component({
  selector: 'app-contratos',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule
  ],
  providers: [DatePipe],
  templateUrl: './contratos.html'
})
export class Contratos {
  displayedColumns: string[] = ['numero_contrato', 'titulo', 'entidad', 'estado', 'fechas', 'acciones'];
  dataSource = new MatTableDataSource<ContratoInterface>([]);
  estadosContrato = ESTADOS_CONTRATO;
  mostrarEliminados = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private global: GlobalFunctionsService,
    private dialog: MatDialog,
    private cargando: NgxSpinnerService,
    private contratoService: ContratosService,
    private datePipe: DatePipe
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.cargarContratos();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  cargarContratos() {
    this.cargando.show();

    const servicio = this.mostrarEliminados 
      ? this.contratoService.listaEliminados() 
      : this.contratoService.lista();

    servicio.subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          this.dataSource.data = res.data || [];
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
        } else {
          Swal.fire('Error', res.message || 'Error al cargar contratos', 'error');
        }
      },
      error: (err) => {
        this.cargando.hide();
        console.error('Error al obtener contratos:', err);
        Swal.fire('Error', 'Error al cargar contratos', 'error');
      }
    });
  }

  toggleVistaEliminados() {
    this.mostrarEliminados = !this.mostrarEliminados;
    this.cargarContratos();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  getEstadoContrato(estado: EstadoContrato) {
    return this.estadosContrato.find(e => e.value === estado) || this.estadosContrato[0];
  }

  getDiasRestantes(fechaFin: string): number {
    return ContratoUtils.getDiasRestantes({ fecha_fin: fechaFin } as ContratoInterface);
  }

  getEstadoVencimiento(fechaFin: string): string {
    if (!fechaFin) return 'sin-fecha';
    
    const contratoMock = { 
      fecha_fin: fechaFin,
      alerta_vencimiento: true 
    } as ContratoInterface;
    
    if (ContratoUtils.estaVencido(contratoMock)) return 'vencido';
    if (ContratoUtils.estaProximoVencer(contratoMock, 30)) return 'por-vencer';
    return 'vigente';
  }

  // Función helper para manejar errores
  private handleError(error: any, defaultMessage: string): string {
    console.error('Error completo:', error);
    
    if (error.error?.message) {
      if (Array.isArray(error.error.message)) {
        return error.error.message[0];
      } else {
        return error.error.message;
      }
    } else if (error.message) {
      return error.message;
    } else if (error.status === 0) {
      return 'Error de conexión con el servidor';
    } else if (error.status === 400) {
      return 'Datos inválidos enviados al servidor';
    } else if (error.status === 401) {
      return 'No autorizado - Sesión expirada';
    } else if (error.status === 500) {
      return 'Error interno del servidor';
    }
    return defaultMessage;
  }

  // Método para obtener el usuario actual
  private obtenerUsuarioActual(): string {
    try {
      // Intenta obtener del localStorage
      const usuario = localStorage.getItem('usuario');
      if (usuario) {
        const usuarioObj = JSON.parse(usuario);
        return usuarioObj.username || usuarioObj.email || usuarioObj.nombre || 'system';
      }
      
      // Intenta obtener del token
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.username || payload.email || payload.nombre || 'system';
        } catch (e) {
          console.log('No se pudo decodificar el token');
        }
      }
      
    } catch (error) {
      console.error('Error al obtener usuario:', error);
    }
    
    return 'system'; 
  }

  openModal(data?: ContratoInterface) {
    const dialogRef = this.dialog.open(ContratosModal, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      data: data ? { ...data } : null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Obtener el usuario actual
        const usuarioActual = this.obtenerUsuarioActual();
        
        if (data?.id) {
          // Actualizar contrato existente
          this.actualizarContrato(data.id, result, usuarioActual);
        } else {
          // Crear nuevo contrato
          this.crearContrato(result, usuarioActual);
        }
      }
    });
  }

  // Método para crear contrato - CORREGIDO
  // Método para crear contrato - ACTUALIZADO
private crearContrato(contratoData: any, usuario: string) {
  // Preparar datos con created_by usando la interfaz correcta
  const datosParaCrear: CreateContratoInterface = {
    titulo: contratoData.titulo,
    tipo_contrato: contratoData.tipo_contrato,
    entidad_id: contratoData.entidad_id,
    sla_id: contratoData.sla_id,
    // ❌ ELIMINADO: prioridad_id - El backend lo asigna automáticamente
    fecha_inicio: contratoData.fecha_inicio,
    fecha_fin: contratoData.fecha_fin,
    descripcion: contratoData.descripcion || undefined,
    monto_total: contratoData.monto_total || undefined,
    moneda: contratoData.moneda || undefined,
    periodo_facturacion: contratoData.periodo_facturacion || undefined,
    forma_pago: contratoData.forma_pago || undefined,
    cuenta_bancaria: contratoData.cuenta_bancaria || undefined,
    contacto_entidad: contratoData.contacto_entidad || undefined,
    telefono_contacto: contratoData.telefono_contacto || undefined,
    email_contacto: contratoData.email_contacto || undefined,
    representante_entidad: contratoData.representante_entidad || undefined,
    representante_heltas: contratoData.representante_heltas || undefined,
    terminos_condiciones: contratoData.terminos_condiciones || undefined,
    servicios_incluidos: contratoData.servicios_incluidos || undefined,
    exclusiones: contratoData.exclusiones || undefined,
    penalidades: contratoData.penalidades || undefined,
    periodo_prueba: contratoData.periodo_prueba || undefined,
    observaciones: contratoData.observaciones || undefined,
    etiquetas: contratoData.etiquetas ? ContratoUtils.stringificarEtiquetas(contratoData.etiquetas) || undefined : undefined,
    alerta_vencimiento: contratoData.alerta_vencimiento ?? true,
    dias_alerta: contratoData.dias_alerta ?? 30,
    created_by: usuario,
    prioridad_id: 0
  };

  console.log('📤 Datos a enviar al CREAR contrato:', datosParaCrear);

  this.cargando.show();
  this.contratoService.crear(datosParaCrear).subscribe({
    next: (res: any) => {
      this.cargando.hide();
      console.log('📥 Respuesta del servidor al CREAR:', res);
      
      if (res.isSuccess) {
        Swal.fire({
          title: '¡Éxito!',
          text: 'Contrato creado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
        this.cargarContratos();
      } else {
        Swal.fire({
          title: 'Error',
          text: res.message || 'No se pudo crear el contrato',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    },
    error: (error) => {
      this.cargando.hide();
      console.error('Error al CREAR contrato:', error);
      
      const errorMessage = this.handleError(error, 'Error al crear el contrato');
      Swal.fire({
        title: 'Error',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
    }
  });
}
  // Método para actualizar contrato 
  private actualizarContrato(id: number, contratoData: any, usuario: string) {
    // Para actualizar, usamos updated_by con la interfaz correcta
    const datosParaActualizar: UpdateContratoInterface = {
      titulo: contratoData.titulo,
      tipo_contrato: contratoData.tipo_contrato,
      entidad_id: contratoData.entidad_id,
      sla_id: contratoData.sla_id,
      prioridad_id: contratoData.prioridad_id, // CORREGIDO: prioridad_id
      fecha_inicio: contratoData.fecha_inicio,
      fecha_fin: contratoData.fecha_fin,
      descripcion: contratoData.descripcion || undefined,
      monto_total: contratoData.monto_total || undefined,
      moneda: contratoData.moneda || undefined,
      periodo_facturacion: contratoData.periodo_facturacion || undefined,
      forma_pago: contratoData.forma_pago || undefined,
      cuenta_bancaria: contratoData.cuenta_bancaria || undefined,
      contacto_entidad: contratoData.contacto_entidad || undefined,
      telefono_contacto: contratoData.telefono_contacto || undefined,
      email_contacto: contratoData.email_contacto || undefined,
      representante_entidad: contratoData.representante_entidad || undefined,
      representante_heltas: contratoData.representante_heltas || undefined,
      terminos_condiciones: contratoData.terminos_condiciones || undefined,
      servicios_incluidos: contratoData.servicios_incluidos || undefined,
      exclusiones: contratoData.exclusiones || undefined,
      penalidades: contratoData.penalidades || undefined,
      periodo_prueba: contratoData.periodo_prueba || undefined,
      estado_contrato: contratoData.estado_contrato,
      motivo_estado: contratoData.motivo_estado || undefined,
      observaciones: contratoData.observaciones || undefined,
      etiquetas: contratoData.etiquetas ? ContratoUtils.stringificarEtiquetas(contratoData.etiquetas) || undefined : undefined,
      alerta_vencimiento: contratoData.alerta_vencimiento,
      dias_alerta: contratoData.dias_alerta || undefined,
      updated_by: usuario
    };

    console.log('📤 Datos a enviar al ACTUALIZAR contrato:', datosParaActualizar);

    this.cargando.show();
    this.contratoService.actualizar(id, datosParaActualizar).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        console.log('📥 Respuesta del servidor al ACTUALIZAR:', res);
        
        if (res.isSuccess) {
          Swal.fire({
            title: '¡Éxito!',
            text: 'Contrato actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.cargarContratos();
        } else {
          Swal.fire({
            title: 'Error',
            text: res.message || 'No se pudo actualizar el contrato',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error) => {
        this.cargando.hide();
        console.error(' Error al ACTUALIZAR contrato:', error);
        
        const errorMessage = this.handleError(error, 'Error al actualizar el contrato');
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  cambiarEstado(contrato: ContratoInterface) {
    Swal.fire({
      title: 'Cambiar Estado del Contrato',
      html: `
        <div class="text-left">
          <label class="block text-sm font-medium text-gray-700 mb-2">Seleccionar Estado</label>
          <select id="estadoSelect" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500">
            ${this.estadosContrato.map(estado => 
              `<option value="${estado.value}" ${estado.value === contrato.estado_contrato ? 'selected' : ''}>${estado.label}</option>`
            ).join('')}
          </select>
          <label class="block text-sm font-medium text-gray-700 mt-3 mb-2">Motivo del Cambio</label>
          <textarea id="motivoInput" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Describe el motivo del cambio de estado..."></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cambiar Estado',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const estadoSelect = document.getElementById('estadoSelect') as HTMLSelectElement;
        const motivoInput = document.getElementById('motivoInput') as HTMLTextAreaElement;
        
        const estado = estadoSelect?.value as EstadoContrato;
        const motivo = motivoInput?.value;
        
        if (!motivo?.trim()) {
          Swal.showValidationMessage('El motivo es requerido');
          return false;
        }
        
        return { estado, motivo };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const usuarioActual = this.obtenerUsuarioActual();
        this.cargando.show();
        
        // Preparar datos para actualizar estado - CORREGIDO
        const datosActualizacion: any = { //  Usamos any para evitar el error de prioridad_id requerido
          estado_contrato: result.value.estado,
          motivo_estado: result.value.motivo,
          updated_by: usuarioActual
        };

        this.contratoService.cambiarEstado(contrato.id, {
  estado: result.value.estado,
  motivo: result.value.motivo
})
          .subscribe({
            next: (res: any) => {
              this.cargando.hide();
              if (res.isSuccess) {
                Swal.fire('¡Actualizado!', res.message || 'Estado cambiado correctamente', 'success');
                this.cargarContratos();
              } else {
                Swal.fire('Error', res.message || 'No se pudo cambiar el estado', 'error');
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

  eliminar(id: number) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'El contrato se marcará como eliminado (soft delete)',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        this.contratoService.eliminar(id).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            if (res.isSuccess) {
              Swal.fire('Eliminado!', res.message || 'Contrato eliminado correctamente', 'success');
              this.cargarContratos();
            } else {
              Swal.fire('Error', res.message || 'No se pudo eliminar el contrato', 'error');
            }
          },
          error: (error) => {
            this.cargando.hide();
            const errorMessage = this.handleError(error, 'Error al eliminar el contrato');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  restaurar(id: number) {
    Swal.fire({
      title: '¿Restaurar contrato?',
      text: 'El contrato volverá a estar activo en el sistema',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando.show();
        this.contratoService.restaurar(id).subscribe({
          next: (res: any) => {
            this.cargando.hide();
            if (res.isSuccess) {
              Swal.fire('Restaurado!', res.message || 'Contrato restaurado correctamente', 'success');
              this.cargarContratos();
            } else {
              Swal.fire('Error', res.message || 'No se pudo restaurar el contrato', 'error');
            }
          },
          error: (error) => {
            this.cargando.hide();
            const errorMessage = this.handleError(error, 'Error al restaurar el contrato');
            Swal.fire('Error', errorMessage, 'error');
          }
        });
      }
    });
  }

  generarPdf(contrato: ContratoInterface) {
    this.cargando.show();
    this.contratoService.generarPdf(contrato.id).subscribe({
      next: (res: any) => {
        this.cargando.hide();
        if (res.isSuccess) {
          Swal.fire('¡PDF Generado!', res.message || 'PDF generado correctamente', 'success');
          this.cargarContratos();
        } else {
          Swal.fire('Error', res.message || 'No se pudo generar el PDF', 'error');
        }
      },
      error: (error) => {
        this.cargando.hide();
        const errorMessage = this.handleError(error, 'Error al generar PDF');
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  descargarPdf(contrato: ContratoInterface) {
    this.cargando.show();
    this.contratoService.descargarPdf(contrato.id).subscribe({
      next: (blob: Blob) => {
        this.cargando.hide();
        const filename = `contrato-${contrato.numero_contrato || 'sin-numero'}.pdf`;
        saveAs(blob, filename);
      },
      error: (error) => {
        this.cargando.hide();
        const errorMessage = this.handleError(error, 'Error al descargar PDF');
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  verPdf(contrato: ContratoInterface) {
    this.cargando.show();
    this.contratoService.verPdf(contrato.id).subscribe({
      next: (blob: Blob) => {
        this.cargando.hide();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error) => {
        this.cargando.hide();
        const errorMessage = this.handleError(error, 'Error al visualizar PDF');
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  exportExcel() {
    const worksheet = XLSX.utils.json_to_sheet(
      this.dataSource.data.map(c => ({
        'Número Contrato': c.numero_contrato || '',
        'Título': c.titulo || '',
        'Entidad': c.entidad?.denominacion || '',
        'Tipo': c.tipo_contrato || '',
        'Estado': this.getEstadoContrato(c.estado_contrato).label,
        'Fecha Inicio': c.fecha_inicio ? this.datePipe.transform(c.fecha_inicio, 'dd/MM/yyyy') : '',
        'Fecha Fin': c.fecha_fin ? this.datePipe.transform(c.fecha_fin, 'dd/MM/yyyy') : '',
        'Monto': c.monto_total ? `${c.monto_total} ${c.moneda || ''}` : '',
        'Días Restantes': this.getDiasRestantes(c.fecha_fin)
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contratos');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `contratos_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Reporte de Contratos', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 22);
    
    autoTable(doc, {
      startY: 30,
      head: [['N° Contrato', 'Título', 'Entidad', 'Estado', 'Fecha Inicio', 'Fecha Fin', 'Días Rest.']],
      body: this.dataSource.data.map(c => [
        c.numero_contrato || '',
        (c.titulo?.substring(0, 20) || '') + (c.titulo && c.titulo.length > 20 ? '...' : ''),
        (c.entidad?.denominacion?.substring(0, 15) || '') + (c.entidad?.denominacion && c.entidad.denominacion.length > 15 ? '...' : ''),
        this.getEstadoContrato(c.estado_contrato).label,
        c.fecha_inicio ? this.datePipe.transform(c.fecha_inicio, 'dd/MM/yyyy') || '' : '',
        c.fecha_fin ? this.datePipe.transform(c.fecha_fin, 'dd/MM/yyyy') || '' : '',
        this.getDiasRestantes(c.fecha_fin).toString()
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [139, 92, 246] }
    });
    
    doc.save(`contratos_${new Date().toISOString().split('T')[0]}.pdf`);
  }
}