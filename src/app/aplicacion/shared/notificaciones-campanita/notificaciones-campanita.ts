import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip'; // Añadir esta importación
import { Router } from '@angular/router';
import { NotificacionesSistemaService } from '../../services/notificaciones-sistema.service';
import { NotificacionesWebsocketService } from '../../services/notificaciones-websocket.service';
import { NotificacionSistema } from '../../interfaces/notificacion-sistema.interface';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { DetalleTicketModalComponent } from '../../paginas/detalle-ticket-modal/detalle-ticket-modal';

@Component({
  selector: 'app-notificaciones-campanita',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule, 
    MatBadgeModule, 
    MatProgressSpinnerModule,
    MatTooltipModule 
  ],
  templateUrl: './notificaciones-campanita.html',
  styleUrls: ['./notificaciones-campanita.scss']
})
export class NotificacionesCampanitaComponent implements OnInit, OnDestroy {
  websocketConectado = false;
  notificaciones: NotificacionSistema[] = [];
  notificacionesNoLeidas = 0;
  mostrarLista = false;
  cargando = false;
  usuarioId: number | null = null;

  private subscriptions = new Subscription();
  private dialog = inject(MatDialog);
  private router = inject(Router);

  constructor(
    private notificacionesService: NotificacionesSistemaService,
    private websocketService: NotificacionesWebsocketService
  ) {}

  ngOnInit(): void {
    this.obtenerUsuarioId();
    this.cargarNotificaciones();
    this.configurarWebSocket();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private obtenerUsuarioId(): void {
    try {
      const usuarioSession = sessionStorage.getItem('usuario');
      if (usuarioSession) {
        const usuario = JSON.parse(usuarioSession);
        this.usuarioId = usuario.id;
        return;
      }

      const usuarioLocal = localStorage.getItem('userData');
      if (usuarioLocal) {
        const usuario = JSON.parse(usuarioLocal);
        this.usuarioId = usuario.id;
        return;
      }

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.usuarioId = payload.userId || payload.sub || payload.id;
          return;
        } catch (e) {
          console.warn('No se pudo decodificar el token:', e);
        }
      }

      this.usuarioId = null;
    } catch (error) {
      console.error('Error obteniendo usuario ID:', error);
      this.usuarioId = null;
    }
  }

  cargarNotificaciones(): void {
    if (!this.usuarioId) {
      console.error('No hay usuario ID para cargar notificaciones');
      return;
    }

    this.cargando = true;

    this.notificacionesService.obtenerMisNotificaciones().subscribe({
      next: (response: any) => {
        this.cargando = false;

        if (response && response.success && response.data) {
          this.notificaciones = response.data.notificaciones || [];
          this.notificacionesNoLeidas = response.data.noLeidas || 0;
          
          // Filtrado de seguridad
          const notificacionesIncorrectas = this.notificaciones.filter(
            notif => notif.usuario_id !== this.usuarioId
          );

          if (notificacionesIncorrectas.length > 0) {
            this.notificaciones = this.notificaciones.filter(
              notif => notif.usuario_id === this.usuarioId
            );
          }
        } else {
          this.notificaciones = [];
          this.notificacionesNoLeidas = 0;
        }
      },
      error: (error: any) => {
        console.error('Error cargando notificaciones:', error);
        this.notificaciones = [];
        this.notificacionesNoLeidas = 0;
        this.cargando = false;
        
        Swal.fire('Error', 'No se pudieron cargar las notificaciones', 'error');
      }
    });
  }

  configurarWebSocket(): void {
    this.subscriptions.add(
      this.websocketService.onNuevaNotificacion().subscribe((notificacion: NotificacionSistema) => {
        if (this.usuarioId && notificacion.usuario_id === this.usuarioId) {
          this.notificaciones.unshift(notificacion);
          if (!notificacion.leida) {
            this.notificacionesNoLeidas++;
          }
        }
      })
    );

    this.subscriptions.add(
      this.websocketService.onContadorActualizado().subscribe((contador: number) => {
        this.notificacionesNoLeidas = contador;
      })
    );

    setTimeout(() => {
      this.websocketConectado = this.websocketService.isConnected();
      if (!this.websocketConectado) {
        this.websocketService.reconnect();
      }
    }, 3000);
  }

  verTicket(notificacion: NotificacionSistema, event: Event): void {
    event.stopPropagation();
    
    const ticketId = this.extraerTicketId(notificacion);
    
    if (!ticketId) {
      Swal.fire('Error', 'No se pudo identificar el ticket relacionado', 'error');
      return;
    }

    // Marcar como leída automáticamente al abrir
    if (!notificacion.leida) {
      this.marcarComoLeidaAutomatica(notificacion);
    }

    // Abrir modal del ticket
    this.abrirModalTicket(ticketId);

    // Cerrar lista de notificaciones
    this.mostrarLista = false;
  }

  private extraerTicketId(notificacion: NotificacionSistema): number | null {
    if (this.esNotificacionTicket(notificacion) && notificacion.entidad_id) {
      return notificacion.entidad_id;
    }

    const ticketMatch = notificacion.mensaje?.match(/ticket[:\s]*#?(\d+)/i) || 
                       notificacion.titulo?.match(/ticket[:\s]*#?(\d+)/i);
    
    if (ticketMatch && ticketMatch[1]) {
      return parseInt(ticketMatch[1], 10);
    }

    return null;
  }

  private marcarComoLeidaAutomatica(notificacion: NotificacionSistema): void {
    this.notificacionesService.marcarComoLeida(notificacion.id).subscribe({
      next: () => {
        notificacion.leida = true;
        this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);
      },
      error: (error: any) => {
        console.error('Error marcando como leída automáticamente:', error);
      }
    });
  }

  private abrirModalTicket(ticketId: number): void {
    const dialogRef = this.dialog.open(DetalleTicketModalComponent, {
      width: '95vw',
      height: '95vh',
      maxWidth: '1400px',
      maxHeight: '900px',
      panelClass: 'ticket-modal-container',
      data: { ticketId: ticketId }
    });

    dialogRef.afterClosed().subscribe(result => {
      this.cargarNotificaciones();
    });
  }

  esNotificacionTicket(notificacion: NotificacionSistema): boolean {
    const tiposTicket = [
      'ticket_creado',
      'ticket_asignado', 
      'ticket_resuelto',
      'ticket_cerrado',
      'ticket_mensaje',
      'ticket_comentario',
      'ticket_actualizado'
    ];
    
    if (notificacion.entidad_tipo === 'ticket') {
      return true;
    }
    
    return tiposTicket.includes(notificacion.tipo);
  }

  getIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'ticket_creado': 'add_task',
      'ticket_asignado': 'assignment_ind',
      'ticket_resuelto': 'check_circle',
      'ticket_cerrado': 'lock',
      'ticket_mensaje': 'chat',
      'ticket_comentario': 'comment',
      'ticket_actualizado': 'update',
      'contrato_por_vencer': 'schedule',
      'sla_alerta': 'warning',
      'usuario_bloqueado': 'block',
      'sistema': 'build'
    };
    return iconos[tipo] || 'notifications';
  }

  getColorIconoTipo(tipo: string): string {
    const colores: { [key: string]: string } = {
      'ticket_creado': 'color-primary',
      'ticket_asignado': 'color-info',
      'ticket_resuelto': 'color-success',
      'ticket_cerrado': 'color-warning',
      'ticket_mensaje': 'color-accent',
      'ticket_comentario': 'color-info',
      'ticket_actualizado': 'color-primary',
      'contrato_por_vencer': 'color-warning',
      'sla_alerta': 'color-error',
      'usuario_bloqueado': 'color-error',
      'sistema': 'color-default'
    };
    return colores[tipo] || 'color-default';
  }

  // Métodos existentes
  probarDiagnostico(): void {
    this.notificacionesService.obtenerDiagnosticoFiltrado().subscribe({
      next: (diagnostico: any) => {
        Swal.fire('Diagnóstico', 'Revisa la consola para ver los detalles', 'info');
      },
      error: (error: any) => {
        console.error('Error diagnóstico:', error);
      }
    });
  }

  toggleLista(): void {
    this.mostrarLista = !this.mostrarLista;
  }

  marcarComoLeida(notificacion: NotificacionSistema, event: Event): void {
    event.stopPropagation();

    if (!notificacion.leida) {
      this.notificacionesService.marcarComoLeida(notificacion.id).subscribe({
        next: () => {
          notificacion.leida = true;
          this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);
        },
        error: (error: any) => {
          console.error('Error marcando como leída:', error);
          Swal.fire('Error', 'No se pudo marcar como leída', 'error');
        }
      });
    }
  }

  marcarTodasComoLeidas(): void {
    if (this.notificacionesNoLeidas > 0) {
      this.notificacionesService.marcarTodasComoLeidas().subscribe({
        next: () => {
          this.notificacionesNoLeidas = 0;
          this.notificaciones.forEach(notif => notif.leida = true);
          Swal.fire('Éxito', 'Todas las notificaciones marcadas como leídas', 'success');
        },
        error: (error: any) => {
          console.error('Error marcando todas como leídas:', error);
          Swal.fire('Error', 'No se pudieron marcar todas como leídas', 'error');
        }
      });
    }
  }

  eliminarNotificacion(notificacion: NotificacionSistema, event: Event): void {
    event.stopPropagation();

    Swal.fire({
      title: '¿Eliminar notificación?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.notificacionesService.eliminarNotificacion(notificacion.id).subscribe({
          next: () => {
            this.notificaciones = this.notificaciones.filter(n => n.id !== notificacion.id);
            if (!notificacion.leida) {
              this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);
            }
            Swal.fire('Eliminada', 'Notificación eliminada correctamente', 'success');
          },
          error: (error: any) => {
            console.error('Error eliminando notificación:', error);
            Swal.fire('Error', 'No se pudo eliminar la notificación', 'error');
          }
        });
      }
    });
  }

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}