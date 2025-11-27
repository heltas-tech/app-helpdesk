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
import { SlasService } from '../../services/slas.service'; // NUEVO SERVICIO

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
  private slasService = inject(SlasService); // NUEVO SERVICIO
  public fileUploadService = inject(FileUploadService);
  private spinner = inject(NgxSpinnerService);
  private global = inject(GlobalFuntions);
  private router = inject(Router);

  // Datos del formulario - SOLO lo que el cliente completa
  ticketData: any = {
    titulo: '',
    descripcion: '',
    categoria_id: null,
    subcategoria_id: null,
    prioridad_id: null // NUEVO CAMPO
  };

  // Listas para selects
  categorias: any[] = [];
  subcategorias: any[] = [];
  prioridadesSLA: any[] = []; // NUEVA LISTA PARA PRIORIDADES

  // Datos automáticos del sistema
  contratoActivo: any = null;
  entidadUsuario: any = null;
  usuarioLogueado: any = null;

  // Estados de carga
  prioridadesCargando: boolean = false;

  // Archivos
  archivos: File[] = [];
  archivosSubiendo: any[] = [];
  archivosSubidos: any[] = [];
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
            
            // ✅ NUEVO: Cargar prioridades del SLA
            this.cargarPrioridadesSLA(this.contratoActivo.sla_id);
            
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

  // ✅ NUEVO MÉTODO: Cargar prioridades del SLA
  cargarPrioridadesSLA(slaId: number) {
    this.prioridadesCargando = true;
    
    this.slasService.obtenerPrioridadesSLA(slaId).subscribe({
      next: (res: any) => {
        this.prioridadesCargando = false;
        
        if (res.isSuccess && res.data) {
          this.prioridadesSLA = res.data;
          console.log('🎯 Prioridades del SLA cargadas:', this.prioridadesSLA);
          
          if (this.prioridadesSLA.length === 0) {
            Swal.fire({
              title: 'Advertencia',
              text: 'El SLA de tu contrato no tiene prioridades configuradas. Contacta al administrador.',
              icon: 'warning',
              confirmButtonText: 'Entendido'
            });
          }
        } else {
          console.error('Error al cargar prioridades del SLA:', res.message);
          Swal.fire('Error', 'No se pudieron cargar las prioridades disponibles', 'error');
        }
      },
      error: (err: any) => {
        this.prioridadesCargando = false;
        console.error('Error al cargar prioridades del SLA:', err);
        Swal.fire('Error', 'Error al cargar las prioridades disponibles', 'error');
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

  // ✅ NUEVO: Formatear tiempo para mostrar en las opciones
  formatearTiempo(minutos: number): string {
    if (!minutos) return 'No definido';
    
    if (minutos < 60) {
      return `${minutos} min`;
    } else if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      const minsRestantes = minutos % 60;
      return minsRestantes > 0 ? `${horas}h ${minsRestantes}min` : `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      const horas = Math.floor((minutos % 1440) / 60);
      if (horas > 0) {
        return `${dias}d ${horas}h`;
      }
      return `${dias}d`;
    }
  }

  // ✅ NUEVOS MÉTODOS PARA MANEJAR LA PRIORIDAD SELECCIONADA

  // Obtener la prioridad seleccionada
  getPrioridadSeleccionada(): any {
    if (!this.ticketData.prioridad_id || !this.prioridadesSLA.length) {
      return null;
    }
    return this.prioridadesSLA.find(p => p.id === this.ticketData.prioridad_id);
  }

  // Obtener nombre de la prioridad seleccionada
  getPrioridadSeleccionadaNombre(): string {
    const prioridad = this.getPrioridadSeleccionada();
    return prioridad ? prioridad.nombre : '';
  }

  // Obtener tiempo de respuesta formateado
  getTiempoRespuestaSeleccionada(): string {
    const prioridad = this.getPrioridadSeleccionada();
    return prioridad ? this.formatearTiempo(prioridad.tiempo_respuesta) : 'No definido';
  }

  // Obtener tiempo de resolución formateado
  getTiempoResolucionSeleccionada(): string {
    const prioridad = this.getPrioridadSeleccionada();
    return prioridad ? this.formatearTiempo(prioridad.tiempo_resolucion) : 'No definido';
  }

  // ✅ NUEVO: Obtener color según nivel de prioridad
  getPrioridadColor(nivel: number): string {
    switch(nivel) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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

  // ✅ ACTUALIZADO: Incluir validación de prioridad
  isFormValid(): boolean {
    return !!this.ticketData.titulo?.trim() && 
           !!this.ticketData.descripcion?.trim() && 
           !!this.ticketData.categoria_id &&
           !!this.ticketData.prioridad_id && // NUEVA VALIDACIÓN
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

    // ✅ NUEVA VALIDACIÓN: Prioridad
    if (!this.ticketData.prioridad_id) {
      Swal.fire('Error', 'Debes seleccionar una prioridad', 'error');
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

    if (this.enviando) return;

    this.enviando = true;
    this.spinner.show();

    const ticketCompleto = {
      // Datos del cliente
      titulo: this.ticketData.titulo.trim(),
      descripcion: this.ticketData.descripcion.trim(),
      categoria_id: Number(this.ticketData.categoria_id),
      subcategoria_id: this.ticketData.subcategoria_id ? Number(this.ticketData.subcategoria_id) : null,
      prioridad_id: Number(this.ticketData.prioridad_id), // ✅ USAR LA PRIORIDAD SELECCIONADA
      
      // Datos automáticos del sistema
      entidad_usuario_id: this.entidadUsuario.id,
      contrato_id: this.contratoActivo.id,
      sla_id: this.contratoActivo.sla_id,
      tecnico_id: null,
      estado: true
    };

    console.log(' ENVIANDO TICKET:', ticketCompleto);
    console.log(' Prioridad ID seleccionada:', this.ticketData.prioridad_id);

    this.ticketsService.crear(ticketCompleto).subscribe({
      next: async (res: any) => {
        if (res.isSuccess) {
          const ticketId = res.data.id;
          console.log('✅ Ticket creado con ID:', ticketId);
          
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
            this.router.navigate(['cliente/inicio']);
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

  // Métodos existentes para subir archivos...
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
          Swal.fire('Error', `Error al subir ${archivo.name}`, 'error');
          resolve(false);
        }
      });
    });
  }

  cancelar() {
    if (!this.enviando) {
      this.router.navigate(['cliente/inicio']);
    }
  }
}