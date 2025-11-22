import { MensajeTicketResponse } from "./mensaje-ticket.interface";
import { FileInfo } from "./file.interface"; 

// ==================== ENUMS Y CONSTANTES ====================

export enum EstadoTicket {
  NUEVO = 'NUEVO',
  EN_PROCESO = 'EN_PROCESO',
  RESUELTO = 'RESUELTO', 
  REABIERTO = 'REABIERTO',
  EN_ESPERA_CLIENTE = 'EN_ESPERA_CLIENTE',
  EN_ESPERA_TECNICO = 'EN_ESPERA_TECNICO',
  CERRADO = 'CERRADO'
}

export interface TicketEstadoUI {
  value: EstadoTicket;
  label: string;
  color: string;
  icon: string;
  badgeClass: string;
}

export const ESTADOS_TICKET_UI: TicketEstadoUI[] = [
  { 
    value: EstadoTicket.NUEVO, 
    label: 'Nuevo', 
    color: 'primary', 
    icon: 'fiber_new',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  { 
    value: EstadoTicket.EN_PROCESO, 
    label: 'En Proceso', 
    color: 'warning', 
    icon: 'build',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  { 
    value: EstadoTicket.RESUELTO, 
    label: 'Resuelto', 
    color: 'success', 
    icon: 'check_circle',
    badgeClass: 'bg-green-100 text-green-800 border-green-200'
  },
  { 
    value: EstadoTicket.REABIERTO, 
    label: 'Reabierto', 
    color: 'info', 
    icon: 'refresh',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  { 
    value: EstadoTicket.EN_ESPERA_CLIENTE, 
    label: 'Esperando Cliente', 
    color: 'secondary', 
    icon: 'person',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  { 
    value: EstadoTicket.EN_ESPERA_TECNICO, 
    label: 'Esperando Técnico', 
    color: 'secondary', 
    icon: 'engineering',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  { 
    value: EstadoTicket.CERRADO, 
    label: 'Cerrado', 
    color: 'default', 
    icon: 'lock',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-200'
  }
];

// ==================== INTERFACES PRINCIPALES ====================

export interface TicketInterface {
  id: number;
  titulo: string;
  descripcion?: string;
  estado: boolean; // Estado activo/inactivo (soft delete)
  estado_ticket: EstadoTicket; // Estado del flujo del ticket
  entidad_usuario_id: number;
  tecnico_id?: number;
  categoria_id: number;
  subcategoria_id?: number;
  prioridad_id: number;
  sla_id: number;
  contrato_id: number;
  fecha_creacion: string;
  fecha_resolucion?: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  veces_reabierto?: number;
  ultima_reapertura?: string;
  motivo_reapertura?: string;

  // Relaciones 
  entidad_usuario?: {
    id: number;
    cargo: string;
    activo: boolean;
    usuario: {
      id: number;
      nombre_usuario: string;
      correo_electronico: string;
      telefono: string;
      rol: string;
    };
    entidad: {
      id: number;
      denominacion: string;
      nit: string;
    };
  };
  tecnico?: {
    id: number;
    nombre_usuario: string;
    correo_electronico: string;
    telefono: string;
    rol: string;
  };
  categoria?: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  subcategoria?: {
    id: number;
    nombre: string;
    descripcion?: string;
  };
  prioridad?: {
    id: number;
    nombre: string;
    descripcion?: string;
    nivel: number;
  };
  sla?: {
    id: number;
    nombre: string;
    descripcion?: string;
    tiempo_resolucion: number;
    tiempo_respuesta: number;
  };
  contrato?: {
    id: number;
    numero_contrato: string;
    titulo: string;
    estado_contrato: string;
    fecha_inicio: string;
    fecha_fin: string;
    entidad: {
      id: number;
      denominacion: string;
    };
  };
}

// ==================== INTERFACE TICKET DETALLE ====================
export interface TicketDetalle {
  ticket: TicketInterface | null;
  mensajes: MensajeTicketResponse[];
  archivos: FileInfo[];
  logs: any[];
  cargando: boolean;
  error?: string | null;
}

// ==================== INTERFACES DE FORMULARIOS ====================
export interface CreateTicketDto {
  titulo: string;
  descripcion?: string;
  entidad_usuario_id: number;
  tecnico_id?: number;
  categoria_id: number;
  subcategoria_id?: number;
  prioridad_id: number;
  sla_id: number;
  contrato_id: number;
  estado_ticket?: EstadoTicket;
}

export interface UpdateTicketDto {
  titulo?: string;
  descripcion?: string;
  estado?: boolean;
  entidad_usuario_id?: number;
  tecnico_id?: number;
  categoria_id?: number;
  subcategoria_id?: number;
  prioridad_id?: number;
  sla_id?: number;
  contrato_id?: number;
  fecha_resolucion?: string;
  estado_ticket?: EstadoTicket;
  veces_reabierto?: number;
  ultima_reapertura?: string;
  motivo_reapertura?: string;
}

export interface MarcarResueltoDto {
  fecha_resolucion: string;
}

export interface ReabrirTicketDto {
  motivo_reapertura: string;
}

// ==================== INTERFACES DE ESTADO UI ====================
export interface TicketModalState {
  ticketId: number | null;
  activoTab: 'info' | 'chat' | 'archivos' | 'logs';
  cargando: boolean;
  enviandoMensaje: boolean;
  subiendoArchivo: boolean;
}

export interface TicketFilters {
  search?: string;
  estado?: boolean;
  estado_ticket?: EstadoTicket;
  tecnico_id?: number;
  categoria_id?: number;
  prioridad_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  mostrarEliminados?: boolean;
}

// ==================== INTERFACES DE MENSAJES ====================
export interface CreateMensajeRequest {
  ticket_id: number;
  usuario_id: number;
  mensaje: string;
  tipo_mensaje?: string;
  created_by: string;
}

export interface UploadArchivoRequest {
  ticket_id: number;
  usuario_id: number;
  archivo: File;
  mensaje?: string;
  created_by: string;
}

// ==================== CLASE DE UTILIDADES ====================
export class TicketUtils {
  
  /** Obtener información del estado del ticket para UI */
  static getEstadoInfo(ticket: TicketInterface): TicketEstadoUI {
    if (!ticket.estado) {
      return {
        value: EstadoTicket.CERRADO,
        label: 'Eliminado',
        color: 'error',
        icon: 'delete',
        badgeClass: 'bg-red-100 text-red-800 border-red-200'
      };
    }

    const estadoUI = ESTADOS_TICKET_UI.find(e => e.value === ticket.estado_ticket);
    return estadoUI || ESTADOS_TICKET_UI[0];
  }

  /** Verificar si el ticket puede ser reabierto */
  static puedeReabrir(ticket: TicketInterface): boolean {
    return ticket.estado && 
           (ticket.estado_ticket === EstadoTicket.RESUELTO || 
            ticket.estado_ticket === EstadoTicket.CERRADO);
  }

  /** Verificar si el ticket puede ser marcado como resuelto */
  static puedeMarcarResuelto(ticket: TicketInterface): boolean {
    return ticket.estado && 
           ticket.estado_ticket !== EstadoTicket.RESUELTO && 
           ticket.estado_ticket !== EstadoTicket.CERRADO;
  }

  /** Verificar si el ticket puede ser eliminado */
  static puedeEliminar(ticket: TicketInterface): boolean {
    return ticket.estado; // Solo tickets activos pueden ser eliminados
  }

  /** Verificar si el ticket puede ser restaurado */
  static puedeRestaurar(ticket: TicketInterface): boolean {
    return !ticket.estado; // Solo tickets eliminados pueden ser restaurados
  }

  /** Calcular tiempo transcurrido desde la creación */
  static getTiempoTranscurrido(fechaCreacion: string): string {
    const creado = new Date(fechaCreacion);
    const ahora = new Date();
    const diffMs = ahora.getTime() - creado.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffHoras / 24);

    if (diffDias > 0) {
      return `${diffDias} día${diffDias > 1 ? 's' : ''}`;
    } else if (diffHoras > 0) {
      return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    } else {
      return 'Menos de 1 hora';
    }
  }

  /** Obtener información de urgencia de prioridad */
  static getUrgenciaPrioridad(nivel: number): string {
    if (nivel >= 4) return 'Crítica';
    if (nivel >= 3) return 'Alta';
    if (nivel >= 2) return 'Media';
    return 'Baja';
  }

  /** Obtener clase CSS para prioridad */
  static getColorPrioridad(nivel: number): string {
    if (nivel >= 4) return 'bg-red-100 text-red-800 border-red-200';
    if (nivel >= 3) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (nivel >= 2) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  }

  /** Formatear fecha para mostrar */
  static formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Verificar si el SLA está próximo a vencer */
  static slaProximoVencer(ticket: TicketInterface): boolean {
    if (!ticket.fecha_creacion || !ticket.sla?.tiempo_resolucion) {
      return false;
    }

    const fechaCreacion = new Date(ticket.fecha_creacion);
    const fechaLimite = new Date(fechaCreacion.getTime() + ticket.sla.tiempo_resolucion * 60 * 60 * 1000);
    const ahora = new Date();
    const horasRestantes = (fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    return horasRestantes > 0 && horasRestantes <= 24; // Próximo a vencer en 24 horas
  }

  /** Verificar si el SLA está vencido */
  static slaVencido(ticket: TicketInterface): boolean {
    if (!ticket.fecha_creacion || !ticket.sla?.tiempo_resolucion) {
      return false;
    }

    const fechaCreacion = new Date(ticket.fecha_creacion);
    const fechaLimite = new Date(fechaCreacion.getTime() + ticket.sla.tiempo_resolucion * 60 * 60 * 1000);
    const ahora = new Date();

    return ahora > fechaLimite;
  }
}