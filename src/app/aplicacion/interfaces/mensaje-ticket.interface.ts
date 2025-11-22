
// INTERFACE PARA CREAR MENSAJE (REQUEST)
export interface CreateMensajeTicketRequest {
  ticket_id: number;
  usuario_id: number;
  mensaje?: string;
  tipo_mensaje: string;  
  archivo_url?: string;
  nombre_archivo?: string;
  tipo_archivo?: string; 
  tamanio_archivo?: number;
  created_by: string;
}

// INTERFACE PARA RESPUESTA DEL BACKEND (RESPONSE)
export interface MensajeTicketResponse {
  id: number;
  ticket_id: number;
  usuario_id: number;
  mensaje?: string;
  tipo_mensaje: string;  
  archivo_url?: string;
  nombre_archivo?: string;
  tipo_archivo?: string; 
  tamanio_archivo?: number;
  estado: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;

  // Relaciones 
  ticket?: {
    id: number;
    titulo: string;
    estado: boolean;
  };
  usuario: {
    id: number;
    nombre_usuario: string;
    correo_electronico: string;
    rol: string;
  };
}

// INTERFACE PARA ACTUALIZAR MENSAJE
export interface UpdateMensajeTicketRequest {
  mensaje?: string;
  tipo_mensaje?: string;  
  archivo_url?: string;
  nombre_archivo?: string;
  tipo_archivo?: string;  
  tamanio_archivo?: number;
  estado?: boolean;
  updated_by?: string;
}