import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { UsuarioInterface } from '../../interfaces/usuarios.interface';

@Component({
  selector: 'app-usuario-modal',
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
  templateUrl: './usuarios-modal.html',
  styleUrls: ['./usuarios-modal.scss']
})
export class UsuarioModal implements OnInit {
  form: FormGroup;
  isEditMode = false;
  mostrarPassword = false;
  roles = ['ADMINISTRADOR', 'CLIENTE', 'TECNICO'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UsuarioModal>,
    @Inject(MAT_DIALOG_DATA) public data: UsuarioInterface
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;
    
    this.form = this.fb.group({
      id: [data?.id || 0],
      nombre_usuario: [
        data?.nombre_usuario || '', 
        [Validators.required, Validators.maxLength(100)]
      ],
      correo_electronico: [
        data?.correo_electronico || '', 
        [Validators.required, Validators.email]
      ],
      telefono: [
        data?.telefono || '', 
        [Validators.required, Validators.maxLength(15)]
      ],
      rol: [
        data?.rol || 'CLIENTE',
        [Validators.required]
      ],
      activo: [data?.activo !== undefined ? data.activo : true]
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  ngOnInit() {}

  get nombre_usuario() {
    return this.form.get('nombre_usuario');
  }

  get correo_electronico() {
    return this.form.get('correo_electronico');
  }

  get telefono() {
    return this.form.get('telefono');
  }

  get rol() {
    return this.form.get('rol');
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
    
    if (field?.hasError('email')) {
      return 'Formato de correo inválido';
    }
    
    return 'Campo inválido';
  }

  esCliente(): boolean {
    return this.form.get('rol')?.value === 'CLIENTE';
  }
}