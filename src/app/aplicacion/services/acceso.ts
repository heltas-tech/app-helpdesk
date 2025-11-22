import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Login } from '../interfaces/login';
import { Usuario } from '../interfaces/usuario';
import { ResponseAcceso } from '../interfaces/response-acceso';
import { ResponseRegistro } from '../interfaces/response-registro';
import { Sistema } from '../interfaces/sistema';
import { DatosUsuario } from '../interfaces/datos-usuario';
import { environment } from '../../../environments/environment';

// Interface para la respuesta de login mejorada
interface LoginResponse {
  isSuccess: boolean;
  message: string;
  data: {
    token?: string;
    requiresPasswordChange?: boolean;
    tempToken?: string;
    userId?: number;
  };
}

// Interface para respuesta genérica
interface ApiResponse {
  isSuccess: boolean;
  message: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class Acceso {
  private baseUrl: string = environment.apiAuthUrl;

  constructor(private http: HttpClient) { }

  // Registro de usuario
  registrarse(objeto: Usuario): Observable<ResponseAcceso> {
    return this.http.post<ResponseAcceso>(`${this.baseUrl}/register`, objeto);
  }

  // Login (MODIFICADO) - Ahora retorna LoginResponse
  login(objeto: Login): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, objeto).pipe(
      tap(response => {
        console.log('🔐 Respuesta login:', response);
        
        // Solo guardar sesión si es login normal (no requiere cambio)
        if (response.isSuccess && response.data && !response.data.requiresPasswordChange && response.data.token) {
          this.guardarSesion(response.data.token, {
            email: objeto.email, // ← Ahora objeto.email existe
            token: response.data.token
          });
        }
      })
    );
  }

  // Cambio de contraseña obligatorio (NUEVO MÉTODO)
  cambiarContrasenaObligatorio(userId: number, newPassword: string, confirmPassword: string): Observable<ApiResponse> {
    const body = {
      userId,
      newPassword,
      confirmPassword
    };
    
    return this.http.post<ApiResponse>(`${this.baseUrl}/auth/force-password-change`, body).pipe(
      tap(response => {
        console.log('🔄 Respuesta cambio contraseña:', response);
        // Si el cambio fue exitoso, guardar el nuevo token
        if (response.isSuccess && response.data?.token) {
          this.guardarSesion(response.data.token, {
            email: this.obtenerUsuario()?.email,
            token: response.data.token
          });
        }
      })
    );
  }

  // Restablecer contraseña (Olvidé contraseña) - NUEVO MÉTODO
  restablecerContrasena(token: string, newPassword: string, confirmPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/auth/reset-password`, {
      token,
      newPassword,
      confirmPassword
    });
  }

  // Solicitar restablecimiento (Olvidé contraseña) - NUEVO MÉTODO
  solicitarRestablecimiento(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/auth/forgot-password`, {
      correo_electronico: email
    });
  }

  // Validar token de restablecimiento - NUEVO MÉTODO
  validarTokenRestablecimiento(token: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/auth/validate-reset-token`, {
      token
    });
  }

  // Logout
  logout(): Observable<ResponseAcceso> {
    this.clearSession(); // Limpiar primero la sesión local
    return this.http.post<ResponseAcceso>(`${this.baseUrl}/logout`, {});
  }

  // Listar usuarios
  lista(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.baseUrl}/user`);
  }

  // Actualizar usuario
  Actualiza(objeto: Usuario, id: number): Observable<ResponseRegistro> {
    return this.http.patch<ResponseRegistro>(`${this.baseUrl}/user/${id}`, objeto);
  }

  // Listar menus por sistema
  listaMenus(objeto: Sistema) {
    return this.http.post<any[]>(`${this.baseUrl}/menu-sistema`, objeto);
  }

  // Datos del usuario logueado
  datosUsuario(): Observable<DatosUsuario[]> {
    return this.http.get<DatosUsuario[]>(`${this.baseUrl}/me`);
  }

  /**
   * Guarda token y objeto usuario en localStorage.
   * @param token string token JWT
   * @param usuario objeto usuario (puede incluir rol y contratoActivo)
   */
  guardarSesion(token: string, usuario: any): void {
    try {
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      console.log('✅ Sesión guardada correctamente');
    } catch (e) {
      console.error('Error guardando sesión en localStorage', e);
    }
  }

  /**
   * Devuelve token desde localStorage
   */
  obtenerToken(): string {
    return localStorage.getItem('token') || '';
  }

  /**
   * Devuelve el objeto usuario guardado en session/localStorage
   */
  obtenerUsuario(): any | null {
    const u = localStorage.getItem('usuario');
    return u ? JSON.parse(u) : null;
  }

  /**
   * Indica si hay sesión activa (por token)
   */
  estaLogueado(): boolean {
    return !!this.obtenerToken();
  }

  /**
   * Limpia session (frontend)
   */
  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    console.log('🔒 Sesión limpiada');
  }
}