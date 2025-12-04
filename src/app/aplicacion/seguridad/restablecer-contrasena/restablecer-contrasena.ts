import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Acceso } from '../../services/acceso';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-restablecer-contrasena',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './restablecer-contrasena.html',
  styleUrls: ['./restablecer-contrasena.scss']
})
export class RestablecerContrasenaComponent implements OnInit {
  isLoading = false;
  message = '';
  token = '';
  tokenValid = false;
  tokenChecked = false;
  step: 'solicitar' | 'restablecer' = 'solicitar';
  emailSolicitud = '';
  
  // Para mostrar/ocultar contraseñas
  mostrarNewPassword = false;
  mostrarConfirmPassword = false;

  resetFormSolicitud: FormGroup;
  resetFormContrasena: FormGroup;

  constructor(
    private fb: FormBuilder,
    private accesoService: Acceso,
    private route: ActivatedRoute,
    private router: Router,
    private snackbar: MatSnackBar
  ) {
    this.resetFormSolicitud = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetFormContrasena = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.validarToken();
        this.step = 'restablecer';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
    } else {
      confirmPassword?.setErrors(null);
    }
    return null;
  }

  // Métodos para mostrar/ocultar contraseñas
  toggleMostrarNewPassword(): void {
    this.mostrarNewPassword = !this.mostrarNewPassword;
  }

  toggleMostrarConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  solicitarRestablecimiento() {
    if (this.resetFormSolicitud.get('email')?.valid) {
      this.isLoading = true;
      this.emailSolicitud = this.resetFormSolicitud.get('email')?.value;

      this.accesoService.solicitarRestablecimiento(this.emailSolicitud).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.isSuccess) {
            this.snackbar.open('✅ Se han enviado instrucciones a tu correo electrónico', 'OK', { duration: 5000 });
            this.message = '';
            // Mantenemos al usuario en la misma vista pero mostramos mensaje de éxito
          } else {
            this.message = response.message || 'Error al procesar la solicitud';
            this.snackbar.open(`❌ ${this.message}`, 'OK', { duration: 3000 });
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.message = '❌ Error al procesar la solicitud';
          this.snackbar.open(this.message, 'OK', { duration: 3000 });
          console.error('Error:', error);
        }
      });
    }
  }

  validarToken() {
    if (this.token) {
      this.isLoading = true;
      console.log('🔍 Validando token:', this.token);

      this.accesoService.validarTokenRestablecimiento(this.token).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log('✅ Respuesta validación token:', response);
          this.tokenValid = response.isSuccess;
          this.tokenChecked = true;
          
          if (!response.isSuccess) {
            console.log('❌ Token inválido:', response.message);
            this.message = '❌ El enlace ha expirado o es inválido';
            this.snackbar.open(this.message, 'OK', { duration: 3000 });
          } else {
            console.log('🎯 Token válido para:', response.data?.email);
            this.emailSolicitud = response.data?.email || '';
            this.message = '';
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('💥 Error validando token:', error);
          this.tokenChecked = true;
          this.tokenValid = false;
          this.message = '❌ Error al validar el enlace';
          this.snackbar.open(this.message, 'OK', { duration: 3000 });
        }
      });
    }
  }

  restablecerContrasena() {
    console.log('🔍 === INICIANDO RESTABLECIMIENTO ===');
    console.log('🔍 Formulario válido:', this.resetFormContrasena.valid);
    console.log('🔍 Token válido:', this.tokenValid);
    console.log('🔍 Token:', this.token);
    console.log('🔍 Valores del form:', this.resetFormContrasena.value);
    
    if (this.resetFormContrasena.valid && this.token && this.tokenValid) {
      console.log('🎯 Condiciones CUMPLIDAS - procediendo...');
      this.isLoading = true;
      const { newPassword, confirmPassword } = this.resetFormContrasena.value;

      this.accesoService.restablecerContrasena(this.token, newPassword, confirmPassword).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.isSuccess) {
            this.snackbar.open('✅ Contraseña restablecida correctamente', 'OK', { duration: 3000 });
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          } else {
            this.message = response.message || 'Error al restablecer la contraseña';
            this.snackbar.open(`❌ ${this.message}`, 'OK', { duration: 3000 });
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.message = '❌ Error al restablecer la contraseña';
          this.snackbar.open(this.message, 'OK', { duration: 3000 });
          console.error('Error:', error);
        }
      });
    } else {
      console.log('❌ Condiciones NO cumplidas:');
      console.log('   - Form válido:', this.resetFormContrasena.valid);
      console.log('   - Token válido:', this.tokenValid);
      console.log('   - Token existe:', !!this.token);
      
      if (!this.resetFormContrasena.valid) {
        this.snackbar.open('Por favor, complete correctamente todos los campos', 'OK', { duration: 3000 });
      }
    }
  }

  volverALogin() {
    this.router.navigate(['/auth/login']);
  }
}