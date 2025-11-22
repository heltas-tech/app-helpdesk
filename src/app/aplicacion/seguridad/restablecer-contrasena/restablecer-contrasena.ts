import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Acceso } from '../../services/acceso';

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

  resetFormSolicitud: FormGroup;  // Para paso 1 (solo email)
  resetFormContrasena: FormGroup; // Para paso 2 (solo contraseñas)

  constructor(
    private fb: FormBuilder,
    private accesoService: Acceso,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Formulario para SOLICITUD (paso 1)
    this.resetFormSolicitud = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  
    // Formulario para RESTABLECER (paso 2) - SIN EMAIL
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

  solicitarRestablecimiento() {
    if (this.resetFormSolicitud.get('email')?.valid) {
      this.isLoading = true;
      this.emailSolicitud = this.resetFormSolicitud.get('email')?.value;

      this.accesoService.solicitarRestablecimiento(this.emailSolicitud).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.isSuccess) {
            this.message = '✅ Se han enviado instrucciones a tu correo electrónico';
            this.step = 'restablecer';
          } else {
            this.message = `❌ ${response.message}`;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.message = '❌ Error al procesar la solicitud';
          console.error('Error:', error);
        }
      });
    }
  }

  validarToken() {
    if (this.token) {
      console.log('🔍 Validando token:', this.token);

      this.accesoService.validarTokenRestablecimiento(this.token).subscribe({
        next: (response) => {
          console.log('✅ Respuesta validación token:', response);
          this.tokenValid = response.isSuccess;
          this.tokenChecked = true;
          
          if (!response.isSuccess) {
            console.log('❌ Token inválido:', response.message);
            this.message = '❌ El enlace ha expirado o es inválido';
          } else {
            console.log('🎯 Token válido para:', response.data?.email);
            this.message = ''; // Limpiar mensajes anteriores
          }
        },
        error: (error) => {
          console.error('💥 Error validando token:', error);
          this.tokenChecked = true;
          this.tokenValid = false;
          this.message = '❌ Error al validar el enlace';
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
    
    if (this.resetFormContrasena.valid && this.token) {
      console.log('🎯 Condiciones CUMPLIDAS - procediendo...');
      this.isLoading = true;
      const { newPassword, confirmPassword } = this.resetFormContrasena.value;

      this.accesoService.restablecerContrasena(this.token, newPassword, confirmPassword).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.isSuccess) {
            this.message = '✅ Contraseña restablecida correctamente. Redirigiendo al login...';
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 3000);
          } else {
            this.message = `❌ ${response.message}`;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.message = '❌ Error al restablecer la contraseña';
          console.error('Error:', error);
        }
      });
    } else {
      console.log('❌ Condiciones NO cumplidas:');
      console.log('   - Form válido:', this.resetFormContrasena.valid);
      console.log('   - Token existe:', !!this.token);
    }
  }

  volverALogin() {
    this.router.navigate(['/auth/login']);
  }
}