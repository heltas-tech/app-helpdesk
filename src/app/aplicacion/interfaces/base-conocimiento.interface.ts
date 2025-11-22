export interface BaseConocimiento {
  id: number;
  ticket_id: number;
  autor_id: number;
  titulo: string;
  contenido: string;
  fecha_publicacion: string;
  utilidad: number;
  no_util: number;
  palabras_clave?: string;
  estado: boolean;
  created_at: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
}

export interface CreateBaseConocimiento {
  ticket_id: number;
  autor_id: number;
  titulo: string;
  contenido: string;
  palabras_clave?: string;
}

export interface UpdateBaseConocimiento {
  ticket_id?: number;
  autor_id?: number;
  titulo?: string;
  contenido?: string;
  palabras_clave?: string;
  utilidad?: number;
  no_util?: number;
}

export interface BaseConocimientoResponse {
  isSuccess: boolean;
  message: string;
  data: {
    activos: BaseConocimiento[];
    eliminados: BaseConocimiento[];
  } | BaseConocimiento | BaseConocimiento[] | null;
  error?: string;
}

