export interface CategoriaInterface {
  id?: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;  // se usa para saber si está activa o eliminada
  fechaCreacion?: string;
  fechaEliminacion?: string | null;
  created_by?: string;
  updated_by?: string;
}
