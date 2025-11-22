import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FileInfo, FileUploadResponse, FileListResponse } from '../interfaces/file.interface';






@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private apiUrl = environment.apiAuthUrl;
  private http = inject(HttpClient);

  // ================== MÉTODOS PARA ARCHIVOS ADJUNTOS (MANTENIDOS) ==================

  /**
   * Subir archivo inicial del ticket
   */
  uploadTicketFile(ticketId: number, file: File): Observable<HttpEvent<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileUploadResponse>(
      `${this.apiUrl}/tickets/${ticketId}/files/inicial`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    );
  }

  /**
   * Subir archivo para el chat del ticket
   */
  uploadChatFile(ticketId: number, file: File): Observable<HttpEvent<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<FileUploadResponse>(
      `${this.apiUrl}/tickets/${ticketId}/files/chat`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    );
  }

  /**
   * Obtener archivos de un ticket
   */
  getTicketFiles(ticketId: number): Observable<FileListResponse> {
    return this.http.get<FileListResponse>(`${this.apiUrl}/tickets/${ticketId}/files`);
  }

  /**
   * Eliminar archivo
   */
  deleteFile(ticketId: number, filename: string, tipo: string = 'inicial'): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/tickets/${ticketId}/files/${filename}?tipo=${tipo}`
    );
  }

  /**
   * Descargar archivo - PARA ARCHIVOS ADJUNTOS
   */
  downloadFile(ticketId: number, filename: string): Observable<Blob> {
    console.log('📥 Descargando archivo adjunto:', { ticketId, filename });
    
    if(!filename || filename === 'undefined' || filename === null){
      console.error('❌ Error crítico: filename es inválido:', filename);
      return new Observable(observer =>{
        observer.error(new Error('Nombre de archivo no válido para descarga'))
      });
    }

    return this.buscarArchivo(ticketId, filename);
  }

  /**
   * Buscar archivo automáticamente en todas las carpetas
   */
  buscarArchivo(ticketId: number, filename: string): Observable<Blob> {
    console.log('🔍 Buscando archivo automáticamente:', { ticketId, filename });
    return this.http.get(
      `${this.apiUrl}/tickets/${ticketId}/files/buscar/${filename}`,
      { responseType: 'blob' }
    );
  }

  // ================== MÉTODOS ESPECÍFICOS PARA CHAT (CORREGIDOS) ==================

  /**
   * Obtener URL para VER archivos del chat - MÉTODO CORREGIDO
   */
  getChatFileViewUrl(ticketId: number, fileName: string, archivoUrl?: string): string {
    // Si viene archivoUrl del servidor, usarlo directamente
    if (archivoUrl) {
      const baseUrl = this.apiUrl.replace('/api', '');
      return `${baseUrl}${archivoUrl}`;
    }
    
    // Fallback: usar ruta estática (por si acaso)
    const baseUrl = this.apiUrl.replace('/api', '');
    console.log('--->baseUrl servicio',baseUrl);
    
    return `${baseUrl}/uploads/mensajes/${fileName}`;
  }

  /**
   * Descargar archivo del chat - MÉTODO CORREGIDO
   */
  downloadChatFile(ticketId: number, filename: string, archivoUrl?: string): Observable<Blob> {
    console.log('💬 Descargando archivo del chat:', { filename, archivoUrl });
    
    // Usar URL correcta basada en archivoUrl si está disponible
    const fileUrl = this.getChatFileViewUrl(ticketId, filename, archivoUrl);
    console.log('🔗 URL del chat para descargar:', fileUrl);
    
    return this.http.get(fileUrl, { 
      responseType: 'blob'
    });
  }

  /**
   * Ver archivo del chat - MÉTODO CORREGIDO
   */
  viewChatFile(ticketId: number, filename: string, archivoUrl?: string): void {
    const fileUrl = this.getChatFileViewUrl(ticketId, filename, archivoUrl);
    console.log('👀 Abriendo archivo del chat:', fileUrl);
    
    // Abrir directamente en nueva pestaña
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Obtener URL segura para mostrar imágenes del chat - MÉTODO CORREGIDO
   */
  getChatImageUrl(ticketId: number, fileName: string, archivoUrl?: string): string {
    return this.getChatFileViewUrl(ticketId, fileName, archivoUrl);
  }

  // ================== MÉTODOS UTILITARIOS (MANTENIDOS) ==================

  /**
   * Validar tipo de archivo
   */
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'video/mp4',
      'video/avi',
      'video/x-msvideo',
      'video/quicktime',
      'application/zip',
      'application/x-zip-compressed'
    ];

    return allowedTypes.includes(file.type);
  }

  /**
   * Validar tamaño de archivo (50MB máximo)
   */
  isValidFileSize(file: File): boolean {
    const maxSize = 50 * 1024 * 1024; // 50MB
    return file.size <= maxSize;
  }

  /**
   * Obtener tipo de archivo para mostrar icono
   */
  getFileTypeIcon(fileType: string): string {
    if (!fileType) return 'insert_drive_file';
    
    const type = fileType.toLowerCase();
    
    if (type.includes('image')) return 'image';
    if (type.includes('pdf')) return 'picture_as_pdf';
    if (type.includes('word') || type.includes('document')) return 'description';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'table_chart';
    if (type.includes('video')) return 'videocam';
    if (type.includes('text') || type.includes('csv')) return 'text_snippet';
    if (type.includes('zip') || type.includes('compressed')) return 'folder_zip';
    
    return 'insert_drive_file';
  }

  /**
   * Formatear tamaño de archivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Verificar si un archivo es una imagen
   */
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Verificar si un tipo MIME es imagen
   */
  isImageType(mimeType: string | undefined | null): boolean {
    if (!mimeType) return false;
    return mimeType.startsWith('image/');
  }

  /**
   * Obtener URL para mostrar imagen en el frontend
   */
  getImageUrl(ticketId: number, fileName: string): string {
    return this.getSafeImageUrl(ticketId, fileName);
  }

  /**
   * Obtener URL para archivos del chat
   */
  getChatFileUrl(ticketId: number, fileName: string): string {
    return this.getSafeImageUrl(ticketId, fileName);
  }

  /**
   * Obtener URL segura para mostrar imágenes en el frontend
   */
  getSafeImageUrl(ticketId: number, fileName: string): string {
    // Usar el endpoint de búsqueda automática con timestamp para evitar cache
    const timestamp = new Date().getTime();
    return `${this.apiUrl}/tickets/${ticketId}/files/buscar/${fileName}?t=${timestamp}`;
  }

  /**
   * Verificar si un archivo es visualizable directamente en el navegador
   */
  isViewableFile(mimeType: string): boolean {
    if (!mimeType) return false;
    
    const viewableTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'text/csv'
    ];
    
    return viewableTypes.includes(mimeType.toLowerCase());
  }

  /**
   * Descargar imagen como blob (para vista previa)
   */
  downloadImage(ticketId: number, fileName: string): Observable<Blob> {
    return this.buscarArchivo(ticketId, fileName);
  }

  /**
   * Obtener información del tipo de archivo para mostrar
   */
  getFileTypeInfo(mimeType: string): { type: string, category: string, icon: string } {
    if (!mimeType) {
      return { type: 'OTRO', category: 'file', icon: 'insert_drive_file' };
    }

    const type = mimeType.toLowerCase();
    
    if (this.isImageType(mimeType)) {
      return { type: 'IMAGEN', category: 'image', icon: 'image' };
    }
    if (type.includes('pdf')) {
      return { type: 'PDF', category: 'document', icon: 'picture_as_pdf' };
    }
    if (type.includes('word') || type.includes('document')) {
      return { type: 'DOCUMENTO', category: 'document', icon: 'description' };
    }
    if (type.includes('excel') || type.includes('spreadsheet')) {
      return { type: 'HOJA_CALCULO', category: 'spreadsheet', icon: 'table_chart' };
    }
    if (type.includes('video')) {
      return { type: 'VIDEO', category: 'video', icon: 'videocam' };
    }
    if (type.includes('text') || type.includes('csv')) {
      return { type: 'TEXTO', category: 'text', icon: 'text_snippet' };
    }
    if (type.includes('zip') || type.includes('compressed')) {
      return { type: 'COMPRIMIDO', category: 'archive', icon: 'folder_zip' };
    }
    
    return { type: 'OTRO', category: 'file', icon: 'insert_drive_file' };
  }

  /**
   * Obtener color para el tipo de archivo
   */
  getFileTypeColor(fileType: string): string {
    const type = fileType?.toLowerCase() || '';
    
    if (type.includes('image')) return 'text-green-600';
    if (type.includes('pdf')) return 'text-red-600';
    if (type.includes('word') || type.includes('document')) return 'text-blue-600';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'text-green-600';
    if (type.includes('video')) return 'text-purple-600';
    if (type.includes('text') || type.includes('csv')) return 'text-gray-600';
    if (type.includes('zip') || type.includes('compressed')) return 'text-orange-600';
    
    return 'text-gray-600';
  }

  /**
   * Extraer nombre de archivo de una URL
   */
  extractFileNameFromUrl(url: string): string {
    if (!url) return '';
    return url.split('/').pop() || '';
  }

  /**
   * Obtener extensión de archivo
   */
  getFileExtension(filename: string): string {
    if (!filename) return '';
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Verificar si se puede previsualizar el archivo
   */
  canPreviewFile(mimeType: string): boolean {
    if (!mimeType) return false;
    
    const type = mimeType.toLowerCase();
    return (
      this.isImageType(mimeType) ||
      type.includes('pdf') ||
      type.includes('text')
    );
  }

  /**
   * Obtener tipo de archivo legible para el usuario
   */
  getReadableFileType(mimeType: string): string {
    const info = this.getFileTypeInfo(mimeType);
    return info.type;
  }

  /**
   * Validar archivo completo (tipo y tamaño)
   */
  validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.isValidFileType(file)) {
      errors.push(`Tipo de archivo no permitido: ${file.type}`);
    }

    if (!this.isValidFileSize(file)) {
      errors.push(`El archivo es demasiado grande: ${this.formatFileSize(file.size)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}