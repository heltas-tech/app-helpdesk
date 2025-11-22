// src/app/aplicacion/interfaces/file.interface.ts

export interface FileInfo {
  nombre_archivo: string;
  nombre: string;
  url: string;
  tipo: string;
  ruta_completa: string;
  tamanio?: number;
  fecha_creacion?: Date;
}

export interface FileUploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    nombre_archivo: string;
    tipo_archivo: string;
    tamanio_archivo: number;
    nombre_guardado?: string; 
  } | null;
}

export interface FileListResponse {
  success: boolean;
  message: string;
  data: FileInfo[];
}