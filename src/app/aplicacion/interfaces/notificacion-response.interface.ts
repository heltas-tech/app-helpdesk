import { NotificacionSistema } from "./notificacion-sistema.interface";


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