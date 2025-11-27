import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { SlaInterface, PrioridadInterface } from '../../interfaces/slas.interface';

interface ModalData {
  id?: number;
  nombre?: string;
  descripcion?: string;
  prioridad_id?: number;
  tipo_sla_id?: number;
  estado?: boolean;
  prioridades_ids?: number[];
  prioridadesDisponibles: PrioridadInterface[];
  tiposSlaDisponibles: any[];
}

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
    MatCheckboxModule
  ],
  templateUrl: './slas-modal.html',
  styleUrls: ['./slas-modal.scss']
})
export class SlaModal implements OnInit {
  form: FormGroup;
  isEditMode = false;
  
  prioridadesDisponibles: PrioridadInterface[] = [];
  tiposSlaDisponibles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SlaModal>,
    @Inject(MAT_DIALOG_DATA) public data: ModalData
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;
    
    this.prioridadesDisponibles = (data?.prioridadesDisponibles || []).filter(
      (p: PrioridadInterface) => p.activo && !p.eliminado
    );
    
    this.tiposSlaDisponibles = data?.tiposSlaDisponibles || [];

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
      tipo_sla_id: [
        data?.tipo_sla_id || null, 
        [Validators.required]
      ],
      estado: [data?.estado !== undefined ? data.estado : true],
      prioridades_ids: [data?.prioridades_ids || []]
    });

    // Si estamos editando, marcamos como tocados para mostrar validaciones
    if (this.isEditMode) {
      this.form.markAllAsTouched();
    }
  }

  ngOnInit() {}

  togglePrioridad(prioridadId: number | undefined) {
    if (!prioridadId) return;
    
    const prioridadesIds = this.prioridades_ids?.value || [];
    const index = prioridadesIds.indexOf(prioridadId);
    
    if (index > -1) {
      prioridadesIds.splice(index, 1);
    } else {
      prioridadesIds.push(prioridadId);
    }
    
    this.prioridades_ids?.setValue([...prioridadesIds]);
    this.prioridades_ids?.updateValueAndValidity();
  }

  isPrioridadSeleccionada(prioridadId: number | undefined): boolean {
    if (!prioridadId) return false;
    const prioridadesIds = this.prioridades_ids?.value || [];
    return prioridadesIds.includes(prioridadId);
  }

  getPrioridadNombre(prioridadId: number): string {
    const prioridad = this.prioridadesDisponibles.find(p => p.id === prioridadId);
    return prioridad ? prioridad.nombre : 'Desconocida';
  }

  formatearTiempo(minutos: number | undefined | null): string {
    if (!minutos) return 'N/D';
    
    if (minutos < 60) {
      return `${minutos} min`;
    } else if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      const minsRestantes = minutos % 60;
      return minsRestantes > 0 ? `${horas}h ${minsRestantes}min` : `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      const horas = Math.floor((minutos % 1440) / 60);
      if (horas > 0) {
        return `${dias}d ${horas}h`;
      }
      return `${dias}d`;
    }
  }

  get nombre() { return this.form.get('nombre'); }
  get descripcion() { return this.form.get('descripcion'); }
  get tipo_sla_id() { return this.form.get('tipo_sla_id'); }
  get prioridades_ids() { return this.form.get('prioridades_ids'); }

  save(): void {
    if (this.form.valid && (this.prioridades_ids?.value || []).length > 0) {
      const formData = {
        id: this.form.value.id,
        nombre: this.form.value.nombre,
        descripcion: this.form.value.descripcion,
        tipo_sla_id: Number(this.form.value.tipo_sla_id),
        estado: this.form.value.estado,
        prioridades_ids: this.prioridades_ids?.value || []
      };
      
      this.dialogRef.close(formData);
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
    
    return 'Campo inválido';
  }

  getPrioridadColor(nivel: number): string {
    switch(nivel) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getTipoSlaColor(tipoNombre: string): string {
    if (!tipoNombre) return 'bg-gray-400';
    
    switch(tipoNombre.toLowerCase()) {
      case 'bronce': return 'bg-amber-500';
      case 'plata': case 'silver': return 'bg-gray-400';
      case 'oro': case 'gold': case 'golden': return 'bg-yellow-500';
      case 'platinum': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  }

  // Verificar si el formulario es válido considerando prioridades
  isFormValid(): boolean {
    return this.form.valid && (this.prioridades_ids?.value || []).length > 0;
  }
}