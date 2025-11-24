import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';

// Servicios
import { Acceso } from '../../../services/acceso';
import { TecnicoService } from '../../../services/tecnico.service';
import { GlobalFuntions } from '../../../services/global-funtions';
import { TecnicoStats, TicketTecnico } from '../../../interfaces/tecnico.interface';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  ticketsCount: number;
  tickets: TicketTecnico[];
}

@Component({
  selector: 'app-inicio-tecnico',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, RouterModule],
  templateUrl: './inicio-tecnico.html',
  styleUrls: ['./inicio-tecnico.scss']
})
export class InicioTecnicoComponent implements OnInit {
  // Información del técnico
  tecnicoInfo: any = {};
  
  stats: TecnicoStats = {
    ticketsAsignados: 0,
    ticketsEnProceso: 0,
    ticketsResueltos: 0,
    ticketsUrgentes: 0,
    eficiencia: 0,
    tiempoPromedioResolucion: '0h 0m',
    ticketsEsteMes: 0,
    ticketsHoy: 0,
    ticketsSLAVencido: 0,
    ticketsSLAProximoVencer: 0,
    ticketsReabiertos: 0,
    satisfaccionPromedio: 0,
    primeraSolucion: 0
  };

  // Datos reales
  ticketsAsignados: TicketTecnico[] = [];
  ticketsUrgentes: TicketTecnico[] = [];
  ticketsRecientes: TicketTecnico[] = [];
  todosLosTickets: TicketTecnico[] = [];
  
  isLoading = true;
  currentDate = new Date();

  // Calendario
  calendarDays: CalendarDay[] = [];
  currentMonth: Date = new Date();
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Modal de detalle de día
  showDayDetailModal = false;
  selectedDayTickets: TicketTecnico[] = [];
  selectedDayDate: Date = new Date();

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
    private global: GlobalFuntions,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('🚀 Iniciando Dashboard Técnico...');
    this.global.validacionToken();
    this.loadTecnicoInfo();
  }

  private loadTecnicoInfo() {
    const usuario = this.accesoService.obtenerUsuario();
    console.log('🔍 Usuario obtenido desde AccesoService:', usuario);
    
    if (usuario && (usuario.id || usuario.token)) {
      let tecnicoId = usuario.id;
      
      if (!tecnicoId && usuario.token) {
        try {
          const payload = JSON.parse(atob(usuario.token.split('.')[1]));
          console.log('🔍 Token payload:', payload);
          tecnicoId = payload.userId || payload.id || payload.sub;
        } catch (error) {
          console.error('❌ Error decodificando token:', error);
        }
      }

      this.tecnicoInfo = {
        id: tecnicoId,
        nombre: usuario.nombre_completo || usuario.nombre_usuario || usuario.nombre || this.extractNameFromEmail(usuario.email) || 'Técnico',
        email: usuario.correo_electronico || usuario.email || '',
        rol: usuario.rol || 'TÉCNICO',
        especialidad: usuario.especialidad || 'Soporte General',
        fechaIngreso: new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      };
      console.log('✅ Información del técnico cargada:', this.tecnicoInfo);
      
      this.loadDashboardData();
    } else {
      console.error('❌ No se pudo obtener usuario desde AccesoService:', usuario);
      this.loadTecnicoFromToken();
    }
  }

  private extractNameFromEmail(email: string): string {
    if (!email) return 'Técnico';
    const namePart = email.split('@')[0];
    return namePart.split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private loadTecnicoFromToken() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔍 Token payload para debug:', payload);
        
        this.tecnicoInfo = {
          id: payload.userId || payload.id || payload.sub,
          nombre: payload.nombre || this.extractNameFromEmail(payload.email) || 'Técnico',
          email: payload.email || '',
          rol: payload.rol || 'TÉCNICO',
          especialidad: 'Soporte General',
          fechaIngreso: new Date().toLocaleDateString('es-ES')
        };
        
        console.log('✅ Técnico cargado desde token:', this.tecnicoInfo);
        this.loadDashboardData();
      } catch (error) {
        console.error('❌ Error cargando desde token:', error);
        this.tecnicoInfo = { id: 0, nombre: 'Técnico', rol: 'TÉCNICO' };
        this.isLoading = false;
      }
    } else {
      console.error('❌ No hay token disponible');
      this.tecnicoInfo = { id: 0, nombre: 'Técnico', rol: 'TÉCNICO' };
      this.isLoading = false;
    }
  }

  private loadDashboardData() {
    this.isLoading = true;
    
    if (!this.tecnicoInfo.id || this.tecnicoInfo.id === 0) {
      console.error('❌ No se pudo obtener el ID del técnico');
      this.isLoading = false;
      return;
    }

    console.log('📊 Cargando datos para técnico ID:', this.tecnicoInfo.id);
    
    Promise.all([
      this.loadEstadisticas(),
      this.loadTicketsAsignados(),
      this.loadTicketsUrgentes(),
      this.loadTicketsRecientes()
    ]).finally(() => {
      this.isLoading = false;
      this.actualizarGraficos();
      this.generateCalendar();
      console.log('✅ Dashboard cargado completamente');
    });
  }

  private async loadEstadisticas() {
    try {
      console.log('📈 Cargando estadísticas...');
      const stats = await this.tecnicoService.getEstadisticas(this.tecnicoInfo.id).toPromise();
      if (stats) {
        this.stats = stats;
        console.log('✅ Estadísticas cargadas:', this.stats);
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error);
    }
  }

  private async loadTicketsAsignados() {
    try {
      console.log('📋 Cargando tickets asignados...');
      const tickets = await this.tecnicoService.getTicketsAsignados(this.tecnicoInfo.id).toPromise();
      if (tickets) {
        this.ticketsAsignados = tickets.slice(0, 10);
        console.log('✅ Tickets asignados cargados:', this.ticketsAsignados.length);
      }
    } catch (error) {
      console.error('❌ Error cargando tickets asignados:', error);
    }
  }

  private async loadTicketsUrgentes() {
    try {
      console.log('🚨 Cargando tickets urgentes...');
      const tickets = await this.tecnicoService.getTicketsUrgentes(this.tecnicoInfo.id).toPromise();
      if (tickets) {
        this.ticketsUrgentes = tickets.slice(0, 5);
        console.log('✅ Tickets urgentes cargados:', this.ticketsUrgentes.length);
      }
    } catch (error) {
      console.error('❌ Error cargando tickets urgentes:', error);
    }
  }

  private async loadTicketsRecientes() {
    try {
      console.log('🕒 Cargando tickets recientes...');
      const tickets = await this.tecnicoService.getTicketsRecientes(this.tecnicoInfo.id).toPromise();
      if (tickets) {
        this.ticketsRecientes = tickets;
        this.todosLosTickets = tickets;
        console.log('✅ Tickets recientes cargados:', this.ticketsRecientes.length);
      }
    } catch (error) {
      console.error('❌ Error cargando tickets recientes:', error);
    }
  }

  private actualizarGraficos() {
    console.log('📊 Actualizando gráficos...');
    
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

    this.generarDatosSemanales();
  }

  private generarDatosSemanales() {
    const baseAsignados = Math.max(1, Math.floor(this.stats.ticketsAsignados / 5));
    const baseResueltos = Math.max(1, Math.floor(this.stats.ticketsResueltos / 5));
    
    const asignados = Array(7).fill(0).map(() => 
      Math.floor(Math.random() * baseAsignados) + 1
    );
    
    const resueltos = Array(7).fill(0).map(() => 
      Math.floor(Math.random() * baseResueltos) + 1
    );
    
    this.barChartData = {
      ...this.barChartData,
      datasets: [
        { ...this.barChartData.datasets[0], data: asignados },
        { ...this.barChartData.datasets[1], data: resueltos }
      ]
    };
  }

  // CALENDARIO
  generateCalendar(): void {
    console.log('📅 Generando calendario para técnico...');
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    this.calendarDays = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const date = new Date(currentDate);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = this.isToday(date);
      
      const ticketsCount = this.countTicketsForDate(date);
      const tickets = this.getTicketsForDate(date);
      
      this.calendarDays.push({
        date,
        isCurrentMonth,
        isToday,
        ticketsCount,
        tickets
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('📅 Calendario técnico generado:', {
      diasTotales: this.calendarDays.length,
      todosLosTickets: this.todosLosTickets.length
    });
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  private countTicketsForDate(date: Date): number {
    return this.todosLosTickets.filter(ticket => {
      const ticketDate = new Date(ticket.fecha_creacion);
      return ticketDate.toDateString() === date.toDateString();
    }).length;
  }

  private getTicketsForDate(date: Date): TicketTecnico[] {
    return this.todosLosTickets.filter(ticket => {
      const ticketDate = new Date(ticket.fecha_creacion);
      return ticketDate.toDateString() === date.toDateString();
    });
  }

  
  navigateToTickets(): void {
    console.log('📋 Navegando a Mis Tickets');
    this.router.navigate(['/tecnico/tickets']);
  }

  navigateToMiPerfil(): void {
    console.log('👤 Navegando a Mi Perfil');
    this.router.navigate(['/mi-perfil']);
  }

  navigateToBaseConocimiento(): void {
    console.log('📚 Navegando a Base de Conocimiento');
    this.router.navigate(['/base-conocimiento']);
  }

  navigateToTicketDetail(ticketId: number): void {
    console.log('🔍 Navegando a detalle del ticket:', ticketId);
    // Redirige a la misma página de tickets pero con el ID para mostrar detalles
    this.router.navigate(['/tecnico/tickets'], { queryParams: { ticketId: ticketId } });
  }

  // Visualización del calendario
  showDayDetail(day: CalendarDay): void {
    console.log('📅 Mostrando detalle del día:', day.date, 'Tickets:', day.ticketsCount);
    this.selectedDayTickets = day.tickets;
    this.selectedDayDate = day.date;
    this.showDayDetailModal = true;
  }

  closeDayDetailModal(): void {
    this.showDayDetailModal = false;
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  getCurrentMonthYear(): string {
    return `${this.monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  // Métodos auxiliares de visualización
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

  getNombreCliente(ticket: TicketTecnico): string {
    return ticket.entidad_usuario?.usuario?.nombre_usuario || 'Cliente';
  }

  getEntidadCliente(ticket: TicketTecnico): string {
    return ticket.entidad_usuario?.entidad?.denominacion || '';
  }

  getTiempoTranscurrido(fechaCreacion: string): string {
    const creado = new Date(fechaCreacion);
    const ahora = new Date();
    const diffMs = ahora.getTime() - creado.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 0) {
      return `${diffDias} día${diffDias > 1 ? 's' : ''}`;
    } else if (diffHoras > 0) {
      return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    } else {
      return 'Menos de 1 hora';
    }
  }

  refreshData() {
    console.log('🔄 Actualizando datos...');
    this.loadDashboardData();
  }
}