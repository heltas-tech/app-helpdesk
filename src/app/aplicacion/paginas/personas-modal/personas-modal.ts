import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { PersonaInterface } from '../../interfaces/personas.interface';

@Component({
  selector: 'app-persona-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule
  ],
  templateUrl: './personas-modal.html'
})
export class PersonaModal {
  form: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PersonaModal>,
    @Inject(MAT_DIALOG_DATA) public data: PersonaInterface
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;
    
    this.form = this.fb.group({
      id: [data?.id || 0],
      nombre: [
        data?.nombre || '', 
        [Validators.required, Validators.maxLength(50)]
      ],
      apellido: [
        data?.apellido || '', 
        [Validators.required, Validators.maxLength(50)]
      ],
      ci: [
        data?.ci || '', 
        [Validators.maxLength(15)]
      ],
      telefono: [
        data?.telefono || '', 
        [Validators.maxLength(15)]
      ],
      direccion: [
        data?.direccion || '', 
        [Validators.maxLength(200)]
      ],
      activo: [data?.activo !== undefined ? data.activo : true]
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get apellido() {
    return this.form.get('apellido');
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