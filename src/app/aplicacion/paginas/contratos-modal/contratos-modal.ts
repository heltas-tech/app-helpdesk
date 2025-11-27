import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { NgxSpinnerService } from 'ngx-spinner';

import { 
  ContratoInterface, 
  CreateContratoInterface,
  UpdateContratoInterface,
  TIPOS_CONTRATO, 
  MONEDAS, 
  PERIODOS_FACTURACION,
  EstadoContrato,
  TipoContrato,
  Moneda,
  PeriodoFacturacion,
  ContratoUtils 
} from '../../interfaces/contratos.interface';
import { EntidadesService } from '../../services/entidades.service';
import { SlasService } from '../../services/slas.service';
import { PrioridadesService } from '../../services/prioridades.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-contratos-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatChipsModule
  ],
  templateUrl: './contratos-modal.html',
  styleUrls: ['./contratos-modal.scss']
})
export class ContratosModal implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  tiposContrato = TIPOS_CONTRATO;
  monedas = MONEDAS;
  periodosFacturacion = PERIODOS_FACTURACION;
  
  // Listas cargadas dinámicamente
  entidades: any[] = [];
  slas: any[] = [];
  prioridades: any[] = [];
  cargando = false;

  // Variables para chips de etiquetas
  etiquetaInput = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ContratosModal>,
    @Inject(MAT_DIALOG_DATA) public data: ContratoInterface | null,
    private entidadesService: EntidadesService,
    private slasService: SlasService,
    private prioridadesService: PrioridadesService,
    private spinner: NgxSpinnerService
  ) {
    this.isEditMode = !!data;
    this.initializeForm();
  }

  private initializeForm(): void {
    // Parsear etiquetas del string JSON
    const etiquetasIniciales = this.data?.etiquetas ? 
      ContratoUtils.parsearEtiquetas(this.data.etiquetas) : [];

    this.form = this.fb.group({
      // === INFORMACIÓN BÁSICA ===
      titulo: [
        this.data?.titulo || '', 
        [Validators.required, Validators.maxLength(200)]
      ],
      tipo_contrato: [
        this.data?.tipo_contrato || '', 
        Validators.required
      ],
      descripcion: [
        this.data?.descripcion || '', 
        [Validators.maxLength(500)]
      ],
      
      // === ENTIDAD Y SLA ===
      entidad_id: [
        this.data?.entidad_id || null, 
        [Validators.required]
      ],
      sla_id: [
        this.data?.sla_id || null, 
        [Validators.required]
      ],
      
      // === FECHAS ===
      fecha_inicio: [
        this.data?.fecha_inicio ? this.formatDateForInput(this.data.fecha_inicio) : '', 
        Validators.required
      ],
      fecha_fin: [
        this.data?.fecha_fin ? this.formatDateForInput(this.data.fecha_fin) : '', 
        Validators.required
      ],
      
      // === INFORMACIÓN FINANCIERA ===
      monto_total: [
        this.data?.monto_total || null,
        [Validators.min(0)]
      ],
      moneda: [
        this.data?.moneda || 'BOB'
      ],
      periodo_facturacion: [
        this.data?.periodo_facturacion || 'MENSUAL'
      ],
      forma_pago: [
        this.data?.forma_pago || '',
        [Validators.maxLength(100)]
      ],
      cuenta_bancaria: [
        this.data?.cuenta_bancaria || '',
        [Validators.maxLength(50)]
      ],
      
      // === CONTACTOS ===
      contacto_entidad: [
        this.data?.contacto_entidad || '',
        [Validators.maxLength(100)]
      ],
      telefono_contacto: [
        this.data?.telefono_contacto || '',
        [Validators.maxLength(20)]
      ],
      email_contacto: [
        this.data?.email_contacto || '',
        [Validators.email, Validators.maxLength(100)]
      ],
      representante_entidad: [
        this.data?.representante_entidad || '',
        [Validators.maxLength(100)]
      ],
      representante_heltas: [
        this.data?.representante_heltas || '',
        [Validators.maxLength(100)]
      ],
      
      // === DETALLES DEL SERVICIO ===
      servicios_incluidos: [
        this.data?.servicios_incluidos || '',
        [Validators.maxLength(1000)]
      ],
      terminos_condiciones: [
        this.data?.terminos_condiciones || '',
        [Validators.maxLength(2000)]
      ],
      exclusiones: [
        this.data?.exclusiones || '',
        [Validators.maxLength(1000)]
      ],
      penalidades: [
        this.data?.penalidades || '',
        [Validators.maxLength(1000)]
      ],
      
      // === PERIODO DE PRUEBA ===
      periodo_prueba: [
        this.data?.periodo_prueba || null,
        [Validators.min(0), Validators.max(365)]
      ],

      // === CONFIGURACIONES ADICIONALES ===
      observaciones: [
        this.data?.observaciones || '',
        [Validators.maxLength(500)]
      ],
      etiquetas: [
        etiquetasIniciales
      ],
      alerta_vencimiento: [
        this.data?.alerta_vencimiento ?? true
      ],
      dias_alerta: [
        this.data?.dias_alerta || 30,
        [Validators.min(1), Validators.max(365)]
      ]
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  ngOnInit() {
    this.cargarListas();
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  private formatDateForBackend(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString();
  }

  // === MÉTODO DE CONVERSIÓN SEGURA PARA NÚMEROS ENTEROS ===
  private convertToInteger(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : Math.floor(num);
  }

  // NUEVO: Método para extraer array de cualquier formato de respuesta
  private extraerArrayDeRespuesta(respuesta: any): any[] {
    if (!respuesta) {
      return [];
    }

    // Si es directamente un array
    if (Array.isArray(respuesta)) {
      return respuesta.filter((item: any) => item.activo && !item.eliminado);
    }

    // Si es un objeto con estructura { isSuccess, data, message }
    if (respuesta.isSuccess !== undefined && respuesta.data !== undefined) {
      return (respuesta.data || []).filter((item: any) => item.activo && !item.eliminado);
    }

    // Si es un objeto con propiedad data que es array
    if (respuesta.data && Array.isArray(respuesta.data)) {
      return respuesta.data.filter((item: any) => item.activo && !item.eliminado);
    }

    // Si es un objeto con otra estructura, intentar encontrar un array
    for (const key in respuesta) {
      if (Array.isArray(respuesta[key])) {
        return respuesta[key].filter((item: any) => item.activo && !item.eliminado);
      }
    }

    console.error('❌ No se pudo extraer array de la respuesta:', respuesta);
    return [];
  }

  cargarListas() {
    this.cargando = true;
    this.spinner.show();

    // Cargar entidades, SLAs y prioridades en paralelo
    Promise.all([
      this.entidadesService.lista().toPromise(),
      this.slasService.lista().toPromise(),
      this.prioridadesService.lista().toPromise()
    ]).then(([resEntidades, resSlas, resPrioridades]) => {
      this.cargando = false;
      this.spinner.hide();

      // Cargar entidades
      if (resEntidades?.isSuccess) {
        this.entidades = (resEntidades.data || []).filter((entidad: any) => entidad.estado);
        console.log('🏢 Entidades cargadas:', this.entidades.length);
      } else {
        console.error('Error al cargar entidades:', resEntidades?.message);
        this.entidades = [];
      }

      // Cargar SLAs
      if (resSlas?.isSuccess) {
        this.slas = (resSlas.data || []).filter((sla: any) => sla.estado);
        console.log('📊 SLAs cargados:', this.slas.length);
      } else {
        console.error('Error al cargar SLAs:', resSlas?.message);
        this.slas = [];
      }

      // Cargar prioridades usando el método universal
      this.prioridades = this.extraerArrayDeRespuesta(resPrioridades);
      console.log('Prioridades cargadas:', this.prioridades.length);

    }).catch(error => {
      this.cargando = false;
      this.spinner.hide();
      console.error('Error al cargar listas:', error);
      this.entidades = [];
      this.slas = [];
      this.prioridades = [];
    });
  }

  // === MÉTODOS PARA ETIQUETAS ===
  addEtiqueta(event: any): void {
    const value = (event.value || '').trim();
    
    if (value) {
      const etiquetas = this.form.get('etiquetas')?.value || [];
      if (!etiquetas.includes(value)) {
        etiquetas.push(value);
        this.form.get('etiquetas')?.setValue(etiquetas);
      }
    }
    
    this.etiquetaInput = '';
    if (event.chipInput) {
      event.chipInput.clear();
    }
  }

  removeEtiqueta(etiqueta: string): void {
    const etiquetas = this.form.get('etiquetas')?.value || [];
    const index = etiquetas.indexOf(etiqueta);
    
    if (index >= 0) {
      etiquetas.splice(index, 1);
      this.form.get('etiquetas')?.setValue(etiquetas);
    }
  }

  // === GETTERS PARA VALIDACIÓN ===
  get titulo() { return this.form.get('titulo'); }
  get entidad_id() { return this.form.get('entidad_id'); }
  get sla_id() { return this.form.get('sla_id'); }
  get fecha_inicio() { return this.form.get('fecha_inicio'); }
  get fecha_fin() { return this.form.get('fecha_fin'); }
  get monto_total() { return this.form.get('monto_total'); }
  get email_contacto() { return this.form.get('email_contacto'); }
  get periodo_prueba() { return this.form.get('periodo_prueba'); }
  get dias_alerta() { return this.form.get('dias_alerta'); }

  // Método para validar monto
  validarMonto(event: any): void {
    const value = event.target.value;
    if (value && value < 0) {
      this.form.get('monto_total')?.setValue(null);
    }
  }

  save(): void {
    if (this.form.valid && this.validateDates()) {
      const formValue = this.form.value;
      
      // === CONVERSIÓN SEGURA DE DATOS PARA EL BACKEND ===
      const datosParaGuardar = {
        ...formValue,
        // === IDs COMO NÚMEROS ENTEROS ===
        entidad_id: this.convertToInteger(formValue.entidad_id),
        sla_id: this.convertToInteger(formValue.sla_id),
        // === FECHAS FORMATEADAS ===
        fecha_inicio: this.formatDateForBackend(formValue.fecha_inicio),
        fecha_fin: this.formatDateForBackend(formValue.fecha_fin),
        // === ETIQUETAS COMO STRING JSON ===
        etiquetas: formValue.etiquetas && formValue.etiquetas.length > 0 ? 
          ContratoUtils.stringificarEtiquetas(formValue.etiquetas) : undefined,
        // === NÚMEROS CONVERSION SEGURA ===
        monto_total: formValue.monto_total ? Number(formValue.monto_total) : null,
        periodo_prueba: this.convertToInteger(formValue.periodo_prueba),
        dias_alerta: this.convertToInteger(formValue.dias_alerta) || 30
      };

      console.log('✅ Datos del formulario válidos:', datosParaGuardar);
      
      this.dialogRef.close(datosParaGuardar);
    } else {
      console.log('❌ Formulario inválido:', this.form.errors);
      this.form.markAllAsTouched();
      
      // Mostrar errores específicos
      if (!this.validateDates()) {
        Swal.fire({
          title: 'Fechas inválidas',
          text: 'La fecha de fin debe ser posterior a la fecha de inicio',
          icon: 'error',
          confirmButtonText: 'Entendido'
        });
      }
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    
    if (!field) return 'Campo no encontrado';
    
    if (field.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (field.hasError('maxlength')) {
      const maxLength = field.errors?.['maxlength']?.requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    
    if (field.hasError('min')) {
      const min = field.errors?.['min']?.min;
      return `El valor mínimo es ${min}`;
    }
    
    if (field.hasError('max')) {
      const max = field.errors?.['max']?.max;
      return `El valor máximo es ${max}`;
    }
    
    if (field.hasError('email')) {
      return 'Formato de email inválido';
    }
    
    return 'Campo inválido';
  }

  // Validación de fechas
  validateDates(): boolean {
    const inicio = this.form.get('fecha_inicio')?.value;
    const fin = this.form.get('fecha_fin')?.value;
    
    if (!inicio || !fin) {
      return true;
    }
    
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);
    
    return fechaFin > fechaInicio;
  }
}