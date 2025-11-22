export interface TecnicoStats {
  ticketsAsignados: number;
  ticketsEnProceso: number;
  ticketsResueltos: number;
  ticketsUrgentes: number;
  eficiencia: number;
  tiempoPromedioResolucion: string;
  ticketsEsteMes: number;
  ticketsHoy: number;
}

export interface TicketTecnico {
  id: number;
  titulo: string;
  descripcion?: string;
  estado: boolean;
  fecha_creacion: string;
  fecha_resolucion?: string;
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
}