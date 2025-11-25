import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { PrioridadesInterface } from '../../interfaces/prioridades.interface';

@Component({
  selector: 'app-prioridades-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule
  ],
  templateUrl: './prioridades-modal.html',
  styleUrls: ['./prioridades-modal.scss']
})
export class PrioridadesModal {
  form: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PrioridadesModal>,
    @Inject(MAT_DIALOG_DATA) public data: PrioridadesInterface
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;
    
    this.form = this.fb.group({
      id: [data?.id || 0],
      nombre: [
        data?.nombre || '', 
        [Validators.required, Validators.maxLength(50)]
      ],
      descripcion: [
        data?.descripcion || '', 
        [Validators.maxLength(200)]
      ],
      nivel: [
        data?.nivel || 1, 
        [Validators.required, Validators.min(1), Validators.max(5)]
      ],
      activo: [data?.activo !== undefined ? data.activo : true]
    });

    // Si estamos editando, marcamos como tocados para mostrar validaciones
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

  get nivel() {
    return this.form.get('nivel');
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
      return 'Este campo es obligatorio';
    }
    
    if (field?.hasError('maxlength')) {
      return 'Máximo de caracteres excedido';
    }
    
    if (field?.hasError('min') || field?.hasError('max')) {
      return 'El nivel debe estar entre 1 y 5';
    }
    
    return 'Campo inválido';
  }
}