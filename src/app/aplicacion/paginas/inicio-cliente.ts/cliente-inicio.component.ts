import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Acceso } from '../../services/acceso';
import { DashboardService } from '../../services/dashboard.service';
import { TicketsService } from '../../services/ticket.service';
import { 
  DashboardStatsResponse, 
  RecentTicketResponse, 
  CalendarMonthResponse,
  CalendarTicket,
  EstadoTicket,
  EstadoSLA,
  PrioridadTicket
} from '../../interfaces/dashboard.interface';

// ApexCharts
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexOptions } from 'ng-apexcharts';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';

interface CalendarDayItem {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tickets: CalendarTicket[];
  ticketsCount: number;
  hasTickets: boolean;
}

interface TicketExtended extends RecentTicketResponse {
  ticketOriginal?: any;
}

@Component({
  selector: 'app-cliente-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './cliente-inicio.component.html',
  styleUrls: ['./cliente-inicio.component.scss']
})
export class ClienteDashboardComponent implements OnInit, OnDestroy {
  stats: DashboardStatsResponse = {
    totalTickets: 0,
    ticketsAbiertos: 0,
    ticketsResueltos: 0,
    slaCumplido: 0,
    ticketsEsteMes: 0,
    ticketsHoy: 0,
    ticketsReabiertos: 0,
    ticketsSLAVencido: 0,
    ticketsSLAProximoVencer: 0,
    ticketsUrgentes: 0,
    ticketsResueltosHoy: 0,
    tiempoPromedioResolucion: '0h 0m',
    satisfaccionPromedio: 0,
    ticketsConSLA: 0
  };

  clienteInfo: any = {};
  ticketsRecientes: TicketExtended[] = [];
  ticketsSLAVencidos: TicketExtended[] = [];
  ticketsSLAPorVencer: TicketExtended[] = [];
  
  calendario: CalendarMonthResponse = {
    mes: new Date().getMonth(),
    anio: new Date().getFullYear(),
    dias: []
  };
  
  isLoading = true;
  loadingSections = {
    stats: true,
    tickets: true,
    calendario: true
  };
  
  currentMonth: Date = new Date();
  currentDate = new Date();
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  showDayDetailModal = false;
  selectedDayTickets: CalendarTicket[] = [];
  selectedDayDate: Date = new Date();

  public distributionChartOptions: ApexOptions;
  public monthlyChartOptions: ApexOptions;
  public priorityChartOptions: ApexOptions;
  public satisfactionChartOptions: ApexOptions;

  calendarDays: CalendarDayItem[] = [];
  calendarHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  weeks: CalendarDayItem[][] = [];

  constructor(
    private accesoService: Acceso,
    private dashboardService: DashboardService,
    private ticketsService: TicketsService,
    private router: Router
  ) {
    this.distributionChartOptions = this.getDistributionChartOptions();
    this.monthlyChartOptions = this.getMonthlyChartOptions();
    this.priorityChartOptions = this.getPriorityChartOptions();
    this.satisfactionChartOptions = this.getSatisfactionChartOptions();
  }

  ngOnInit() {
    this.loadClienteInfo();
    this.loadDashboardData();
  }

  ngOnDestroy() {}

  private loadClienteInfo() {
    const usuario = this.accesoService.obtenerUsuario();
    this.clienteInfo = {
      nombre: usuario?.nombre_usuario || 'Cliente',
      email: usuario?.correo_electronico || '',
      rol: usuario?.rol || 'CLIENTE'
    };
  }

  private loadDashboardData() {
    this.isLoading = true;
    this.loadDashboardStats();
    this.loadTicketsRecientes();
    this.loadCalendario();
    this.loadTicketsSLA();
  }

  private loadDashboardStats() {
    this.loadingSections.stats = true;
    this.dashboardService.getMiDashboard().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.stats = response.data;
          this.updateChartsWithStats();
        } else {
          const usuario = this.accesoService.obtenerUsuario();
          if (usuario?.id) {
            this.loadClienteStats();
          } else {
            this.loadDataFromTicketsService();
          }
        }
        this.loadingSections.stats = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas:', error);
        this.loadingSections.stats = false;
        this.checkAllLoaded();
        this.loadDataFromTicketsService();
      }
    });
  }

  private loadClienteStats() {
    this.dashboardService.getDashboardCliente().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.stats = response.data;
          this.updateChartsWithStats();
        }
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando stats cliente:', error);
        this.loadDataFromTicketsService();
      }
    });
  }

  private async loadDataFromTicketsService() {
    try {
      const ticketsResponse = await this.ticketsService.lista().toPromise();
      if (ticketsResponse?.isSuccess && ticketsResponse.data) {
        const ticketsCliente = Array.isArray(ticketsResponse.data) 
          ? ticketsResponse.data.filter((t: any) => t.estado)
          : [];
        this.calcularStatsManual(ticketsCliente);
        this.cargarTicketsRecientesManual(ticketsCliente);
        this.actualizarGraficosManual();
      }
    } catch (error) {
      console.error('Error cargando tickets:', error);
    }
  }

  private calcularStatsManual(tickets: any[]) {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    this.stats = {
      totalTickets: tickets.length,
      ticketsAbiertos: tickets.filter(t => !t.fecha_resolucion && !['RESUELTO', 'CERRADO'].includes(t.estado)).length,
      ticketsResueltos: tickets.filter(t => t.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(t.estado)).length,
      slaCumplido: this.calcularSLAManual(tickets),
      ticketsEsteMes: tickets.filter(t => new Date(t.fecha_creacion) >= inicioMes).length,
      ticketsHoy: tickets.filter(t => new Date(t.fecha_creacion) >= inicioDia).length,
      ticketsReabiertos: tickets.filter(t => t.veces_reabierto > 0).length,
      ticketsSLAVencido: this.calcularTicketsSLAVencido(tickets),
      ticketsSLAProximoVencer: this.calcularTicketsSLAPorVencer(tickets),
      ticketsUrgentes: tickets.filter(t => t.prioridad?.nivel >= 3 && !t.fecha_resolucion && !['RESUELTO', 'CERRADO'].includes(t.estado)).length,
      ticketsResueltosHoy: tickets.filter(t => t.fecha_resolucion && new Date(t.fecha_resolucion) >= inicioDia).length,
      tiempoPromedioResolucion: this.calcularTiempoPromedioManual(tickets),
      satisfaccionPromedio: this.calcularSatisfaccionManual(tickets),
      ticketsConSLA: tickets.filter(t => t.sla || t.prioridad?.tiempo_resolucion).length
    };
  }

  private calcularSLAManual(tickets: any[]): number {
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(t.estado));
    if (ticketsResueltos.length === 0) return 0;

    let cumplidos = 0;
    ticketsResueltos.forEach(ticket => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion || ticket.fecha_actualizacion || creado);
      const diffHoras = (resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60);
      const tiempoSLA = ticket.prioridad?.tiempo_resolucion || ticket.sla?.tiempo_resolucion || 72;
      if (diffHoras <= tiempoSLA) {
        cumplidos++;
      }
    });

    return Math.round((cumplidos / ticketsResueltos.length) * 100);
  }

  private calcularTicketsSLAVencido(tickets: any[]): number {
    const ahora = new Date();
    return tickets.filter(ticket => {
      // Excluir tickets resueltos/cerrados
      if (ticket.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(ticket.estado)) {
        return false;
      }
      const creado = new Date(ticket.fecha_creacion);
      const tiempoSLA = ticket.prioridad?.tiempo_resolucion || ticket.sla?.tiempo_resolucion || 72;
      const fechaLimite = new Date(creado.getTime() + tiempoSLA * 60 * 60 * 1000);
      return fechaLimite < ahora;
    }).length;
  }

  private calcularTicketsSLAPorVencer(tickets: any[]): number {
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    return tickets.filter(ticket => {
      // Excluir tickets resueltos/cerrados
      if (ticket.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(ticket.estado)) {
        return false;
      }
      const creado = new Date(ticket.fecha_creacion);
      const tiempoSLA = ticket.prioridad?.tiempo_resolucion || ticket.sla?.tiempo_resolucion || 72;
      const fechaLimite = new Date(creado.getTime() + tiempoSLA * 60 * 60 * 1000);
      return fechaLimite > ahora && fechaLimite <= en24Horas;
    }).length;
  }

  private calcularTiempoPromedioManual(tickets: any[]): string {
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(t.estado));
    if (ticketsResueltos.length === 0) return '0h 0m';

    let totalHoras = 0;
    ticketsResueltos.forEach(ticket => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion || ticket.fecha_actualizacion || creado);
      totalHoras += (resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60);
    });

    const promedioHoras = totalHoras / ticketsResueltos.length;
    return this.formatTiempoPrivado(promedioHoras);
  }

  private calcularSatisfaccionManual(tickets: any[]): number {
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(t.estado));
    if (ticketsResueltos.length === 0) return 0;

    let satisfaccionTotal = 0;
    ticketsResueltos.forEach(ticket => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion || ticket.fecha_actualizacion || creado);
      const diffDias = (resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60 * 24);
      let satisfaccionTicket = 100;
      if (diffDias > 7) satisfaccionTicket = 60;
      else if (diffDias > 3) satisfaccionTicket = 80;
      else if (diffDias > 1) satisfaccionTicket = 90;
      satisfaccionTotal += satisfaccionTicket;
    });

    return Math.round(satisfaccionTotal / ticketsResueltos.length);
  }

  private cargarTicketsRecientesManual(tickets: any[]) {
    this.ticketsRecientes = tickets
      .sort((a: any, b: any) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5)
      .map((ticket: any): TicketExtended => ({
        id: ticket.id,
        titulo: ticket.titulo,
        descripcion: ticket.descripcion,
        estado: ticket.estado_ticket || (ticket.fecha_resolucion ? 'RESUELTO' : 'ABIERTO'),
        fecha_creacion: ticket.fecha_creacion,
        fecha_resolucion: ticket.fecha_resolucion,
        prioridad_nivel: ticket.prioridad?.nivel || 1,
        prioridad_nombre: ticket.prioridad?.nombre || 'Normal',
        categoria_nombre: ticket.categoria?.nombre,
        tecnico_nombre: ticket.tecnico?.nombre_usuario,
        cliente_nombre: ticket.entidad_usuario?.usuario?.nombre_usuario,
        entidad_nombre: ticket.entidad_usuario?.entidad?.denominacion,
        tiempo_transcurrido: this.getTiempoTranscurrido(ticket.fecha_creacion),
        sla_estado: this.verificarSLAEstado(ticket),
        ticketOriginal: ticket
      }));
  }

  private verificarSLAEstado(ticket: any): string {
    // Si el ticket está resuelto o cerrado, mostrar como dentro del tiempo
    if (ticket.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(ticket.estado)) {
      return EstadoSLA.DENTRO_TIEMPO;
    }
    
    if (!ticket.prioridad?.tiempo_resolucion && !ticket.sla?.tiempo_resolucion) {
      return EstadoSLA.SIN_SLA;
    }

    const ahora = new Date();
    const creado = new Date(ticket.fecha_creacion);
    const tiempoSLA = ticket.prioridad?.tiempo_resolucion || ticket.sla?.tiempo_resolucion || 72;
    const fechaLimite = new Date(creado.getTime() + tiempoSLA * 60 * 60 * 1000);
    const horasRestantes = (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    if (horasRestantes <= 0) return EstadoSLA.VENCIDO;
    if (horasRestantes <= 24) return EstadoSLA.POR_VENCER;
    return EstadoSLA.DENTRO_TIEMPO;
  }

  private actualizarGraficosManual() {
    const tickets = this.ticketsRecientes;
    const resueltos = tickets.filter(t => t.fecha_resolucion || ['RESUELTO', 'CERRADO'].includes(t.estado)).length;
    const enProceso = tickets.filter(t => !t.fecha_resolucion && t.tecnico_nombre && !['RESUELTO', 'CERRADO'].includes(t.estado)).length;
    const abiertos = tickets.filter(t => !t.fecha_resolucion && !t.tecnico_nombre && !['RESUELTO', 'CERRADO'].includes(t.estado)).length;
    const urgentes = tickets.filter(t => t.prioridad_nivel && t.prioridad_nivel >= 3 && !t.fecha_resolucion && !['RESUELTO', 'CERRADO'].includes(t.estado)).length;

    this.distributionChartOptions.series = [resueltos, enProceso, abiertos, urgentes];
    this.satisfactionChartOptions.series = [this.stats.satisfaccionPromedio ?? 0];
  }

  private loadTicketsRecientes() {
    this.loadingSections.tickets = true;
    this.dashboardService.getTicketsRecientes().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.ticketsRecientes = response.data.map(ticket => ({
            ...ticket,
            ticketOriginal: ticket
          }));
        }
        this.loadingSections.tickets = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando tickets recientes:', error);
        this.loadingSections.tickets = false;
        this.checkAllLoaded();
      }
    });
  }

  private loadTicketsSLA(): void {
    this.dashboardService.getTicketsRecientes().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          // Filtrar tickets VENCIDOS excluyendo los ya resueltos/cerrados
          this.ticketsSLAVencidos = response.data
            .filter(ticket => 
              ticket.sla_estado === EstadoSLA.VENCIDO && 
              !['RESUELTO', 'CERRADO'].includes(ticket.estado)
            )
            .slice(0, 3)
            .map(ticket => ({ ...ticket, ticketOriginal: ticket }));
          
          // Filtrar tickets POR VENCER excluyendo los ya resueltos/cerrados
          this.ticketsSLAPorVencer = response.data
            .filter(ticket => 
              ticket.sla_estado === EstadoSLA.POR_VENCER && 
              !['RESUELTO', 'CERRADO'].includes(ticket.estado)
            )
            .slice(0, 3)
            .map(ticket => ({ ...ticket, ticketOriginal: ticket }));
        }
        this.checkAllLoaded();
      },
      error: (error) => {
        console.error('Error cargando tickets SLA:', error);
        this.checkAllLoaded();
      }
    });
  }

  private loadCalendario() {
    this.loadingSections.calendario = true;
    const hoy = new Date();
    this.dashboardService.getCalendario(hoy.getMonth(), hoy.getFullYear()).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.calendario = response.data;
          this.generateCalendar();
        } else {
          this.generateCalendarManual();
        }
        this.loadingSections.calendario = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando calendario:', error);
        this.generateCalendarManual();
        this.loadingSections.calendario = false;
        this.checkAllLoaded();
      }
    });
  }

  private checkAllLoaded() {
    const allLoaded = Object.values(this.loadingSections).every(loaded => !loaded);
    if (allLoaded) {
      this.isLoading = false;
    }
  }

  // ==================== MÉTODOS DEL CALENDARIO ====================

  private generateCalendar(): void {
    this.calendarDays = [];
    this.weeks = [];
    
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i;
      const date = new Date(year, month - 1, day);
      this.calendarDays.push(this.createCalendarDay(day, date, false));
    }
    
    const daysInMonth = lastDayOfMonth.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      this.calendarDays.push(this.createCalendarDay(day, date, true));
    }
    
    const totalDays = this.calendarDays.length;
    const remainingDays = 42 - totalDays;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      this.calendarDays.push(this.createCalendarDay(day, date, false));
    }
    
    for (let i = 0; i < this.calendarDays.length; i += 7) {
      this.weeks.push(this.calendarDays.slice(i, i + 7));
    }
  }

  private generateCalendarManual(): void {
    this.calendarDays = [];
    this.weeks = [];
    
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
    
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i;
      const date = new Date(year, month - 1, day);
      this.calendarDays.push(this.createCalendarDay(day, date, false));
    }
    
    const daysInMonth = lastDayOfMonth.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      this.calendarDays.push(this.createCalendarDay(day, date, true));
    }
    
    const totalDays = this.calendarDays.length;
    const remainingDays = 42 - totalDays;
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      this.calendarDays.push(this.createCalendarDay(day, date, false));
    }
    
    for (let i = 0; i < this.calendarDays.length; i += 7) {
      this.weeks.push(this.calendarDays.slice(i, i + 7));
    }
  }

  private createCalendarDay(day: number, date: Date, isCurrentMonth: boolean): CalendarDayItem {
    const dateString = date.toISOString().split('T')[0];
    const isToday = this.isToday(date);
    let dayTickets: CalendarTicket[] = [];
    let ticketsCount = 0;
    
    if (this.calendario.dias) {
      const dayData = this.calendario.dias.find(d => {
        const dayDate = new Date(d.fecha);
        return dayDate.toDateString() === date.toDateString();
      });
      if (dayData) {
        dayTickets = dayData.tickets || [];
        ticketsCount = dayData.cantidad_tickets || 0;
      }
    }
    
    return {
      day,
      date,
      isCurrentMonth,
      isToday,
      tickets: dayTickets,
      ticketsCount,
      hasTickets: ticketsCount > 0
    };
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();
  }

  getDayClass(day: CalendarDayItem): string {
    const classes = [];
    if (!day.isCurrentMonth) classes.push('other-month');
    if (day.isToday) classes.push('today');
    if (day.hasTickets) classes.push('has-tickets');
    return classes.join(' ');
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.loadCalendarioForMonth(this.currentMonth.getMonth(), this.currentMonth.getFullYear());
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.loadCalendarioForMonth(this.currentMonth.getMonth(), this.currentMonth.getFullYear());
  }

  private loadCalendarioForMonth(mes: number, anio: number): void {
    this.loadingSections.calendario = true;
    this.dashboardService.getCalendario(mes, anio).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.calendario = response.data;
          this.generateCalendar();
        }
        this.loadingSections.calendario = false;
      },
      error: (error: any) => {
        console.error('Error cargando calendario:', error);
        this.loadingSections.calendario = false;
        this.generateCalendarManual();
      }
    });
  }

  getCurrentMonthYear(): string {
    return `${this.monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  showDayDetail(day: CalendarDayItem): void {
    if (day.tickets.length > 0) {
      this.selectedDayTickets = day.tickets;
      this.selectedDayDate = day.date;
      this.showDayDetailModal = true;
    }
  }

  // ==================== RESTANTES MÉTODOS ====================

  private updateChartsWithStats() {
    this.distributionChartOptions.series = [
      this.stats.ticketsResueltos,
      this.stats.ticketsAbiertos - this.stats.ticketsUrgentes,
      this.stats.ticketsUrgentes,
      0
    ];
    this.satisfactionChartOptions.series = [this.stats.satisfaccionPromedio ?? 0];
  }

  // MÉTODOS DE UTILIDAD PARA UI - SIMPLIFICADOS Y CORREGIDOS
  getColorPrioridad(nivel: number | undefined): string {
    const nivelSeguro = nivel || 1;
    // Usar colores directamente aquí para evitar problemas
    switch (nivelSeguro) {
      case 1: return '#4caf50'; // Baja - Verde
      case 2: return '#ffc107'; // Media - Amarillo
      case 3: return '#ff9800'; // Alta - Naranja
      case 4: return '#f44336'; // Urgente - Rojo
      default: return '#9e9e9e'; // Gris por defecto
    }
  }

  getNombrePrioridad(nivel: number | undefined): string {
    const nivelSeguro = nivel || 1;
    switch (nivelSeguro) {
      case 1: return 'Baja';
      case 2: return 'Media';
      case 3: return 'Alta';
      case 4: return 'Urgente';
      default: return 'Normal';
    }
  }

  getColorEstado(estado: string): string {
    // Implementación directa sin dependencia del servicio
    switch (estado) {
      case 'NUEVO': return '#2196f3';
      case 'EN_PROCESO': return '#ff9800';
      case 'PENDIENTE': return '#9c27b0';
      case 'RESUELTO': return '#4caf50';
      case 'CERRADO': return '#607d8b';
      case 'REABIERTO': return '#ff5722';
      default: return '#9e9e9e';
    }
  }

  getTextoEstado(estado: string): string {
    switch (estado) {
      case 'NUEVO': return 'Nuevo';
      case 'EN_PROCESO': return 'En Proceso';
      case 'PENDIENTE': return 'Pendiente';
      case 'RESUELTO': return 'Resuelto';
      case 'CERRADO': return 'Cerrado';
      case 'REABIERTO': return 'Reabierto';
      default: return estado;
    }
  }

  getColorSLA(estado: string): string {
    switch (estado) {
      case 'DENTRO_TIEMPO': return '#4caf50';
      case 'POR_VENCER': return '#ff9800';
      case 'VENCIDO': return '#f44336';
      case 'SIN_SLA': return '#9e9e9e';
      default: return '#9e9e9e';
    }
  }

  getTextoSLA(estado: string): string {
    switch (estado) {
      case 'DENTRO_TIEMPO': return 'En tiempo';
      case 'POR_VENCER': return 'Por vencer';
      case 'VENCIDO': return 'Vencido';
      case 'SIN_SLA': return 'Sin SLA';
      default: return estado;
    }
  }

  getTiempoTranscurrido(fecha: string): string {
    // Implementación directa
    const creado = new Date(fecha);
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

  formatTiempo(tiempo: string | undefined): string {
    const tiempoSeguro = tiempo || '0h 0m';
    if (!tiempoSeguro || tiempoSeguro === '0h 0m') return 'Sin datos';
    
    const diasMatch = tiempoSeguro.match(/(\d+)d/);
    const horasMatch = tiempoSeguro.match(/(\d+)h/);
    const minutosMatch = tiempoSeguro.match(/(\d+)m/);
    
    let result = '';
    if (diasMatch) result += `${diasMatch[1]} días `;
    if (horasMatch) result += `${horasMatch[1]} horas `;
    if (minutosMatch) result += `${minutosMatch[1]} minutos`;
    
    return result.trim() || tiempoSeguro;
  }

  getTicketEstado(ticket: RecentTicketResponse): string {
    return this.getTextoEstado(ticket.estado);
  }

  getBadgeColorEstado(estado: string): string {
    const color = this.getColorEstado(estado);
    if (color === '#2196f3') return 'new';
    if (color === '#ff9800') return 'in-progress';
    if (color === '#4caf50') return 'resolved';
    if (color === '#607d8b') return 'closed';
    if (color === '#ff5722') return 'reopened';
    return 'new';
  }

  // Método privado para formateo interno
  private formatTiempoPrivado(horas: number): string {
    if (horas < 1) {
      const minutos = Math.round(horas * 60);
      return `${minutos}m`;
    } else if (horas < 24) {
      const horasEnteras = Math.floor(horas);
      const minutos = Math.round((horas - horasEnteras) * 60);
      return `${horasEnteras}h ${minutos}m`;
    } else {
      const dias = Math.floor(horas / 24);
      const horasRestantes = Math.round(horas % 24);
      return `${dias}d ${horasRestantes}h`;
    }
  }

  // Navegación
  navigateToTickets(): void {
    this.router.navigate(['/mis-tickets']);
  }

  navigateToTicketDetail(ticketId: number): void {
    this.router.navigate(['/ticket', ticketId]);
  }

  navigateToNewTicket(): void {
    this.router.navigate(['/crear-ticket']);
  }

  closeDayDetailModal(): void {
    this.showDayDetailModal = false;
  }

  refreshData(): void {
    this.isLoading = true;
    Object.keys(this.loadingSections).forEach(key => {
      (this.loadingSections as any)[key] = true;
    });
    this.loadDashboardData();
  }

  // Configuración de gráficas
  private getDistributionChartOptions(): ApexOptions {
    return {
      series: [0, 0, 0, 0],
      chart: { type: 'donut', height: 350 },
      labels: ['Resueltos', 'En Proceso', 'Urgentes', 'Abiertos'],
      colors: ['#4caf50', '#2196f3', '#f44336', '#ff9800'],
      legend: { position: 'bottom' },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total',
                color: '#666',
                formatter: function (w) {
                  return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)
                }
              }
            }
          }
        }
      },
      title: {
        text: 'Distribución de Mis Tickets',
        align: 'center',
        style: { fontSize: '16px', fontWeight: 'bold' }
      }
    };
  }

  private getMonthlyChartOptions(): ApexOptions {
    return {
      series: [{ name: 'Mis Tickets', data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
      chart: { type: 'bar', height: 350, toolbar: { show: true } },
      plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '55%' } },
      dataLabels: { enabled: false },
      stroke: { show: true, width: 2, colors: ['transparent'] },
      xaxis: { categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'] },
      yaxis: { title: { text: 'Cantidad de Tickets' } },
      fill: { opacity: 1 },
      colors: ['#3f51b5'],
      title: {
        text: 'Mis Tickets por Mes',
        align: 'left',
        style: { fontSize: '16px', fontWeight: 'bold' }
      }
    };
  }

  private getPriorityChartOptions(): ApexOptions {
    return {
      series: [0, 0, 0, 0],
      chart: { type: 'pie', height: 350 },
      labels: ['Baja', 'Media', 'Alta', 'Urgente'],
      colors: ['#4caf50', '#ffc107', '#ff9800', '#f44336'],
      legend: { position: 'bottom' },
      plotOptions: {
        pie: {
          donut: {
            size: '45%',
            labels: {
              show: true,
              total: { show: true, label: 'Total' }
            }
          }
        }
      },
      title: {
        text: 'Distribución por Prioridad',
        align: 'center',
        style: { fontSize: '16px', fontWeight: 'bold' }
      }
    };
  }

  private getSatisfactionChartOptions(): ApexOptions {
    return {
      series: [0],
      chart: { height: 300, type: 'radialBar' },
      plotOptions: {
        radialBar: {
          hollow: { size: '70%' },
          dataLabels: {
            name: { fontSize: '16px', color: '#666' },
            value: { fontSize: '24px', color: '#333' },
            total: {
              show: true,
              label: 'Satisfacción',
              formatter: function (w) {
                return w.globals.series[0] + '%'
              }
            }
          }
        }
      },
      labels: ['Satisfacción'],
      colors: ['#4CAF50']
    };
  }
}