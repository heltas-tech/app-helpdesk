import { Component, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var $: any;

@Component({
  selector: 'app-summernote-editor',
  template: `
    <div #editor class="summernote-container"></div>
    <div *ngIf="procesandoImagen" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg">
        <div class="flex items-center space-x-3">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span class="text-gray-700">Procesando imagen...</span>
        </div>
      </div>
    </div>
  `,
  standalone: true,
  imports: [CommonModule]
})
export class SummernoteEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editor') editorRef!: ElementRef;
  @Output() contentChange = new EventEmitter<string>();
  @Output() imageUpload = new EventEmitter<File>();
  @Input() initialContent: string = '';
  
  procesandoImagen: boolean = false;

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeSummernote();
    }, 100);
  }

  private initializeSummernote() {
    $(this.editorRef.nativeElement).summernote({
      placeholder: 'Describe detalladamente el problema...',
      tabsize: 2,
      height: 300,
      toolbar: [
        ['style', ['style']],
        ['font', ['bold', 'italic', 'underline', 'clear']],
        ['fontname', ['fontname']],
        ['color', ['color']],
        ['para', ['ul', 'ol', 'paragraph']],
        ['table', ['table']],
        ['insert', ['link', 'video']], // QUITAMOS 'picture' del toolbar
        ['view', ['fullscreen', 'codeview', 'help']]
      ],
      callbacks: {
        onImageUpload: (files: File[]) => {
          // Prevenir la subida automática de imágenes
          return false;
        },
        onChange: (content: string) => {
          this.contentChange.emit(content);
        },
        onPaste: (e: any) => {
          this.handlePaste(e);
        }
      }
    });

    if (this.initialContent) {
      $(this.editorRef.nativeElement).summernote('code', this.initialContent);
    }
  }

  /**
   * Manejar pegado de contenido - SOLO para imágenes
   */
  private handlePaste(e: any) {
    const clipboardData = e.originalEvent.clipboardData || (window as any).clipboardData;
    
    if (!clipboardData) return;
    
    // Verificar si se está pegando una imagen
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        
        const file = item.getAsFile();
        if (file) {
          this.procesarImagenComoArchivo(file);
        }
        return;
      }
    }
    
    // Si es texto normal, permitir el comportamiento normal
    // No hacemos nada para texto
  }

  /**
   * Procesar imagen como archivo adjunto
   */
  private async procesarImagenComoArchivo(file: File) {
    if (!file || !file.type.startsWith('image/')) return;

    try {
      this.procesandoImagen = true;
      
      // Comprimir imagen
      const compressedFile = await this.compressImage(file);
      
      // ✅ EMITIR el archivo para que el componente padre lo maneje como archivo adjunto
      this.imageUpload.emit(compressedFile);
      
    } catch (error) {
      console.error('Error procesando imagen:', error);
      // No mostramos error en el editor, solo en consola
    } finally {
      this.procesandoImagen = false;
    }
  }

  /**
   * Comprimir imagen
   */
  private compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const img = new Image();
        img.src = e.target.result;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Tamaño máximo para compresión
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 800;
          
          let width = img.width;
          let height = img.height;
          
          // Redimensionar si es muy grande
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            } else {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertir a Blob y luego a File
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], this.generateFileName(file.name), {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Error al comprimir imagen'));
            }
          }, 'image/jpeg', 0.8);
        };
        
        img.onerror = () => reject(new Error('Error al cargar imagen'));
      };
      
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Generar nombre único para el archivo
   */
  private generateFileName(originalName: string): string {
    const timestamp = new Date().getTime();
    const randomString = Math.random().toString(36).substring(2, 8);
    const originalWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    return `imagen-${originalWithoutExt}-${timestamp}-${randomString}.jpg`;
  }

  getContent(): string {
    return $(this.editorRef.nativeElement).summernote('code');
  }

  setContent(content: string): void {
    $(this.editorRef.nativeElement).summernote('code', content);
  }

  ngOnDestroy() {
    if (this.editorRef && this.editorRef.nativeElement) {
      $(this.editorRef.nativeElement).summernote('destroy');
    }
  }
}