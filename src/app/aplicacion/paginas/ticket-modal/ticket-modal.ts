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
  subcategorias: any[] = []; // Todas las subcategorías
  subcategoriasFiltradas: any[] = []; // Subcategorías filtradas por categoría
  prioridades: any[] = [];
  slas: any[] = [];
  contratos: any[] = [];
  entidadesUsuarios: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TicketModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEditMode = !!data?.ticket;

    // Inicializar datos de los selects
    this.tecnicos = data?.tecnicos || [];
    this.categorias = data?.categorias || [];
    this.subcategorias = data?.subcategorias || []; // Asegurar que tenemos subcategorías
    this.prioridades = data?.prioridades || [];
    this.slas = data?.slas || [];
    this.contratos = data?.contratos || [];
    this.entidadesUsuarios = data?.entidadesUsuarios || [];

    this.form = this.fb.group({
      id: [data?.ticket?.id || 0],
      titulo: [
        data?.ticket?.titulo || '', 
        [Validators.required, Validators.maxLength(100)]
      ],
      descripcion: [
        data?.ticket?.descripcion || '', 
        [Validators.maxLength(1000)]
      ],
      estado: [data?.ticket?.estado !== undefined ? data.ticket.estado : true],
      entidad_usuario_id: [
        data?.ticket?.entidad_usuario_id || null, 
        Validators.required
      ],
      tecnico_id: [data?.ticket?.tecnico_id || null],
      categoria_id: [
        data?.ticket?.categoria_id || null, 
        Validators.required
      ],
      subcategoria_id: [
        data?.ticket?.subcategoria_id || null, 
        Validators.required
      ],
      prioridad_id: [
        data?.ticket?.prioridad_id || null, 
        Validators.required
      ],
      sla_id: [
        data?.ticket?.sla_id || null, 
        Validators.required
      ],
      contrato_id: [
        data?.ticket?.contrato_id || null, 
        Validators.required
      ]
    });

    // Filtrar subcategorías cuando cambia la categoría
    this.form.get('categoria_id')?.valueChanges.subscribe(categoriaId => {
      this.filtrarSubcategorias(categoriaId);
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
      // Filtrar subcategorías inicialmente si hay categoría seleccionada
      if (data.ticket.categoria_id) {
        this.filtrarSubcategorias(data.ticket.categoria_id);
      }
    }
  }

  ngOnInit() {
    // Si no tenemos subcategorías, intentar cargarlas
    if (this.subcategorias.length === 0) {
      this.cargarSubcategorias();
    } else {
      // Si ya tenemos subcategorías, filtrar según la categoría actual
      const categoriaId = this.form.get('categoria_id')?.value;
      if (categoriaId) {
        this.filtrarSubcategorias(categoriaId);
      }
    }
  }

  cargarSubcategorias() {
    // En un caso real, aquí harías una llamada al servicio
    // Por ahora usamos las que vienen en data
    this.subcategorias = this.data?.subcategorias || [];
    
    const categoriaId = this.form.get('categoria_id')?.value;
    if (categoriaId) {
      this.filtrarSubcategorias(categoriaId);
    }
  }

  filtrarSubcategorias(categoriaId: number) {
    if (categoriaId) {
      this.subcategoriasFiltradas = this.subcategorias.filter(
        sub => sub.categoria_id === categoriaId && sub.estado
      );
      
      // Reset subcategoria_id si la subcategoría actual no pertenece a la categoría seleccionada
      const currentSubcategoriaId = this.form.get('subcategoria_id')?.value;
      if (currentSubcategoriaId && !this.subcategoriasFiltradas.some(sub => sub.id === currentSubcategoriaId)) {
        this.form.patchValue({ subcategoria_id: null });
      }
    } else {
      this.subcategoriasFiltradas = [];
      this.form.patchValue({ subcategoria_id: null });
    }
  }

  get nombre() {
    return this.form.get('titulo');
  }

  get entidad_usuario_id() {
    return this.form.get('entidad_usuario_id');
  }

  get categoria_id() {
    return this.form.get('categoria_id');
  }

  get subcategoria_id() {
    return this.form.get('subcategoria_id');
  }

  get prioridad_id() {
    return this.form.get('prioridad_id');
  }

  get sla_id() {
    return this.form.get('sla_id');
  }

  get contrato_id() {
    return this.form.get('contrato_id');
  }

  save(): void {
    if (this.form.valid) {
      this.isLoading = true;
      // Simular guardado (en realidad se maneja en el componente principal)
      setTimeout(() => {
        this.isLoading = false;
        this.dialogRef.close(this.form.value);
      }, 1000);
    } else {
      this.form.markAllAsTouched();
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
}