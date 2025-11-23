import { Component, OnInit, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { NgxSpinnerService } from 'ngx-spinner';
import Swal from 'sweetalert2';
import { HttpEventType } from '@angular/common/http';

import { TicketsService } from '../../services/ticket.service';
import { CategoriasService } from '../../services/categorias.service';
import { SubcategoriasService } from '../../services/subcategorias.service';
import { ContratosService } from '../../services/contratos.service';
import { EntidadesUsuariosService } from '../../services/entidades-usuarios.service';
import { GlobalFuntions } from '../../services/global-funtions';
import { FileUploadService } from '../../services/file-upload.service';
import { SummernoteEditorComponent } from '../../../components/summernote-editor/summernote-editor.component';

@Component({
  selector: 'app-crear-ticket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatCardModule,
    MatChipsModule,
    SummernoteEditorComponent
  ],
  templateUrl: './crear-ticket.html'
})
export class CrearTicketComponent implements OnInit {
  private ticketsService = inject(TicketsService);
  private categoriasService = inject(CategoriasService);
  private subcategoriasService = inject(SubcategoriasService);
  private contratosService = inject(ContratosService);
  private entidadesUsuariosService = inject(EntidadesUsuariosService);
  public fileUploadService = inject(FileUploadService);
  private spinner = inject(NgxSpinnerService);
  private global = inject(GlobalFuntions);
  private router = inject(Router);

  // Datos del formulario
  ticketData: any = {
    titulo: '',
    descripcion: '',
    categoria_id: null,
    subcategoria_id: null
  };

  // Listas para selects
  categorias: any[] = [];
  subcategorias: any[] = [];

  // Datos automáticos del sistema
  contratoActivo: any = null;
  entidadUsuario: any = null;

  // Archivos adjuntos
  archivos: File[] = [];
  archivosSubiendo: any[] = [];
  archivosSubidos: any[] = [];
  enviando: boolean = false;

  @ViewChild(SummernoteEditorComponent) editor!: SummernoteEditorComponent;

  ngOnInit() {
    this.global.validacionToken();
    this.cargarDatosAutomaticos();
  }

  onEditorContentChange(content: string) {
    this.ticketData.descripcion = content;
  }

  // ✅ MÉTODO CORREGIDO: Manejar imágenes del editor como archivos adjuntos
  onEditorImageUpload(file: File) {
    console.log('🖼️ Imagen recibida del editor:', file.name, file.size);
    
    // Validar el archivo
    if (!this.fileUploadService.isValidFileSize(file)) {
      Swal.fire('Error', `La imagen ${file.name} es muy grande. Máximo 50MB`, 'error');
      return;
    }
    
    if (!this.fileUploadService.isValidFileType(file)) {
      Swal.fire('Error', `Tipo de imagen no permitido: ${file.name}`, 'error');
      return;
    }

    // Agregar a la lista de archivos por subir
    this.archivos.push(file);
    
    // Mostrar mensaje de confirmación
    Swal.fire({
      title: '¡Imagen adjuntada!',
      text: `La imagen "${file.name}" se ha guardado como archivo adjunto.`,
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    });

    console.log('📁 Archivos adjuntos actuales:', this.archivos.length);
  }

  private obtenerUsuarioLogueado(): number {
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Error', 'No se encontró sesión activa', 'error');
      this.router.navigate(['/login']);
      return 0;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    } catch (error) {
      console.error('Error decodificando token:', error);
      Swal.fire('Error', 'Error en la sesión', 'error');
      this.router.navigate(['/login']);
      return 0;
    }
  }

  cargarDatosAutomaticos() {
    const usuarioId = this.obtenerUsuarioLogueado();
    if (!usuarioId) return;

    this.spinner.show();

    this.entidadesUsuariosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.entidadUsuario = res.data.find((eu: any) => 
            eu.usuarioId === usuarioId && eu.activo
          );
          
          if (this.entidadUsuario) {
            this.cargarContratoActivo(this.entidadUsuario.entidadId);
          } else {
            this.spinner.hide();
            Swal.fire('Error', 'No tienes una empresa asignada', 'error');
          }
        } else {
          this.spinner.hide();
          Swal.fire('Error', 'Error al cargar datos de empresa', 'error');
        }
      },
      error: (err: any) => {
        this.spinner.hide();
        console.error('Error:', err);
        Swal.fire('Error', 'Error al conectar con el servidor', 'error');
      }
    });

    this.cargarCategorias();
  }

  cargarContratoActivo(entidadId: number) {
    this.contratosService.lista().subscribe({
      next: (res: any) => {
        this.spinner.hide();
        if (res.isSuccess) {
          this.contratoActivo = res.data.find((contrato: any) => 
            contrato.entidad_id === entidadId && 
            (contrato.estado_contrato === 'VIGENTE' || contrato.estado_contrato === 'RENOVADO') &&
            !contrato.eliminado
          );
          
          if (this.contratoActivo) {
            if (!this.contratoActivo.prioridad) {
              Swal.fire({
                title: 'Advertencia',
                text: 'Tu contrato activo no tiene una prioridad asignada. Los tickets no podrán crearse hasta que se solucione esto.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
              });
            }
          } else {
            Swal.fire('Error', 'No tienes un contrato activo', 'error');
          }
        }
      },
      error: (err: any) => {
        this.spinner.hide();
        console.error('Error:', err);
        Swal.fire('Error', 'Error al cargar contratos', 'error');
      }
    });
  }

  cargarCategorias() {
    this.categoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.categorias = (res.data || []).filter((cat:any) =>
          cat.estado === true && cat.eliminado === false
          );
        }
      },
      error: (err: any) => {
      console.error('Error al cargar categorías:', err);
      }
    });

    this.subcategoriasService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.subcategorias = (res.data || []).filter((sub: any) =>
          sub.estado ===true
          );
        }
      },
      error: (err: any) => {
      console.error('Error al cargar subcategorías:', err);
      }
    });
  }

  onCategoriaChange() {
    this.ticketData.subcategoria_id = null;
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (!this.fileUploadService.isValidFileSize(file)) {
          Swal.fire('Error', `El archivo ${file.name} es muy grande. Máximo 50MB`, 'error');
          continue;
        }
        
        if (!this.fileUploadService.isValidFileType(file)) {
          Swal.fire('Error', `Tipo de archivo no permitido: ${file.name}`, 'error');
          continue;
        }
        
        this.archivos.push(file);
      }
      event.target.value = '';
    }
  }

  eliminarArchivo(index: number) {
    this.archivos.splice(index, 1);
  }

  getSubcategoriasFiltradas() {
    if (!this.ticketData.categoria_id) return [];
    return this.subcategorias.filter(sub => sub.categoria_id == this.ticketData.categoria_id);
  }

  isFormValid(): boolean {
    return !!this.ticketData.titulo?.trim() && 
           !!this.ticketData.descripcion?.trim() && 
           !!this.ticketData.categoria_id &&
           !!this.contratoActivo &&
           !this.enviando;
  }

  async crearTicket() {
    if (!this.ticketData.titulo?.trim()) {
      Swal.fire('Error', 'El asunto es obligatorio', 'error');
      return;
    }

    const plainText = this.stripHtml(this.ticketData.descripcion).trim();
    if (!plainText) {
      Swal.fire('Error', 'La descripción es obligatoria', 'error');
      return;
    }

    if (!this.ticketData.categoria_id) {
      Swal.fire('Error', 'Debes seleccionar una categoría', 'error');
      return;
    }

    if (!this.contratoActivo) {
      Swal.fire('Error', 'No tienes un contrato activo', 'error');
      return;
    }

    if (!this.entidadUsuario) {
      Swal.fire('Error', 'No tienes una empresa asignada', 'error');
      return;
    }

    if (!this.contratoActivo.prioridad || !this.contratoActivo.prioridad.id) {
      Swal.fire({
        title: 'Error',
        text: 'El contrato activo no tiene una prioridad asignada. Contacta al administrador.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (this.enviando) return;

    this.enviando = true;
    this.spinner.show();

    const ticketCompleto = {
      titulo: this.ticketData.titulo.trim(),
      descripcion: this.ticketData.descripcion.trim(),
      categoria_id: Number(this.ticketData.categoria_id),
      subcategoria_id: this.ticketData.subcategoria_id ? Number(this.ticketData.subcategoria_id) : null,
      entidad_usuario_id: this.entidadUsuario.id,
      contrato_id: this.contratoActivo.id,
      sla_id: this.contratoActivo.sla_id,
      prioridad_id: this.contratoActivo.prioridad.id,
      tecnico_id: null,
      estado: true
    };

    console.log(' ENVIANDO TICKET:', ticketCompleto);

    this.ticketsService.crear(ticketCompleto).subscribe({
      next: async (res: any) => {
        if (res.isSuccess) {
          const ticketId = res.data.id;
          console.log('✅ Ticket creado con ID:', ticketId);
          
          if (this.archivos.length > 0) {
            console.log('📁 Subiendo archivos adjuntos...');
            const archivosSubidos = await this.subirArchivos(ticketId);
            
            if (!archivosSubidos) {
              Swal.fire({
                title: 'Advertencia',
                text: 'Ticket creado pero algunos archivos no se pudieron subir',
                icon: 'warning',
                confirmButtonText: 'Entendido'
              });
            }
          }

          this.spinner.hide();
          this.enviando = false;
          
          Swal.fire({
            title: '¡Ticket Creado!',
            text: 'Tu ticket ha sido creado exitosamente con todos los archivos adjuntos.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.router.navigate(['/cliente/inicio']);
          });
          
        } else {
          this.spinner.hide();
          this.enviando = false;
          Swal.fire({
            title: 'Error',
            text: res.message || 'Error al crear ticket',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (err: any) => {
        this.spinner.hide();
        this.enviando = false;
        console.error(' ERROR:', err);
        
        let errorMessage = 'Error al crear ticket';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        } else if (err.status === 500) {
          errorMessage = 'Error interno del servidor';
        }
        
        Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  async subirArchivos(ticketId: number): Promise<boolean> {
    if (this.archivos.length === 0) return true;

    const subidasExitosas: boolean[] = [];

    for (const archivo of this.archivos) {
      try {
        const resultado = await this.subirArchivoIndividual(ticketId, archivo);
        subidasExitosas.push(resultado);
      } catch (error) {
        console.error('Error subiendo archivo:', error);
        subidasExitosas.push(false);
      }
    }

    return subidasExitosas.every(exito => exito);
  }

  private subirArchivoIndividual(ticketId: number, archivo: File): Promise<boolean> {
    return new Promise((resolve) => {
      const archivoSubiendo = {
        nombre: archivo.name,
        progreso: 0,
        subiendo: true
      };
      this.archivosSubiendo.push(archivoSubiendo);

      this.fileUploadService.uploadTicketFile(ticketId, archivo).subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            const progreso = Math.round(100 * event.loaded / event.total);
            archivoSubiendo.progreso = progreso;
          } else if (event.type === HttpEventType.Response) {
            archivoSubiendo.subiendo = false;
            this.archivosSubidos.push(event.body.data);
            console.log('✅ Archivo subido:', event.body.data);
            resolve(true);
          }
        },
        error: (error) => {
          console.error('Error subiendo archivo:', error);
          archivoSubiendo.subiendo = false;
          resolve(false);
        }
      });
    });
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  cancelar() {
    if (!this.enviando) {
      this.router.navigate(['/cliente/inicio']);
    }
  }

  // Método para obtener el icono según el tipo de archivo
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'webp':
        return 'image';
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc': case 'docx':
        return 'description';
      case 'xls': case 'xlsx':
        return 'table_chart';
      case 'zip': case 'rar': case '7z':
        return 'folder_zip';
      default:
        return 'insert_drive_file';
    }
  }

  // Método para formatear el tamaño del archivo
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}