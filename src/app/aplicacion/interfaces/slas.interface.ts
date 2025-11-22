export interface SlaInterface {
  id: number;
  nombre: string;
  descripcion?: string;
  tiempo_respuesta: number;
  tiempo_resolucion: number;
  prioridad_id: number;
  estado: boolean;
  eliminado: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  prioridad_nombre?: string;
  prioridad_estado?: boolean;
}