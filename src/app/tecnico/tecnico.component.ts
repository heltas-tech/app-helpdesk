import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tecnico-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tecnico.component.html',
  styleUrls: ['./tecnico.component.css'] // opcional
})
export class TecnicoDashboardComponent {
  username: string = 'Técnico'; // Puedes hacer dinámico más adelante
  ticketsAsignados = 12;
  ticketsPendientes = 5;
  ticketsCerrados = 8;

  ticketsStats = [
    { titulo: 'Asignados', cantidad: 12, color: 'warning' },
    { titulo: 'Pendientes', cantidad: 5, color: 'info' },
    { titulo: 'Cerrados', cantidad: 8, color: 'success' }
  ];

  atenderTicket() {
    alert('Función atender ticket');
  }
}
