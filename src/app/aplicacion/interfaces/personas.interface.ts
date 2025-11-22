export interface PersonaInterface {
  id?: number;
  nombre: string;
  apellido: string;
  ci?: string;
  telefono?: string;
  direccion?: string;
  activo: boolean;
  eliminado?: boolean;
}
