export interface NotificacionSistema {
  id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  leida: boolean;
  fecha_creacion: string;
  entidad_tipo?: string;
  entidad_id?: number;
  usuario?: {
    id: number;
    nombre_usuario: string;
    rol: string;
  };
}

export interface CreateNotificacionSistema {
  usuarioId: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  entidadTipo?: string;
  entidadId?: number;
}

export interface UpdateNotificacionSistema {
  leida?: boolean;
}

export interface NotificacionResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface NotificacionesPaginadas {
  notificaciones: NotificacionSistema[];
  paginacion: {
    pagina: number;
    limite: number;
    total: number;
    paginas: number;
  };
  noLeidas: number;
}

export interface ContadorNotificaciones {
  noLeidas: number;
}