import { Injectable, inject } from '@angular/core';

export interface SlaEstado {
  estado: 'DENTRO_TIEMPO' | 'POR_VENCER' | 'VENCIDO' | 'SIN_SLA';
  color: string;
  icono: string;
  texto: string;
  porcentaje: number;
  tiempoRestante?: string;
  fechaLimite?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SlaCalculatorService {

  constructor() { }

  /**
   * Calcula el estado del SLA basado en la prioridad del ticket
   */
  calcularEstadoSLA(ticket: any): SlaEstado {
    // DEBUG: Ver qué datos llegan del ticket
    console.log('🔍 Calculando SLA para ticket:', {
      id: ticket.id,
      titulo: ticket.titulo,
      fecha_creacion: ticket.fecha_creacion,
      prioridad: ticket.prioridad
    });

    // Validar que el ticket tenga los datos necesarios
    if (!ticket.fecha_creacion || !ticket.prioridad) {
      return {
        estado: 'SIN_SLA',
        color: 'gray',
        icono: 'schedule',
        texto: 'Sin SLA',
        porcentaje: 0
      };
    }

    const fechaCreacion = new Date(ticket.fecha_creacion);
    const ahora = new Date();
    
    // Obtener tiempos de la prioridad (en MINUTOS)
    const tiempoResolucionMinutos = ticket.prioridad.tiempo_resolucion || 4320; // 72h por defecto
    
    // Calcular fecha límite
    const fechaLimite = new Date(fechaCreacion.getTime() + tiempoResolucionMinutos * 60 * 1000);
    
    // Calcular progreso
    const tiempoTotalMs = tiempoResolucionMinutos * 60 * 1000;
    const tiempoTranscurridoMs = ahora.getTime() - fechaCreacion.getTime();
    const porcentaje = Math.min(100, (tiempoTranscurridoMs / tiempoTotalMs) * 100);
    
    // Calcular tiempo restante en minutos
    const minutosRestantes = (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60);
    
    // Determinar estado según el tiempo restante
    let estado: SlaEstado;
    
    if (minutosRestantes <= 0) {
      // SLA VENCIDO
      estado = {
        estado: 'VENCIDO',
        color: 'red',
        icono: 'error',
        texto: 'SLA Vencido',
        porcentaje: 100,
        tiempoRestante: 'Vencido',
        fechaLimite
      };
    } else if (minutosRestantes <= 1440) { // 24 horas
      // POR VENCER (menos de 24h)
      estado = {
        estado: 'POR_VENCER',
        color: 'orange',
        icono: 'warning',
        texto: 'Por vencer',
        porcentaje,
        tiempoRestante: this.formatearTiempoRestante(minutosRestantes),
        fechaLimite
      };
    } else {
      // DENTRO DEL TIEMPO
      estado = {
        estado: 'DENTRO_TIEMPO',
        color: 'green',
        icono: 'check_circle',
        texto: 'En tiempo',
        porcentaje,
        tiempoRestante: this.formatearTiempoRestante(minutosRestantes),
        fechaLimite
      };
    }
    
    console.log('✅ Estado calculado:', estado);
    return estado;
  }

  /**
   * Convierte minutos a formato legible (2d 5h, 3h 30m, 45m)
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
   * Ordena tickets por urgencia de SLA (vencidos primero)
   */
  ordenarTicketsPorSLA(tickets: any[]): any[] {
    return [...tickets].sort((a, b) => {
      const estadoA = this.calcularEstadoSLA(a);
      const estadoB = this.calcularEstadoSLA(b);
      
      // Prioridad: Vencidos > Por vencer > En tiempo > Sin SLA
      const prioridad = {
        'VENCIDO': 1,
        'POR_VENCER': 2,
        'DENTRO_TIEMPO': 3,
        'SIN_SLA': 4
      };
      
      // Primero por estado
      if (prioridad[estadoA.estado] !== prioridad[estadoB.estado]) {
        return prioridad[estadoA.estado] - prioridad[estadoB.estado];
      }
      
      // Si mismo estado, por fecha límite más cercana
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
}