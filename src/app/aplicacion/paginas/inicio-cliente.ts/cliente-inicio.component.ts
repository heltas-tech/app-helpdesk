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
    tiempoRespuesta: '0h 0m',
    slaCumplido: 0
  };

  // Tickets reales del cliente
  ticketsRecientes: any[] = [];
  notificaciones: any[] = [];

  // Opciones para gráficos ApexCharts
  public donutChartOptions: any = {
    series: [0, 0, 0, 0],
    chart: {
      type: 'donut',
      height: 350,
      animations: {
        enabled: true,
        speed: 800
      }
    },
    labels: ['Resueltos', 'En Proceso', 'Abiertos', 'Urgentes'],
    colors: ['#4CAF50', '#FF9800', '#F44336', '#9C27B0'],
    responsive: [{
      breakpoint: 480,
      options: {
        chart: {
          width: 200
        },
        legend: {
          position: 'bottom'
        }
      }
    }],
    legend: {
      position: 'bottom',
      fontSize: '14px'
    },
    title: {
      text: 'Distribución de Mis Tickets',
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total',
              fontSize: '16px',
              fontWeight: 'bold'
            }
          }
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: any, opts: any) {
        return opts.w.config.series[opts.seriesIndex] + ' tickets';
      }
    }
  };

  public barChartOptions: any = {
    series: [{
      name: 'Mis Tickets',
      data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }],
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false
      }
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '60%',
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      offsetY: -20,
      style: {
        fontSize: '12px',
        colors: ['#304758']
      }
    },
    xaxis: {
      categories: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      title: {
        text: 'Cantidad de Tickets'
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'light',
        type: 'vertical',
        shadeIntensity: 0.5,
        gradientToColors: ['#2196F3'],
        inverseColors: false,
        opacityFrom: 0.8,
        opacityTo: 0.2,
      }
    },
    title: {
      text: 'Mis Tickets por Mes',
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    }
  };

  public radialChartOptions: any = {
    series: [0],
    chart: {
      height: 300,
      type: 'radialBar',
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: '70%',
        },
        dataLabels: {
          show: true,
          name: {
            show: true,
            fontSize: '16px',
            fontWeight: 'bold',
            offsetY: -10
          },
          value: {
            show: true,
            fontSize: '24px',
            fontWeight: 'bold',
            offsetY: 5,
            formatter: function (val: any) {
              return val + '%';
            }
          }
        }
      }
    },
    colors: ['#4CAF50'],
    labels: ['Satisfacción'],
    title: {
      text: 'Mi Satisfacción',
      align: 'center',
      style: {
        fontSize: '16px',
        fontWeight: 'bold'
      }
    }
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
      // ✅ CORRECCIÓN: Usar el método específico para tickets del cliente
      const ticketsResponse = await this.ticketsService.listaMisTicketsCliente().toPromise();
      
      if (ticketsResponse?.isSuccess && ticketsResponse.data) {
        const ticketsCliente = ticketsResponse.data;
        
        console.log('✅ Tickets del cliente cargados:', ticketsCliente.length);
        console.log('📋 Estructura de tickets:', ticketsCliente.map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          estado: t.estado,
          fecha_resolucion: t.fecha_resolucion,
          tecnico_id: t.tecnico_id,
          prioridad: t.prioridad
        })));

        this.calcularMetricas(ticketsCliente);
        this.cargarTicketsRecientes(ticketsCliente);
        this.cargarNotificaciones(ticketsCliente);
        this.actualizarGraficos();
      } else {
        console.log('⚠️ No se pudieron cargar los tickets:', ticketsResponse);
        // Cargar datos de demostración si no hay tickets reales
        this.cargarDatosDeDemostracion();
      }
      
    } catch (error) {
      console.error('❌ Error cargando datos del dashboard:', error);
      // Cargar datos de demostración en caso de error
      this.cargarDatosDeDemostracion();
    } finally {
      this.isLoading = false;
    }
  }

  private calcularMetricas(tickets: any[]) {
    console.log('📊 Calculando métricas para:', tickets.length, 'tickets');
    
    // Tickets resueltos (con fecha_resolucion)
    this.metricas.ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion).length;
    
    // Tickets en proceso (sin fecha_resolucion PERO con técnico asignado)
    this.metricas.ticketsEnProceso = tickets.filter((t: any) => 
      !t.fecha_resolucion && t.tecnico_id
    ).length;
    
    // Tickets abiertos (sin fecha_resolucion Y sin técnico asignado)
    this.metricas.ticketsAbiertos = tickets.filter((t: any) => 
      !t.fecha_resolucion && !t.tecnico_id
    ).length;
    
    // Tickets urgentes (prioridad alta - nivel 3 o superior)
    this.metricas.ticketsUrgentes = tickets.filter((t: any) => 
      t.prioridad?.nivel && t.prioridad.nivel >= 3
    ).length;

    console.log('🎯 Métricas calculadas:', {
      resueltos: this.metricas.ticketsResueltos,
      enProceso: this.metricas.ticketsEnProceso, 
      abiertos: this.metricas.ticketsAbiertos,
      urgentes: this.metricas.ticketsUrgentes
    });

    // Calcular tiempos promedios
    this.calcularTiemposPromedio(tickets);
    
    // Calcular satisfacción (basada en tickets resueltos vs totales)
    const totalTickets = tickets.length;
    this.metricas.satisfaccion = totalTickets > 0 ? 
      Math.round((this.metricas.ticketsResueltos / totalTickets) * 100) : 0;

    // SLA cumplido (basado en tickets resueltos en menos de 7 días)
    this.metricas.slaCumplido = this.calcularSLACumplido(tickets);
  }

  private calcularTiemposPromedio(tickets: any[]) {
    
  const ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion);
  
  if (ticketsResueltos.length > 0) {
    let totalDias = 0;
    let totalHoras = 0;
    let ticketsConTiempoValido = 0;
    
    ticketsResueltos.forEach((ticket: any) => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      
      // ✅ VERIFICAR que las fechas sean válidas y en orden correcto
      if (creado instanceof Date && !isNaN(creado.getTime()) && 
          resuelto instanceof Date && !isNaN(resuelto.getTime()) &&
          resuelto > creado) {
        
        const diffMs = resuelto.getTime() - creado.getTime();
        const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffHoras = Math.ceil(diffMs / (1000 * 60 * 60));
        
        totalDias += diffDias;
        totalHoras += diffHoras;
        ticketsConTiempoValido++;
        
        console.log(`📅 Ticket ${ticket.id}: ${diffDias} días (${creado.toISOString()} -> ${resuelto.toISOString()})`);
      } else {
        console.warn(`⚠️ Fechas inválidas en ticket ${ticket.id}:`, {
          creado: ticket.fecha_creacion,
          resuelto: ticket.fecha_resolucion
        });
      }
    });
    
    if (ticketsConTiempoValido > 0) {
      const promedioDias = Math.round(totalDias / ticketsConTiempoValido);
      const promedioHoras = Math.round(totalHoras / ticketsConTiempoValido);
      
      this.metricas.tiempoPromedio = `${promedioDias} días`;
      this.metricas.tiempoRespuesta = `${Math.floor(promedioHoras / 24)}d ${promedioHoras % 24}h`;
      
      console.log('⏱️ Tiempos calculados:', {
        ticketsValidos: ticketsConTiempoValido,
        promedioDias,
        promedioHoras
      });
    } else {
      this.metricas.tiempoPromedio = '0 días';
      this.metricas.tiempoRespuesta = '0h 0m';
    }
  } else {
    this.metricas.tiempoPromedio = '0 días';
    this.metricas.tiempoRespuesta = '0h 0m';
  }
}

  private calcularSLACumplido(tickets: any[]): number {
    const ticketsResueltos = tickets.filter((t: any) => t.fecha_resolucion);
    
    if (ticketsResueltos.length === 0) return 0;
    
    const ticketsEnSLA = ticketsResueltos.filter((ticket: any) => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      const diffDias = Math.ceil((resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60 * 24));
      return diffDias <= 7; // SLA de 7 días
    });
    
    return Math.round((ticketsEnSLA.length / ticketsResueltos.length) * 100);
  }

  private cargarTicketsRecientes(tickets: any[]) {
    this.ticketsRecientes = tickets
      .sort((a: any, b: any) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
      .slice(0, 5)
      .map((ticket: any) => ({
        id: `TKT-${ticket.id.toString().padStart(3, '0')}`,
        titulo: ticket.titulo,
        estado: this.getEstadoTicket(ticket),
        fecha: ticket.fecha_creacion,
        prioridad: this.getPrioridadTexto(ticket.prioridad?.nivel),
        categoria: ticket.categoria?.nombre || 'General',
        tiempoTranscurrido: this.getTiempoTranscurrido(ticket.fecha_creacion),
        ticketOriginal: ticket
      }));

    console.log('📋 Tickets recientes cargados:', this.ticketsRecientes.length);
  }

  private cargarNotificaciones(tickets: any[]) {
    this.notificaciones = [];
    
    // Notificación por tickets urgentes
    if (this.metricas.ticketsUrgentes > 0) {
      this.notificaciones.push({
        tipo: 'warning',
        mensaje: `Tienes ${this.metricas.ticketsUrgentes} ticket(s) urgente(s) pendientes`,
        fecha: 'Ahora'
      });
    }

    // Notificación por tickets recién asignados
    const ticketsRecientesAsignados = tickets.filter((t: any) => 
      t.tecnico_id && 
      !t.fecha_resolucion &&
      new Date(t.fecha_creacion).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );

    if (ticketsRecientesAsignados.length > 0) {
      this.notificaciones.push({
        tipo: 'info',
        mensaje: `${ticketsRecientesAsignados.length} ticket(s) asignados recientemente a técnicos`,
        fecha: 'Hoy'
      });
    }

    // Notificación por tickets resueltos recientemente
    const ticketsResueltosHoy = tickets.filter((t: any) => 
      t.fecha_resolucion && 
      new Date(t.fecha_resolucion).toDateString() === new Date().toDateString()
    );

    if (ticketsResueltosHoy.length > 0) {
      this.notificaciones.push({
        tipo: 'success',
        mensaje: `${ticketsResueltosHoy.length} ticket(s) resuelto(s) hoy`,
        fecha: 'Reciente'
      });
    }

    // Notificación por defecto si no hay otras
    if (this.notificaciones.length === 0 && tickets.length === 0) {
      this.notificaciones.push({
        tipo: 'info',
        mensaje: 'Bienvenido a tu centro de soporte. Crea tu primer ticket para comenzar.',
        fecha: 'Ahora'
      });
    } else if (this.notificaciones.length === 0) {
      this.notificaciones.push({
        tipo: 'info',
        mensaje: 'Todo está al día. No tienes notificaciones pendientes.',
        fecha: 'Ahora'
      });
    }

    console.log('🔔 Notificaciones cargadas:', this.notificaciones.length);
  }

  private actualizarGraficos() {
    // Actualizar gráfico de donut
    this.donutChartOptions.series = [
      this.metricas.ticketsResueltos,
      this.metricas.ticketsEnProceso,
      this.metricas.ticketsAbiertos,
      this.metricas.ticketsUrgentes
    ];

    // Actualizar gráfico radial
    this.radialChartOptions.series = [this.metricas.satisfaccion];

    // Generar datos mensuales para gráfico de barras
    this.generarDatosMensuales();

    console.log('📈 Gráficos actualizados:', {
      donut: this.donutChartOptions.series,
      radial: this.radialChartOptions.series
    });
  }

  private generarDatosMensuales() {
    const datosMensuales = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    // Contar tickets por mes del año actual
    const añoActual = new Date().getFullYear();
    
    this.ticketsRecientes.forEach((ticket: any) => {
      const fecha = new Date(ticket.fecha);
      if (fecha.getFullYear() === añoActual) {
        const mes = fecha.getMonth();
        datosMensuales[mes] = (datosMensuales[mes] || 0) + 1;
      }
    });
    
    this.barChartOptions.series = [{ name: 'Mis Tickets', data: datosMensuales }];
  }

  // Datos de demostración para cuando no hay tickets reales
  private cargarDatosDeDemostracion() {
    console.log('🎭 Cargando datos de demostración...');
    
    this.metricas = {
      ticketsAbiertos: 2,
      ticketsResueltos: 5,
      ticketsEnProceso: 1,
      ticketsUrgentes: 1,
      tiempoPromedio: '2 días',
      satisfaccion: 83,
      tiempoRespuesta: '1d 4h',
      slaCumplido: 92
    };

    this.ticketsRecientes = [
      {
        id: 'TKT-001',
        titulo: 'Problema con acceso al sistema',
        estado: 'Resuelto',
        fecha: new Date().toISOString(),
        prioridad: 'Alta',
        categoria: 'Acceso',
        tiempoTranscurrido: 'Hace 2 días'
      },
      {
        id: 'TKT-002', 
        titulo: 'Consulta sobre facturación',
        estado: 'En Proceso',
        fecha: new Date().toISOString(),
        prioridad: 'Media',
        categoria: 'Facturación',
        tiempoTranscurrido: 'Hoy'
      },
      {
        id: 'TKT-003',
        titulo: 'Error en reporte mensual',
        estado: 'Abierto',
        fecha: new Date().toISOString(),
        prioridad: 'Baja',
        categoria: 'Reportes',
        tiempoTranscurrido: 'Hace 1 día'
      }
    ];

    this.notificaciones = [
      {
        tipo: 'info',
        mensaje: 'Estos son datos de demostración. Crea tickets reales para ver tu información.',
        fecha: 'Demo'
      }
    ];

    this.actualizarGraficos();
  }

  // Métodos auxiliares
  private getEstadoTicket(ticket: any): string {
    if (ticket.fecha_resolucion) return 'Resuelto';
    if (ticket.tecnico_id) return 'En Proceso';
    return 'Abierto';
  }

  private getPrioridadTexto(nivel?: number): string {
    if (!nivel) return 'Normal';
    if (nivel >= 4) return 'Crítica';
    if (nivel >= 3) return 'Alta';
    if (nivel >= 2) return 'Media';
    return 'Baja';
  }

  private getTiempoTranscurrido(fecha: string): string {
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

  getEstadoColor(estado: string): string {
    switch (estado) {
      case 'Resuelto': return 'primary';
      case 'En Proceso': return 'accent';
      case 'Abierto': return 'warn';
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
      default: return '';
    }
  }

  getNotificacionIcon(tipo: string): string {
    switch (tipo) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      default: return 'notifications';
    }
  }

  // Método para recargar datos
  refreshData() {
    this.loadDashboardData();
  }

  // Método para debug MEJORADO
  debugDashboard() {
    console.log('🐛 DEBUG CLIENTE DETALLADO:');
    console.log('👤 Usuario:', this.usuario);
    console.log('📊 Métricas:', this.metricas);
    console.log('📋 Tickets recientes:', this.ticketsRecientes);
    console.log('🔔 Notificaciones:', this.notificaciones);
    
    // Debug adicional de tickets
    this.ticketsService.listaMisTicketsCliente().subscribe({
      next: (res: any) => {
        if (res.isSuccess && res.data) {
          console.log('🎯 TICKETS REALES DEL CLIENTE:');
          console.log('Cantidad total:', res.data.length);
          console.log('Ejemplos:', res.data.slice(0, 3).map((t: any) => ({
            id: t.id,
            titulo: t.titulo,
            estado: t.estado,
            fecha_resolucion: t.fecha_resolucion,
            tecnico_id: t.tecnico_id,
            prioridad: t.prioridad?.nivel
          })));
        } else {
          console.log('❌ No se pudieron obtener tickets para debug');
        }
      },
      error: (err) => {
        console.error('❌ Error obteniendo tickets para debug:', err);
      }
    });
  }
}