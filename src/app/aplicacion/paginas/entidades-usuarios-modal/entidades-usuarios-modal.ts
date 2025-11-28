import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';

import { EntidadUsuarioInterface } from '../../interfaces/entidad-usuario.interface';
import { UsuarioInterface } from '../../interfaces/usuarios.interface';
import { EntidadInterface } from '../../interfaces/entidades.interface';
import { UsuariosService } from '../../services/usuarios.service';
import { EntidadesService } from '../../services/entidades.service';

@Component({
  selector: 'app-entidad-usuario-modal',
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
  templateUrl: './entidades-usuarios-modal.html',
  styleUrls: ['./entidades-usuarios-modal.scss']
})
export class EntidadUsuarioModal implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  usuarios: UsuarioInterface[] = [];
  entidades: EntidadInterface[] = [];
  cargandoUsuarios = true;
  cargandoEntidades = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EntidadUsuarioModal>,
    @Inject(MAT_DIALOG_DATA) public data: EntidadUsuarioInterface,
    private usuariosService: UsuariosService,
    private entidadesService: EntidadesService
  ) {
    this.isEditMode = !!data && data.id !== undefined && data.id !== 0;
    this.initializeForm();
  }

  private initializeForm() {
    this.form = this.fb.group({
      id: [this.data?.id || 0],
      usuarioId: [this.data?.usuarioId || null, Validators.required],
      entidadId: [this.data?.entidadId || null, Validators.required],
      cargo: [
        this.data?.cargo || '', 
        [Validators.required, Validators.maxLength(100)]
      ],
      activo: [this.data?.activo !== undefined ? this.data.activo : true]
    });

    // ✅ ELIMINADO: No marcar como touched en modo edición
    // Esto evita que se muestren errores al abrir el modal
  }

  ngOnInit() {
    this.cargarUsuarios();
    this.cargarEntidades();
  }

  cargarUsuarios() {
    this.cargandoUsuarios = true;
    this.usuariosService.lista().subscribe({
      next: (res: any) => {
        this.cargandoUsuarios = false;
        
        if (res.isSuccess) {
          let dataArray: any[] = [];
          
          if (Array.isArray(res.data)) {
            dataArray = res.data;
          } else if (res.data && typeof res.data === 'object') {
            if (res.data.activos || res.data.eliminados) {
              dataArray = [...(res.data.activos || []), ...(res.data.eliminados || [])];
            } else {
              dataArray = Object.values(res.data);
            }
          }
          
          // SOLO usuarios CLIENTE y no eliminados
          this.usuarios = dataArray.filter((u: any) => 
            !u.eliminado && u.rol === 'CLIENTE'
          ) as UsuarioInterface[];
          
          this.manejarUsuarioActual();
        } else {
          this.usuarios = [];
        }
      },
      error: (err) => {
        this.cargandoUsuarios = false;
        console.error('Error al cargar usuarios:', err);
        this.usuarios = [];
      }
    });
  }

  cargarEntidades() {
    this.cargandoEntidades = true;
    this.entidadesService.lista().subscribe({
      next: (res: any) => {
        this.cargandoEntidades = false;
        
        if (res.isSuccess) {
          let dataArray: any[] = [];
          
          if (Array.isArray(res.data)) {
            dataArray = res.data;
          } else if (res.data && typeof res.data === 'object') {
            if (res.data.activos || res.data.eliminados) {
              dataArray = [...(res.data.activos || []), ...(res.data.eliminados || [])];
            } else {
              dataArray = Object.values(res.data);
            }
          }
          
          this.entidades = dataArray.filter((e: any) => !e.eliminado) as EntidadInterface[];
          this.manejarEntidadActual();
        } else {
          this.entidades = [];
        }
      },
      error: (err) => {
        this.cargandoEntidades = false;
        console.error('Error al cargar entidades:', err);
        this.entidades = [];
      }
    });
  }

  private manejarUsuarioActual() {
    if (this.isEditMode && this.data.usuarioId) {
      const usuarioActual = this.usuarios.find(u => u.id === this.data.usuarioId);
      if (!usuarioActual && this.data.usuario) {
        // Solo agregar si es CLIENTE para mantener consistencia
        if (this.data.usuario.rol === 'CLIENTE') {
          this.usuarios.push({
            id: this.data.usuarioId,
            nombre_usuario: this.data.usuario.nombre_usuario,
            correo_electronico: this.data.usuario.correo_electronico,
            telefono: this.data.usuario.telefono,
            rol: 'CLIENTE',
            activo: this.data.usuario.activo,
            eliminado: false
          } as UsuarioInterface);
        }
      }
    }
  }

  private manejarEntidadActual() {
    if (this.isEditMode && this.data.entidadId) {
      const entidadActual = this.entidades.find(e => e.id === this.data.entidadId);
      if (!entidadActual && this.data.entidad) {
        this.entidades.push({
          id: this.data.entidadId,
          denominacion: this.data.entidad.denominacion,
          nit: this.data.entidad.nit,
          estado: this.data.entidad.estado,
          eliminado: false
        } as EntidadInterface);
      }
    }
  }

  get usuarioId() {
    return this.form.get('usuarioId');
  }

  get entidadId() {
    return this.form.get('entidadId');
  }

  get cargo() {
    return this.form.get('cargo');
  }

  save(): void {
    if (this.form.valid) {
      // SOLO validar entidad inactiva, no usuario inactivo
      const entidadSeleccionada = this.getEntidadSeleccionada();
      
      if (entidadSeleccionada && !entidadSeleccionada.estado) {
        if (!confirm('La entidad seleccionada está INACTIVA. ¿Deseas continuar?')) {
          return;
        }
      }
      
      this.dialogRef.close(this.form.value);
    } else {
      this.form.markAllAsTouched(); // ✅ Solo marca como touched al intentar guardar
    }
  }

  // ✅✅✅ CORRECCIÓN: Botón cancelar NO marca el formulario como touched
  cancel(): void {
    this.dialogRef.close(null); // ✅ Cierra sin datos y sin marcar touched
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

  getUsuarioSeleccionado(): UsuarioInterface | undefined {
    const usuarioId = this.form.get('usuarioId')?.value;
    return this.usuarios.find(u => u.id === usuarioId);
  }

  getEntidadSeleccionada(): EntidadInterface | undefined {
    const entidadId = this.form.get('entidadId')?.value;
    return this.entidades.find(e => e.id === entidadId);
  }

  // Método para ver si un usuario está inactivo (solo para UI)
  isUsuarioInactivo(): boolean {
    const usuario = this.getUsuarioSeleccionado();
    return !!usuario && !usuario.activo;
  }

  //  Método para ver si una entidad está inactiva (solo para UI)
  isEntidadInactiva(): boolean {
    const entidad = this.getEntidadSeleccionada();
    return !!entidad && !entidad.estado;
  }
}