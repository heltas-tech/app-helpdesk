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

  // Obtener estadísticas del técnico - CORREGIDO
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

  // Métodos privados para cálculos
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

    console.log('📊 Estadísticas calculadas:', {
      ticketsAsignados,
      ticketsResueltos,
      ticketsUrgentes,
      ticketsEnProceso,
      eficiencia,
      ticketsEsteMes,
      ticketsHoy
    });

    return {
      ticketsAsignados,
      ticketsEnProceso,
      ticketsResueltos,
      ticketsUrgentes,
      eficiencia,
      tiempoPromedioResolucion,
      ticketsEsteMes,
      ticketsHoy
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

  private getStatsDefault(): TecnicoStats {
    return {
      ticketsAsignados: 0,
      ticketsEnProceso: 0,
      ticketsResueltos: 0,
      ticketsUrgentes: 0,
      eficiencia: 0,
      tiempoPromedioResolucion: '0h 0m',
      ticketsEsteMes: 0,
      ticketsHoy: 0
    };
  }
}