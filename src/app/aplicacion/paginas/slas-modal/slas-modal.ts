import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { SlaInterface } from '../../interfaces/slas.interface';
import { PrioridadesInterface } from '../../interfaces/prioridades.interface';
import { PrioridadesService } from '../../services/prioridades.service';

@Component({
  selector: 'app-sla-modal',
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
  templateUrl: './slas-modal.html'
})
export class SlaModal implements OnInit {
  form: FormGroup;
  isEditMode = false;
  prioridades: PrioridadesInterface[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SlaModal>,
    @Inject(MAT_DIALOG_DATA) public data: SlaInterface,
    private prioridadService: PrioridadesService
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
      tiempo_respuesta: [
        data?.tiempo_respuesta || null, 
        [Validators.required, Validators.min(1)]
      ],
      tiempo_resolucion: [
        data?.tiempo_resolucion || null, 
        [Validators.required, Validators.min(1)]
      ],
      prioridad_id: [data?.prioridad_id || null, Validators.required],
      estado: [data?.estado !== undefined ? data.estado : true]
    });

    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  ngOnInit() {
    // Cargar todas las prioridades (activas e inactivas)
    this.prioridadService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.prioridades = res.data || [];
          
          // Si estamos editando y la prioridad actual está inactiva, asegurarnos de que esté en la lista
          if (this.isEditMode && this.data.prioridad_id) {
            const prioridadActual = this.prioridades.find((p: PrioridadesInterface) => p.id === this.data.prioridad_id);
            if (prioridadActual && !this.prioridades.some(p => p.id === prioridadActual.id)) {
              this.prioridades.push(prioridadActual);
            }
          }
        }
      },
      error: (err) => console.error('Error al cargar prioridades:', err)
    });
  }

  get nombre() {
    return this.form.get('nombre');
  }

  get tiempo_respuesta() {
    return this.form.get('tiempo_respuesta');
  }

  get tiempo_resolucion() {
    return this.form.get('tiempo_resolucion');
  }

  get prioridad_id() {
    return this.form.get('prioridad_id');
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
    
    if (field?.hasError('min')) {
      return 'El valor debe ser mayor a 0';
    }
    
    return 'Campo inválido';
  }
}