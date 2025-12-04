import { Injectable } from '@angular/core';

export interface SlaEstado {
  estado: 'DENTRO_TIEMPO' | 'POR_VENCER' | 'VENCIDO' | 'SIN_SLA';
  color: string;
  icono: string;
  texto: string;
  porcentaje: number;
  tiempoRestante?: string;
  fechaLimite?: Date;
  horasRestantes?: number;
  fuenteTiempo?: 'SLA' | 'PRIORIDAD' | 'DEFAULT';
}

@Injectable({
  providedIn: 'root'
})
export class SlaCalculatorService {

  constructor() { }

  /**
   * Calcula el estado del SLA considerando SLA y Prioridad
   */
  calcularEstadoSLA(ticket: any): SlaEstado {
    // 1. Obtener el tiempo de resolución CORRECTO según las reglas de negocio
    const { tiempoResolucionMinutos, fuente } = this.obtenerTiempoResolucionCorrecto(ticket);
    
    if (!tiempoResolucionMinutos) {
      return this.crearEstadoSLA('SIN_SLA', 0, undefined, 0, 'DEFAULT');
    }

    // 2. Validar fecha de creación
    if (!ticket.fecha_creacion) {
      console.warn('Ticket sin fecha de creación:', ticket.id);
      return this.crearEstadoSLA('SIN_SLA', 0, undefined, 0, fuente);
    }

    const fechaCreacion = new Date(ticket.fecha_creacion);
    const ahora = new Date();
    
    // 3. Validar fecha futura
    if (fechaCreacion > ahora) {
      console.warn('Ticket con fecha futura:', ticket.id, ticket.fecha_creacion);
      return this.crearEstadoSLA('SIN_SLA', 0, undefined, 0, fuente);
    }
    
    // 4. Calcular fecha límite y progreso
    const fechaLimite = new Date(fechaCreacion.getTime() + tiempoResolucionMinutos * 60 * 1000);
    
    const tiempoTotalMs = tiempoResolucionMinutos * 60 * 1000;
    const tiempoTranscurridoMs = ahora.getTime() - fechaCreacion.getTime();
    const porcentaje = Math.min(100, (tiempoTranscurridoMs / tiempoTotalMs) * 100);
    
    // 5. Calcular tiempo restante en HORAS
    const horasRestantes = (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    
    // 6. Determinar estado según el tiempo restante
    let estado: string;
    
    if (horasRestantes <= 0) {
      estado = 'VENCIDO';
    } else if (horasRestantes <= 24) {
      estado = 'POR_VENCER';
    } else {
      estado = 'DENTRO_TIEMPO';
    }

    return this.crearEstadoSLA(
      estado as any, 
      porcentaje, 
      fechaLimite, 
      horasRestantes, 
      fuente
    );
  }

  /**
   * Obtiene el tiempo correcto según reglas de negocio
   */
  private obtenerTiempoResolucionCorrecto(ticket: any): { 
    tiempoResolucionMinutos: number | null; 
    fuente: 'SLA' | 'PRIORIDAD' | 'DEFAULT' 
  } {
    // REGLA 1: Si el ticket tiene SLA específico, usar SUS tiempos
    if (ticket.sla?.tiempo_resolucion) {
      return { 
        tiempoResolucionMinutos: ticket.sla.tiempo_resolucion, 
        fuente: 'SLA' 
      };
    }
    
    // REGLA 2: Si no hay SLA, usar tiempos de la PRIORIDAD del ticket
    if (ticket.prioridad?.tiempo_resolucion) {
      return { 
        tiempoResolucionMinutos: ticket.prioridad.tiempo_resolucion, 
        fuente: 'PRIORIDAD' 
      };
    }
    
    // REGLA 3: Valor por defecto (72 horas = 4320 minutos)
    return { 
      tiempoResolucionMinutos: 4320,
      fuente: 'DEFAULT' 
    };
  }

  /**
   * Crea el estado del SLA con información completa
   */
  private crearEstadoSLA(
    estado: 'DENTRO_TIEMPO' | 'POR_VENCER' | 'VENCIDO' | 'SIN_SLA',
    porcentaje: number,
    fechaLimite?: Date,
    horasRestantes?: number,
    fuente?: 'SLA' | 'PRIORIDAD' | 'DEFAULT'
  ): SlaEstado {
    const baseEstado = {
      porcentaje,
      fechaLimite,
      horasRestantes: horasRestantes || 0,
      fuenteTiempo: fuente
    };

    switch (estado) {
      case 'VENCIDO':
        return {
          ...baseEstado,
          estado: 'VENCIDO',
          color: 'red',
          icono: 'error',
          texto: 'SLA Vencido',
          tiempoRestante: 'Vencido'
        };
      case 'POR_VENCER':
        return {
          ...baseEstado,
          estado: 'POR_VENCER',
          color: 'orange',
          icono: 'warning',
          texto: 'Por vencer',
          tiempoRestante: this.formatearTiempoRestante(horasRestantes! * 60)
        };
      case 'DENTRO_TIEMPO':
        return {
          ...baseEstado,
          estado: 'DENTRO_TIEMPO',
          color: 'green',
          icono: 'check_circle',
          texto: 'En tiempo',
          tiempoRestante: this.formatearTiempoRestante(horasRestantes! * 60)
        };
      default:
        return {
          ...baseEstado,
          estado: 'SIN_SLA',
          color: 'gray',
          icono: 'schedule',
          texto: 'Sin SLA',
          tiempoRestante: 'No definido'
        };
    }
  }

  /**
   * Convierte minutos a formato legible
   */
  private formatearTiempoRestante(minutos: number): string {
    if (minutos < 60) {
      return `${Math.floor(minutos)}m`;
    } else if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      const minutosRestantes = Math.floor(minutos % 60);
      return minutosRestantes > 0 ? `${horas}h ${minutosRestantes}m` : `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      const horas = Math.floor((minutos % 1440) / 60);
      return horas > 0 ? `${dias}d ${horas}h` : `${dias}d`;
    }
  }

  /**
   * Ordena tickets por urgencia de SLA
   */
  ordenarTicketsPorSLA(tickets: any[]): any[] {
    return [...tickets].sort((a, b) => {
      const estadoA = this.calcularEstadoSLA(a);
      const estadoB = this.calcularEstadoSLA(b);
      
      const prioridad = {
        'VENCIDO': 1,
        'POR_VENCER': 2,
        'DENTRO_TIEMPO': 3,
        'SIN_SLA': 4
      };
      
      if (prioridad[estadoA.estado] !== prioridad[estadoB.estado]) {
        return prioridad[estadoA.estado] - prioridad[estadoB.estado];
      }
      
      if (estadoA.fechaLimite && estadoB.fechaLimite) {
        return estadoA.fechaLimite.getTime() - estadoB.fechaLimite.getTime();
      }
      
      return 0;
    });
  }

  /**
   * Filtra tickets por estado de SLA
   */
  filtrarTicketsPorSLA(tickets: any[], estado: string): any[] {
    return tickets.filter(ticket => {
      const slaEstado = this.calcularEstadoSLA(ticket);
      return slaEstado.estado === estado;
    });
  }

  /**
   * Obtiene estadísticas de SLA para el dashboard
   */
  obtenerEstadisticasSLA(tickets: any[]): {
    total: number;
    vencidos: number;
    porVencer: number;
    enTiempo: number;
    sinSLA: number;
    porcentajeCumplimiento: number;
  } {
    const estadisticas = {
      total: tickets.length,
      vencidos: 0,
      porVencer: 0,
      enTiempo: 0,
      sinSLA: 0,
      porcentajeCumplimiento: 0
    };

    tickets.forEach(ticket => {
      const estado = this.calcularEstadoSLA(ticket);
      switch (estado.estado) {
        case 'VENCIDO': estadisticas.vencidos++; break;
        case 'POR_VENCER': estadisticas.porVencer++; break;
        case 'DENTRO_TIEMPO': estadisticas.enTiempo++; break;
        case 'SIN_SLA': estadisticas.sinSLA++; break;
      }
    });

    // Calcular porcentaje de cumplimiento (excluyendo tickets sin SLA)
    const ticketsConSLA = estadisticas.total - estadisticas.sinSLA;
    if (ticketsConSLA > 0) {
      estadisticas.porcentajeCumplimiento = Math.round(
        (estadisticas.enTiempo / ticketsConSLA) * 100
      );
    }

    return estadisticas;
  }

  /**
   * Verifica si un ticket está próximo a vencer
   */
  estaProximoAVencer(ticket: any): boolean {
    const estado = this.calcularEstadoSLA(ticket);
    return estado.estado === 'POR_VENCER' && estado.horasRestantes! <= 12;
  }

  /**
   * Obtiene el color para mostrar en el dashboard
   */
  getColorSLA(estado: string): string {
    switch (estado) {
      case 'VENCIDO': return '#ef4444';
      case 'POR_VENCER': return '#f97316';
      case 'DENTRO_TIEMPO': return '#22c55e';
      default: return '#6b7280';
    }
  }

  /**
   * Obtiene el icono para mostrar en el dashboard
   */
  getIconoSLA(estado: string): string {
    switch (estado) {
      case 'VENCIDO': return '⏰❌';
      case 'POR_VENCER': return '⏰⚠️';
      case 'DENTRO_TIEMPO': return '⏰✅';
      default: return '⏰';
    }
  }
}