import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { SubcategoriaInterface } from '../../interfaces/subcategorias';
import { CategoriaInterface } from '../../interfaces/categoria.interface';
import { CategoriasService } from '../../services/categorias.service';

@Component({
  selector: 'app-subcategoria-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './subcategorias-modal.html'
})
export class SubcategoriaModal implements OnInit {
  form: FormGroup;
  isEditMode = false;
  categorias: CategoriaInterface[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SubcategoriaModal>,
    @Inject(MAT_DIALOG_DATA) public data: SubcategoriaInterface,
    private categoriaService: CategoriasService
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;

    this.form = this.fb.group({
      id: [data?.id || 0],
      nombre: [
        data?.nombre || '', 
        [Validators.required, Validators.maxLength(100)]
      ],
      descripcion: [
        data?.descripcion || '', 
        [Validators.maxLength(200)]
      ],
      estado: [data?.estado !== undefined ? data.estado : true],
      categoria_id: [data?.categoria_id || null, Validators.required]
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  ngOnInit() {
    // Cargar todas las categorías (activas e inactivas)
    this.categoriaService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.categorias = res.data || [];
          
          // Si estamos editando y la categoría actual está inactiva, asegurarnos de que esté en la lista
          if (this.isEditMode && this.data.categoria_id) {
            const categoriaActual = this.categorias.find((c: CategoriaInterface) => c.id === this.data.categoria_id);
            if (categoriaActual && !this.categorias.some(c => c.id === categoriaActual.id)) {
              this.categorias.push(categoriaActual);
            }
          }
        }
      },
      error: (err) => console.error('Error al cargar categorías:', err)
    });
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get categoria_id() {
    return this.form.get('categoria_id');
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
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