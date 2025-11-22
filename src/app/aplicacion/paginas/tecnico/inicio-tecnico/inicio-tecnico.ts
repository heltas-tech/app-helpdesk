import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

// Servicios
import { Acceso } from '../../../services/acceso';
import { TecnicoService } from '../../../services/tecnico.service';
import { GlobalFuntions } from '../../../services/global-funtions';
import { TecnicoStats, TicketTecnico } from '../../../interfaces/tecnico.interface';

@Component({
  selector: 'app-inicio-tecnico',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterModule, FormsModule],
  templateUrl: './inicio-tecnico.html',
  styleUrls: ['./inicio-tecnico.scss']
})
export class InicioTecnicoComponent implements OnInit {
  // Información del técnico

  // Agregar este método a la clase

  tecnicoInfo: any = {};
  stats: TecnicoStats = {
    ticketsAsignados: 0,
    ticketsEnProceso: 0,
    ticketsResueltos: 0,
    ticketsUrgentes: 0,
    eficiencia: 0,
    tiempoPromedioResolucion: '0h 0m',
    ticketsEsteMes: 0,
    ticketsHoy: 0
  };

  // Datos reales
  ticketsAsignados: TicketTecnico[] = [];
  ticketsUrgentes: TicketTecnico[] = [];
  ticketsRecientes: TicketTecnico[] = [];
  
  isLoading = true;
  currentDate = new Date();

  // Modal para resolver ticket
  showResolverModal = false;
  ticketSeleccionado: TicketTecnico | null = null;
  solucionTexto = '';

  // Gráfico de pastel - Distribución de tickets
  pieChartData: ChartConfiguration<'pie'>['data'] = {
    labels: ['En Proceso', 'Resueltos', 'Pendientes', 'Urgentes'],
    datasets: [{
      data: [0, 0, 0, 0],
      backgroundColor: ['#ffc107', '#28a745', '#007bff', '#dc3545'],
      hoverBackgroundColor: ['#ffca2c', '#34ce57', '#1a8cff', '#e4606d'],
      hoverOffset: 10,
    }],
  };

  pieChartType: ChartType = 'pie';
  pieChartOptions: ChartConfiguration<'pie'>['options'] = { 
    responsive: true,
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          color: '#555',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
  };

  // Gráfico de barras - Actividad semanal
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      { 
        label: 'Tickets Asignados', 
        data: [0, 0, 0, 0, 0, 0, 0], 
        backgroundColor: '#007bff',
        borderColor: '#0062cc',
        borderWidth: 1
      },
      { 
        label: 'Tickets Resueltos', 
        data: [0, 0, 0, 0, 0, 0, 0], 
        backgroundColor: '#28a745',
        borderColor: '#1e7e34',
        borderWidth: 1
      },
    ],
  };

  barChartType: ChartType = 'bar';
  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      x: { 
        ticks: { color: '#555' },
        grid: { color: 'rgba(0,0,0,0.1)' }
      },
      y: { 
        beginAtZero: true,
        ticks: { color: '#555' },
        grid: { color: 'rgba(0,0,0,0.1)' }
      },
    },
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          color: '#555',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
  };

  constructor(
    private accesoService: Acceso,
    private tecnicoService: TecnicoService,
    private global: GlobalFuntions
  ) {}

  ngOnInit() {
    this.global.validacionToken();
    this.loadTecnicoInfo();
    this.loadDashboardData();
  }

  private loadTecnicoInfo() {
  const usuario = this.accesoService.obtenerUsuario();
  
  if (usuario && usuario.id) {
    this.tecnicoInfo = {
      id: usuario.id,
      nombre: usuario.nombre_completo || usuario.nombre_usuario || 'Técnico',
      email: usuario.correo_electronico || '',
      rol: usuario.rol || 'TÉCNICO',
      especialidad: usuario.especialidad || 'Soporte General',
      fechaIngreso: new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
    console.log('✅ Usuario cargado desde AccesoService:', this.tecnicoInfo);
  } else {
    console.error('❌ No se pudo obtener usuario desde AccesoService:', usuario);
    // Fallback al método del token
    this.loadTecnicoFromToken();
  }
}

private loadTecnicoFromToken() {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('🔍 Token payload para debug:', payload);
      
      this.tecnicoInfo = {
        id: payload.userId || payload.id || payload.sub,
        nombre: payload.nombre || payload.email || 'Técnico',
        email: payload.email || '',
        rol: payload.rol || 'TÉCNICO',
        especialidad: 'Soporte General',
        fechaIngreso: new Date().toLocaleDateString('es-ES')
      };
    } catch (error) {
      console.error('❌ Error cargando desde token:', error);
      this.tecnicoInfo = { id: 0, nombre: 'Técnico', rol: 'TÉCNICO' };
    }
  } else {
    this.tecnicoInfo = { id: 0, nombre: 'Técnico', rol: 'TÉCNICO' };
  }
}

  private loadDashboardData() {
    this.isLoading = true;
    
    if (!this.tecnicoInfo.id) {
      console.error('No se pudo obtener el ID del técnico');
      this.isLoading = false;
      return;
    }

    Promise.all([
      this.loadEstadisticas(),
      this.loadTicketsAsignados(),
      this.loadTicketsUrgentes(),
      this.loadTicketsRecientes()
    ]).finally(() => {
      this.isLoading = false;
      this.actualizarGraficos();
    });
  }

  private async loadEstadisticas() {
    try {
      const stats = await this.tecnicoService.getEstadisticas(this.tecnicoInfo.id).toPromise();
      if (stats) {
        this.stats = stats;
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  private async loadTicketsAsignados() {
    try {
      const tickets = await this.tecnicoService.getTicketsAsignados(this.tecnicoInfo.id).toPromise();
      if (tickets) {
        this.ticketsAsignados = tickets.slice(0, 10);
      }
    } catch (error) {
      console.error('Error cargando tickets asignados:', error);
    }
  }

  private async loadTicketsUrgentes() {
    try {
      const tickets = await this.tecnicoService.getTicketsUrgentes(this.tecnicoInfo.id).toPromise();
      if (tickets) {
        this.ticketsUrgentes = tickets.slice(0, 5);
      }
    } catch (error) {
      console.error('Error cargando tickets urgentes:', error);
    }
  }

  private async loadTicketsRecientes() {
    try {
      const tickets = await this.tecnicoService.getTicketsRecientes(this.tecnicoInfo.id).toPromise();
      if (tickets) {
        this.ticketsRecientes = tickets;
      }
    } catch (error) {
      console.error('Error cargando tickets recientes:', error);
    }
  }

  private actualizarGraficos() {
    // Actualizar gráfico de pastel
    this.pieChartData = {
      ...this.pieChartData,
      datasets: [{
        ...this.pieChartData.datasets[0],
        data: [
          this.stats.ticketsEnProceso,
          this.stats.ticketsResueltos,
          this.stats.ticketsAsignados - this.stats.ticketsEnProceso - this.stats.ticketsResueltos,
          this.stats.ticketsUrgentes
        ]
      }]
    };

    // Generar datos semanales para gráfico de barras (placeholder)
    this.generarDatosSemanales();
  }

  private generarDatosSemanales() {
    // Datos de ejemplo para la semana actual
    const asignados = [3, 5, 2, 6, 4, 1, 2];
    const resueltos = [2, 3, 4, 2, 5, 0, 1];
    
    this.barChartData = {
      ...this.barChartData,
      datasets: [
        { ...this.barChartData.datasets[0], data: asignados },
        { ...this.barChartData.datasets[1], data: resueltos }
      ]
    };
  }

  // ACCIONES FUNCIONALES

  iniciarTicket(ticket: TicketTecnico) {
    if (!ticket.id) return;

    this.tecnicoService.iniciarTicket(ticket.id).subscribe({
      next: (response) => {
        console.log('Ticket iniciado:', response);
        this.loadDashboardData(); // Recargar datos
        this.mostrarAlerta('success', `Ticket #${ticket.id} iniciado correctamente`);
      },
      error: (error) => {
        console.error('Error iniciando ticket:', error);
        this.mostrarAlerta('error', 'Error al iniciar el ticket');
      }
    });
  }

  abrirResolverModal(ticket: TicketTecnico) {
    this.ticketSeleccionado = ticket;
    this.solucionTexto = '';
    this.showResolverModal = true;
  }

  cerrarResolverModal() {
    this.showResolverModal = false;
    this.ticketSeleccionado = null;
    this.solucionTexto = '';
  }

  resolverTicket() {
    if (!this.ticketSeleccionado?.id || !this.solucionTexto.trim()) {
      this.mostrarAlerta('warning', 'Por favor, ingresa una solución para el ticket');
      return;
    }

    this.tecnicoService.resolverTicket(this.ticketSeleccionado.id, this.solucionTexto).subscribe({
      next: (response) => {
        console.log('Ticket resuelto:', response);
        this.cerrarResolverModal();
        this.loadDashboardData(); // Recargar datos
        this.mostrarAlerta('success', `Ticket #${this.ticketSeleccionado?.id} resuelto correctamente`);
      },
      error: (error) => {
        console.error('Error resolviendo ticket:', error);
        this.mostrarAlerta('error', 'Error al resolver el ticket');
      }
    });
  }

  verDetallesTicket(ticket: TicketTecnico) {
    // Navegar a la página de detalles del ticket
    console.log('Ver detalles del ticket:', ticket.id);
    // this.router.navigate(['/ticket', ticket.id]);
    this.mostrarAlerta('info', `Redirigiendo a detalles del ticket #${ticket.id}`);
  }

  // MÉTODOS AUXILIARES
  getTicketEstado(ticket: TicketTecnico): string {
    if (ticket.fecha_resolucion) return 'Resuelto';
    return 'En Proceso';
  }

  getTicketEstadoColor(estado: string): string {
    switch (estado) {
      case 'En Proceso': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Resuelto': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getPrioridadColor(nivel?: number): string {
    if (!nivel) return 'bg-gray-500';
    if (nivel >= 4) return 'bg-red-500';
    if (nivel >= 3) return 'bg-orange-500';
    if (nivel >= 2) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  getPrioridadTexto(nivel?: number): string {
    if (!nivel) return 'Sin prioridad';
    if (nivel >= 4) return 'Crítica';
    if (nivel >= 3) return 'Alta';
    if (nivel >= 2) return 'Media';
    return 'Baja';
  }

  puedeIniciarTicket(ticket: TicketTecnico): boolean {
    return !ticket.fecha_resolucion;
  }

  puedeResolverTicket(ticket: TicketTecnico): boolean {
    return !ticket.fecha_resolucion;
  }

  getNombreCliente(ticket: TicketTecnico): string {
    return ticket.entidad_usuario?.usuario?.nombre_usuario || 'Cliente';
  }

  getEntidadCliente(ticket: TicketTecnico): string {
    return ticket.entidad_usuario?.entidad?.denominacion || '';
  }

  getDiasTranscurridos(fechaCreacion: string): number {
    const creado = new Date(fechaCreacion);
    const hoy = new Date();
    const diffTime = hoy.getTime() - creado.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  refreshData() {
    this.loadDashboardData();
  }

  private mostrarAlerta(icon: 'success' | 'error' | 'warning' | 'info', mensaje: string) {
    // Usar SweetAlert2 o console.log temporal
    console.log(`${icon.toUpperCase()}: ${mensaje}`);
    // Swal.fire(icon.charAt(0).toUpperCase() + icon.slice(1), mensaje, icon);
  }
}