import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatProgressBarModule
  ],
  templateUrl: './crear-ticket.html'
})
export class CrearTicketComponent implements OnInit {
  private ticketsService = inject(TicketsService);
  private categoriasService = inject(CategoriasService);
  private subcategoriasService = inject(SubcategoriasService);
  private contratosService = inject(ContratosService);
  private entidadesUsuariosService = inject(EntidadesUsuariosService);
  public fileUploadService = inject(FileUploadService); // ← CAMBIADO A public
  private spinner = inject(NgxSpinnerService);
  private global = inject(GlobalFuntions);
  private router = inject(Router);

  // Datos del formulario - SOLO lo que el cliente completa
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
  usuarioLogueado: any = null;

  // Archivos - SISTEMA NUEVO
  archivos: File[] = [];
  archivosSubiendo: any[] = []; // Para progress bars
  archivosSubidos: any[] = []; // Archivos ya subidos con URLs
  enviando: boolean = false;

  ngOnInit() {
    this.global.validacionToken();
    this.cargarDatosAutomaticos();
  }

  // Obtener usuario logueado del JWT
  private obtenerUsuarioLogueado(): number {
    const token = localStorage.getItem('token');
    if (!token) {
      Swal.fire('Error', 'No se encontró sesión activa', 'error');
      this.router.navigate(['/login']);
      return 0;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('👤 Usuario logueado ID:', payload.userId);
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

    // 1. Buscar entidad_usuario del logueado
    this.entidadesUsuariosService.lista().subscribe({
      next: (res: any) => {
        if (res.isSuccess) {
          this.entidadUsuario = res.data.find((eu: any) => 
            eu.usuarioId === usuarioId && eu.activo
          );
          
          if (this.entidadUsuario) {
            console.log('🏢 Entidad usuario encontrada:', this.entidadUsuario);
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

    // 2. Cargar categorías y subcategorías
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
            console.log('📄 Contrato activo encontrado:', this.contratoActivo);
            
            // VERIFICAR SI TIENE PRIORIDAD
            if (!this.contratoActivo.prioridad) {
              console.warn('⚠️ CONTRATO SIN PRIORIDAD ASIGNADA');
              Swal.fire({
                title: 'Advertencia',
                text: 'Tu contrato activo no tiene una prioridad asignada. Los tickets no podrán crearse hasta que se solucione esto.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
              });
            } else {
              console.log('🎯 Prioridad del contrato:', this.contratoActivo.prioridad);
              console.log('🎯 Prioridad ID:', this.contratoActivo.prioridad.id);
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
          console.log(' Categorías activas cargadas:', this.categorias.length);
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
          console.log('Subcategorías activas cargadas:', this.subcategorias.length);
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
        
        // Validar usando el nuevo servicio (50MB máximo)
        if (!this.fileUploadService.isValidFileSize(file)) {
          Swal.fire('Error', `El archivo ${file.name} es muy grande. Máximo 50MB`, 'error');
          continue;
        }
        
        if (!this.fileUploadService.isValidFileType(file)) {
          Swal.fire('Error', `Tipo de archivo no permitido: ${file.name}`, 'error');
          continue;
        }
        
        // Agregar a lista de archivos por subir
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
    // Validaciones básicas
    if (!this.ticketData.titulo?.trim()) {
      Swal.fire('Error', 'El asunto es obligatorio', 'error');
      return;
    }

    if (!this.ticketData.descripcion?.trim()) {
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

    // VALIDAR QUE EXISTA PRIORIDAD ANTES DE ACCEDER A .id
    if (!this.contratoActivo.prioridad || !this.contratoActivo.prioridad.id) {
      console.error(' Error: Contrato no tiene prioridad asignada', this.contratoActivo);
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
      // Datos del cliente
      titulo: this.ticketData.titulo.trim(),
      descripcion: this.ticketData.descripcion.trim(),
      categoria_id: Number(this.ticketData.categoria_id),
      subcategoria_id: this.ticketData.subcategoria_id ? Number(this.ticketData.subcategoria_id) : null,
      
      // Datos automáticos del sistema
      entidad_usuario_id: this.entidadUsuario.id,
      contrato_id: this.contratoActivo.id,
      sla_id: this.contratoActivo.sla_id,
      prioridad_id: this.contratoActivo.prioridad.id, 
      tecnico_id: null,
      estado: true
    };

    console.log(' ENVIANDO TICKET:', ticketCompleto);
    console.log(' Prioridad ID:', this.contratoActivo.prioridad.id);

    this.ticketsService.crear(ticketCompleto).subscribe({
      next: async (res: any) => {
        if (res.isSuccess) {
          const ticketId = res.data.id;
          console.log('✅ Ticket creado con ID:', ticketId);
          
          // Subir archivos después de crear el ticket
          if (this.archivos.length > 0) {
            console.log('📁 Subiendo archivos...');
            const archivosSubidos = await this.subirArchivos(ticketId);
            
            if (!archivosSubidos) {
              Swal.fire({
                title: 'Advertencia',
                text: 'Ticket creado pero algunos archivos no se pudieron subir',
                icon: 'warning',
                confirmButtonText: 'Entendido'
              });
            } else {
              console.log('✅ Todos los archivos subidos correctamente');
            }
          }

          this.spinner.hide();
          this.enviando = false;
          
          Swal.fire({
            title: '¡Ticket Creado!',
            text: 'Tu ticket ha sido creado exitosamente. Un técnico se asignará pronto.',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.router.navigate(['/inicio']);
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
          const backendMessage = err.error.message;
          
          if (backendMessage.includes('Error validando relaciones')) {
            errorMessage = 'Error en los datos del ticket. Verifique que todos los campos sean válidos.';
          } else if (backendMessage.includes('no existe')) {
            errorMessage = 'Uno de los elementos seleccionados no existe.';
          } else if (backendMessage.includes('no está vigente')) {
            errorMessage = 'El contrato seleccionado no está vigente.';
          } else if (backendMessage.includes('Error de validación')) {
            errorMessage = 'Datos inválidos enviados al servidor.';
          } else {
            errorMessage = backendMessage;
          }
        } else if (err.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        } else if (err.status === 400) {
          errorMessage = 'Datos inválidos enviados al servidor';
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

  // NUEVO MÉTODO: Subir archivos después de crear el ticket
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

  // NUEVO MÉTODO: Subir archivo individual con progress bar
  private subirArchivoIndividual(ticketId: number, archivo: File): Promise<boolean> {
    return new Promise((resolve) => {
      // Agregar a lista de archivos subiendo
      const archivoSubiendo = {
        nombre: archivo.name,
        progreso: 0,
        subiendo: true
      };
      this.archivosSubiendo.push(archivoSubiendo);

      this.fileUploadService.uploadTicketFile(ticketId, archivo).subscribe({
        next: (event: any) => {
          if (event.type === HttpEventType.UploadProgress) {
            // Actualizar progreso
            const progreso = Math.round(100 * event.loaded / event.total);
            archivoSubiendo.progreso = progreso;
          } else if (event.type === HttpEventType.Response) {
            // Archivo subido exitosamente
            archivoSubiendo.subiendo = false;
            this.archivosSubidos.push(event.body.data);
            console.log('✅ Archivo subido:', event.body.data);
            resolve(true);
          }
        },
        error: (error) => {
          console.error('Error subiendo archivo:', error);
          archivoSubiendo.subiendo = false;
          Swal.fire('Error', `Error al subir ${archivo.name}`, 'error');
          resolve(false);
        }
      });
    });
  }

  cancelar() {
    if (!this.enviando) {
      this.router.navigate(['/inicio']);
    }
  }
}