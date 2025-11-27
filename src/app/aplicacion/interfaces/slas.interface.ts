export interface SlaInterface {
  id: number;
  nombre: string;
  descripcion?: string;
  tiempo_respuesta: number;
  tiempo_resolucion: number;
  prioridad_id: number;
  tipo_sla_id: number;
  estado: boolean;
  eliminado: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  
  // Campos para relaciones
  prioridades_ids?: number[];
  prioridades?: PrioridadInterface[];
  tipo_sla?: {
    id: number;
    nombre: string;
    color?: string;
    activo: boolean;
  };
  
  // Campos para display
  contrato_info?: string;
  empresa_info?: string;
  tipo_sla_nombre?: string;
  prioridades_incluidas?: PrioridadInterface[];
  prioridades_count?: number;
  tiempos_ejemplo?: string;
}

export interface PrioridadInterface {
  id: number;
  nombre: string;
  descripcion?: string;
  nivel: number;
  tiempo_respuesta?: number;
  tiempo_resolucion?: number;
  activo: boolean;
  eliminado: boolean;
  usuario_registro?: string;
  fecha_registro?: string;
  usuario_modificacion?: string;
  fecha_modificacion?: string;
  usuario_eliminacion?: string;
  fecha_eliminacion?: string;
}