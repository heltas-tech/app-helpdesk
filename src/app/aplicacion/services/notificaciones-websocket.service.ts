import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificacionSistema } from '../interfaces/notificacion-sistema.interface';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesWebsocketService {
  // ✅ CORREGIDO: Inicializar socket como null
  private socket: Socket | null = null;
  private connected = false;
  
  // Subjects para los eventos
  private nuevaNotificacionSubject = new BehaviorSubject<NotificacionSistema | null>(null);
  private contadorActualizadoSubject = new BehaviorSubject<number>(0);

  constructor() {
    console.log('🔗 DEBUG WebSocket: 🚀 INICIANDO servicio WebSocket...', {
      apiUrl: environment.apiUrl,
      // ✅ CORREGIDO: Sin propiedad production
      timestamp: new Date().toISOString()
    });

    this.initializeSocket();
  }

  private initializeSocket(): void {
    try {
      const usuarioId = this.getUsuarioId();
      console.log('🔗 DEBUG WebSocket: Conectando con usuarioId:', usuarioId);

      // ✅ CORREGIDO: Socket inicializado correctamente
      this.socket = io(`${environment.apiUrl}/notificaciones`, {
        transports: ['websocket', 'polling'],
        query: { usuarioId },
        timeout: 10000,
        forceNew: true
      });

      this.setupEventListeners();
      
    } catch (error) {
      console.error('🔗 DEBUG WebSocket: 💥 ERROR inicializando socket:', error);
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      console.error('🔗 DEBUG WebSocket: ❌ Socket no inicializado');
      return;
    }

    // CONEXIÓN ESTABLECIDA
    this.socket.on('connect', () => {
      console.log('🔗 DEBUG WebSocket: ✅ CONECTADO al servidor de notificaciones', {
        socketId: this.socket?.id,
        connected: this.socket?.connected,
        timestamp: new Date().toISOString()
      });
      this.connected = true;
    });

    // DESCONEXIÓN
    this.socket.on('disconnect', (reason) => {
      console.log('🔗 DEBUG WebSocket: ❌ DESCONECTADO del servidor', {
        reason: reason,
        socketId: this.socket?.id,
        timestamp: new Date().toISOString()
      });
      this.connected = false;
    });

    // ERROR DE CONEXIÓN
    this.socket.on('connect_error', (error) => {
      console.error('🔗 DEBUG WebSocket: 💥 ERROR DE CONEXIÓN:', {
        error: error.message,
        name: error.name,
        timestamp: new Date().toISOString()
      });
      this.connected = false;
    });

    // RECONEXIÓN
    this.socket.on('reconnect', (attempt) => {
      console.log('🔗 DEBUG WebSocket: 🔄 RECONECTADO al servidor', {
        attempt: attempt,
        timestamp: new Date().toISOString()
      });
      this.connected = true;
    });

    // NUEVA NOTIFICACIÓN
    this.socket.on('nueva_notificacion', (data: NotificacionSistema) => {
      console.log('🔗 DEBUG WebSocket: 📨 NUEVA NOTIFICACIÓN RECIBIDA:', {
        notificacion: data,
        timestamp: new Date().toISOString()
      });
      this.nuevaNotificacionSubject.next(data);
    });

    // CONTADOR ACTUALIZADO
    this.socket.on('contador_actualizado', (contador: number) => {
      console.log('🔗 DEBUG WebSocket: 🔢 CONTADOR ACTUALIZADO:', {
        contador: contador,
        timestamp: new Date().toISOString()
      });
      this.contadorActualizadoSubject.next(contador);
    });

    // ERROR GENERAL
    this.socket.on('error', (error) => {
      console.error('🔗 DEBUG WebSocket: 💥 ERROR GENERAL:', error);
    });
  }

  // ESCUCHAR NUEVAS NOTIFICACIONES
  onNuevaNotificacion(): Observable<NotificacionSistema> {
    console.log('🔗 DEBUG WebSocket: 👂 Suscribiéndose a nuevas notificaciones');
    // ✅ CORREGIDO: Filtrar valores null
    return this.nuevaNotificacionSubject.asObservable().pipe(
      filter(notificacion => notificacion !== null)
    ) as Observable<NotificacionSistema>;
  }

  // ESCUCHAR ACTUALIZACIÓN DE CONTADOR
  onContadorActualizado(): Observable<number> {
    console.log('🔗 DEBUG WebSocket: 👂 Suscribiéndose a actualizaciones de contador');
    return this.contadorActualizadoSubject.asObservable();
  }

  // OBTENER ESTADO DE CONEXIÓN
  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  // DESCONECTAR MANUALMENTE
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      console.log('🔗 DEBUG WebSocket: 🛑 Socket desconectado manualmente');
    }
  }

  // RECONECTAR MANUALMENTE
  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
      console.log('🔗 DEBUG WebSocket: 🔄 Intentando reconectar manualmente');
    } else {
      // ✅ CORREGIDO: Reinicializar si el socket es null
      console.log('🔗 DEBUG WebSocket: 🔄 Reinicializando socket...');
      this.initializeSocket();
    }
  }

  // OBTENER ID DEL USUARIO - MÉTODO MEJORADO
  private getUsuarioId(): string {
    try {
      // Método 1: Desde localStorage (token JWT)
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId || payload.sub || payload.id;
          console.log('🔗 DEBUG WebSocket: Usuario ID desde token:', userId);
          return userId?.toString() || '1';
        } catch (e) {
          console.warn('🔗 DEBUG WebSocket: No se pudo decodificar el token:', e);
        }
      }

      // Método 2: Desde sessionStorage
      const userSession = sessionStorage.getItem('usuario');
      if (userSession) {
        try {
          const usuario = JSON.parse(userSession);
          console.log('🔗 DEBUG WebSocket: Usuario ID desde sessionStorage:', usuario.id);
          return usuario.id?.toString() || '1';
        } catch (e) {
          console.warn('🔗 DEBUG WebSocket: No se pudo parsear usuario de sessionStorage:', e);
        }
      }

      // Método 3: Desde cualquier otro lugar donde guardes el usuario
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const usuario = JSON.parse(userData);
          console.log('🔗 DEBUG WebSocket: Usuario ID desde userData:', usuario.id);
          return usuario.id?.toString() || '1';
        } catch (e) {
          console.warn('🔗 DEBUG WebSocket: No se pudo parsear userData:', e);
        }
      }

      console.warn('🔗 DEBUG WebSocket: ❌ No se pudo obtener usuario ID, usando valor por defecto: 1');
      return '1';

    } catch (error) {
      console.error('🔗 DEBUG WebSocket: 💥 Error obteniendo usuario ID:', error);
      return '1';
    }
  }
}