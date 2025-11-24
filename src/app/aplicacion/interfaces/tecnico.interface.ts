export interface TecnicoStats {
  ticketsAsignados: number;
  ticketsEnProceso: number;
  ticketsResueltos: number;
  ticketsUrgentes: number;
  eficiencia: number;
  tiempoPromedioResolucion: string;
  ticketsEsteMes: number;
  ticketsHoy: number;
  // NUEVAS PROPIEDADES
  ticketsSLAVencido: number;
  ticketsSLAProximoVencer: number;
  ticketsReabiertos: number;
  satisfaccionPromedio: number;
  primeraSolucion: number;
}

export interface TicketTecnico {
  id: number;
  titulo: string;
  descripcion?: string;
  estado: boolean;
  fecha_creacion: string;
  fecha_resolucion?: string;
  estado_ticket?: string;
  prioridad?: {
    id: number;
    nombre: string;
    nivel: number;
  };
  categoria?: {
    id: number;
    nombre: string;
  };
  subcategoria?: {
    id: number;
    nombre: string;
  };
  entidad_usuario?: {
    id: number;
    entidad?: {
      id: number;
      denominacion: string;
    };
    usuario?: {
      id: number;
      nombre_usuario: string;
      correo_electronico: string;
    };
  };
  tecnico_id?: number;
  sla?: {
    id: number;
    nombre: string;
    tiempo_resolucion: number;
  };
  contrato?: {
    id: number;
    numero_contrato: string;
    titulo: string;
  };
}