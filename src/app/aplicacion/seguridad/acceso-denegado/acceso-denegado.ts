import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-acceso-denegado',
  template: `
    <div style="text-align: center; padding: 50px;">
      <h1>Acceso Denegado</h1>
      <p>No tienes permisos para acceder a esta sección.</p>
      <button (click)="volverAlLogin()">Volver al Login</button>
    </div>
  `
})
export class AccesoDenegadoComponent {
  constructor(private router: Router) {}

  volverAlLogin() {
    this.router.navigate(['/login']);
  }
}