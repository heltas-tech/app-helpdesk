import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificacionesSistemaService } from '../../services/notificaciones-sistema.service';
import { NotificacionesWebsocketService } from '../../services/notificaciones-websocket.service';
import { NotificacionSistema } from '../../interfaces/notificacion-sistema.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notificaciones-campanita',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notificaciones-campanita.html',
  styleUrls: ['./notificaciones-campanita.scss']
})
export class NotificacionesCampanitaComponent implements OnInit, OnDestroy {
  websocketConectado = false;
  notificaciones: NotificacionSistema[] = [];
  notificacionesNoLeidas = 0;
  mostrarLista = false;
  cargando = false;

  // 🔍 DEBUG: Contadores de eventos
  debug = {
    ngOnInit: 0,
    cargarNotificaciones: 0,
    notificacionesCargadas: 0,
    websocketEvents: 0,
    toggleLista: 0,
    marcarLeida: 0,
    eliminarNotificacion: 0
  };

  private subscriptions = new Subscription();

  constructor(
    private notificacionesService: NotificacionesSistemaService,
    private websocketService: NotificacionesWebsocketService
  ) {
    console.log('🔔 DEBUG: Constructor llamado', {
      notificacionesService: !!notificacionesService,
      websocketService: !!websocketService,
      timestamp: new Date().toISOString()
    });
  }

  ngOnInit(): void {
    this.debug.ngOnInit++;
    console.log('🔔 DEBUG: ngOnInit llamado', {
      contador: this.debug.ngOnInit,
      estadoInicial: {
        notificaciones: this.notificaciones,
        notificacionesNoLeidas: this.notificacionesNoLeidas,
        mostrarLista: this.mostrarLista,
        cargando: this.cargando
      },
      timestamp: new Date().toISOString()
    });

    this.cargarNotificaciones();
    this.configurarWebSocket();
    this.verificarConexionWebSocket();
  }

  private verificarConexionWebSocket(): void {
    setTimeout(() => {
      this.websocketConectado = this.websocketService.isConnected();
      console.log('🔔 DEBUG: Estado WebSocket después de 2 segundos', {
        conectado: this.websocketConectado,
        timestamp: new Date().toISOString()
      });
      if (!this.websocketConectado) {
        console.warn('🔔 DEBUG: ⚠️ WebSocket NO CONECTADO - Intentando reconectar...');
        this.websocketService.reconnect();
      }
    }, 2000);
  }

  ngOnDestroy(): void {
    console.log('🔔 DEBUG: ngOnDestroy llamado', {
      totalEventos: this.debug,
      estadoFinal: {
        notificacionesCount: this.notificaciones.length,
        notificacionesNoLeidas: this.notificacionesNoLeidas
      },
      timestamp: new Date().toISOString()
    });
    this.subscriptions.unsubscribe();
  }

  // OBTENER USUARIO LOGUEADO
  getUsuarioLogueado(): any {
    try {
      // Método 1: Desde sessionStorage
      const usuarioSession = sessionStorage.getItem('usuario');
      if (usuarioSession) {
        return JSON.parse(usuarioSession);
      }

      // Método 2: Desde localStorage
      const usuarioLocal = localStorage.getItem('userData');
      if (usuarioLocal) {
        return JSON.parse(usuarioLocal);
      }

      // Método 3: Desde token JWT
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          id: payload.userId || payload.sub,
          nombre_usuario: payload.nombre || payload.username,
          rol: payload.rol || 'USUARIO'
        };
      }

      console.warn('🔔 DEBUG: No se pudo obtener usuario logueado');
      return null;
    } catch (error) {
      console.error('🔔 DEBUG: Error obteniendo usuario logueado:', error);
      return null;
    }
  }

  // FILTRAR NOTIFICACIONES SEGÚN ROL
  private filtrarNotificacionesPorUsuario(notificaciones: any[]): any[] {
    const usuarioLogueado = this.getUsuarioLogueado();
    
    if (!usuarioLogueado) {
      console.warn('🔔 DEBUG: No hay usuario logueado, mostrando todas las notificaciones');
      return notificaciones;
    }

    console.log('🔔 DEBUG: Usuario logueado:', {
      id: usuarioLogueado.id,
      nombre: usuarioLogueado.nombre_usuario,
      rol: usuarioLogueado.rol
    });

    // 👑 ADMINISTRADOR: Ve todas las notificaciones
    if (usuarioLogueado.rol === 'ADMINISTRADOR') {
      console.log('🔔 DEBUG: Usuario es ADMINISTRADOR - Mostrando TODAS las notificaciones');
      return notificaciones;
    }

    // 👤 TÉCNICO/USUARIO: Solo sus notificaciones personales
    const notificacionesFiltradas = notificaciones.filter(notif => 
      notif.usuario_id === usuarioLogueado.id
    );

    console.log('🔔 DEBUG: Notificaciones filtradas por usuario', {
      totalOriginal: notificaciones.length,
      totalFiltradas: notificacionesFiltradas.length,
      usuarioId: usuarioLogueado.id,
      rol: usuarioLogueado.rol
    });

    return notificacionesFiltradas;
  }

  cargarNotificaciones(): void {
    this.debug.cargarNotificaciones++;
    this.cargando = true;
    
    console.log('🔔 DEBUG: cargarNotificaciones INICIO', {
      contador: this.debug.cargarNotificaciones,
      timestamp: new Date().toISOString()
    });

    this.notificacionesService.obtenerMisNotificaciones().subscribe({
      next: (response: any) => {
        this.debug.notificacionesCargadas++;
        
        console.log('🔔 DEBUG: cargarNotificaciones ÉXITO', {
          contador: this.debug.notificacionesCargadas,
          response: response,
          notificacionesCountOriginal: response?.data?.notificaciones?.length || 0,
          noLeidasOriginal: response?.data?.noLeidas || 0,
          timestamp: new Date().toISOString()
        });

        // ✅ FILTRAR NOTIFICACIONES POR USUARIO
        const notificacionesOriginales = response?.data?.notificaciones || [];
        const notificacionesFiltradas = this.filtrarNotificacionesPorUsuario(notificacionesOriginales);
        
        // ✅ CALCULAR NO LEÍDAS REALES (solo del usuario logueado)
        const noLeidasReales = notificacionesFiltradas.filter(notif => !notif.leida).length;

        this.notificaciones = notificacionesFiltradas;
        this.notificacionesNoLeidas = noLeidasReales;
        this.cargando = false;

        console.log('🔔 DEBUG: Estado después de filtrado', {
          notificacionesOriginales: notificacionesOriginales.length,
          notificacionesFiltradas: this.notificaciones.length,
          notificacionesNoLeidas: this.notificacionesNoLeidas,
          cargando: this.cargando,
          timestamp: new Date().toISOString()
        });

      },
      error: (error: any) => {
        console.error('🔔 DEBUG: cargarNotificaciones ERROR', error);
        this.notificaciones = [];
        this.notificacionesNoLeidas = 0;
        this.cargando = false;
      }
    });
  }

  configurarWebSocket(): void {
    console.log('🔔 DEBUG: configurarWebSocket INICIO', {
      websocketService: !!this.websocketService,
      timestamp: new Date().toISOString()
    });

    this.subscriptions.add(
      this.websocketService.onNuevaNotificacion().subscribe((notificacion: NotificacionSistema) => {
        this.debug.websocketEvents++;
        console.log('🔔 DEBUG: WebSocket - Nueva notificación', {
          contador: this.debug.websocketEvents,
          notificacion: notificacion,
          estadoPrevio: {
            notificacionesCount: this.notificaciones.length,
            notificacionesNoLeidas: this.notificacionesNoLeidas
          },
          timestamp: new Date().toISOString()
        });

        // ✅ FILTRAR LA NUEVA NOTIFICACIÓN TAMBIÉN
        const usuarioLogueado = this.getUsuarioLogueado();
        const mostrarNotificacion = !usuarioLogueado || 
          usuarioLogueado.rol === 'ADMINISTRADOR' || 
          notificacion.usuario_id === usuarioLogueado.id;

        if (mostrarNotificacion) {
          this.notificaciones = this.notificaciones || [];
          this.notificaciones.unshift(notificacion);
          if (!notificacion.leida) {
            this.notificacionesNoLeidas++;
          }

          console.log('🔔 DEBUG: Estado después de nueva notificación', {
            notificacionesCount: this.notificaciones.length,
            notificacionesNoLeidas: this.notificacionesNoLeidas,
            timestamp: new Date().toISOString()
          });
        }
      })
    );

    this.subscriptions.add(
      this.websocketService.onContadorActualizado().subscribe((contador: number) => {
        console.log('🔔 DEBUG: WebSocket - Contador actualizado', {
          contadorAnterior: this.notificacionesNoLeidas,
          contadorNuevo: contador,
          timestamp: new Date().toISOString()
        });

        this.notificacionesNoLeidas = contador;
      })
    );

    console.log('🔔 DEBUG: configurarWebSocket COMPLETADO', {
      subscriptionsCount: 'Configuradas correctamente',
      timestamp: new Date().toISOString()
    });
  }

  toggleLista(): void {
    this.debug.toggleLista++;
    console.log('🔔 DEBUG: toggleLista', {
      contador: this.debug.toggleLista,
      estadoPrevio: this.mostrarLista,
      estadoNuevo: !this.mostrarLista,
      notificacionesNoLeidas: this.notificacionesNoLeidas,
      timestamp: new Date().toISOString()
    });

    this.mostrarLista = !this.mostrarLista;
    
    if (this.mostrarLista && this.notificacionesNoLeidas > 0) {
      console.log('🔔 DEBUG: toggleLista - Marcando todas como leídas automáticamente');
      this.marcarTodasComoLeidas();
    }
  }

  marcarComoLeida(notificacion: NotificacionSistema, event: Event): void {
    this.debug.marcarLeida++;
    event.stopPropagation();
    
    console.log('🔔 DEBUG: marcarComoLeida INICIO', {
      contador: this.debug.marcarLeida,
      notificacion: notificacion,
      yaLeida: notificacion.leida,
      estadoPrevio: {
        notificacionesNoLeidas: this.notificacionesNoLeidas
      },
      timestamp: new Date().toISOString()
    });

    if (!notificacion.leida) {
      this.notificacionesService.marcarComoLeida(notificacion.id).subscribe({
        next: () => {
          console.log('🔔 DEBUG: marcarComoLeida ÉXITO', {
            notificacionId: notificacion.id,
            estadoPrevio: notificacion.leida,
            estadoNuevo: true,
            timestamp: new Date().toISOString()
          });

          notificacion.leida = true;
          this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);

          console.log('🔔 DEBUG: Estado después de marcar como leída', {
            notificacionesNoLeidas: this.notificacionesNoLeidas,
            timestamp: new Date().toISOString()
          });
        },
        error: (error: any) => {
          console.error('🔔 DEBUG: marcarComoLeida ERROR', {
            error: error,
            notificacionId: notificacion.id,
            timestamp: new Date().toISOString()
          });
        }
      });
    } else {
      console.log('🔔 DEBUG: marcarComoLeida - Ya estaba leída, no se hace nada');
    }
  }

  marcarTodasComoLeidas(): void {
    console.log('🔔 DEBUG: marcarTodasComoLeidas INICIO', {
      notificacionesNoLeidas: this.notificacionesNoLeidas,
      timestamp: new Date().toISOString()
    });

    if (this.notificacionesNoLeidas > 0) {
      this.notificacionesService.marcarTodasComoLeidas().subscribe({
        next: () => {
          console.log('🔔 DEBUG: marcarTodasComoLeidas ÉXITO', {
            notificacionesNoLeidasPrevio: this.notificacionesNoLeidas,
            notificacionesCount: this.notificaciones.length,
            timestamp: new Date().toISOString()
          });

          this.notificacionesNoLeidas = 0;
          this.notificaciones.forEach(notif => notif.leida = true);

          console.log('🔔 DEBUG: Estado después de marcar todas como leídas', {
            notificacionesNoLeidas: this.notificacionesNoLeidas,
            notificacionesLeidas: this.notificaciones.filter(n => n.leida).length,
            timestamp: new Date().toISOString()
          });
        },
        error: (error: any) => {
          console.error('🔔 DEBUG: marcarTodasComoLeidas ERROR', {
            error: error,
            timestamp: new Date().toISOString()
          });
        }
      });
    } else {
      console.log('🔔 DEBUG: marcarTodasComoLeidas - No hay notificaciones no leídas');
    }
  }

  eliminarNotificacion(notificacion: NotificacionSistema, event: Event): void {
    this.debug.eliminarNotificacion++;
    event.stopPropagation();
    
    console.log('🔔 DEBUG: eliminarNotificacion INICIO', {
      contador: this.debug.eliminarNotificacion,
      notificacion: notificacion,
      estadoPrevio: {
        notificacionesCount: this.notificaciones.length,
        notificacionesNoLeidas: this.notificacionesNoLeidas,
        notificacionLeida: notificacion.leida
      },
      timestamp: new Date().toISOString()
    });

    this.notificacionesService.eliminarNotificacion(notificacion.id).subscribe({
      next: () => {
        console.log('🔔 DEBUG: eliminarNotificacion ÉXITO', {
          notificacionId: notificacion.id,
          notificacionesCountPrevio: this.notificaciones.length,
          timestamp: new Date().toISOString()
        });

        this.notificaciones = this.notificaciones.filter(n => n.id !== notificacion.id);
        if (!notificacion.leida) {
          this.notificacionesNoLeidas = Math.max(0, this.notificacionesNoLeidas - 1);
        }

        console.log('🔔 DEBUG: Estado después de eliminar', {
          notificacionesCount: this.notificaciones.length,
          notificacionesNoLeidas: this.notificacionesNoLeidas,
          timestamp: new Date().toISOString()
        });
      },
      error: (error: any) => {
        console.error('🔔 DEBUG: eliminarNotificacion ERROR', {
          error: error,
          notificacionId: notificacion.id,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  formatearFecha(fecha: string): string {
    const fechaFormateada = new Date(fecha).toLocaleString('es-ES');
    return fechaFormateada;
  }

  getIconoTipo(tipo: string): string {
    const iconos: { [key: string]: string } = {
      'ticket_creado': '📝',
      'ticket_asignado': '👤',
      'ticket_resuelto': '✅',
      'ticket_cerrado': '🔒',
      'ticket_mensaje': '💬',
      'contrato_por_vencer': '⏰',
      'sla_alerta': '⚠️',
      'usuario_bloqueado': '🔐',
      'sistema': '🔧'
    };
    return iconos[tipo] || '🔔';
  }

  // 🔍 MÉTODO PARA VER ESTADO ACTUAL
  getEstadoActual() {
    return {
      notificaciones: this.notificaciones,
      notificacionesNoLeidas: this.notificacionesNoLeidas,
      mostrarLista: this.mostrarLista,
      cargando: this.cargando,
      debug: this.debug
    };
  }

  // 🔴 MÉTODO DE PRUEBA TEMPORAL (OPCIONAL)
  probarNotificacionNoLeida(): void {
    console.log('🔔 DEBUG: Probando notificación NO LEÍDA manual...');
    
    const notificacionPrueba: any = {
      id: Date.now(),
      usuario_id: this.getUsuarioLogueado()?.id || 112,
      titulo: '🚨 TICKET URGENTE DE PRUEBA',
      mensaje: 'Esta es una notificación de prueba para ver el contador rojo',
      tipo: 'sla_alerta',
      leida: false, // ✅ IMPORTANTE: NO LEÍDA
      fecha_creacion: new Date().toISOString(),
      entidad_tipo: 'ticket',
      entidad_id: 999,
      usuario: {
        id: this.getUsuarioLogueado()?.id || 112,
        nombre_usuario: this.getUsuarioLogueado()?.nombre_usuario || "USUARIO_PRUEBA",
        rol: this.getUsuarioLogueado()?.rol || "TECNICO"
      }
    };

    // Agregar al inicio del array
    this.notificaciones.unshift(notificacionPrueba);
    this.notificacionesNoLeidas++;
    
    console.log('🔔 DEBUG: Notificación NO LEÍDA agregada manualmente', {
      notificacionesCount: this.notificaciones.length,
      notificacionesNoLeidas: this.notificacionesNoLeidas,
      timestamp: new Date().toISOString()
    });
  }
}