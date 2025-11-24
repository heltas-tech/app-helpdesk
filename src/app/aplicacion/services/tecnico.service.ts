import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TicketsService } from './ticket.service';
import { TecnicoStats } from '../interfaces/tecnico.interface';

@Injectable({
  providedIn: 'root'
})
export class TecnicoService {
  private ticketsService = inject(TicketsService);

  // Obtener estadísticas del técnico - ACTUALIZADO
  getEstadisticas(tecnicoId: number): Observable<TecnicoStats> {
    return this.ticketsService.listaActivos().pipe(
      map((res: any) => {
        if (!res.isSuccess || !res.data) {
          return this.getStatsDefault();
        }

        const todosTickets = res.data || [];
        const ticketsTecnico = todosTickets.filter((ticket: any) => 
          ticket.tecnico_id === tecnicoId
        );

        console.log('🔍 TecnicoService - Tickets del técnico:', {
          tecnicoId,
          totalTickets: todosTickets.length,
          ticketsTecnico: ticketsTecnico.length,
          tickets: ticketsTecnico.map((t: any) => ({ id: t.id, titulo: t.titulo, tecnico_id: t.tecnico_id }))
        });

        return this.calcularEstadisticas(ticketsTecnico);
      }),
      catchError((error) => {
        console.error('❌ Error en TecnicoService:', error);
        return [this.getStatsDefault()];
      })
    );
  }

  // Obtener tickets asignados al técnico - CORREGIDO
  getTicketsAsignados(tecnicoId: number): Observable<any[]> {
    return this.ticketsService.listaActivos().pipe(
      map((res: any) => {
        if (!res.isSuccess || !res.data) {
          console.log('❌ No hay datos en la respuesta');
          return [];
        }
        
        const tickets = (res.data || [])
          .filter((ticket: any) => ticket.tecnico_id === tecnicoId && !ticket.fecha_resolucion)
          .sort((a: any, b: any) => 
            new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
          );

        console.log('📋 Tickets asignados encontrados:', tickets.length);
        return tickets;
      }),
      catchError((error) => {
        console.error('❌ Error obteniendo tickets asignados:', error);
        return [];
      })
    );
  }

  // Obtener tickets urgentes del técnico - CORREGIDO
  getTicketsUrgentes(tecnicoId: number): Observable<any[]> {
    return this.ticketsService.listaActivos().pipe(
      map((res: any) => {
        if (!res.isSuccess || !res.data) return [];
        
        return (res.data || [])
          .filter((ticket: any) => 
            ticket.tecnico_id === tecnicoId && 
            !ticket.fecha_resolucion &&
            ticket.prioridad?.nivel && 
            ticket.prioridad.nivel >= 3
          )
          .sort((a: any, b: any) => {
            const prioridadA = a.prioridad?.nivel || 0;
            const prioridadB = b.prioridad?.nivel || 0;
            if (prioridadB !== prioridadA) return prioridadB - prioridadA;
            return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
          });
      })
    );
  }

  // Obtener tickets recientes del técnico - CORREGIDO
  getTicketsRecientes(tecnicoId: number): Observable<any[]> {
    return this.ticketsService.listaActivos().pipe(
      map((res: any) => {
        if (!res.isSuccess || !res.data) return [];
        
        return (res.data || [])
          .filter((ticket: any) => ticket.tecnico_id === tecnicoId)
          .sort((a: any, b: any) => 
            new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
          )
          .slice(0, 8);
      })
    );
  }

  // Cambiar estado del ticket - Iniciar trabajo
  iniciarTicket(ticketId: number): Observable<any> {
    return this.ticketsService.actualizar(ticketId, { 
      estado: true
    });
  }

  // Marcar ticket como resuelto
  resolverTicket(ticketId: number, solucion: string): Observable<any> {
    return this.ticketsService.actualizar(ticketId, {
      fecha_resolucion: new Date().toISOString()
    });
  }

  // Métodos privados para cálculos - ACTUALIZADO
  private calcularEstadisticas(tickets: any[]): TecnicoStats {
    const ticketsAsignados = tickets.length;
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion).length;
    const ticketsUrgentes = tickets.filter(t => t.prioridad?.nivel && t.prioridad.nivel >= 3).length;
    const ticketsEnProceso = tickets.filter(t => !t.fecha_resolucion).length;

    // Tickets este mes
    const esteMes = new Date().getMonth();
    const esteAnio = new Date().getFullYear();
    const ticketsEsteMes = tickets.filter(t => {
      const fechaTicket = new Date(t.fecha_creacion);
      return fechaTicket.getMonth() === esteMes && fechaTicket.getFullYear() === esteAnio;
    }).length;

    // Tickets hoy
    const hoy = new Date().toDateString();
    const ticketsHoy = tickets.filter(t => 
      new Date(t.fecha_creacion).toDateString() === hoy
    ).length;

    // Eficiencia
    const eficiencia = ticketsAsignados > 0 ? 
      Math.round((ticketsResueltos / ticketsAsignados) * 100) : 0;

    // Tiempo promedio de resolución
    const tiempoPromedioResolucion = this.calcularTiempoPromedio(tickets);

    // NUEVAS MÉTRICAS
    const ticketsSLAVencido = this.calcularTicketsSLAVencido(tickets);
    const ticketsSLAProximoVencer = this.calcularTicketsSLAProximoVencer(tickets);
    const ticketsReabiertos = this.calcularTicketsReabiertos(tickets);
    const satisfaccionPromedio = this.calcularSatisfaccionPromedio(tickets);
    const primeraSolucion = this.calcularPrimeraSolucion(tickets);

    console.log('📊 Estadísticas calculadas:', {
      ticketsAsignados,
      ticketsResueltos,
      ticketsUrgentes,
      ticketsEnProceso,
      eficiencia,
      ticketsEsteMes,
      ticketsHoy,
      ticketsSLAVencido,
      ticketsSLAProximoVencer,
      ticketsReabiertos,
      satisfaccionPromedio,
      primeraSolucion
    });

    return {
      ticketsAsignados,
      ticketsEnProceso,
      ticketsResueltos,
      ticketsUrgentes,
      eficiencia,
      tiempoPromedioResolucion,
      ticketsEsteMes,
      ticketsHoy,
      // NUEVAS PROPIEDADES
      ticketsSLAVencido,
      ticketsSLAProximoVencer,
      ticketsReabiertos,
      satisfaccionPromedio,
      primeraSolucion
    };
  }

  private calcularTiempoPromedio(tickets: any[]): string {
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion);
    if (ticketsResueltos.length === 0) return '0h 0m';

    let totalMinutos = 0;
    ticketsResueltos.forEach(ticket => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      const diffMs = resuelto.getTime() - creado.getTime();
      totalMinutos += diffMs / (1000 * 60);
    });

    const promedioMinutos = totalMinutos / ticketsResueltos.length;
    const horas = Math.floor(promedioMinutos / 60);
    const minutos = Math.round(promedioMinutos % 60);

    return `${horas}h ${minutos}m`;
  }

  // NUEVOS MÉTODOS PARA LAS MÉTRICAS ADICIONALES
  private calcularTicketsSLAVencido(tickets: any[]): number {
    return tickets.filter(ticket => {
      if (!ticket.sla?.tiempo_resolucion || ticket.fecha_resolucion) return false;
      
      const fechaCreacion = new Date(ticket.fecha_creacion);
      const ahora = new Date();
      const horasTranscurridas = (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
      const horasRestantes = ticket.sla.tiempo_resolucion - horasTranscurridas;

      return horasRestantes <= 0;
    }).length;
  }

  private calcularTicketsSLAProximoVencer(tickets: any[]): number {
    return tickets.filter(ticket => {
      if (!ticket.sla?.tiempo_resolucion || ticket.fecha_resolucion) return false;
      
      const fechaCreacion = new Date(ticket.fecha_creacion);
      const ahora = new Date();
      const horasTranscurridas = (ahora.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
      const horasRestantes = ticket.sla.tiempo_resolucion - horasTranscurridas;

      return horasRestantes > 0 && horasRestantes <= 24;
    }).length;
  }

  private calcularTicketsReabiertos(tickets: any[]): number {
    return tickets.filter(ticket => 
      ticket.estado_ticket === 'REABIERTO' || 
      ticket.veces_reabierto > 0
    ).length;
  }

  private calcularSatisfaccionPromedio(tickets: any[]): number {
    // Simulación - en una implementación real esto vendría de encuestas de satisfacción
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion);
    if (ticketsResueltos.length === 0) return 0;
    
    // Simular puntuaciones de satisfacción basadas en tiempo de resolución
    let totalSatisfaccion = 0;
    ticketsResueltos.forEach(ticket => {
      const creado = new Date(ticket.fecha_creacion);
      const resuelto = new Date(ticket.fecha_resolucion);
      const horasResolucion = (resuelto.getTime() - creado.getTime()) / (1000 * 60 * 60);
      
      // Lógica de satisfacción: menos horas = mayor satisfacción
      let satisfaccion = 100;
      if (horasResolucion > 72) satisfaccion = 60;
      else if (horasResolucion > 48) satisfaccion = 70;
      else if (horasResolucion > 24) satisfaccion = 80;
      else if (horasResolucion > 12) satisfaccion = 90;
      
      totalSatisfaccion += satisfaccion;
    });

    return Math.round(totalSatisfaccion / ticketsResueltos.length);
  }

  private calcularPrimeraSolucion(tickets: any[]): number {
    const ticketsResueltos = tickets.filter(t => t.fecha_resolucion);
    if (ticketsResueltos.length === 0) return 0;

    let primeraSolucionCount = 0;
    ticketsResueltos.forEach(ticket => {
      // Considerar como "primera solución" si no fue reabierto
      if (!ticket.veces_reabierto || ticket.veces_reabierto === 0) {
        primeraSolucionCount++;
      }
    });

    return Math.round((primeraSolucionCount / ticketsResueltos.length) * 100);
  }

  private getStatsDefault(): TecnicoStats {
    return {
      ticketsAsignados: 0,
      ticketsEnProceso: 0,
      ticketsResueltos: 0,
      ticketsUrgentes: 0,
      eficiencia: 0,
      tiempoPromedioResolucion: '0h 0m',
      ticketsEsteMes: 0,
      ticketsHoy: 0,
      // NUEVAS PROPIEDADES CON VALORES POR DEFECTO
      ticketsSLAVencido: 0,
      ticketsSLAProximoVencer: 0,
      ticketsReabiertos: 0,
      satisfaccionPromedio: 0,
      primeraSolucion: 0
    };
  }
}