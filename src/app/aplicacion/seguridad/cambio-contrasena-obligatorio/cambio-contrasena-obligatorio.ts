import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Acceso } from '../../services/acceso';

@Component({
  selector: 'app-cambio-contrasena-obligatorio',
  imports: [ // ← AGREGAR ESTOS IMPORTS
    CommonModule,
    ReactiveFormsModule,
    RouterModule
  ],
  templateUrl: './cambio-contrasena-obligatorio.html',
  styleUrls: ['./cambio-contrasena-obligatorio.scss']
})
export class CambioContrasenaObligatorioComponent implements OnInit {
  cambioForm: FormGroup;
  isLoading = false;
  message = '';
  userId!: number;

  constructor(
    private fb: FormBuilder,
    private accesoService: Acceso,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.cambioForm = this.fb.group({
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
    // Obtener userId de los parámetros de ruta
    this.route.queryParams.subscribe(params => {
      this.userId = +params['userId'];
      
      if (!this.userId) {
        this.message = 'Error: No se pudo identificar al usuario';
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
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

  onSubmit() {
    if (this.cambioForm.valid && this.userId) {
      this.isLoading = true;
      this.message = '';

      const { newPassword, confirmPassword } = this.cambioForm.value;

      this.accesoService.cambiarContrasenaObligatorio(
        this.userId, 
        newPassword, 
        confirmPassword
      ).subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response.isSuccess) {
            this.message = '✅ Contraseña cambiada correctamente. Redirigiendo...';
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 2000);
          } else {
            this.message = `❌ ${response.message}`;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.message = '❌ Error al cambiar la contraseña. Intenta nuevamente.';
          console.error('Error:', error);
        }
      });
    } else {
      this.message = '❌ Por favor, completa todos los campos correctamente.';
    }
  }
}