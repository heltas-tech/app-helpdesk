import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {
  // Tarjetas estadísticas
  cards = [
    { title: 'Tickets Abiertos', value: 15, color: '#007bff' },
    { title: 'Tickets Cerrados', value: 25, color: '#28a745' },
    { title: 'Tickets en Proceso', value: 10, color: '#ffc107' },
    { title: 'Tickets Urgentes', value: 5, color: '#dc3545' },
  ];

  // Gráfico de pastel
  pieChartData = {
    labels: ['Abiertos', 'Cerrados', 'En Proceso', 'Urgentes'],
    datasets: [{
      data: [15, 25, 10, 5],
      backgroundColor: ['#007bff', '#28a745', '#ffc107', '#dc3545'],
      hoverOffset: 10,
    }],
  };
  pieChartType = 'pie' as const;
  pieChartOptions = { 
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };

  // Gráfico de barras
  barChartData = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      { label: 'Tickets Abiertos', data: [5, 7, 3, 8, 6, 4, 2], backgroundColor: '#007bff' },
      { label: 'Tickets Cerrados', data: [2, 4, 6, 3, 5, 8, 7], backgroundColor: '#28a745' },
    ],
  };
  barChartType = 'bar' as const;
  barChartOptions = {
    responsive: true,
    scales: {
      x: { ticks: { color: '#555' } },
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { position: 'bottom' as const },
    },
  };
}
