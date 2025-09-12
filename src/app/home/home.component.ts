import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  username = 'Joel';

  showCreateModal = false;

  newTicket = {
    titulo: '',
    descripcion: '',
    estado: 'No Resuelto'
  };

  ticketsStats = [
    { titulo: 'No Resueltos', cantidad: 5, color: 'danger' },
    { titulo: 'En Progreso', cantidad: 3, color: 'warning' },
    { titulo: 'Resueltos', cantidad: 8, color: 'success' }
  ];

  get totalTickets() {
    return this.ticketsStats.reduce((sum, t) => sum + t.cantidad, 0);
  }

  pieChartData = {
    labels: ['No Resueltos', 'En Progreso', 'Resueltos'],
    datasets: [
      { data: [5, 3, 8], backgroundColor: ['#dc3545', '#ffc107', '#28a745'] }
    ]
  };
  pieChartType: 'pie' = 'pie';
  pieChartOptions = { responsive: true, maintainAspectRatio: false };

  barChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'],
    datasets: [{ data: [1, 3, 2, 5, 4], label: 'Tickets por día', backgroundColor: '#00c3ff9c' }]
  };
  barChartType: 'bar' = 'bar';
  barChartOptions = { responsive: true, maintainAspectRatio: false };

  crearTicket() {
    this.showCreateModal = true;
  }

  closeModal() {
    this.showCreateModal = false;
  }

  submitTicket() {
    console.log(this.newTicket);
    this.closeModal();
  }
}
