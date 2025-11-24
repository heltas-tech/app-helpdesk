import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Acceso } from '../../services/acceso';
import { TicketsService } from '../../services/ticket.service';

// ApexCharts
import { NgApexchartsModule } from 'ng-apexcharts';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-cliente-inicio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressBarModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatGridListModule,
    MatTooltipModule,
    MatBadgeModule,
    MatTabsModule
  ],
  templateUrl: './cliente-inicio.component.html',
  styleUrls: ['./cliente-inicio.component.scss']
})
export class ClienteInicioComponent implements OnInit {
  usuario: any;
  today = new Date();
  isLoading = true;
  
  // Métricas REALES del cliente
  metricas = {
    ticketsAbiertos: 0,
    ticketsResueltos: 0,
    ticketsEnProceso: 0,
    ticketsUrgentes: 0,
    tiempoPromedio: '0 días',
    satisfaccion: 0,
    slaCumplido: 0,
    ticketsEsteMes: 0,
    ticketsHoy: 0,
    ticketsReabiertos: 0,
    totalTickets: 0,
    // NUEVAS MÉTRICAS SLA
    ticketsSLAVencido: 0,
    ticketsSLAProximoVencer: 0,
    ticketsConSLA: 0
  };

  // Datos REALES
  ticketsRecientes: any[] = [];
  todosLosTickets: any[] = [];
  notificaciones: any[] = [];
  
  // Calendario
  calendarDays: any[] = [];
  currentMonth: Date = new Date();
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Modal
  showDayDetailModal = false;
  selectedDayTickets: any[] = [];
  selectedDayDate: Date = new Date();

  // Gráficos
  donutChartOptions: any = {
    series: [0, 0, 0, 0],
    chart: {
      type: 'donut',
      height: 350
    },
    labels: ['Resueltos', 'En Proceso', 'Abiertos', 'Urgentes'],
    colors: ['#4CAF50', '#FF9800', '#F44336', '#9C27B0'],
    legend: {
      position: 'bottom'
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total'
            }
          }
        }
      }
    }
  };

  barChartOptions: any = {
    series: [{
      name: 'Mis Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }],
    chart: {
      type: 'bar',
      height: 350
    },
    xaxis: {
      categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    }
  };

  radialChartOptions: any = {
    series: [0],
    chart: {
      height: 300,
      type: 'radialBar',
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '70%',
        }
      }
    },
    labels: ['Satisfacción']
  };

  constructor(
    private accesoService: Acceso,
    private ticketsService: TicketsService
  ) {}

  async ngOnInit() {
    this.usuario = this.accesoService.obtenerUsuario();
    await this.loadDashboardData();
  }

  private async loadDashboardData() {
    this.isLoading = true;
    
    try {
      const ticketsResponse = await this.ticketsService.listaMisTicketsCliente().toPromise();
      
      if (ticketsResponse?.isSuccess) {
        if (ticketsResponse.data && Array.isArray(ticketsResponse.data)) {
          const ticketsReales = ticketsResponse.data;
          
          this.todosLosTickets = ticketsReales;
          this.calcularMetricasReales(ticketsReales);
          this.calcularMetricasSLA(ticketsReales);
          this.cargarTicketsRecientesReales(ticketsReales);
          this.cargarNotificacionesReales(ticketsReales);
          this.actualizarGraficos();
          this.generateCalendar();
          
        } else {
          this.cargarDatosDeDemostracion();
        }
        
      } else {
        this.cargarDatosDeDemostracion();
      }
      
    } catch (error: any) {
      this.cargarDatosDeDemostracion();
    } finally {
      this.isLoading = false;
    }
  }

  private calcularMetricasReales(tickets: any[]) {
    // Cálculos con datos REALES
    this.metricas.ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion && t.estado).length;
    this.metricas.ticketsEnProceso = tickets.filter((t: any) => !t.fecha_resolucion && t.tecnico_id && t.estado).length;
    this.metricas.ticketsAbiertos = tickets.filter((t: any) => !t.fecha_resolucion && !t.tecnico_id && t.estado).length;
    this.metricas.ticketsUrgentes = tickets.filter((t: any) => t.prioridad?.nivel >= 3 && t.estado).length;
    this.metricas.ticketsReabiertos = tickets.filter((t: any) => t.veces_reabierto > 0 && t.estado).length;
    this.metricas.totalTickets = tickets.filter((t: any) => t.estado).length;

    // Tiempo promedio REAL
    this.calcularTiempoPromedioReal(tickets);
    
    // Satisfacción REAL
    this.metricas.satisfaccion = this.calcularSatisfaccionReal(tickets);

    // SLA REAL
    this.metricas.slaCumplido = this.calcularSLAReal(tickets);

    // Tickets este mes REAL
    const esteMes = new Date().getMonth();
    const esteAnio = new Date().getFullYear();
    this.metricas.ticketsEsteMes = tickets.filter((t: any) => {
      const fecha = new Date(t.fecha_creacion);
      return fecha.getMonth() === esteMes && fecha.getFullYear() === esteAnio && t.estado;
    }).length;

    // Tickets hoy REAL
    const hoy = new Date().toDateString();
    this.metricas.ticketsHoy = tickets.filter((t: any) => 
      new Date(t.fecha_creacion).toDateString() === hoy && t.estado
    ).length;
  }

  private calcularMetricasSLA(tickets: any[]) {
    let ticketsSLAVencido = 0;
    let ticketsSLAProximoVencer = 0;
    let ticketsConSLA = 0;

    tickets.forEach((ticket: any) => {
      if (ticket.estado && !ticket.fecha_resolucion) {
        const estadoSLA = this.verificarEstadoSLA(ticket);
        
        if (estadoSLA === 'vencido') {
          ticketsSLAVencido++;
        } else if (estadoSLA === 'proximo_vencer') {
          ticketsSLAProximoVencer++;
        }
        
        if (ticket.sla) {
          ticketsConSLA++;
        }
      }
    });

    this.metricas.ticketsSLAVencido = ticketsSLAVencido;
    this.metricas.ticketsSLAProximoVencer = ticketsSLAProximoVencer;
    this.metricas.ticketsConSLA = ticketsConSLA;
  }

  private verificarEstadoSLA(ticket: any): string {
    if (!ticket.sla?.tiempo_resolucion || !ticket.fecha_creacion) {
      return 'sin_sla';
    }

    const fechaCreacion = new Date(ticket.fecha_creacion);
    const ahora = new Date();
    
    const horasTranscurridas = (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
    const horasSLA = ticket.sla.tiempo_resolucion;
    const horasRestantes = horasSLA - horasTranscurridas;

    if (horasRestantes <= 0) {
      return 'vencido';
    } else if (horasRestantes <= 24) {
      return 'proximo_vencer';
    } else {
      return 'en_tiempo';
    }
  }

  private calcularTiempoPromedioReal(tickets: any[]) {
    const ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion && t.estado);
    
    if (ticketsResueltos.length === 0) {
      this.metricas.tiempoPromedio = '0 días';
      return;
    }

    let totalDias = 0;
    let ticketsValidos = 0;

    ticketsResueltos.forEach((ticket: any) => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      
      if (resuelto > creado) {
        const diffMs = resuelto.getTime() - creado.getTime();
        const diffDias = diffMs / (1000 * 60 * 60 * 24);
        totalDias += diffDias;
        ticketsValidos++;
      }
    });

    if (ticketsValidos > 0) {
      const promedioDias = (totalDias / ticketsValidos).toFixed(1);
      this.metricas.tiempoPromedio = `${promedioDias} días`;
    }
  }

  private calcularSatisfaccionReal(tickets: any[]): number {
    const ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion && t.estado);
    
    if (ticketsResueltos.length === 0) return 0;

    let satisfaccionTotal = 0;
    let ticketsConSatisfaccion = 0;

    ticketsResueltos.forEach((ticket: any) => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      
      if (resuelto > creado) {
        const diffDias = (resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60 * 24);
        
        let satisfaccionTicket = 100;
        if (diffDias > 7) satisfaccionTicket = 60;
        else if (diffDias > 3) satisfaccionTicket = 80;
        else if (diffDias > 1) satisfaccionTicket = 90;
        
        satisfaccionTotal += satisfaccionTicket;
        ticketsConSatisfaccion++;
      }
    });

    return ticketsConSatisfaccion > 0 ? Math.round(satisfaccionTotal / ticketsConSatisfaccion) : 0;
  }

  private calcularSLAReal(tickets: any[]): number {
    const ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion && t.estado);
    
    if (ticketsResueltos.length === 0) return 0;

    let ticketsEnSLA = 0;

    ticketsResueltos.forEach((ticket: any) => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      const diffDias = (resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60 * 24);
      
      if (diffDias <= 7) {
        ticketsEnSLA++;
      }
    });

    return Math.round((ticketsEnSLA / ticketsResueltos.length) * 100);
  }

  private cargarTicketsRecientesReales(tickets: any[]) {
    this.ticketsRecientes = tickets
      .filter((t: any) => t.estado)
      .sort((a: any, b: any) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5)
      .map((ticket: any) => ({
        id: ticket.id,
        titulo: ticket.titulo,
        estado: this.getEstadoTicketReal(ticket),
        fecha: ticket.fecha_creacion,
        prioridad: this.getPrioridadTexto(ticket.prioridad?.nivel),
        categoria: ticket.categoria?.nombre || 'General',
        tiempoTranscurrido: this.getTiempoTranscurrido(ticket.fecha_creacion),
        ticketOriginal: ticket
      }));
  }

  private cargarNotificacionesReales(tickets: any[]) {
    this.notificaciones = [];
    
    const ticketsActivos = tickets.filter((t: any) => t.estado);

    // Notificación por tickets urgentes REALES
    const ticketsUrgentesReales = ticketsActivos.filter((t: any) => t.prioridad?.nivel >= 3 && !t.fecha_resolucion);
    if (ticketsUrgentesReales.length > 0) {
      this.notificaciones.push({
        tipo: 'warning',
        mensaje: `Tienes ${ticketsUrgentesReales.length} ticket(s) urgente(s) pendientes`,
        fecha: 'Ahora',
        icon: 'priority_high'
      });
    }

    // Notificación por SLA vencido
    if (this.metricas.ticketsSLAVencido > 0) {
      this.notificaciones.push({
        tipo: 'error',
        mensaje: `${this.metricas.ticketsSLAVencido} ticket(s) con SLA vencido - ¡Atención inmediata!`,
        fecha: 'Urgente',
        icon: 'warning'
      });
    }

    // Notificación por SLA próximo a vencer
    if (this.metricas.ticketsSLAProximoVencer > 0) {
      this.notificaciones.push({
        tipo: 'warning',
        mensaje: `${this.metricas.ticketsSLAProximoVencer} ticket(s) con SLA próximo a vencer`,
        fecha: 'Próximo',
        icon: 'schedule'
      });
    }

    // Notificación por tickets en proceso REALES
    const ticketsEnProcesoReales = ticketsActivos.filter((t: any) => t.tecnico_id && !t.fecha_resolucion);
    if (ticketsEnProcesoReales.length > 0) {
      this.notificaciones.push({
        tipo: 'info',
        mensaje: `${ticketsEnProcesoReales.length} ticket(s) en proceso con técnicos asignados`,
        fecha: 'Activo',
        icon: 'build'
      });
    }

    // Notificación por tickets resueltos recientemente REALES
    const ticketsResueltosRecientes = ticketsActivos.filter((t: any) => {
      if (!t.fecha_resolucion) return false;
      const resuelto = new Date(t.fecha_resolucion);
      const unaSemanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return resuelto > unaSemanaAtras;
    });

    if (ticketsResueltosRecientes.length > 0) {
      this.notificaciones.push({
        tipo: 'success',
        mensaje: `${ticketsResueltosRecientes.length} ticket(s) resuelto(s) esta semana`,
        fecha: 'Reciente',
        icon: 'check_circle'
      });
    }

    // Notificación si no hay tickets
    if (ticketsActivos.length === 0) {
      this.notificaciones.push({
        tipo: 'info',
        mensaje: 'No tienes tickets activos. ¡Crea tu primer ticket!',
        fecha: 'Bienvenido',
        icon: 'add_circle'
      });
    }
  }

  private actualizarGraficos() {
    // Gráfico de donut con datos REALES
    this.donutChartOptions.series = [
      this.metricas.ticketsResueltos,
      this.metricas.ticketsEnProceso,
      this.metricas.ticketsAbiertos,
      this.metricas.ticketsUrgentes
    ];

    // Gráfico radial con satisfacción REAL
    this.radialChartOptions.series = [this.metricas.satisfaccion];

    // Gráfico de barras con datos mensuales REALES
    this.generarDatosMensualesReales();
  }

  private generarDatosMensualesReales() {
    const datosMensuales = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const añoActual = new Date().getFullYear();
    
    this.todosLosTickets.forEach((ticket: any) => {
      if (ticket.estado) {
        const fecha = new Date(ticket.fecha_creacion);
        if (fecha.getFullYear() === añoActual) {
          const mes = fecha.getMonth();
          datosMensuales[mes]++;
        }
      }
    });
    
    this.barChartOptions.series = [{ name: 'Mis Tickets', data: datosMensuales }];
  }

  // CALENDARIO con datos REALES
  generateCalendar(): void {
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
      
      const ticketsCount = this.countTicketsForDateReal(date);
      const tickets = this.getTicketsForDateReal(date);
      
      this.calendarDays.push({
        date,
        isCurrentMonth,
        isToday,
        ticketsCount,
        tickets
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  private countTicketsForDateReal(date: Date): number {
    return this.todosLosTickets.filter((ticket: any) => {
      if (!ticket.estado) return false;
      const ticketDate = new Date(ticket.fecha_creacion);
      return ticketDate.toDateString() === date.toDateString();
    }).length;
  }

  private getTicketsForDateReal(date: Date): any[] {
    return this.todosLosTickets.filter((ticket: any) => {
      if (!ticket.estado) return false;
      const ticketDate = new Date(ticket.fecha_creacion);
      return ticketDate.toDateString() === date.toDateString();
    });
  }

  // Datos de demostración SOLO si falla
  private cargarDatosDeDemostracion() {
    this.metricas = {
      ticketsAbiertos: 0,
      ticketsResueltos: 0,
      ticketsEnProceso: 0,
      ticketsUrgentes: 0,
      tiempoPromedio: '0 días',
      satisfaccion: 0,
      slaCumplido: 0,
      ticketsEsteMes: 0,
      ticketsHoy: 0,
      ticketsReabiertos: 0,
      totalTickets: 0,
      ticketsSLAVencido: 0,
      ticketsSLAProximoVencer: 0,
      ticketsConSLA: 0
    };

    this.ticketsRecientes = [];
    this.notificaciones = [{
      tipo: 'warning',
      mensaje: 'No se pudieron cargar los datos reales. Verifica la conexión.',
      fecha: 'Error',
      icon: 'error'
    }];

    this.actualizarGraficos();
    this.generateCalendar();
  }

  // Métodos públicos para el template
  getEstadoTicketReal(ticket: any): string {
    if (!ticket.estado) return 'Eliminado';
    if (ticket.fecha_resolucion) return 'Resuelto';
    if (ticket.tecnico_id) return 'En Proceso';
    return 'Abierto';
  }

  getPrioridadTexto(nivel?: number): string {
    if (!nivel) return 'Normal';
    if (nivel >= 4) return 'Crítica';
    if (nivel >= 3) return 'Alta';
    if (nivel >= 2) return 'Media';
    return 'Baja';
  }

  getTiempoTranscurrido(fecha: string): string {
    const creado = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora.getTime() - creado.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoy';
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)} semanas`;
    return `Hace ${Math.floor(diffDias / 30)} meses`;
  }

  // Métodos de UI
  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Resuelto': return 'primary';
      case 'En Proceso': return 'accent';
      case 'Abierto': return 'warn';
      case 'Eliminado': return 'warn';
      default: return '';
    }
  }

  getPrioridadColor(prioridad: string): string {
    switch (prioridad) {
      case 'Crítica': return 'warn';
      case 'Alta': return 'warn';
      case 'Media': return 'accent';
      case 'Baja': return 'primary';
      default: return '';
    }
  }

  getNotificacionColor(tipo: string): string {
    switch (tipo) {
      case 'info': return 'primary';
      case 'warning': return 'accent';
      case 'success': return 'primary';
      case 'error': return 'warn';
      default: return '';
    }
  }

  // Navegación del calendario
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

  // Modal de detalle de día
  showDayDetail(day: any): void {
    this.selectedDayTickets = day.tickets;
    this.selectedDayDate = day.date;
    this.showDayDetailModal = true;
  }

  closeDayDetailModal(): void {
    this.showDayDetailModal = false;
  }

  // Refresh
  refreshData() {
    this.loadDashboardData();
  }
}