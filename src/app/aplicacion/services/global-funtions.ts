import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DatosUsuario } from '../interfaces/datos-usuario';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { Acceso as AccesoService } from './acceso';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class GlobalFuntions {
  
  constructor(
    private accesoService: AccesoService,
    private router: Router,
    private snackbar: MatSnackBar,
  ) {
    this.cargarDatosUsuario();
  }

  public _datosUsuario: DatosUsuario[] = [];

  get datosUsuario(): DatosUsuario[] {
    return this._datosUsuario;
  }

  set datosUsuario(value: DatosUsuario[]) {
    this._datosUsuario = value;
    this.guardarDatosUsuario();
  }

  private cargarDatosUsuario(): void {
    const datosGuardados = localStorage.getItem('userData');
    if (datosGuardados) {
      try {
        this._datosUsuario = JSON.parse(datosGuardados);
      } catch (e) {
        console.error('Error al parsear datos de usuario', e);
        localStorage.removeItem('userData');
      }
    }
  }

  private guardarDatosUsuario(): void {
    localStorage.setItem('userData', JSON.stringify(this._datosUsuario));
  }

  // --- MÉTODOS EXISTENTES ---
  
  mostrarMensaje(mensaje: string, tipo: string) {
    if (tipo === 'success')
      this.snackbar.open(mensaje, 'OK', { duration: 3000 });
    else
      this.snackbar.open(mensaje, 'error', { duration: 3000 });
  }

  validacionToken(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No se encontró token en localStorage');
      this.limpiarSesionYRedirigir();
      throw new Error('Token no disponible');
    }

    if (this.esTokenValido(token)) {
      if (this._datosUsuario.length === 0) {
        this.verificarTokenConServicio();
      }
      return;
    }

    this.verificarTokenConServicio();
  }

  private esTokenValido(token: string): boolean {
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);

      const ahora = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < ahora) {
        console.warn('Token expirado');
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Error al decodificar el token:', error);
      return false;
    }
  }

  private verificarTokenConServicio(): void {
    this.accesoService.datosUsuario().pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) {
          console.warn(`Error de autenticación (${err.status}):`, err.message);
          this.limpiarSesionYRedirigir();
        } else {
          console.error('Error en la solicitud:', err);
        }
        return throwError(() => err);
      })
    ).subscribe({
      next: (data: any) => {
        if (!data) {
          console.warn('Respuesta vacía recibida');
          this.limpiarSesionYRedirigir();
          return;
        }
        this.datosUsuario = data;
      },
      error: () => { }
    });
  }

  public limpiarSesionYRedirigir() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  // --- NUEVOS MÉTODOS PARA USUARIOS ---

  /** 🔐 Obtener ID del usuario logeado desde el token */
  getUserId(): number {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error obteniendo userId del token:', error);
      return 0;
    }
  }

  /** 👤 Obtener rol del usuario logeado */
  getUserRole(): string {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.rol || '';
      }
      return '';
    } catch (error) {
      console.error('Error obteniendo rol del token:', error);
      return '';
    }
  }

  /** 🔍 Validar si el usuario es administrador */
  isAdmin(): boolean {
    return this.getUserRole() === 'ADMINISTRADOR';
  }

  /** 🔧 Validar si el usuario es técnico */
  isTecnico(): boolean {
    return this.getUserRole() === 'TECNICO';
  }

  /** 👥 Validar si el usuario es cliente */
  isCliente(): boolean {
    return this.getUserRole() === 'CLIENTE';
  }

  /** 📧 Obtener email del usuario logeado */
  getUserEmail(): string {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.email || '';
      }
      return '';
    } catch (error) {
      console.error('Error obteniendo email del token:', error);
      return '';
    }
  }

  /** 🔒 Verificar permisos de administrador (con mensaje) */
  checkAdminPermission(): boolean {
    if (!this.isAdmin()) {
      this.mostrarMensaje('No tienes permisos de administrador', 'error');
      return false;
    }
    return true;
  }

  /** 🎯 Verificar si el usuario puede editar un perfil (propio o admin) */
  canEditProfile(targetUserId: number): boolean {
    const currentUserId = this.getUserId();
    const isAdmin = this.isAdmin();
    
    // Puede editar si es admin O si está editando su propio perfil
    return isAdmin || currentUserId === targetUserId;
  }

  /** 📋 Obtener datos básicos del usuario logeado */
  getCurrentUserInfo(): { id: number; nombre: string; email: string; rol: string } {
    return {
      id: this.getUserId(),
      nombre: this.datosUsuario[0]?.nombre || '',
      email: this.getUserEmail(),
      rol: this.getUserRole()
    };
  }

  /** 🆔 Obtener nombre para auditoría (quién realiza la acción) */
  getAuditUserName(): string {
    // Prioridad: datosUsuario -> token -> 'SISTEMA'
    if (this.datosUsuario.length > 0 && this.datosUsuario[0].nombre) {
      return this.datosUsuario[0].nombre;
    }
    
    const tokenName = this.getUserEmail(); // Podrías tener nombre en el token
    return tokenName || 'ADMINISTRADOR'; // Fallback
  }
}