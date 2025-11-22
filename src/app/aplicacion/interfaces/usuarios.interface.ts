export interface UsuarioInterface {
  id?: number;
  nombre_usuario: string;
  correo_electronico: string;
  telefono?: string;
  rol: string;
  activo: boolean;
  eliminado?: boolean;
  bloqueado?: boolean;
  primer_login?: boolean;
  fecha_ultimo_cambio_password?: Date;
  intentos_fallidos?: number;
  usuario_registro?: string;
  fecha_registro?: Date;
  usuario_modificacion?: string;
  fecha_modificacion?: Date;
}

export interface CreateUsuarioDto {
  nombre_usuario: string;
  correo_electronico: string;
  telefono?: string;
  rol: string;
}

export interface UpdateUsuarioDto {
  nombre_usuario?: string;
  correo_electronico?: string;
  telefono?: string;
  rol?: string;
  activo?: boolean;
  password?: string;
}

export interface UpdateProfileDto {
  nombre_usuario?: string;
  telefono?: string;
  password?: string;
}

export interface UsuarioRegistroResponse {
  isSuccess: boolean;
  message: string;
  data: {
    usuario: UsuarioInterface;
    emailEnviado: boolean;
  };
}

export interface DesbloquearUsuarioDto {
  usuario_modificacion: string;
}

// Interfaces para filtros
export interface FiltrosUsuarios {
  rol?: string;
  activo?: boolean;
  eliminado?: boolean;
  bloqueado?: boolean;
  search?: string;
}