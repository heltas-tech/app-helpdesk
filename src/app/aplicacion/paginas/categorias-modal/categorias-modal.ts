import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { CategoriaInterface } from '../../interfaces/categoria.interface';

@Component({
  selector: 'app-categoria-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule
  ],
  templateUrl: './categorias-modal.html',
  styleUrls: ['./categorias-modal.scss']
})
export class CategoriaModal {
  form: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CategoriaModal>,
    @Inject(MAT_DIALOG_DATA) public data: CategoriaInterface
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
      estado: [data?.estado !== undefined ? data.estado : true]
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get descripcion() {
    return this.form.get('descripcion');
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
