import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service'; // ✅ Asegúrate de la ruta

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // módulos necesarios
  templateUrl: './login.component.html', // Asegúrate de tener este archivo
  styleUrls: ['./login.component.css'] // Opcional, si tienes estilos
})
export class LoginComponent { // ✅ exportado
  loginForm: FormGroup; // FormGroup para el formulario
  errorMessage: string = ''; // Para mostrar mensajes de error
  // Inyectamos FormBuilder, AuthService y Router  

  constructor(
    private fb: FormBuilder,     // para crear el formulario
    private auth: AuthService,   // ✅ Solo funciona si AuthService tiene @Injectable
    private router: Router       // para redirigir a otras rutas
  ) {

    // Definimos el formulario con validaciones
    this.loginForm = this.fb.group({
      correo_electronico: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) { // Verificamos que el formulario sea válido
      this.auth.login(this.loginForm.value).subscribe({
        next: (response) => { // si la respuesta es exitosa
          console.log('Login exitoso', response);

          // Guardar token y rol usando AuthService
          this.auth.setSession(response.access_token);

          const rol = this.auth.getRole(); // obtenemos el rol del usuario

          // Redirigir según rol
          if (rol === 'ADMINISTRADOR') {
            this.router.navigate(['/admin']);
          } else if (rol === 'TECNICO') {
            this.router.navigate(['/tecnico']);
          } else {
            this.router.navigate(['/home']); // Maria irá aquí
          }
        },
        error: (error) => { // si hay un error
          console.error('Error de login', error); // muestra el error en consola
          alert('Credenciales inválidas'); // Muestra alerta al usuario
        }
      });
    }
  }
}
