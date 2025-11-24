import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-ticket-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './ticket-modal.html'
})
export class TicketModalComponent implements OnInit {
  form: FormGroup;
  isEditMode = false;
  isLoading = false;

  // Datos para los selects
  tecnicos: any[] = [];
  categorias: any[] = [];
  subcategorias: any[] = [];
  subcategoriasFiltradas: any[] = [];
  prioridades: any[] = [];
  slas: any[] = [];
  contratos: any[] = [];
  entidadesUsuarios: any[] = [];

  // Estados del ticket
  estadosTicket = [
    { value: 'NUEVO', label: '🆕 Nuevo' },
    { value: 'EN_PROCESO', label: '⚙️ En Proceso' },
    { value: 'EN_ESPERA_CLIENTE', label: '⏳ Esperando Cliente' },
    { value: 'EN_ESPERA_TECNICO', label: '⏳ Esperando Técnico' },
    { value: 'RESUELTO', label: '✅ Resuelto' },
    { value: 'REABIERTO', label: '🔄 Reabierto' },
    { value: 'CERRADO', label: '🔒 Cerrado' }
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TicketModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.createForm();
    this.isEditMode = !!data?.ticket;

    this.tecnicos = data?.tecnicos || [];
    this.categorias = data?.categorias || [];
    this.subcategorias = data?.subcategorias || [];
    this.prioridades = data?.prioridades || [];
    this.slas = data?.slas || [];
    this.contratos = data?.contratos || [];
    this.entidadesUsuarios = data?.entidadesUsuarios || [];

    console.log('📥 Subcategorías cargadas:', this.subcategorias.length);
    console.log('📥 Categorías cargadas:', this.categorias.length);
  }

  private createForm(): FormGroup {
    const ticket = this.data?.ticket;

    return this.fb.group({
      id: [ticket?.id || 0],
      titulo: [
        ticket?.titulo || '', 
        [Validators.required, Validators.maxLength(100)]
      ],
      descripcion: [
        ticket?.descripcion || '', 
        [Validators.maxLength(5000)]
      ],
      estado: [ticket?.estado !== undefined ? ticket.estado : true],
      estado_ticket: [ticket?.estado_ticket || 'NUEVO', Validators.required],
      entidad_usuario_id: [
        ticket?.entidad_usuario_id || null, 
        Validators.required
      ],
      tecnico_id: [ticket?.tecnico_id || null],
      categoria_id: [
        ticket?.categoria_id || null, 
        Validators.required
      ],
      subcategoria_id: [ticket?.subcategoria_id || null],
      prioridad_id: [
        ticket?.prioridad_id || null, 
        Validators.required
      ],
      sla_id: [
        ticket?.sla_id || null, 
        Validators.required
      ],
      contrato_id: [
        ticket?.contrato_id || null, 
        Validators.required
      ]
    });
  }

  ngOnInit() {
    // ✅ CORRECCIÓN: Configurar suscripción ANTES de filtrar
    this.form.get('categoria_id')?.valueChanges.subscribe(categoriaId => {
      console.log('🔄 Cambio de categoría:', categoriaId);
      this.filtrarSubcategorias(categoriaId);
    });

    // ✅ CORRECCIÓN: Filtrar subcategorías inmediatamente si hay categoría
    const categoriaInicial = this.form.get('categoria_id')?.value;
    if (categoriaInicial) {
      console.log('🎯 Filtrando subcategorías para categoría inicial:', categoriaInicial);
      this.filtrarSubcategorias(categoriaInicial);
    } else {
      console.log('ℹ️ No hay categoría seleccionada inicialmente');
      this.subcategoriasFiltradas = [];
    }
  }

  filtrarSubcategorias(categoriaId: number) {
    console.log('🔍 Filtrando subcategorías para categoría:', categoriaId);
    console.log('📋 Total de subcategorías disponibles:', this.subcategorias.length);
    
    if (categoriaId) {
      // ✅ CORRECCIÓN: Asegurar que categoriaId sea número y filtrar correctamente
      const idCategoria = Number(categoriaId);
      
      this.subcategoriasFiltradas = this.subcategorias.filter(
        sub => Number(sub.categoria_id) === idCategoria && sub.estado
      );
      
      console.log('📋 Subcategorías filtradas:', this.subcategoriasFiltradas);
      console.log('🔍 Detalle de filtro:', {
        categoriaIdBuscado: idCategoria,
        tipoCategoriaId: typeof idCategoria,
        subcategoriasEncontradas: this.subcategoriasFiltradas.length,
        todasLasSubcategorias: this.subcategorias.map(s => ({ 
          id: s.id, 
          categoria_id: s.categoria_id, 
          tipo_categoria_id: typeof s.categoria_id,
          nombre: s.nombre 
        }))
      });
      
      const currentSubcategoriaId = this.form.get('subcategoria_id')?.value;
      console.log('🎯 Subcategoría actual:', currentSubcategoriaId);
      
      // ✅ CORRECCIÓN: Solo resetear si la subcategoría actual no pertenece a la nueva categoría
      if (currentSubcategoriaId && !this.subcategoriasFiltradas.some(sub => Number(sub.id) === Number(currentSubcategoriaId))) {
        console.log('🔄 Reseteando subcategoría - no pertenece a la nueva categoría');
        this.form.patchValue({ subcategoria_id: null });
      }
    } else {
      console.log('❌ No hay categoría seleccionada - limpiando subcategorías');
      this.subcategoriasFiltradas = [];
      this.form.patchValue({ subcategoria_id: null });
    }
  }

  // Getters para validación
  get nombre() { return this.form.get('titulo'); }
  get entidad_usuario_id() { return this.form.get('entidad_usuario_id'); }
  get categoria_id() { return this.form.get('categoria_id'); }
  get subcategoria_id() { return this.form.get('subcategoria_id'); }
  get prioridad_id() { return this.form.get('prioridad_id'); }
  get sla_id() { return this.form.get('sla_id'); }
  get contrato_id() { return this.form.get('contrato_id'); }
  get estado_ticket() { return this.form.get('estado_ticket'); }

  save(): void {
    if (this.form.valid) {
      this.isLoading = true;
      
      const formData = this.form.value;
      
      // ✅ CORRECCIÓN: Convertir campos numéricos explícitamente
      const camposNumericos = [
        'entidad_usuario_id', 'tecnico_id', 'categoria_id', 
        'subcategoria_id', 'prioridad_id', 'sla_id', 'contrato_id'
      ];
      
      camposNumericos.forEach(campo => {
        if (formData[campo] !== null && formData[campo] !== undefined && formData[campo] !== '') {
          formData[campo] = Number(formData[campo]);
        } else if (formData[campo] === '') {
          formData[campo] = null;
        }
      });
      
      console.log('📤 Datos del formulario (corregidos):', formData);
      console.log('🔍 Tipos de datos:', this.verificarTiposFormulario(formData));
      
      this.dialogRef.close(formData);
    } else {
      this.form.markAllAsTouched();
      console.error('❌ Formulario inválido:', this.form.errors);
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    
    if (field?.hasError('required')) {
      return 'Campo obligatorio';
    }
    
    if (field?.hasError('maxlength')) {
      return 'Máximo de caracteres excedido';
    }
    
    return 'Campo inválido';
  }

  // ✅ NUEVO MÉTODO: Verificar tipos en el formulario
  private verificarTiposFormulario(data: any): any {
    const tipos: any = {};
    Object.keys(data).forEach(key => {
      tipos[key] = {
        valor: data[key],
        tipo: typeof data[key],
        esNumber: !isNaN(data[key]) && data[key] !== null && data[key] !== ''
      };
    });
    return tipos;
  }
}