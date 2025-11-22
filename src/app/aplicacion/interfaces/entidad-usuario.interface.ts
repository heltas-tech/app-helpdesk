export interface EntidadUsuarioInterface {
  id: number;
  entidadId: number;
  usuarioId: number;
  cargo: string;
  activo: boolean;
  eliminado: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  usuario?: {
    id: number;
    nombre_usuario: string;
    correo_electronico: string;
    telefono: string;
    rol: string;
    activo: boolean;
    eliminado: boolean;
  };
  entidad?: {
    id: number;
    denominacion: string;
    nit: string;
    estado: boolean;
    eliminado: boolean;
  };
}

export interface CreateEntidadUsuarioDto {
  entidadId: number;
  usuarioId: number;
  cargo: string;
  activo?: boolean;
}

export interface UpdateEntidadUsuarioDto {
  cargo?: string;
  activo?: boolean;
}