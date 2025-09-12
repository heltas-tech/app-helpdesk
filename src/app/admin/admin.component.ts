import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css'] // opcional
})
export class AdminComponent {
  username: string = 'Administrador'; // Aquí puedes poner dinámico más adelante
  totalUsuarios = 20;  // ejemplo
  totalTickets = 35;   // ejemplo

  ticketsStats = [
    { titulo: 'Abiertos', cantidad: 10, color: 'warning' },
    { titulo: 'En Proceso', cantidad: 15, color: 'info' },
    { titulo: 'Cerrados', cantidad: 10, color: 'success' }
  ];

  crearUsuario() {
    alert('Función crear usuario'); // prueba por ahora
  }

  crearTicket() {
    alert('Función crear ticket'); // prueba por ahora
  }
}
