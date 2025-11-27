export interface PrioridadesInterface {
  id?: number;
  nombre: string;
  descripcion?: string;
  nivel: number;
  tiempo_respuesta?: number;
  tiempo_resolucion?: number;
  activo: boolean;
  eliminado?: boolean;
  usuario_registro?: string;
  fecha_registro?: string;
  usuario_modificacion?: string;
  fecha_modificacion?: string;
  usuario_eliminacion?: string;
  fecha_eliminacion?: string;
}