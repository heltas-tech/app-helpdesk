import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Acceso } from '../../services/acceso';
import { TicketsService } from '../../services/ticket.service';
import { UsuariosService } from '../../services/usuarios.service';
import { ContratosService } from '../../services/contratos.service';
import { EntidadesService } from '../../services/entidades.service';
import { TicketInterface } from '../../interfaces/ticket.interface';
import { UsuarioInterface } from '../../interfaces/usuarios.interface';
import { ContratoInterface } from '../../interfaces/contratos.interface';
import { EntidadInterface } from '../../interfaces/entidades.interface';

// Chart.js
import { ChartConfiguration, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// ApexCharts
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexOptions } from 'ng-apexcharts';

// Para exportar PDF
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FormsModule } from '@angular/forms';

interface DashboardStats {
  totalTickets: number;
  ticketsAbiertos: number;
  ticketsResueltos: number;
  ticketsPendientes: number;
  slaCumplido: number;
  usuariosActivos: number;
  entidadesActivas: number;
  ticketsEsteMes: number;
  contratosProximosVencer: number;
  ticketsHoy: number;
  ticketsSinAsignar: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  ticketsCount: number;
  tickets: TicketInterface[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    BaseChartDirective,
    NgApexchartsModule,
    FormsModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  stats: DashboardStats = {
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
    ticketsSinAsignar: 0
  };

  adminInfo: any = {};
  ticketsRecientes: TicketInterface[] = [];
  ticketsSinAsignar: TicketInterface[] = [];
  contratosProximos: ContratoInterface[] = [];
  isLoading = true;
  currentDate = new Date();
  
  // Calendario
  calendarDays: CalendarDay[] = [];
  currentMonth: Date = new Date();
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Modal de reportes
  showReportModal = false;
  reportType: 'pdf' | 'excel' = 'pdf';
  reportDateRange = {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  };

  // Chart.js - Tickets por Estado
  public barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Distribución de Tickets por Estado',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Nuevos', 'Asignados', 'En Proceso', 'Resueltos', 'Cerrados'],
    datasets: [
      {
        data: [0, 0, 0, 0, 0],
        label: 'Cantidad de Tickets',
        backgroundColor: [
          '#3b82f6', '#f59e0b', '#f97316', '#10b981', '#6b7280'
        ],
        borderColor: [
          '#2563eb', '#d97706', '#ea580c', '#059669', '#4b5563'
        ],
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }
    ]
  };

  public barChartType: ChartType = 'bar';

  // ApexCharts - Tickets por Mes
  public chartOptions: ApexOptions = {
    series: [{
      name: 'Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }],
    chart: {
      height: 350,
      type: 'area',
      toolbar: {
        show: true
      }
    },
    dataLabels: {
      enabled: false
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      axisBorder: {
        show: true
      },
      axisTicks: {
        show: true
      }
    },
    yaxis: {
      title: {
        text: 'Cantidad de Tickets'
      }
    },
    colors: ['#3b82f6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    title: {
      text: 'Tickets Creados por Mes',
      align: 'left',
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    }
  };

  // ApexCharts - Distribución por Prioridad
  public pieChartOptions: ApexOptions = {
    series: [0, 0, 0, 0],
    chart: {
      type: 'donut',
      height: 350
    },
    labels: ['Crítica', 'Alta', 'Media', 'Baja'],
    colors: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
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
              label: 'Total',
              fontSize: '16px'
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
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number, opts) {
        return opts.w.config.series[opts.seriesIndex] + ' tickets';
      }
    }
  };

  constructor(
    private accesoService: Acceso,
    private ticketsService: TicketsService,
    private usuariosService: UsuariosService,
    private contratosService: ContratosService,
    private entidadesService: EntidadesService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadAdminInfo();
    this.loadDashboardData();
    this.generateCalendar();
  }

  private loadAdminInfo() {
    const usuario = this.accesoService.obtenerUsuario();
    this.adminInfo = {
      nombre: usuario?.nombre_completo || usuario?.nombre_usuario || 'Administrador',
      email: usuario?.correo_electronico || '',
      rol: usuario?.rol || 'ADMINISTRADOR',
      fechaIngreso: new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };
  }

  private loadDashboardData() {
    this.isLoading = true;
    
    Promise.all([
      this.loadTicketsData(),
      this.loadUsuariosData(),
      this.loadContratosData(),
      this.loadEntidadesData()
    ]).finally(() => {
      this.isLoading = false;
      this.updateCharts();
      this.generateCalendar();
    });
  }

  private async loadTicketsData() {
    try {
      const ticketsResponse = await this.ticketsService.lista().toPromise();
      console.log('📊 Respuesta de tickets:', ticketsResponse);
      
      if (ticketsResponse?.isSuccess && ticketsResponse.data) {
        const tickets: TicketInterface[] = ticketsResponse.data;
        
        // Estadísticas básicas
        this.stats.totalTickets = tickets.length;
        this.stats.ticketsAbiertos = tickets.filter(t => t.estado && !t.fecha_resolucion).length;
        this.stats.ticketsResueltos = tickets.filter(t => t.fecha_resolucion).length;
        this.stats.ticketsPendientes = tickets.filter(t => t.estado && !t.tecnico_id).length;
        this.stats.ticketsSinAsignar = tickets.filter(t => !t.tecnico_id && t.estado).length;
        
        // Tickets este mes
        const esteMes = new Date().getMonth();
        const esteAnio = new Date().getFullYear();
        this.stats.ticketsEsteMes = tickets.filter(t => {
          const fechaTicket = new Date(t.fecha_creacion);
          return fechaTicket.getMonth() === esteMes && fechaTicket.getFullYear() === esteAnio;
        }).length;

        // Tickets hoy
        const hoy = new Date().toDateString();
        this.stats.ticketsHoy = tickets.filter(t => 
          new Date(t.fecha_creacion).toDateString() === hoy
        ).length;

        // Tickets recientes (últimos 10)
        this.ticketsRecientes = tickets
          .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
          .slice(0, 10);

        // Tickets sin asignar
        this.ticketsSinAsignar = tickets
          .filter(t => !t.tecnico_id && t.estado)
          .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
          .slice(0, 10);

        // Calcular distribución para gráficos
        this.calculateChartData(tickets);
      } else {
        console.error('❌ Error en respuesta de tickets:', ticketsResponse?.message);
      }
    } catch (error) {
      console.error('❌ Error cargando tickets:', error);
    }
  }

  private calculateChartData(tickets: TicketInterface[]) {
    // Distribución por estado para Chart.js - CORREGIDO
    const nuevos = tickets.filter(t => !t.tecnico_id && t.estado && !t.fecha_resolucion).length;
    const asignados = tickets.filter(t => t.tecnico_id && !t.fecha_resolucion && t.estado).length;
    const enProceso = tickets.filter(t => t.estado && t.tecnico_id && !t.fecha_resolucion).length;
    const resueltos = tickets.filter(t => t.fecha_resolucion && t.estado).length;
    const cerrados = tickets.filter(t => !t.estado).length;

    this.barChartData = {
      ...this.barChartData,
      datasets: [{
        ...this.barChartData.datasets[0],
        data: [nuevos, asignados, enProceso, resueltos, cerrados]
      }]
    };

    // Distribución por prioridad para ApexCharts - CORREGIDO
    const critica = tickets.filter(t => t.prioridad?.nivel && t.prioridad.nivel >= 4).length;
    const alta = tickets.filter(t => t.prioridad?.nivel && t.prioridad.nivel === 3).length;
    const media = tickets.filter(t => t.prioridad?.nivel && t.prioridad.nivel === 2).length;
    const baja = tickets.filter(t => !t.prioridad?.nivel || t.prioridad.nivel <= 1).length;

    this.pieChartOptions.series = [critica, alta, media, baja];
  }

  private async loadUsuariosData() {
    try {
      const usuariosResponse = await this.usuariosService.lista().toPromise();
      console.log('👥 Respuesta de usuarios:', usuariosResponse);
      
      if (usuariosResponse?.isSuccess && usuariosResponse.data) {
        const usuarios: UsuarioInterface[] = usuariosResponse.data;
        this.stats.usuariosActivos = usuarios.filter(u => u.activo && !u.eliminado).length;
        
        // Calcular SLA cumplido basado en tickets resueltos a tiempo
        const ticketsResponse = await this.ticketsService.lista().toPromise();
        if (ticketsResponse?.isSuccess && ticketsResponse.data) {
          const tickets: TicketInterface[] = ticketsResponse.data;
          const ticketsResueltosATiempo = tickets.filter(t => 
            t.fecha_resolucion && this.verificarSLACumplido(t)
          ).length;
          
          this.stats.slaCumplido = ticketsResueltosATiempo > 0 ? 
            Math.round((ticketsResueltosATiempo / this.stats.ticketsResueltos) * 100) : 0;
        }
      }
    } catch (error) {
      console.error('❌ Error cargando usuarios:', error);
    }
  }

  private verificarSLACumplido(ticket: TicketInterface): boolean {
    if (!ticket.fecha_resolucion || !ticket.sla?.tiempo_resolucion) return false;
    
    const fechaCreacion = new Date(ticket.fecha_creacion);
    const fechaResolucion = new Date(ticket.fecha_resolucion);
    const horasTranscurridas = (fechaResolucion.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
    
    return horasTranscurridas <= ticket.sla.tiempo_resolucion;
  }

  private async loadContratosData() {
    try {
      const contratosResponse = await this.contratosService.lista().toPromise();
      console.log('📑 Respuesta de contratos:', contratosResponse);
      
      if (contratosResponse?.isSuccess && contratosResponse.data) {
        const contratos: ContratoInterface[] = contratosResponse.data;
        
        // Contratos próximos a vencer (próximos 30 días)
        const hoy = new Date();
        const en30Dias = new Date();
        en30Dias.setDate(hoy.getDate() + 30);
        
        this.contratosProximos = contratos
          .filter(contrato => {
            const fechaFin = new Date(contrato.fecha_fin);
            return fechaFin > hoy && fechaFin <= en30Dias && 
                  (contrato.estado_contrato === 'VIGENTE' || contrato.estado_contrato === 'RENOVADO');
          })
          .sort((a, b) => new Date(a.fecha_fin).getTime() - new Date(b.fecha_fin).getTime())
          .slice(0, 5);
        
        this.stats.contratosProximosVencer = this.contratosProximos.length;
      }
    } catch (error) {
      console.error('❌ Error cargando contratos:', error);
    }
  }

  private async loadEntidadesData() {
    try {
      const entidadesResponse = await this.entidadesService.lista().toPromise();
      console.log('🏢 Respuesta de entidades:', entidadesResponse);
      
      if (entidadesResponse?.isSuccess && entidadesResponse.data) {
        const entidades: EntidadInterface[] = entidadesResponse.data;
        this.stats.entidadesActivas = entidades.filter(e => e.estado && !e.eliminado).length;
      }
    } catch (error) {
      console.error('❌ Error cargando entidades:', error);
    }
  }

  private updateCharts() {
    // Actualizar datos mensuales basados en tickets reales
    const datosMensuales = this.calcularTicketsPorMes();
    this.chartOptions.series = [{
      name: 'Tickets',
      data: datosMensuales
    }];
  }

  private calcularTicketsPorMes(): number[] {
    const meses = Array(12).fill(0);
    const anioActual = new Date().getFullYear();
    
    this.ticketsRecientes.forEach(ticket => {
      const fecha = new Date(ticket.fecha_creacion);
      if (fecha.getFullYear() === anioActual) {
        meses[fecha.getMonth()]++;
      }
    });
    
    return meses;
  }

  // CALENDARIO
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
      
      // Contar tickets para este día usando datos reales
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
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  private countTicketsForDate(date: Date): number {
    return this.ticketsRecientes.filter(ticket => {
      const ticketDate = new Date(ticket.fecha_creacion);
      return ticketDate.toDateString() === date.toDateString();
    }).length;
  }

  private getTicketsForDate(date: Date): TicketInterface[] {
    return this.ticketsRecientes.filter(ticket => {
      const ticketDate = new Date(ticket.fecha_creacion);
      return ticketDate.toDateString() === date.toDateString();
    });
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

  // NAVEGACIÓN
  navigateToTickets(): void {
    this.router.navigate(['/ticket']);
  }

  navigateToUsers(): void {
    this.router.navigate(['/usuarios']);
  }

  navigateToContracts(): void {
    this.router.navigate(['/contratos']);
  }

  navigateToTicketDetail(ticketId: number): void {
    this.router.navigate(['/ticket', ticketId]);
  }

  assignTechnician(ticketId: number): void {
    this.router.navigate(['/ticket', ticketId], { queryParams: { assign: true } });
  }

  // REPORTES
  openReportModal(): void {
    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  async generateReport(): Promise<void> {
    try {
      if (this.reportType === 'pdf') {
        await this.generatePDFReport();
      } else {
        await this.generateExcelReport();
      }
      
      this.closeReportModal();
      
      // Mostrar mensaje de éxito
      this.showSuccessMessage(`Reporte ${this.reportType.toUpperCase()} generado exitosamente`);
      
    } catch (error) {
      console.error('Error generando reporte:', error);
      this.showErrorMessage('Error al generar el reporte');
    }
  }

  private async generatePDFReport(): Promise<void> {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(20);
    doc.text('Reporte de Dashboard', 105, 20, { align: 'center' });
    
    // Fecha del reporte
    doc.setFontSize(12);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, 105, 30, { align: 'center' });
    
    // Estadísticas
    doc.setFontSize(16);
    doc.text('Estadísticas Principales', 20, 50);
    
    const statsData = [
      ['Total Tickets', this.stats.totalTickets.toString()],
      ['Tickets Abiertos', this.stats.ticketsAbiertos.toString()],
      ['Tickets Resueltos', this.stats.ticketsResueltos.toString()],
      ['Tickets Sin Asignar', this.stats.ticketsSinAsignar.toString()],
      ['SLA Cumplido', this.stats.slaCumplido + '%'],
      ['Usuarios Activos', this.stats.usuariosActivos.toString()],
      ['Entidades Activas', this.stats.entidadesActivas.toString()],
      ['Tickets Este Mes', this.stats.ticketsEsteMes.toString()]
    ];
    
    autoTable(doc, {
      startY: 55,
      head: [['Métrica', 'Valor']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    // Tickets Recientes
    doc.setFontSize(16);
    doc.text('Tickets Recientes', 20, (doc as any).lastAutoTable.finalY + 20);
    
    const ticketsData = this.ticketsRecientes.map(ticket => [
      `#${ticket.id}`,
      ticket.titulo.substring(0, 30) + (ticket.titulo.length > 30 ? '...' : ''),
      this.getTicketEstado(ticket),
      ticket.prioridad?.nombre || 'Sin prioridad',
      new Date(ticket.fecha_creacion).toLocaleDateString('es-ES')
    ]);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 25,
      head: [['ID', 'Título', 'Estado', 'Prioridad', 'Fecha']],
      body: ticketsData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`reporte-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  private async generateExcelReport(): Promise<void> {
    // Implementar generación de Excel
    alert('Funcionalidad de Excel en desarrollo');
  }

  // MÉTODOS AUXILIARES
  getTicketEstado(ticket: TicketInterface): string {
    if (!ticket.estado) return 'Eliminado';
    if (ticket.fecha_resolucion) return 'Resuelto';
    if (ticket.tecnico_id) return 'Asignado';
    return 'Nuevo';
  }

  getTicketEstadoColor(estado: string): string {
    switch (estado) {
      case 'Nuevo': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Asignado': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'En Proceso': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'Resuelto': return 'bg-green-100 text-green-800 border border-green-200';
      case 'Cerrado': return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'Eliminado': return 'bg-red-100 text-red-800 border border-red-200';
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

  getDiasRestantes(fechaFin: string): number {
    const fin = new Date(fechaFin);
    const hoy = new Date();
    const diffTime = fin.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getContratoEstadoColor(estado: string): string {
    switch (estado) {
      case 'VIGENTE': return 'bg-green-100 text-green-800 border border-green-200';
      case 'RENOVADO': return 'bg-green-100 text-green-800 border border-green-200';
      case 'PENDIENTE_FIRMA': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'SUSPENDIDO': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'FINALIZADO': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  refreshData() {
    this.loadDashboardData();
  }

  private showSuccessMessage(message: string): void {
    // Puedes implementar toast notifications aquí
    alert(message);
  }

  private showErrorMessage(message: string): void {
    alert(message);
  }
}