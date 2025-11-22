export interface EntidadInterface {
  id?: number;
  denominacion: string;
  nit: string;
  estado: boolean;
  eliminado?: boolean;
  created_at?: Date;
  updated_at?: Date;
  created_by?: string;
  updated_by?: string;
}