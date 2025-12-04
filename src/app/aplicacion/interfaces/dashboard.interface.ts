export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
  error?: string;
}

export interface DashboardStatsResponse {
  totalTickets: number;
  ticketsAbiertos: number;
  ticketsResueltos: number;
  ticketsPendientes?: number;
  slaCumplido: number;
  usuariosActivos?: number;
  entidadesActivas?: number;
  ticketsEsteMes: number;
  contratosProximosVencer?: number;
  ticketsHoy: number;
  ticketsSinAsignar?: number;
  ticketsReabiertos: number;
  tiempoPromedioResolucion?: string;
  ticketsSLAVencido: number;
  ticketsSLAProximoVencer: number;
  ticketsUrgentes: number;
  ticketsResueltosHoy: number;
  eficienciaGeneral?: number;
  satisfaccionPromedio?: number;
  ticketsAsignados?: number;
  ticketsEnProceso?: number;
  ticketsConSLA?: number;
}

export interface RecentTicketResponse {
  id: number;
  titulo: string;
  descripcion?: string;
  estado: string;
  fecha_creacion: string;
  fecha_resolucion?: string;
  prioridad_nivel: number;
  prioridad_nombre: string;
  categoria_nombre?: string;
  tecnico_nombre?: string;
  cliente_nombre?: string;
  entidad_nombre?: string;
  tiempo_transcurrido: string;
  sla_estado: string;
}

export interface CalendarTicket {
  id: number;
  titulo: string;
  estado: string;
  prioridad: number;
  tecnico?: string;
  cliente?: string;
}

export interface CalendarDay {
  fecha: string;
  cantidad_tickets: number;
  tickets: CalendarTicket[];
}

export interface CalendarMonthResponse {
  mes: number;
  anio: number;
  dias: CalendarDay[];
}

export interface TopTecnicoResponse {
  id: number;
  nombre: string;
  email: string;
  tickets_asignados: number;
  tickets_resueltos: number;
  eficiencia: number;
  tiempo_promedio: string;
  satisfaccion_promedio: number;
}

export interface CategoriaMetricaResponse {
  id: number;
  nombre: string;
  total_tickets: number;
  tickets_abiertos: number;
  tickets_resueltos: number;
  porcentaje_resuelto: number;
  tiempo_promedio: string;
  color: string;
}

export interface DashboardQuery {
  mes?: number;
  anio?: number;
  limit?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
}

// Estado del ticket (para uso en UI)
export enum EstadoTicket {
  NUEVO = 'NUEVO',
  EN_PROCESO = 'EN_PROCESO',
  PENDIENTE = 'PENDIENTE',
  RESUELTO = 'RESUELTO',
  CERRADO = 'CERRADO',
  REABIERTO = 'REABIERTO'
}

// Prioridad del ticket
export enum PrioridadTicket {
  BAJA = 1,
  MEDIA = 2,
  ALTA = 3,
  URGENTE = 4
}

// Estado del SLA
export enum EstadoSLA {
  DENTRO_TIEMPO = 'DENTRO_TIEMPO',
  POR_VENCER = 'POR_VENCER',
  VENCIDO = 'VENCIDO',
  SIN_SLA = 'SIN_SLA'
}