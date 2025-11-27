export interface TiposSlaInterface {
  id: number;
  nombre: string;
  descripcion?: string;
  color?: string;
  activo: boolean;
  eliminado: boolean;
  usuario_registro: string;
  fecha_registro: string;
  usuario_modificacion?: string;
  fecha_modificacion?: string;
  usuario_eliminacion?: string;
  fecha_eliminacion?: string;
}