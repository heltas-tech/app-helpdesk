import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { EntidadInterface } from '../../interfaces/entidades.interface';

@Component({
  selector: 'app-entidad-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule
  ],
  templateUrl: './entidades-modal.html',
  styleUrls: ['./entidades-modal.scss']
})
export class EntidadModal {
  form: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EntidadModal>,
    @Inject(MAT_DIALOG_DATA) public data: EntidadInterface
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;
    
    this.form = this.fb.group({
      id: [data?.id || 0],
      denominacion: [
        data?.denominacion || '', 
        [Validators.required, Validators.maxLength(100)]
      ],
      nit: [
        data?.nit || '', 
        [Validators.required, Validators.maxLength(20)]
      ],
      estado: [data?.estado !== undefined ? data.estado : true]
    });

    // Si es edición, marcamos el formulario como "dirty" para mostrar validaciones
    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  get denominacion() {
    return this.form.get('denominacion');
  }

  get nit() {
    return this.form.get('nit');
  }

  save(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    } else {
      // Marcar todos los campos como touched para mostrar errores
      this.form.markAllAsTouched();
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  // Método para mostrar errores de validación
  getErrorMessage(fieldName: string): string {
    const field = this.form.get(fieldName);
    
    if (field?.hasError('required')) {
      return 'Este campo es obligatorio';
    }
    
    if (field?.hasError('maxlength')) {
      const maxLength = field.errors?.['maxlength']?.requiredLength;
      return `Máximo ${maxLength} caracteres`;
    }
    
    return '';
  }
}