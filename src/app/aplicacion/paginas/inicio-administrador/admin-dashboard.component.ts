import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Acceso } from '../../services/acceso';
import { DashboardService } from '../../services/dashboard.service';
import { TicketsService } from '../../services/ticket.service';
import { SlasService } from '../../services/slas.service';
import { SlaCalculatorService } from '../../services/sla-calculator.service';
import { 
  DashboardStatsResponse, 
  RecentTicketResponse, 
  CalendarMonthResponse,
  CalendarDay,
  CalendarTicket,
  TopTecnicoResponse,
  CategoriaMetricaResponse,
  EstadoTicket,
  EstadoSLA,
  PrioridadTicket
} from '../../interfaces/dashboard.interface';
import { TicketInterface } from '../../interfaces/ticket.interface';
import { ContratoInterface } from '../../interfaces/contratos.interface';

// ApexCharts
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexOptions } from 'ng-apexcharts';

// Para exportar PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule } from '@angular/forms';

// Material
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

// Servicios adicionales
import { UsuariosService } from '../../services/usuarios.service';
import { ContratosService } from '../../services/contratos.service';

interface CalendarDayItem {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
  tickets: CalendarTicket[];
  ticketCount: number;
  hasTickets: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    NgApexchartsModule,
    FormsModule,
    MatIconModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  // Datos principales del dashboard
  stats: DashboardStatsResponse = {
    totalTickets: 0,
    ticketsAbiertos: 0,
    ticketsResueltos: 0,
    ticketsPendientes: 0,
    slaCumplido: 0,
    usuariosActivos: 0,
    entidadesActivas: 0,
    ticketsEsteMes: 0,
    contratosProximosVencer: 0,
    ticketsHoy: 0,
    ticketsSinAsignar: 0,
    ticketsReabiertos: 0,
    tiempoPromedioResolucion: '0h 0m',
    ticketsSLAVencido: 0,
    ticketsSLAProximoVencer: 0,
    ticketsUrgentes: 0,
    ticketsResueltosHoy: 0,
    eficienciaGeneral: 0,
    satisfaccionPromedio: 0,
    ticketsAsignados: 0,
    ticketsEnProceso: 0,
    ticketsConSLA: 0
  };

  adminInfo: any = {};
  ticketsRecientes: RecentTicketResponse[] = [];
  ticketsSinAsignarList: TicketInterface[] = [];
  contratosProximos: ContratoInterface[] = [];
  
  // Datos para reportes especiales (admin)
  topTecnicos: TopTecnicoResponse[] = [];
  metricasCategorias: CategoriaMetricaResponse[] = [];
  
  // Datos de calendario
  calendario: CalendarMonthResponse = {
    mes: new Date().getMonth(),
    anio: new Date().getFullYear(),
    dias: []
  };
  
  // Estados de carga
  isLoading = true;
  loadingSections = {
    stats: true,
    tickets: true,
    tecnicos: true,
    categorias: true,
    calendario: true
  };
  
  // Variables del calendario
  currentMonth: Date = new Date();
  currentDate = new Date();
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Modal de reportes
  showReportModal = false;
  reportType: 'pdf' | 'excel' = 'pdf';
  reportDateRange = {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  };

  // Modal de detalle de día
  showDayDetailModal = false;
  selectedDayTickets: CalendarTicket[] = [];
  selectedDayDate: Date = new Date();

  // Datos de SLA
  ticketsSLAVencidos: RecentTicketResponse[] = [];
  ticketsSLAPorVencer: RecentTicketResponse[] = [];

  // Gráficas
  public efficiencyChartOptions: ApexOptions;
  public statusChartOptions: ApexOptions;
  public pieChartOptions: ApexOptions;
  public categoriaChartOptions: ApexOptions;
  public tecnicosChartOptions: ApexOptions;

  // Configuración de calendario - CORREGIDO
  calendarDays: CalendarDayItem[] = [];
  calendarHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  weeks: CalendarDayItem[][] = [];

  constructor(
    private accesoService: Acceso,
    private dashboardService: DashboardService,
    private ticketService: TicketsService,
    private usuariosService: UsuariosService,
    private contratosService: ContratosService,
    private slasService: SlasService,
    private slaCalculator: SlaCalculatorService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    // Inicializar gráficas con opciones base
    this.efficiencyChartOptions = this.getEfficiencyChartOptions();
    this.statusChartOptions = this.getStatusChartOptions();
    this.pieChartOptions = this.getPieChartOptions();
    this.categoriaChartOptions = this.getCategoriaChartOptions();
    this.tecnicosChartOptions = this.getTecnicosChartOptions();
  }

  ngOnInit() {
    this.loadAdminInfo();
    this.loadDashboardData();
  }

  ngOnDestroy() {
    // Limpiar recursos si es necesario
  }

  private loadAdminInfo() {
    const usuario = this.accesoService.obtenerUsuario();
    
    this.adminInfo = {
      nombre: usuario?.nombre_usuario || 'Administrador',
      email: usuario?.correo_electronico || '',
      rol: usuario?.rol || 'ADMINISTRADOR'
    };
  }

  private loadDashboardData() {
    this.isLoading = true;
    
    // Cargar todas las secciones del dashboard
    this.loadDashboardStats();
    this.loadTicketsRecientes();
    this.loadTopTecnicos();
    this.loadMetricasCategorias();
    this.loadCalendario();
    this.loadContratosProximos();
    this.loadTicketsSinAsignar();
    this.loadTicketsSLA();
    this.loadTicketsPorMes();
  }

  private loadDashboardStats() {
    this.loadingSections.stats = true;
    this.dashboardService.getDashboardAdmin().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.stats = response.data;
          this.updateChartsWithStats();
        } else {
          this.showError('Error al cargar estadísticas del dashboard');
        }
        this.loadingSections.stats = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando estadísticas:', error);
        this.showError('Error de conexión con el servidor');
        this.loadingSections.stats = false;
        this.checkAllLoaded();
      }
    });
  }

  private loadTicketsRecientes() {
    this.loadingSections.tickets = true;
    this.dashboardService.getTicketsRecientes(10).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.ticketsRecientes = response.data;
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

  private loadTopTecnicos() {
    this.loadingSections.tecnicos = true;
    this.dashboardService.getTopTecnicos(5).subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.topTecnicos = response.data;
          this.updateTecnicosChart();
        }
        this.loadingSections.tecnicos = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando top técnicos:', error);
        this.loadingSections.tecnicos = false;
        this.checkAllLoaded();
      }
    });
  }

  private loadMetricasCategorias() {
    this.loadingSections.categorias = true;
    this.dashboardService.getMetricasCategorias().subscribe({
      next: (response) => {
        if (response.isSuccess && response.data) {
          this.metricasCategorias = response.data;
          this.updateCategoriaChart();
        }
        this.loadingSections.categorias = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando métricas por categoría:', error);
        this.loadingSections.categorias = false;
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
        }
        this.loadingSections.calendario = false;
        this.checkAllLoaded();
      },
      error: (error: any) => {
        console.error('Error cargando calendario:', error);
        this.loadingSections.calendario = false;
        this.checkAllLoaded();
      }
    });
  }

  private loadContratosProximos() {
    this.contratosService.lista().subscribe({
      next: (response: any) => {
        if (response?.isSuccess && response.data) {
          const hoy = new Date();
          const en30Dias = new Date();
          en30Dias.setDate(hoy.getDate() + 30);
          
          this.contratosProximos = response.data
            .filter((contrato: ContratoInterface) => {
              const fechaFin = new Date(contrato.fecha_fin);
              const esVigente = contrato.estado_contrato === 'VIGENTE' || contrato.estado_contrato === 'RENOVADO';
              return esVigente && fechaFin > hoy && fechaFin <= en30Dias;
            })
            .sort((a: ContratoInterface, b: ContratoInterface) => 
              new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime()
            )
            .slice(0, 5);
        }
      },
      error: (error: any) => {
        console.error('Error cargando contratos:', error);
      }
    });
  }

  private loadTicketsSinAsignar() {
    this.ticketService.lista().subscribe({
      next: (response: any) => {
        if (response?.isSuccess && response.data) {
          if (Array.isArray(response.data)) {
            this.ticketsSinAsignarList = response.data
              .filter((ticket: TicketInterface) => 
                ticket.estado && !ticket.tecnico_id && !ticket.fecha_resolucion
              )
              .slice(0, 5);
          }
        }
      },
      error: (error: any) => {
        console.error('Error cargando tickets sin asignar:', error);
      }
    });
  }

  private loadTicketsSLA(): void {
  this.dashboardService.getTicketsRecientes(50).subscribe({
    next: (response) => {
      if (response.isSuccess && response.data) {
        // Filtrar tickets con SLA vencido (excluyendo cerrados y resueltos)
        this.ticketsSLAVencidos = response.data
          .filter(ticket => 
            ticket.sla_estado === 'VENCIDO' && 
            ticket.estado !== 'CERRADO' && 
            ticket.estado !== 'RESUELTO'
          )
          .slice(0, 5);
        
        // Filtrar tickets con SLA por vencer (excluyendo cerrados y resueltos)
        this.ticketsSLAPorVencer = response.data
          .filter(ticket => 
            ticket.sla_estado === 'POR_VENCER' && 
            ticket.estado !== 'CERRADO' && 
            ticket.estado !== 'RESUELTO'
          )
          .slice(0, 5);
      }
    },
    error: (error) => {
      console.error('Error cargando tickets SLA:', error);
    }
  });
}

  private async loadTicketsPorMes(): Promise<void> {
    try {
      const hoy = new Date();
      const mesesAnteriores = 6;
      
      const mesesData: number[] = [];
      const mesesLabels: string[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mes = fecha.getMonth();
        const anio = fecha.getFullYear();
        
        try {
          const response = await this.dashboardService.getCalendario(mes, anio).toPromise();
          
          let totalTicketsMes = 0;
          if (response?.isSuccess && response.data) {
            totalTicketsMes = response.data.dias.reduce((sum: number, dia: CalendarDay) => sum + dia.cantidad_tickets, 0);
          }
          
          mesesData.push(totalTicketsMes);
          mesesLabels.push(this.monthNames[mes].substring(0, 3));
        } catch (error) {
          mesesData.push(0);
          mesesLabels.push(this.monthNames[mes].substring(0, 3));
        }
      }
      
      // Actualizar gráfica con datos reales
      this.efficiencyChartOptions = {
        ...this.efficiencyChartOptions,
        series: [{
          name: 'Tickets',
          data: mesesData
        }],
        xaxis: {
          categories: mesesLabels
        }
      };
      
    } catch (error) {
      console.error('Error cargando tickets por mes:', error);
    }
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
    
    // Obtener el primer día del mes y el último día
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Obtener el día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // Obtener el último día del mes anterior
    const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
    
    // Generar días del mes anterior que aparecen en el calendario
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = lastDayOfPrevMonth - i;
      const date = new Date(year, month - 1, day);
      this.calendarDays.push(this.createCalendarDay(day, date, false));
    }
    
    // Generar días del mes actual
    const daysInMonth = lastDayOfMonth.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      this.calendarDays.push(this.createCalendarDay(day, date, true));
    }
    
    // Generar días del siguiente mes para completar la última semana
    const totalDays = this.calendarDays.length;
    const remainingDays = 42 - totalDays; // 6 semanas * 7 días = 42
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      this.calendarDays.push(this.createCalendarDay(day, date, false));
    }
    
    // Dividir en semanas (7 días por semana)
    for (let i = 0; i < this.calendarDays.length; i += 7) {
      this.weeks.push(this.calendarDays.slice(i, i + 7));
    }
  }

  private createCalendarDay(day: number, date: Date, isCurrentMonth: boolean): CalendarDayItem {
    const dateString = date.toISOString().split('T')[0];
    
    // Buscar si hay tickets para este día
    let dayTickets: CalendarTicket[] = [];
    let ticketCount = 0;
    
    if (this.calendario.dias) {
      const dayData = this.calendario.dias.find(d => d.fecha === dateString);
      if (dayData) {
        dayTickets = dayData.tickets || [];
        ticketCount = dayData.cantidad_tickets || 0;
      }
    }
    
    return {
      day,
      date,
      isCurrentMonth,
      tickets: dayTickets,
      ticketCount,
      hasTickets: ticketCount > 0
    };
  }

  isToday(day: CalendarDayItem): boolean {
    const today = new Date();
    return day.date.getDate() === today.getDate() &&
           day.date.getMonth() === today.getMonth() &&
           day.date.getFullYear() === today.getFullYear();
  }

  getDayClass(day: CalendarDayItem): string {
    const classes = [];
    
    if (!day.isCurrentMonth) {
      classes.push('other-month');
    }
    
    if (this.isToday(day)) {
      classes.push('today');
    }
    
    if (day.hasTickets) {
      classes.push('has-tickets');
    }
    
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
    this.statusChartOptions.series = [{
      name: 'Tickets',
      data: [
        this.stats.ticketsSinAsignar || 0,
        this.stats.ticketsAsignados || 0,
        this.stats.ticketsEnProceso || 0,
        this.stats.ticketsResueltos,
        this.stats.ticketsReabiertos
      ]
    }];

    this.pieChartOptions.series = [
      this.stats.ticketsUrgentes,
      Math.floor(this.stats.ticketsAbiertos * 0.4),
      Math.floor(this.stats.ticketsAbiertos * 0.4),
      Math.floor(this.stats.ticketsAbiertos * 0.2)
    ];
  }

  private updateCategoriaChart() {
    if (this.metricasCategorias.length > 0) {
      this.categoriaChartOptions.series = this.metricasCategorias
        .slice(0, 6)
        .map(categoria => categoria.total_tickets);
      
      this.categoriaChartOptions.labels = this.metricasCategorias
        .slice(0, 6)
        .map(categoria => categoria.nombre);
      
      this.categoriaChartOptions.colors = this.metricasCategorias
        .slice(0, 6)
        .map(categoria => categoria.color);
    }
  }

  private updateTecnicosChart() {
    if (this.topTecnicos.length > 0) {
      this.tecnicosChartOptions.series = [{
        name: 'Eficiencia (%)',
        data: this.topTecnicos.map(tecnico => tecnico.eficiencia)
      }];
      
      this.tecnicosChartOptions.labels = this.topTecnicos.map(tecnico => tecnico.nombre);
    }
  }

  // Métodos de utilidad para UI
  getColorPrioridad(nivel: number): string {
    return this.dashboardService.getColorPrioridad(nivel);
  }

  getNombrePrioridad(nivel: number): string {
    return this.dashboardService.getNombrePrioridad(nivel);
  }

  getColorEstado(estado: string): string {
    return this.dashboardService.getColorEstado(estado);
  }

  getTextoEstado(estado: string): string {
    return this.dashboardService.getTextoEstado(estado);
  }

  getColorSLA(estado: string): string {
    return this.dashboardService.getColorSLA(estado);
  }

  getTextoSLA(estado: string): string {
    return this.dashboardService.getTextoSLA(estado);
  }

  getTiempoTranscurrido(fecha: string): string {
    return this.dashboardService.getTiempoTranscurrido(fecha);
  }

  formatTiempo(tiempo: string): string {
    return this.dashboardService.formatTiempoParaUI(tiempo);
  }

  getTicketEstado(ticket: RecentTicketResponse): string {
    return this.getTextoEstado(ticket.estado);
  }

  getBadgeColorEstado(estado: string): string {
    const color = this.getColorEstado(estado);
    if (color.includes('#2196f3')) return 'new';
    if (color.includes('#ff9800')) return 'in-progress';
    if (color.includes('#4caf50')) return 'resolved';
    if (color.includes('#607d8b')) return 'closed';
    if (color.includes('#ff5722')) return 'reopened';
    return 'new';
  }

  // Navegación
  navigateToTickets(): void {
    this.router.navigate(['/ticket']);
  }

  navigateToTicketDetail(ticketId: number): void {
    this.router.navigate(['/ticket', ticketId]);
  }

  navigateToUsers(): void {
    this.router.navigate(['/usuarios']);
  }

  navigateToContracts(): void {
    this.router.navigate(['/contratos']);
  }

  // Modal de reportes
  openReportModal(): void {
    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  closeDayDetailModal(): void {
    this.showDayDetailModal = false;
  }

  async generateReport(): Promise<void> {
    try {
      if (this.reportType === 'pdf') {
        await this.generatePDFReport();
      } else {
        await this.generateExcelReport();
      }
      
      this.closeReportModal();
      this.showSuccess('Reporte generado exitosamente');
    } catch (error) {
      console.error('Error generando reporte:', error);
      this.showError('Error al generar el reporte');
    }
  }

  private async generatePDFReport(): Promise<void> {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Dashboard Administrativo', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Generado por: ${this.adminInfo.nombre}`, 14, 35);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 14, 42);
    doc.text(`Rango: ${this.reportDateRange.start} a ${this.reportDateRange.end}`, 14, 49);
    
    doc.setFontSize(16);
    doc.text('Estadísticas Principales', 14, 65);
    
    const statsData = [
      ['Total Tickets', this.stats.totalTickets.toString()],
      ['Tickets Abiertos', this.stats.ticketsAbiertos.toString()],
      ['Tickets Resueltos', this.stats.ticketsResueltos.toString()],
      ['Tickets Sin Asignar', this.stats.ticketsSinAsignar?.toString() || '0'],
      ['SLA Cumplido', `${this.stats.slaCumplido}%`],
      ['Tickets SLA Vencido', this.stats.ticketsSLAVencido.toString()],
      ['Tickets SLA Por Vencer', this.stats.ticketsSLAProximoVencer.toString()],
      ['Usuarios Activos', this.stats.usuariosActivos?.toString() || '0'],
      ['Entidades Activas', this.stats.entidadesActivas?.toString() || '0'],
      ['Tickets Este Mes', this.stats.ticketsEsteMes.toString()]
    ];
    
    autoTable(doc, {
      startY: 70,
      head: [['Métrica', 'Valor']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(16);
    doc.text('Top Técnicos', 14, finalY + 15);
    
    const tecnicosData = this.topTecnicos.map(tecnico => [
      tecnico.nombre,
      tecnico.tickets_resueltos.toString(),
      `${tecnico.eficiencia}%`,
      tecnico.tiempo_promedio
    ]);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Nombre', 'Resueltos', 'Eficiencia', 'Tiempo Promedio']],
      body: tecnicosData,
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243] }
    });
    
    const fileName = `reporte-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  }

  private async generateExcelReport(): Promise<void> {
    this.showInfo('Funcionalidad de Excel en desarrollo. Se ha generado PDF en su lugar.');
    await this.generatePDFReport();
  }

  // Contratos
  getDiasRestantes(fechaFin: string): number {
    const fin = new Date(fechaFin);
    const hoy = new Date();
    const diffTime = fin.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getContratoEstadoColor(estado: string): string {
    switch (estado) {
      case 'VIGENTE': 
      case 'RENOVADO': 
        return 'bg-green-100 text-green-800';
      case 'PENDIENTE_FIRMA': 
        return 'bg-yellow-100 text-yellow-800';
      case 'SUSPENDIDO': 
        return 'bg-orange-100 text-orange-800';
      case 'FINALIZADO': 
        return 'bg-blue-100 text-blue-800';
      case 'CANCELADO': 
        return 'bg-red-100 text-red-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  }

  // Snackbars
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      panelClass: ['info-snackbar']
    });
  }

  // Refresh
  refreshData(): void {
    this.isLoading = true;
    Object.keys(this.loadingSections).forEach(key => {
      (this.loadingSections as any)[key] = true;
    });
    this.loadDashboardData();
    this.showSuccess('Datos actualizados');
  }

  // Configuración de gráficas
  private getEfficiencyChartOptions(): ApexOptions {
    return {
      series: [{
        name: 'Tickets',
        data: []
      }],
      chart: {
        height: 350,
        type: 'bar',
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          columnWidth: '55%',
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: [],
      },
      yaxis: {
        title: {
          text: 'Cantidad de Tickets'
        }
      },
      fill: {
        opacity: 1
      },
      colors: ['#3f51b5'],
      title: {
        text: 'Tickets por Mes',
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      }
    };
  }

  private getStatusChartOptions(): ApexOptions {
    return {
      series: [{
        name: 'Tickets',
        data: []
      }],
      chart: {
        height: 350,
        type: 'line',
        toolbar: {
          show: true
        }
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      xaxis: {
        categories: ['Sin Asignar', 'Asignados', 'En Proceso', 'Resueltos', 'Reabiertos'],
      },
      yaxis: {
        title: {
          text: 'Cantidad'
        }
      },
      colors: ['#ff9800'],
      title: {
        text: 'Distribución por Estado',
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      }
    };
  }

  private getPieChartOptions(): ApexOptions {
    return {
      series: [],
      chart: {
        type: 'donut',
        height: 350
      },
      labels: ['Urgentes', 'Altas', 'Medias', 'Bajas'],
      colors: ['#f44336', '#ff9800', '#ffc107', '#4caf50'],
      legend: {
        position: 'bottom'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '45%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total'
              }
            }
          }
        }
      },
      title: {
        text: 'Distribución por Prioridad',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      }
    };
  }

  private getCategoriaChartOptions(): ApexOptions {
    return {
      series: [],
      chart: {
        type: 'pie',
        height: 350
      },
      labels: [],
      colors: ['#3f51b5', '#673ab7', '#2196f3', '#4caf50', '#ff9800', '#f44336'],
      legend: {
        position: 'bottom'
      },
      title: {
        text: 'Tickets por Categoría',
        align: 'center',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      }
    };
  }

  private getTecnicosChartOptions(): ApexOptions {
    return {
      series: [],
      chart: {
        height: 350,
        type: 'bar',
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          columnWidth: '55%',
        }
      },
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: [],
      },
      yaxis: {
        title: {
          text: 'Eficiencia (%)'
        },
        max: 100
      },
      fill: {
        opacity: 1
      },
      colors: ['#4caf50'],
      title: {
        text: 'Top Técnicos por Eficiencia',
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      }
    };
  }
}