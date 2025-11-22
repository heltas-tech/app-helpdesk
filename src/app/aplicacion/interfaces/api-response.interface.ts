// src/app/interfaces/api-response.interface.ts

// Interface base para respuestas API
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  error?: string;
}

// Las interfaces específicas las definiremos después de crear las demás
// para evitar errores de dependencias circulares