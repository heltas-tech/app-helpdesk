export interface LogTicket {
  id: number;
  ticket_id: number;
  usuario_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  comentarios?: string;
  fecha_cambio: string;
  accion?: string;
  estado: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;

  // Relaciones
  ticket?: {
    id: number;
    titulo: string;
  };
  usuario: {
    id: number;
    nombre_usuario: string;
    correo_electronico: string;
  };
}

export interface CreateLogTicket {
  ticket_id: number;
  usuario_id: number;
  estado_anterior: string;
  estado_nuevo: string;
  comentarios?: string;
  accion?: string;
  created_by: string;
}