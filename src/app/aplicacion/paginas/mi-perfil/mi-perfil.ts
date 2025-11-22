import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import Swal from 'sweetalert2';

import { UsuariosService } from '../../services/usuarios.service';
import { GlobalFuntions } from '../../services/global-funtions';
import { UpdateProfileDto } from '../../interfaces/usuarios.interface';
import { AccessControlService } from '../../services/access-control.service'; // ✅ NUEVO IMPORT

@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './mi-perfil.html',
  styleUrls: ['./mi-perfil.scss']
})
export class MiPerfilComponent implements OnInit {
  perfilForm: FormGroup;
  isLoading = false;
  isEditing = false;
  usuario: any = {};
  userRol: string = ''; // ✅ NUEVO: Variable para almacenar el rol

  // ✅ NUEVO: Variables para mostrar/ocultar contraseña
  hideNewPassword = true;
  hideConfirmPassword = true;

  constructor(
    private fb: FormBuilder,
    private usuariosService: UsuariosService,
    private global: GlobalFuntions,
    private router: Router,
    private snackBar: MatSnackBar,
    private accessControl: AccessControlService // ✅ NUEVO: Inyectar servicio
  ) {
    this.perfilForm = this.fb.group({
      nombre_usuario: ['', [Validators.required]],
      correo_electronico: ['', [Validators.required, Validators.email]],
      telefono: [''],
      // Campos para cambio de contraseña (opcional)
      newPassword: ['', [Validators.minLength(6)]],
      confirmPassword: ['']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    this.obtenerRolUsuario(); // ✅ NUEVO: Obtener rol al inicializar
    this.cargarDatosUsuario();
  }

  // ✅ NUEVO: Método para obtener el rol del usuario
  obtenerRolUsuario() {
    this.accessControl.checkAccess().subscribe({
      next: (accessData) => {
        if (accessData && accessData.rol) {
          this.userRol = accessData.rol.toUpperCase();
        }
      },
      error: (err) => {
        console.error('Error obteniendo rol:', err);
        // Si hay error, intentar obtener el rol del usuario cargado
        if (this.usuario.rol) {
          this.userRol = this.usuario.rol.toUpperCase();
        }
      }
    });
  }

  // ✅ NUEVO: Método para redirigir según el rol
  volver() {
    switch (this.userRol) {
      case 'ADMINISTRADOR':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'TECNICO':
        this.router.navigate(['/tecnico/inicio']);
        break;
      case 'CLIENTE':
        this.router.navigate(['/cliente/inicio']);
        break;
      default:
        this.router.navigate(['/inicio']);
        break;
    }
  }

  // ✅ OPCIÓN ALTERNATIVA MÁS SIMPLE: Usar el rol del usuario cargado
  volverAlternativo() {
    const rol = this.usuario.rol?.toUpperCase() || this.userRol;
    
    switch (rol) {
      case 'ADMINISTRADOR':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'TECNICO':
        this.router.navigate(['/tecnico/inicio']);
        break;
      case 'CLIENTE':
        this.router.navigate(['/cliente/inicio']);
        break;
      default:
        this.router.navigate(['/inicio']);
        break;
    }
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
    return null;
  }

  // ✅ NUEVO: Método para alternar visibilidad de contraseña
  togglePasswordVisibility(field: 'newPassword' | 'confirmPassword') {
    if (field === 'newPassword') {
      this.hideNewPassword = !this.hideNewPassword;
    } else {
      this.hideConfirmPassword = !this.hideConfirmPassword;
    }
  }

  cargarDatosUsuario() {
    this.isLoading = true;
    
    this.usuariosService.obtenerMiPerfil().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.isSuccess) {
          this.usuario = res.data;
          this.perfilForm.patchValue({
            nombre_usuario: res.data.nombre_usuario,
            correo_electronico: res.data.correo_electronico,
            telefono: res.data.telefono || ''
          });
          
          // ✅ NUEVO: Si no tenemos rol del accessControl, usar el del usuario
          if (!this.userRol && res.data.rol) {
            this.userRol = res.data.rol.toUpperCase();
          }
        } else {
          this.mostrarError('Error al cargar los datos del perfil');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.mostrarError('Error al cargar los datos del perfil');
        console.error('Error cargando perfil:', err);
      }
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      // Si cancela la edición, restaurar valores originales
      this.perfilForm.patchValue({
        nombre_usuario: this.usuario.nombre_usuario,
        correo_electronico: this.usuario.correo_electronico,
        telefono: this.usuario.telefono || '',
        newPassword: '',
        confirmPassword: ''
      });
      // Resetear visibilidad de contraseñas
      this.hideNewPassword = true;
      this.hideConfirmPassword = true;
    }
  }

  guardarPerfil() {
    if (this.perfilForm.valid) {
      this.isLoading = true;
      
      const formData = this.perfilForm.value;
      const updateData: UpdateProfileDto = {
        nombre_usuario: formData.nombre_usuario,
        telefono: formData.telefono
      };

      // Solo incluir password si se está cambiando
      if (formData.newPassword && formData.newPassword.length >= 6) {
        updateData.password = formData.newPassword;
      }

      const userId = this.global.getUserId();
      
      this.usuariosService.actualizarPerfil(userId, updateData).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          if (res.isSuccess) {
            this.isEditing = false;
            this.usuario = { ...this.usuario, ...updateData };
            this.mostrarExito('Perfil actualizado correctamente');
            
            // Limpiar campos de contraseña
            this.perfilForm.patchValue({
              newPassword: '',
              confirmPassword: ''
            });
            // Resetear visibilidad
            this.hideNewPassword = true;
            this.hideConfirmPassword = true;
          } else {
            this.mostrarError(res.message || 'Error al actualizar el perfil');
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.mostrarError('Error al actualizar el perfil');
          console.error('Error actualizando perfil:', err);
        }
      });
    } else {
      this.mostrarError('Por favor, completa todos los campos correctamente');
    }
  }

  private mostrarExito(mensaje: string) {
    Swal.fire({
      icon: 'success',
      title: '¡Éxito!',
      text: mensaje,
      confirmButtonColor: '#2563eb'
    });
  }

  private mostrarError(mensaje: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: mensaje,
      confirmButtonColor: '#dc2626'
    });
  }
}