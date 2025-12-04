import { Component, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { Acceso as AccesoService } from '../../services/acceso';
import { NgxSpinnerService } from 'ngx-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatTooltipModule,    
    MatCheckboxModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  registroFormGroup: FormGroup;
  private accesoService = inject(AccesoService);
  public tituloSistema: string = environment.tituloSistema;
  
  // Variable para controlar si se muestra la contraseña
  public mostrarPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private snackbar: MatSnackBar,
    private cargando: NgxSpinnerService,
    public router: Router
  ) {
    this.registroFormGroup = this.fb.group({
      email: [null, [Validators.required, Validators.email]],
      password: [null, [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void { }

  // Método para alternar entre mostrar/ocultar contraseña
  toggleMostrarPassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  onSubmit(): void {
    if (this.registroFormGroup.invalid) {
      this.snackbar.open('Formulario incompleto', 'OK', { duration: 3000 });
      return;
    }

    this.cargando.show();
    const loginData = this.registroFormGroup.getRawValue();

    this.accesoService.login(loginData).subscribe({
      next: (data: any) => {
        this.cargando.hide();

        console.log('🔐 Respuesta completa del login:', data);

        // ✅ ESCENARIO 1: Requiere cambio de contraseña (primer_login)
        if (data.isSuccess && data.data?.requiresPasswordChange) {
          console.log('🔄 Usuario requiere cambio de contraseña obligatorio');
          
          this.snackbar.open('Debes cambiar tu contraseña antes de continuar', 'OK', { duration: 3000 });
          
          // Redirigir a cambio de contraseña obligatorio
          this.router.navigate(['/auth/cambio-contrasena-obligatorio'], {
            queryParams: {
              userId: data.data.userId,
              tempToken: data.data.tempToken
            }
          });
          return;
        }

        // ✅ ESCENARIO 2: Login normal exitoso
        if (data.isSuccess && data.data?.token) {
          const usuario = {
            token: data.data.token,
            email: loginData.email,
            // Agregar más datos del usuario si están disponibles
          };

          // Guardar sesión
          this.accesoService.guardarSesion(data.data.token, usuario);

          this.snackbar.open(`Bienvenido`, 'OK', { duration: 3000 });

          console.log('🎯 Login exitoso, redirigiendo al dashboard');
          
          // Redirigir al dashboard
          this.router.navigateByUrl('/', { replaceUrl: true });
          return;
        }

        // ❌ ESCENARIO 3: Error en login
        this.snackbar.open(data.message || 'Datos incorrectos', 'OK', { duration: 3000 });
      },
      error: (error) => {
        this.cargando.hide();
        console.error('🔍 LOGIN: Error:', error);
        
        let errorMessage = 'Error de conexión o datos inválidos';
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.snackbar.open(errorMessage, 'OK', { duration: 3000 });
      }
    });
  }

  // 🔄 NUEVO MÉTODO: Para olvidó contraseña
  olvidoContrasena() {
    this.router.navigate(['/auth/restablecer-contrasena']);
  }

  registrarse() {
    this.router.navigate(['registro']);
  }
}