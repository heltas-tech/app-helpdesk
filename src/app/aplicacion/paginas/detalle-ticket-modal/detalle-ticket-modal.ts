import { Component, OnInit, OnDestroy, inject, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { Router } from '@angular/router';

import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';

import { TicketDetalleService } from '../../services/ticket-detalle.service';
import { TicketsService } from '../../services/ticket.service';
import { FileUploadService } from '../../services/file-upload.service';
import { BaseConocimientoService } from '../../services/base-conocimiento.service';
import { TicketDetalle, MensajeTicketResponse } from '../../interfaces';

@Component({
  selector: 'app-detalle-ticket-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
    MatListModule,
    MatExpansionModule
  ],
  templateUrl: './detalle-ticket-modal.html'
})
export class DetalleTicketModalComponent implements OnInit, OnDestroy {

  ticketId!: number;

  // Servicios
  private ticketDetalleService = inject(TicketDetalleService);
  private ticketsService = inject(TicketsService);
  private fileUploadService = inject(FileUploadService);
  private baseConocimientoService = inject(BaseConocimientoService);
  private router = inject(Router);
  private cdRef = inject(ChangeDetectorRef);

  // Datos del ticket
  detalleTicket: TicketDetalle = {
    ticket: null,
    mensajes: [],
    archivos: [],
    logs: [],
    cargando: false
  };

  // Estado
  cargando: boolean = false;
  enviandoMensaje: boolean = false;
  subiendoArchivo: boolean = false;
  generandoPdf: boolean = false;
  progresoSubida: number = 0;

  // Chat
  nuevoMensaje: string = '';
  archivoChat: File | null = null;

  // Acordeones
  archivosAbierto: boolean = false;
  chatAbierto: boolean = true;

  // Subscripciones
  private subscriptions: Subscription[] = [];

  // Usuario actual
  usuarioActual: any = { id: 0, nombre: 'Usuario', rol: 'CLIENTE' };

  constructor(
    public dialogRef: MatDialogRef<DetalleTicketModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { ticketId: number }
  ) {}

  ngOnInit() {
    this.obtenerUsuarioActual();
    this.ticketId = this.data.ticketId;
    this.cargarDetalleTicket();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /** Obtener usuario actual */
  private obtenerUsuarioActual() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        this.usuarioActual = {
          id: payload.userId,
          nombre: payload.email,
          rol: payload.rol
        };
      } catch (error) {
        console.error('Error al decodificar token:', error);
        this.usuarioActual = { id: 0, nombre: 'Usuario', rol: 'CLIENTE' };
      }
    }
  }

  getUsuarioActual() {
    return this.usuarioActual || { id: 0, nombre: 'Usuario', rol: 'CLIENTE' };
  }

  /** Cargar detalle completo del ticket */
  cargarDetalleTicket() {
    this.cargando = true;
    
    const sub = this.ticketDetalleService.cargarDetalleTicket(this.ticketId).subscribe({
      next: (detalle) => {
        this.detalleTicket = detalle;
        this.cargando = false;
        this.cdRef.detectChanges();
      },
      error: (error: any) => {
        console.error('Error al cargar detalle:', error);
        Swal.fire('Error', 'No se pudo cargar la información del ticket', 'error');
        this.cargando = false;
      }
    });
    this.subscriptions.push(sub);
  }

  /** ================== MÉTODOS CORREGIDOS PARA CHAT ================== */

  /** Enviar mensaje de texto o archivo - CORREGIDO */
  enviarMensaje() {
    if (!this.nuevoMensaje.trim() && !this.archivoChat) {
      Swal.fire('Advertencia', 'Escribe un mensaje o selecciona un archivo antes de enviar', 'warning');
      return;
    }

    if (!this.getUsuarioActual().id) {
      Swal.fire('Error', 'No se pudo identificar al usuario', 'error');
      return;
    }

    // Si hay archivo, subirlo junto con el mensaje
    if (this.archivoChat) {
      this.subirArchivoChat();
    } else {
      // Solo enviar mensaje de texto - CORREGIDO: se usa la firma correcta del servicio
      this.enviandoMensaje = true;
      
      const sub = this.ticketDetalleService.enviarMensaje(
        this.nuevoMensaje,
        this.getUsuarioActual().id,
        this.getUsuarioActual().nombre
      ).subscribe({
        next: (response: any) => {
          if (response.isSuccess) {
            this.nuevoMensaje = '';
            this.enviandoMensaje = false;
            this.cargarDetalleTicket();
            Swal.fire('Éxito', 'Mensaje enviado correctamente', 'success');
          } else {
            this.enviandoMensaje = false;
            throw new Error(response.message || 'Error al enviar mensaje');
          }
        },
        error: (error: any) => {
          console.error('Error al enviar mensaje:', error);
          this.enviandoMensaje = false;
          Swal.fire('Error', 'No se pudo enviar el mensaje', 'error');
        }
      });
      this.subscriptions.push(sub);
    }
  }

  /** Manejar selección de archivo */
  onArchivoSeleccionado(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validaciones
    if (!this.fileUploadService.isValidFileType(file)) {
      Swal.fire('Error', 'Tipo de archivo no permitido', 'error');
      event.target.value = ''; // Limpiar input
      return;
    }

    if (!this.fileUploadService.isValidFileSize(file)) {
      Swal.fire('Error', 'El archivo es demasiado grande (máx. 50MB)', 'error');
      event.target.value = ''; // Limpiar input
      return;
    }

    this.archivoChat = file;
    this.progresoSubida = 0;
  }

  /** Eliminar archivo seleccionado */
  eliminarArchivoSeleccionado() {
    this.archivoChat = null;
    this.progresoSubida = 0;
    // Limpiar input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  /** Subir archivo al chat - CORREGIDO */
  subirArchivoChat() {
    if (!this.archivoChat || !this.getUsuarioActual().id) return;

    this.subiendoArchivo = true;
    this.progresoSubida = 0;
    const fileName = this.archivoChat.name;
    const fileType = this.archivoChat.type;

    // Simular progreso
    const progressInterval = setInterval(() => {
      if (this.progresoSubida < 90) {
        this.progresoSubida += 10;
      }
    }, 200);

    // CORREGIDO: Se usa la firma correcta del servicio (sin ticketId adicional)
    const sub = this.ticketDetalleService.subirArchivoChat(
      this.archivoChat!,
      this.getUsuarioActual().id,
      this.getUsuarioActual().nombre,
      this.nuevoMensaje.trim() || `Archivo: ${fileName}`
    ).subscribe({
      next: (response: any) => {
        clearInterval(progressInterval);
        this.progresoSubida = 100;

        console.log('✅ Respuesta completa del servidor:', response);
        
        let success = false;
        let data = null;

        if (response && response.isSuccess !== undefined) {
          success = response.isSuccess;
          data = response.data;
        } else if (response && (response.url || response.nombre_archivo)) {
          success = true;
          data = response;
        } else if (response) {
          success = true;
          data = response;
        }

        if (success) {
          setTimeout(() => {
            this.archivoChat = null;
            this.nuevoMensaje = '';
            this.subiendoArchivo = false;
            this.progresoSubida = 0;
            
            const mensaje = this.isImageType(fileType) ? 
              `Imagen "${fileName}" enviada correctamente` : 
              `Archivo "${fileName}" enviado correctamente`;
              
            Swal.fire('Éxito', mensaje, 'success');
            this.cargarDetalleTicket();
            
            // Limpiar input file
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
          }, 500);
        } else {
          this.subiendoArchivo = false;
          this.progresoSubida = 0;
          const errorMsg = data?.message || response?.message || 'Error al enviar archivo';
          throw new Error(errorMsg);
        }
      },
      error: (error: any) => {
        clearInterval(progressInterval);
        console.error('❌ Error completo enviando archivo:', error);
        this.subiendoArchivo = false;
        this.progresoSubida = 0;
        
        let errorMessage = `No se pudo enviar el archivo "${fileName}"`;
        
        if (error.status === 0) {
          errorMessage += ' - Error de conexión con el servidor';
        } else if (error.error) {
          errorMessage += ` - ${error.error.message || error.message || 'Error desconocido'}`;
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Descargar archivo - PARA ARCHIVOS ADJUNTOS */
  descargarArchivo(archivo: any) {
    const nombreArchivo = archivo.nombre || archivo.nombre_archivo;
    
    if (!nombreArchivo) {
      Swal.fire('Error', 'No se puede descargar el archivo: nombre no disponible', 'error');
      return;
    }

    const sub = this.fileUploadService.downloadFile(this.ticketId, nombreArchivo).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = archivo.nombre_archivo ||  nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('❌ Error al descargar archivo:', error);
        Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** ================== MÉTODOS MEJORADOS PARA VISUALIZACIÓN ================== */

  /** Ver archivo en nueva pestaña - MÉTODO CORREGIDO */
  verArchivo(archivo: any) {
    const nombreArchivo = archivo.nombre || archivo.nombre_archivo;
    const tipoArchivo = archivo.tipo_archivo || archivo.tipo;

    console.log('🚀 VER ARCHIVO:', { 
      nombre: nombreArchivo, 
      tipo: tipoArchivo,
      esImagen: this.isImageType(tipoArchivo)
    });

    if (!nombreArchivo) {
      Swal.fire('Error', 'No se puede abrir el archivo: nombre no disponible', 'error');
      return;
    }

    // SIMPLIFICADO: Todos los archivos visualizables se abren en pestaña
    if (this.puedeMostrarVistaPrevia(tipoArchivo)) {
      const fileUrl = this.fileUploadService.getSafeImageUrl(this.ticketId, nombreArchivo);
      console.log('🔗 Abriendo en pestaña:', fileUrl);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      // Para archivos no visualizables, ofrecer descarga
      this.mostrarOpcionDescarga(archivo);
    }
  }

  /** Ver archivo del chat - MÉTODO CORREGIDO */
  verArchivoChat(mensaje: any) {
    const nombreArchivo = mensaje.nombre_archivo;
    const tipoArchivo = mensaje.tipo_archivo;
    const archivoUrl = mensaje.archivo_url;

    console.log('💬 VER ARCHIVO CHAT:', { 
      nombre: nombreArchivo, 
      tipo: tipoArchivo,
      esImagen: this.isImageType(tipoArchivo)
    });

    if (!nombreArchivo) {
      Swal.fire('Error', 'No se puede abrir el archivo: nombre no disponible', 'error');
      return;
    }

    // SIMPLIFICADO: Todos los archivos visualizables se abren en pestaña
    if (this.puedeMostrarVistaPrevia(tipoArchivo)) {
      const fileUrl = this.fileUploadService.getChatFileViewUrl(this.ticketId, nombreArchivo, archivoUrl);
      console.log('🔗 Abriendo chat en pestaña:', fileUrl);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      this.mostrarOpcionDescargaChat(mensaje);
    }
  }

  /** Descargar archivo del chat - CORREGIDO */
  descargarArchivoChat(mensaje: any) {
    const nombreArchivo = mensaje.nombre_archivo;
    const archivoUrl = mensaje.archivo_url;
    
    if (!nombreArchivo) {
      Swal.fire('Error', 'No se puede descargar el archivo: nombre no disponible', 'error');
      return;
    }

    console.log('💬 Descargando archivo del chat:', { nombreArchivo, archivoUrl });

    const sub = this.fileUploadService.downloadChatFile(
      this.ticketId, 
      nombreArchivo, 
      archivoUrl
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('❌ Error al descargar archivo del chat:', error);
        Swal.fire('Error', 'No se pudo descargar el archivo', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Método para manejar la descarga con el botón animado */
  iniciarDescarga(archivo: any, tipo: 'adjunto' | 'chat' = 'adjunto', event?: Event) {
    if (event) {
      event.stopPropagation(); // Prevenir que se abra el archivo
    }

    const elementoId = tipo === 'adjunto' 
      ? `download-toggle-${archivo.nombre || archivo.nombre_archivo}`
      : `download-toggle-chat-${archivo.nombre_archivo}`;
      
    const elemento = document.getElementById(elementoId);
    
    if (elemento) {
      elemento.classList.add('checked');

      // Descargar después de la animación
      setTimeout(() => {
        if (tipo === 'adjunto') {
          this.descargarArchivo(archivo);
        } else {
          this.descargarArchivoChat(archivo);
        }
      }, 3800);

      // Resetear después de 8 segundos
      setTimeout(() => {
        if (elemento) {
          elemento.classList.remove('checked');
        }
      }, 8000);
    }
  }

  /** Mostrar opción de descarga para archivos no visualizables */
  mostrarOpcionDescarga(archivo: any) {
    const nombreArchivo = archivo.nombre || archivo.nombre_archivo;
    const tipoLegible = this.getTipoArchivoLegible(archivo.tipo_archivo || archivo.tipo);
    
    Swal.fire({
      title: `Archivo ${tipoLegible}`,
      html: `
        <div class="text-center">
          <mat-icon class="text-4xl text-blue-500 mb-3">description</mat-icon>
          <p class="text-lg font-semibold text-gray-800 mb-2">${nombreArchivo}</p>
          <p class="text-gray-600 mb-4">
            Los archivos <strong>${tipoLegible.toLowerCase()}</strong> no se pueden visualizar directamente en el navegador.
          </p>
          <p class="text-sm text-gray-500">
            ¿Quieres descargar el archivo para abrirlo en la aplicación correspondiente?
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, descargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.descargarArchivo(archivo);
      }
    });
  }

  /** Mostrar opción de descarga para archivos del chat no visualizables */
  mostrarOpcionDescargaChat(mensaje: any) {
    const nombreArchivo = mensaje.nombre_archivo;
    const tipoLegible = this.getTipoArchivoLegible(mensaje.tipo_archivo);
    
    Swal.fire({
      title: `Archivo ${tipoLegible}`,
      html: `
        <div class="text-center">
          <mat-icon class="text-4xl text-blue-500 mb-3">description</mat-icon>
          <p class="text-lg font-semibold text-gray-800 mb-2">${nombreArchivo}</p>
          <p class="text-gray-600 mb-4">
            Los archivos <strong>${tipoLegible.toLowerCase()}</strong> no se pueden visualizar directamente en el navegador.
          </p>
          <p class="text-sm text-gray-500">
            ¿Quieres descargar el archivo para abrirlo en la aplicación correspondiente?
          </p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, descargar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6b7280'
    }).then((result) => {
      if (result.isConfirmed) {
        this.descargarArchivoChat(mensaje);
      }
    });
  }

  /** ================== MÉTODOS PARA IMÁGENES ================== */

  /** Verificar si un tipo de archivo es imagen */
  isImageType(tipoArchivo: string | undefined | null): boolean {
    if (!tipoArchivo) return false;
    if (tipoArchivo === 'IMAGEN') return true;
    return this.fileUploadService.isImageType(tipoArchivo);
  }

  /** Obtener URL de imagen para mostrar en el chat - CORREGIDO */
  getImageUrl(mensaje: any): string {
    const nombreArchivo = mensaje.nombre_archivo;
    const archivoUrl = mensaje.archivo_url;
    
    if (!nombreArchivo) return '';
    
    return this.fileUploadService.getChatImageUrl(this.ticketId, nombreArchivo, archivoUrl);
  }

  /** Obtener URL para archivos adjuntos */
  getImageUrlForArchivo(archivo: any): string {
    if (archivo.nombre_archivo) {
      return this.fileUploadService.getSafeImageUrl(this.ticketId, archivo.nombre_archivo);
    }
    return '';
  }

  /** Ver imagen ampliada desde el chat */
  verImagenAmpliadaChat(mensaje: any): void {
    const imageUrl = this.getImageUrl(mensaje);
    if (imageUrl) {
      this.verImagenAmpliada(imageUrl, mensaje.nombre_archivo || 'Imagen');
    }
  }

  /** Ver imagen ampliada desde lista de archivos */
  verImagenArchivo(archivo: any): void {
    const imageUrl = this.getImageUrlForArchivo(archivo);
    if (imageUrl) {
      this.verImagenAmpliada(imageUrl, archivo.nombre_archivo || archivo.nombre || 'Imagen');
    }
  }

  /** Modal para imagen ampliada - MEJORADO */
  verImagenAmpliada(imagenUrl: string, nombreArchivo: string): void {
    // Preload image para mejor experiencia
    const img = new Image();
    img.src = imagenUrl;
    
    img.onload = () => {
      Swal.fire({
        html: `
          <div class="text-center">
            <img src="${imagenUrl}" 
                 alt="${nombreArchivo}" 
                 class="max-w-full max-h-[80vh] mx-auto rounded-lg shadow-2xl cursor-zoom-out object-contain"
                 id="imagen-ampliada"
                 loading="eager">
            <p class="mt-4 text-sm text-gray-600 font-medium">${nombreArchivo}</p>
            <p class="text-xs text-gray-500 mt-1">
              Haz clic en la imagen para cerrar • 
              <button id="descargar-imagen" class="text-blue-500 hover:text-blue-700 underline text-xs">
                Descargar imagen
              </button>
            </p>
          </div>
        `,
        width: 'auto',
        padding: '0',
        background: 'rgba(0,0,0,0.9)',
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
          const imagen = document.getElementById('imagen-ampliada');
          const descargarBtn = document.getElementById('descargar-imagen');
          
          if (imagen) {
            imagen.addEventListener('click', () => Swal.close());
          }
          
          if (descargarBtn) {
            descargarBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              this.descargarImagenDirectamente(imagenUrl, nombreArchivo);
            });
          }
          
          document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') Swal.close();
          });
        }
      });
    };
    
    img.onerror = () => {
      Swal.fire('Error', 'No se pudo cargar la imagen', 'error');
    };
  }

  /** Descargar imagen directamente desde URL */
  descargarImagenDirectamente(imageUrl: string, fileName: string): void {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** Manejar error al cargar imagen */
  handleImageError(event: any): void {
    const imgElement = event.target;
    imgElement.style.display = 'none';
    
    const parent = imgElement.parentElement;
    if (parent && !parent.querySelector('.image-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'image-error text-center p-2 text-gray-500 bg-gray-100 rounded';
      errorDiv.innerHTML = `
        <mat-icon class="text-lg text-gray-400">broken_image</mat-icon>
        <p class="text-xs mt-1">Error al cargar imagen</p>
      `;
      parent.appendChild(errorDiv);
    }
  }

  /** Obtener tipo de archivo legible */
  getTipoArchivoLegible(tipoArchivo: string | undefined): string {
    if (!tipoArchivo) return 'Archivo';
    
    if (tipoArchivo === 'IMAGEN' || this.isImageType(tipoArchivo)) return 'Imagen';
    if (tipoArchivo.includes('pdf') || tipoArchivo === 'PDF') return 'PDF';
    if (tipoArchivo.includes('word') || tipoArchivo.includes('document')) return 'Documento';
    if (tipoArchivo.includes('excel') || tipoArchivo.includes('spreadsheet')) return 'Hoja de cálculo';
    if (tipoArchivo.includes('video')) return 'Video';
    
    return 'Archivo';
  }

  /** Verificar si se puede mostrar vista previa - MEJORADO */
  puedeMostrarVistaPrevia(tipoArchivo: string | undefined): boolean {
    if (!tipoArchivo) return false;
    
    // Verificar por tipo MIME o tipo personalizado del backend
    if (tipoArchivo === 'IMAGEN' || 
        this.isImageType(tipoArchivo) || 
        tipoArchivo.includes('pdf') || 
        tipoArchivo.includes('PDF') ||
        tipoArchivo.includes('text') ||
        tipoArchivo.includes('html') ||
        tipoArchivo.includes('json') ||
        tipoArchivo.includes('csv')) {
      return true;
    }
      
    // Si no tenemos tipo MIME, verificar por extensión del nombre
    const extension = this.fileUploadService.getFileExtension(tipoArchivo).toLowerCase();
    const viewableExtensions = [
      'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 
      'pdf', 'txt', 'html', 'htm', 'csv', 'json'
    ];
    
    return viewableExtensions.includes(extension);
  }

  /** ================== MÉTODOS PARA PDF ================== */

  /** Descargar PDF del ticket */
  descargarPdf() {
    this.generandoPdf = true;
    
    const sub = this.ticketsService.descargarPdfTicket(this.ticketId).subscribe({
      next: (blob: Blob) => {
        this.generandoPdf = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ticket-${this.ticketId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        Swal.fire('Éxito', 'PDF descargado correctamente', 'success');
      },
      error: (error: any) => {
        console.error('Error al descargar PDF:', error);
        this.generandoPdf = false;
        Swal.fire('Error', 'No se pudo descargar el PDF', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Ver PDF del ticket en nueva pestaña */
  verPdf() {
    this.generandoPdf = true;
    
    const sub = this.ticketsService.verPdfTicket(this.ticketId).subscribe({
      next: (blob: Blob) => {
        this.generandoPdf = false;
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        Swal.fire('Éxito', 'PDF abierto en nueva pestaña', 'success');
      },
      error: (error: any) => {
        console.error('Error al abrir PDF:', error);
        this.generandoPdf = false;
        Swal.fire('Error', 'No se pudo abrir el PDF', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Abrir logs en modal - CORREGIDO: Solo logs del ticket actual */
  /** Abrir logs en modal - SOLO PARA TÉCNICOS Y ADMINISTRADORES */
abrirLogs() {
  const usuario = this.getUsuarioActual();
  
  // ✅ VERIFICAR PERMISOS: SOLO TÉCNICOS Y ADMINISTRADORES
  if (usuario.rol !== 'TECNICO' && usuario.rol !== 'ADMINISTRADOR') {
    Swal.fire({
      title: 'Acceso Restringido',
      html: `
        <div class="text-center">
          <mat-icon class="text-4xl text-yellow-500 mb-4">lock</mat-icon>
          <p class="text-lg font-medium text-gray-800 mb-2">No tienes permisos</p>
          <p class="text-gray-600">Los logs del sistema solo están disponibles para el personal técnico y administradores.</p>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#3085d6'
    });
    return;
  }

  const logsData = this.getLogs();
  
  // Filtrar logs solo del ticket actual
  const logsFiltrados = this.filtrarLogsPorTicket(logsData);
  
  Swal.fire({
    title: '🔧 Historial de Logs - Ticket #' + (this.getTicket()?.id || ''),
    html: `
      <div class="max-h-96 overflow-y-auto text-left">
        ${logsFiltrados.length === 0 ? 
          '<p class="text-gray-500 text-center py-8">No hay registros de logs para este ticket</p>' : 
          logsFiltrados.map((log: any) => `
            <div class="border-b border-gray-200 py-3">
              <div class="flex justify-between items-start mb-2">
                <strong class="text-gray-900">${this.getUserName(log.usuario)}</strong>
                <span class="text-xs text-gray-500">${new Date(log.fecha_cambio).toLocaleString('es-ES')}</span>
              </div>
              <p class="text-sm text-gray-700 mb-1">${log.accion || 'Modificación'}</p>
              ${log.estado_anterior || log.estado_nuevo ? `
                <div class="flex items-center gap-2 text-xs">
                  ${log.estado_anterior ? `<span class="bg-gray-100 px-2 py-1 rounded">${log.estado_anterior}</span>` : ''}
                  ${log.estado_anterior && log.estado_nuevo ? '<span class="text-gray-400">→</span>' : ''}
                  ${log.estado_nuevo ? `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">${log.estado_nuevo}</span>` : ''}
                </div>
              ` : ''}
              ${log.comentarios ? `<p class="text-xs text-gray-600 mt-2">${log.comentarios}</p>` : ''}
            </div>
          `).join('')}
      </div>
    `,
    width: '700px',
    showCancelButton: true,
    confirmButtonText: 'Cerrar',
    cancelButtonText: 'Descargar PDF',
    showCloseButton: true,
    customClass: {
      title: 'text-gray-800 font-bold'
    }
  }).then((result) => {
    if (result.dismiss === 'cancel') {
      this.descargarPdf();
    }
  });
}

  /** Filtrar logs solo del ticket actual - NUEVO MÉTODO */
  private filtrarLogsPorTicket(logsData: { activos: any[], eliminados: any[] }): any[] {
    const todosLosLogs = [
      ...(logsData.activos || []),
      ...(logsData.eliminados || [])
    ];
    
    // Filtrar logs que pertenezcan al ticket actual
    return todosLosLogs.filter(log => {
      // Si el log tiene ticket_id, comparar con el ticket actual
      if (log.ticket_id) {
        return log.ticket_id === this.ticketId;
      }
      
      // Si no tiene ticket_id, asumir que pertenece al ticket actual
      // (para compatibilidad con logs antiguos)
      return true;
    });
  }

  /** ================== MÉTODOS NUEVOS PARA BASE DE CONOCIMIENTO ================== */

  /** Cerrar ticket - CORREGIDO: Ahora el cliente también puede cerrar */
  /** Cerrar ticket - AHORA PERMITIDO PARA CLIENTES */
/** Cerrar ticket - CON PERMISOS ESPECÍFICOS */
cerrarTicket() {
  const usuario = this.getUsuarioActual();
  const ticket = this.getTicket();
  
  if (!ticket) {
    Swal.fire('Error', 'No se pudo cargar la información del ticket', 'error');
    return;
  }

  // ✅ VALIDACIÓN DE PERMISOS MEJORADA
  if (usuario.rol === 'CLIENTE') {
    // Cliente solo puede cerrar SUS propios tickets
    const esPropietario = ticket.entidad_usuario?.usuario?.id === usuario.id;
    
    if (!esPropietario) {
      Swal.fire('Error', 'Solo puedes cerrar tus propios tickets', 'error');
      return;
    }
  } else if (usuario.rol === 'TECNICO') {
    // Técnico puede cerrar tickets ASIGNADOS a él + tickets de clientes
    const esTecnicoAsignado = ticket.tecnico_id === usuario.id;
    const esTicketDeCliente = ticket.entidad_usuario?.usuario?.rol === 'CLIENTE';
    
    if (!esTecnicoAsignado && !esTicketDeCliente) {
      Swal.fire('Error', 'Solo puedes cerrar tickets asignados a ti o tickets de clientes', 'error');
      return;
    }
  }
  // ADMINISTRADOR: Sin restricciones (puede cerrar cualquier ticket)

  Swal.fire({
    title: '¿Cerrar definitivamente este ticket?',
    html: `
      <div class="text-left">
        <p class="text-gray-700 mb-3">Estás a punto de <strong>cerrar definitivamente</strong> este ticket.</p>
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-sm text-yellow-700 flex items-center gap-2">
            <mat-icon class="text-sm">info</mat-icon>
            <strong>Una vez cerrado:</strong>
          </p>
          <ul class="text-xs text-yellow-600 list-disc ml-5 mt-1 space-y-1">
            <li>No podrás enviar más mensajes</li>
            <li>El ticket aparecerá como "Cerrado"</li>
            <li>Podrás reabrir si necesitas más ayuda</li>
          </ul>
        </div>
        <p class="text-xs text-gray-500 mt-3">
          <strong>Usuario:</strong> ${usuario.nombre} (${usuario.rol})<br>
          <strong>Ticket:</strong> #${ticket.id} - ${ticket.titulo}
        </p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, cerrar ticket',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    width: '500px'
  }).then((result) => {
    if (result.isConfirmed) {
      this.cargando = true;

      const sub = this.ticketsService.cerrarTicket(this.ticketId).subscribe({
        next: (response: any) => {
          this.cargando = false;
          
          if (response.isSuccess) {
            Swal.fire({
              title: '✅ Ticket Cerrado',
              text: 'El ticket ha sido cerrado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.dialogRef.close('updated');
            });
          } else {
            Swal.fire('Error', response.message || 'Error al cerrar el ticket', 'error');
          }
        },
        error: (error: any) => {
          this.cargando = false;
          console.error('❌ Error al cerrar ticket:', error);
          Swal.fire('Error', 'No se pudo cerrar el ticket', 'error');
        }
      });
      this.subscriptions.push(sub);
    }
  });
}

  /** Cerrar ticket como TÉCNICO o ADMIN */
  private cerrarTicketTecnico() {
    Swal.fire({
      title: '🎯 ¿Cerrar Ticket?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4">Estás a punto de marcar este ticket como <strong>resuelto</strong>.</p>
          <p class="text-gray-600 mb-2">¿Qué deseas hacer con la solución?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '📝 Crear Artículo',
      cancelButtonText: '✅ Solo Cerrar',
      showDenyButton: true,
      denyButtonText: '✏️ Describir Pasos',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6b7280',
      denyButtonColor: '#f59e0b',
      width: '500px'
    }).then((result) => {
      if (result.isConfirmed) {
        // Opción 1: Cerrar y crear artículo automáticamente
        this.cerrarYCrearArticuloAutomatico();
      } else if (result.isDenied) {
        // Opción 2: El técnico describe los pasos
        this.cerrarYDescribirPasos();
      } else {
        // Opción 3: Solo cerrar el ticket
        this.cerrarTicketSinArticulo();
      }
    });
  }

  /** Cerrar ticket como CLIENTE */
  private cerrarTicketCliente() {
    Swal.fire({
      title: '¿Cerrar Ticket?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4">Estás a punto de marcar este ticket como <strong>resuelto</strong>.</p>
          <p class="text-gray-600 mb-2">Al cerrar el ticket:</p>
          <ul class="text-gray-600 text-sm space-y-1 mb-4">
            <li>• ✅ Se considerará que tu problema ha sido solucionado</li>
            <li>• 📁 El ticket se archivará en tu historial</li>
            <li>• 🔒 No podrás enviar más mensajes en este ticket</li>
          </ul>
          <p class="text-gray-700 font-semibold">¿Confirmas que el problema ha sido resuelto?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar ticket',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      width: '500px'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cerrarTicketSinArticulo();
      }
    });
  }

  /** Cerrar ticket y crear artículo automáticamente */
  private cerrarYCrearArticuloAutomatico() {
    this.cargando = true;
    
    const fechaResolucion = new Date().toISOString();
    
    const sub = this.ticketsService.marcarResuelto(this.ticketId, fechaResolucion).subscribe({
      next: (response: any) => {
        this.cargando = false;
        
        if (response.isSuccess) {
          // ✅ Ticket cerrado exitosamente, ahora crear artículo automáticamente
          this.crearArticuloAutomatico();
        } else {
          Swal.fire('Error', response.message || 'Error al cerrar el ticket', 'error');
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('❌ Error al cerrar ticket:', error);
        Swal.fire('Error', 'No se pudo cerrar el ticket', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Cerrar ticket sin crear artículo */
  private cerrarTicketSinArticulo() {
    this.cargando = true;
    
    const fechaResolucion = new Date().toISOString();
    
    const sub = this.ticketsService.marcarResuelto(this.ticketId, fechaResolucion).subscribe({
      next: (response: any) => {
        this.cargando = false;
        
        if (response.isSuccess) {
          Swal.fire({
            title: '✅ Ticket Cerrado',
            text: 'El ticket ha sido marcado como resuelto correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.dialogRef.close('updated');
          });
        } else {
          Swal.fire('Error', response.message || 'Error al cerrar el ticket', 'error');
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('❌ Error al cerrar ticket:', error);
        Swal.fire('Error', 'No se pudo cerrar el ticket', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Cerrar ticket y permitir al técnico describir los pasos */
  private cerrarYDescribirPasos() {
    this.cargando = true;
    
    const fechaResolucion = new Date().toISOString();
    
    const sub = this.ticketsService.marcarResuelto(this.ticketId, fechaResolucion).subscribe({
      next: (response: any) => {
        this.cargando = false;
        
        if (response.isSuccess) {
          // ✅ Ticket cerrado, ahora abrir editor para describir pasos
          this.abrirEditorPasosTecnico();
        } else {
          Swal.fire('Error', response.message || 'Error al cerrar el ticket', 'error');
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('❌ Error al cerrar ticket:', error);
        Swal.fire('Error', 'No se pudo cerrar el ticket', 'error');
      }
    });
    this.subscriptions.push(sub);
  }

  /** Crear artículo automáticamente desde el ticket */
  private crearArticuloAutomatico() {
    this.cargando = true;
    
    // CORREGIDO: Solo pasa el ticketId (1 argumento)
    this.baseConocimientoService.createFromTicket(this.ticketId)
      .subscribe({
        next: (response: any) => {
          this.cargando = false;
          if (response.isSuccess) {
            Swal.fire({
              title: '🎉 ¡Éxito Completo!',
              html: `
                <div class="text-center">
                  <div class="text-6xl mb-4">📚</div>
                  <p class="text-lg font-semibold text-gray-800 mb-2">Ticket cerrado y artículo creado</p>
                  <p class="text-gray-600">La solución se ha agregado automáticamente a la base de conocimiento</p>
                  <div class="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 text-left">
                    <p class="text-sm font-medium text-green-800">📌 Artículo creado:</p>
                    <p class="text-sm text-green-700">"${response.data?.titulo || 'Solución del ticket'}"</p>
                  </div>
                </div>
              `,
              showCancelButton: true,
              confirmButtonText: '👀 Ver Artículo',
              cancelButtonText: 'Cerrar',
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#6b7280',
              width: '500px'
            }).then((result) => {
              if (result.isConfirmed) {
                // Redirigir a la base de conocimiento
                this.dialogRef.close('updated');
                this.router.navigate(['/base-conocimiento']);
              } else {
                this.dialogRef.close('updated');
              }
            });
          } else {
            Swal.fire('Error', response.message || 'Error al crear artículo', 'error');
            this.dialogRef.close('updated');
          }
        },
        error: (error) => {
          this.cargando = false;
          console.error('❌ Error al crear artículo:', error);
          Swal.fire({
            title: '⚠️ Ticket Cerrado',
            html: `
              <div class="text-center">
                <p class="text-gray-800 mb-2">El ticket se cerró correctamente</p>
                <p class="text-gray-600">Pero hubo un error al crear el artículo: ${error.message}</p>
              </div>
            `,
            icon: 'warning'
          }).then(() => {
            this.dialogRef.close('updated');
          });
        }
      });
  }

  /** Abrir editor para que el técnico describa los pasos realizados */
  private abrirEditorPasosTecnico() {
    const ticket = this.getTicket();
    const ultimoMensajeTecnico = this.obtenerUltimoMensajeTecnico();
    
    Swal.fire({
      title: '✍️ Describir la Solución',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Título del Artículo</label>
            <input 
              id="titulo-articulo" 
              class="swal2-input w-full" 
              placeholder="Ej: Cómo solucionar problema de conexión"
              value="Solución: ${ticket?.titulo || 'Ticket Resuelto'}"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Pasos Realizados</label>
            <textarea 
              id="pasos-solucion" 
              class="swal2-textarea w-full" 
              rows="8" 
              placeholder="Describe detalladamente los pasos que seguiste para resolver el problema..."
            >${ultimoMensajeTecnico}</textarea>
            <p class="text-xs text-gray-500 mt-1">Este contenido será visible para otros usuarios en la base de conocimiento</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Palabras Clave</label>
            <input 
              id="palabras-clave" 
              class="swal2-input w-full" 
              placeholder="conexion, router, internet, red"
              value="${this.extraerPalabrasClave(ticket?.titulo || '')}"
            >
            <p class="text-xs text-gray-500 mt-1">Separa con comas para facilitar las búsquedas</p>
          </div>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: '📚 Crear Artículo',
      cancelButtonText: '❌ Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      preConfirm: () => {
        const titulo = (document.getElementById('titulo-articulo') as HTMLInputElement).value;
        const pasos = (document.getElementById('pasos-solucion') as HTMLTextAreaElement).value;
        const palabrasClave = (document.getElementById('palabras-clave') as HTMLInputElement).value;

        if (!titulo.trim()) {
          Swal.showValidationMessage('El título es obligatorio');
          return false;
        }

        if (!pasos.trim()) {
          Swal.showValidationMessage('La descripción de los pasos es obligatoria');
          return false;
        }

        return {
          titulo: titulo.trim(),
          contenido: pasos.trim(),
          palabras_clave: palabrasClave.trim()
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.crearArticuloPersonalizado(result.value);
      } else {
        // El técnico canceló la creación del artículo, pero el ticket ya está cerrado
        Swal.fire('Ticket Cerrado', 'El ticket se marcó como resuelto', 'info');
        this.dialogRef.close('updated');
      }
    });
  }

  /** Crear artículo personalizado con los datos del técnico */
  private crearArticuloPersonalizado(datos: { titulo: string, contenido: string, palabras_clave: string }) {
    this.cargando = true;

    // CORREGIDO: Incluye el autor_id requerido
    const articuloData = {
      titulo: datos.titulo,
      contenido: datos.contenido,
      palabras_clave: datos.palabras_clave,
      ticket_id: this.ticketId,
      autor_id: this.usuarioActual.id
    };

    this.baseConocimientoService.create(articuloData).subscribe({
      next: (response: any) => {
        this.cargando = false;
        if (response.isSuccess) {
          Swal.fire({
            title: '📖 ¡Artículo Creado!',
            html: `
              <div class="text-center">
                <div class="text-6xl mb-4">✅</div>
                <p class="text-lg font-semibold text-gray-800 mb-2">Artículo guardado en la base de conocimiento</p>
                <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-left">
                  <p class="text-sm font-medium text-blue-800">📌 Título:</p>
                  <p class="text-sm text-blue-700">"${datos.titulo}"</p>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Ver Base de Conocimiento',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#6b7280'
          }).then((result) => {
            if (result.isConfirmed) {
              this.dialogRef.close('updated');
              this.router.navigate(['/base-conocimiento']);
            } else {
              this.dialogRef.close('updated');
            }
          });
        } else {
          Swal.fire('Error', response.message || 'Error al crear artículo', 'error');
          this.dialogRef.close('updated');
        }
      },
      error: (error) => {
        this.cargando = false;
        console.error('❌ Error al crear artículo personalizado:', error);
        Swal.fire('Error', 'No se pudo crear el artículo: ' + error.message, 'error');
        this.dialogRef.close('updated');
      }
    });
  }

  /** Obtener el último mensaje del técnico para pre-llenar */
  private obtenerUltimoMensajeTecnico(): string {
    const mensajesTecnico = this.getMensajes().filter(m => 
      m.usuario_id === this.usuarioActual.id || 
      (m.usuario && m.usuario.rol === 'TECNICO')
    );
    
    if (mensajesTecnico.length > 0) {
      const ultimoMensaje = mensajesTecnico[mensajesTecnico.length - 1];
      if (ultimoMensaje.mensaje && !ultimoMensaje.mensaje.startsWith('Archivo:')) {
        return ultimoMensaje.mensaje;
      }
    }
    
    // Mensaje por defecto con estructura de pasos
    return `Pasos realizados para solucionar el problema:

1. 🔍 Diagnóstico inicial del problema
2. 🛠️ Aplicación de la solución
3. ✅ Verificación de resultados
4. 🎯 Confirmación de resolución

El problema fue resuelto satisfactoriamente.`;
  }

  /** Extraer palabras clave automáticamente del título */
  private extraerPalabrasClave(titulo: string): string {
    if (!titulo) return '';
    
    const palabrasComunes = ['de', 'la', 'el', 'en', 'y', 'con', 'para', 'por', 'se', 'un', 'una', 'los', 'las'];
    const palabras = titulo.toLowerCase()
      .split(/[\s,.;]+/)
      .filter(palabra => 
        palabra.length > 3 && 
        !palabrasComunes.includes(palabra) &&
        !palabra.match(/^\d+$/) // excluir números solos
      )
      .slice(0, 6); // máximo 6 palabras clave
    
    return palabras.join(',');
  }

  /** Reactivar ticket - VERSIÓN CORREGIDA */
  reactivarTicket() {
    Swal.fire({
      title: '¿Reactivar ticket?',
      text: 'Este ticket volverá a estado activo y podrás enviar mensajes nuevamente',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;

        // ✅ CORRECCIÓN: Usar el endpoint de reapertura en lugar de actualizar fecha_resolucion
        const sub = this.ticketsService.reabrirTicket(
          this.ticketId, 
          'Ticket reactivado por el usuario'
        ).subscribe({
          next: (response: any) => {
            this.cargando = false;
            
            if (response.isSuccess || response.data) {
              Swal.fire('¡Reactivado!', 'El ticket ha sido reactivado correctamente', 'success');
              this.cargarDetalleTicket(); // Recargar para actualizar estado
              
              // DEBUG: Verificar el nuevo estado
              setTimeout(() => {
                console.log('🔄 Estado después de reactivar:', {
                  estadoTicket: this.detalleTicket?.ticket?.estado_ticket,
                  fechaResolucion: this.detalleTicket?.ticket?.fecha_resolucion,
                  puedeEnviarMensajes: this.puedeEnviarMensajes()
                });
              }, 1000);
            } else {
              Swal.fire('Error', response.message || 'Error al reactivar el ticket', 'error');
            }
          },
          error: (error: any) => {
            this.cargando = false;
            console.error('❌ Error al reactivar ticket:', error);
            Swal.fire('Error', 'No se pudo reactivar el ticket', 'error');
          }
        });
        this.subscriptions.push(sub);
      }
    });
  }

  /** ================== MÉTODO NUEVO: CERRAR TICKET DEFINITIVAMENTE ================== */

  /** Cerrar ticket definitivamente (para clientes, técnicos y administradores) */
  cerrarTicketDefinitivamente() {
    Swal.fire({
      title: '¿Cerrar ticket definitivamente?',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4">Estás a punto de <strong>cerrar definitivamente</strong> este ticket.</p>
          <p class="text-gray-600 mb-2">Al cerrar el ticket:</p>
          <ul class="text-gray-600 text-sm space-y-1 mb-4">
            <li>• ✅ Se marcará como <strong>CERRADO</strong></li>
            <li>• 🔒 No podrás enviar más mensajes</li>
            <li>• 📁 El ticket se archivará en tu historial</li>
            <li>• 🔄 Podrás reabrir el ticket si es necesario</li>
          </ul>
          <p class="text-gray-700 font-semibold">¿Confirmas que deseas cerrar este ticket?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar definitivamente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      width: '500px'
    }).then((result) => {
      if (result.isConfirmed) {
        this.cargando = true;

        const sub = this.ticketsService.cerrarTicket(this.ticketId).subscribe({
          next: (response: any) => {
            this.cargando = false;
            
            if (response.isSuccess || response.data) {
              Swal.fire({
                title: '✅ Ticket Cerrado',
                text: 'El ticket ha sido cerrado definitivamente',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              }).then(() => {
                this.dialogRef.close('updated');
              });
            } else {
              Swal.fire('Error', response.message || 'Error al cerrar el ticket', 'error');
            }
          },
          error: (error: any) => {
            this.cargando = false;
            console.error('❌ Error al cerrar ticket definitivamente:', error);
            Swal.fire('Error', 'No se pudo cerrar el ticket', 'error');
          }
        });
        this.subscriptions.push(sub);
      }
    });
  }

  /** ================== UTILIDADES ================== */

  /** Verificar si el ticket está resuelto - VERSIÓN CORREGIDA */
  isTicketResuelto(): boolean {
    const ticket = this.detalleTicket?.ticket;
    
    if (!ticket) return false;
    
    // ✅ CORRECCIÓN: Verificar por estado_ticket en lugar de fecha_resolucion
    const estadoTicket = ticket.estado_ticket;
    
    console.log('🔍 Estado del ticket:', {
      estadoTicket,
      fechaResolucion: ticket.fecha_resolucion,
      ticketId: ticket.id
    });
    
    // Si el estado es RESUELTO o CERRADO, el ticket está resuelto
    if (estadoTicket === 'RESUELTO' || estadoTicket === 'CERRADO') {
      return true;
    }
    
    // Si el estado es REABIERTO, EN_PROCESO, NUEVO, etc., NO está resuelto
    return false;
  }

  getLogs(): { activos: any[], eliminados: any[] } {
    const logsData = this.detalleTicket?.logs || { activos: [], eliminados: [] };
    
    if (Array.isArray(logsData)) {
      return { activos: logsData, eliminados: [] };
    }
    
    return {
      activos: (logsData as any).activos || [],
      eliminados: (logsData as any).eliminados || []
    };
  }

  /** Obtener el total de logs */
  getTotalLogs(): number {
    const logsData = this.getLogs();
    const logsFiltrados = this.filtrarLogsPorTicket(logsData);
    return logsFiltrados.length;
  }

  puedeEnviarMensajes(): boolean {
    const ticket = this.detalleTicket?.ticket;
    
    if (!ticket || !this.getUsuarioActual().id) {
      return false;
    }
    
    const puedeEnviar = !this.isTicketResuelto();
    
    console.log('🔍 Verificando si puede enviar mensajes:', {
      ticketId: ticket.id,
      estadoTicket: ticket.estado_ticket,
      fechaResolucion: ticket.fecha_resolucion,
      isTicketResuelto: this.isTicketResuelto(),
      puedeEnviar: puedeEnviar,
      usuario: this.getUsuarioActual().nombre
    });
    
    return puedeEnviar;
  }

  esUsuarioActual(usuarioId: number | undefined | null): boolean {
    if (!usuarioId) return false;
    return usuarioId === this.getUsuarioActual().id;
  }

  getFileIcon(tipoArchivo: string | undefined): string {
    return this.fileUploadService.getFileTypeIcon(tipoArchivo || '');
  }

  formatFileSize(bytes: number | undefined): string {
    return this.fileUploadService.formatFileSize(bytes || 0);
  }

  getUserName(user: any): string {
    return user?.nombre_usuario || 'Usuario';
  }

  getUserInitial(user: any): string {
    return this.getUserName(user)?.charAt(0) || 'U';
  }

  getUserEmail(user: any): string {
    return user?.correo_electronico || '';
  }

  getCategoryName(category: any): string {
    return category?.nombre || 'No asignada';
  }

  getPriorityName(priority: any): string {
    return priority?.nombre || 'No asignada';
  }

  getSLAName(sla: any): string {
    return sla?.nombre || 'No asignado';
  }

  getContractNumber(contract: any): string {
    return contract?.numero_contrato || 'No asignado';
  }

  getMensajes() { 
    return this.detalleTicket?.mensajes || [];
  }

  getArchivos() {
    return this.detalleTicket?.archivos || [];
  }

  getTicket() {
    return this.detalleTicket?.ticket || null;
  }

  getFechaCreacion(): string {
    const fecha = this.detalleTicket?.ticket?.fecha_creacion;
    return fecha ? new Date(fecha).toLocaleString('es-ES') : 'No disponible';
  }

  getFechaResolucion(): string {
    const fecha = this.detalleTicket?.ticket?.fecha_resolucion;
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    const fechaDefault = new Date('1970-01-01T00:00:00.000Z');
    
    if (fechaObj.getTime() === fechaDefault.getTime()) {
      return '';
    }
    
    return fechaObj.toLocaleString('es-ES');
  }

  getDescripcion(): string {
    return this.detalleTicket?.ticket?.descripcion || 'Sin descripción';
  }

  getTitulo(): string {
    return this.detalleTicket?.ticket?.titulo || 'Cargando...';
  }

  hasTecnico(): boolean {
    return !!this.detalleTicket?.ticket?.tecnico;
  }

  getTecnico() {
    return this.detalleTicket?.ticket?.tecnico || null;
  }

  /** Recargar manualmente */
  recargarTodo(): void {
    this.cargarDetalleTicket();
    Swal.fire('Actualizado', 'Datos actualizados correctamente', 'success');
  }

  /** Cerrar modal */
  cerrar() {
    this.dialogRef.close();
  }
}