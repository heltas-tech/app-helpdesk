export interface PrioridadesInterface {
    id?: number;
  nombre: string;
  descripcion?: string;
  nivel: number;
  tiempo_respuesta?: number;
  tiempo_resolucion?: number;
  activo: boolean;
}
