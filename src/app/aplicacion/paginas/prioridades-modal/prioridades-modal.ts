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
    CommonModule, // ✅ Ya incluye NgIf, no necesitas importarlo por separado
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    MatIconModule
    // ❌ ELIMINADO: NgIf (ya viene en CommonModule)
  ],
  templateUrl: './prioridades-modal.html',
  styleUrls: ['./prioridades-modal.scss']
})
export class PrioridadesModal {
  form: FormGroup;
  isEditMode = false;

  // Propiedades para conversión de tiempos
  tiempoRespuestaHoras: string = '0';
  tiempoRespuestaDias: number = 0;
  tiempoResolucionHoras: string = '0';
  tiempoResolucionDias: number = 0;

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
      tiempo_respuesta: [
        data?.tiempo_respuesta || null, 
        [Validators.required, Validators.min(1)]
      ],
      tiempo_resolucion: [
        data?.tiempo_resolucion || null, 
        [Validators.required, Validators.min(1)]
      ],
      activo: [data?.activo !== undefined ? data.activo : true]
    });

    // Si estamos editando, marcamos como tocados para mostrar validaciones
    if (this.isEditMode) {
      this.form.markAllAsTouched();
      this.actualizarConversionTiempos();
    }

    // Escuchar cambios en los campos de tiempo
    this.form.get('tiempo_respuesta')?.valueChanges.subscribe(() => {
      this.actualizarConversionTiempos();
    });

    this.form.get('tiempo_resolucion')?.valueChanges.subscribe(() => {
      this.actualizarConversionTiempos();
    });
  }

  // MÉTODOS PARA CONVERSIÓN DE TIEMPOS
  actualizarConversionTiempos(): void {
    const tiempoRespuesta = this.tiempo_respuesta?.value || 0;
    const tiempoResolucion = this.tiempo_resolucion?.value || 0;

    this.tiempoRespuestaHoras = (tiempoRespuesta / 60).toFixed(1);
    this.tiempoRespuestaDias = Math.floor(tiempoRespuesta / 1440);
    
    this.tiempoResolucionHoras = (tiempoResolucion / 60).toFixed(1);
    this.tiempoResolucionDias = Math.floor(tiempoResolucion / 1440);
  }

  getTiempoRespuestaHoras(): string {
    return this.tiempoRespuestaHoras;
  }

  getTiempoRespuestaDias(): number {
    return this.tiempoRespuestaDias;
  }

  getTiempoResolucionHoras(): string {
    return this.tiempoResolucionHoras;
  }

  getTiempoResolucionDias(): number {
    return this.tiempoResolucionDias;
  }

  // GETTERS
  get nombre() {
    return this.form.get('nombre');
  }

  get descripcion() {
    return this.form.get('descripcion');
  }

  get nivel() {
    return this.form.get('nivel');
  }

  get tiempo_respuesta() {
    return this.form.get('tiempo_respuesta');
  }

  get tiempo_resolucion() {
    return this.form.get('tiempo_resolucion');
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
      if (fieldName === 'nivel') {
        return 'El nivel debe estar entre 1 y 5';
      } else {
        return 'El valor debe ser mayor a 0';
      }
    }
    
    return 'Campo inválido';
  }
}