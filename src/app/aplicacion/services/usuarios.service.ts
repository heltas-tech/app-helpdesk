import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  CreateUsuarioDto, 
  UpdateUsuarioDto, 
  UsuarioRegistroResponse,
  UpdateProfileDto 
} from '../interfaces/usuarios.interface';
import { environment } from '../../../environments/environment';
import { GlobalFuntions } from './global-funtions'; 


@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private apiUrl = `${environment.apiAuthUrl}/usuarios`;

  constructor(
    private http: HttpClient,
    private global: GlobalFuntions
  
  ) {}

  // --- MÉTODOS EXISTENTES ---
  
  lista(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  crear(usuario: CreateUsuarioDto): Observable<UsuarioRegistroResponse> {
    return this.http.post<UsuarioRegistroResponse>(this.apiUrl, usuario);
  }

  actualizar(id: number, usuario: UpdateUsuarioDto): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, usuario);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }


  /** 🔓 DESBLOQUEAR USUARIO MANUALMENTE */
  desbloquearUsuario(id: number, usuario_modificacion: string = 'ADMIN'): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/desbloquear`, {
      usuario_modificacion
    });
  }

  /** 🔍 BUSCAR USUARIOS CON FILTROS AVANZADOS */
  buscarUsuarios(filtros: {
    rol?: string;
    activo?: boolean;
    eliminado?: boolean;
    bloqueado?: boolean;
    search?: string;
  }): Observable<any> {
    // Construir query params
    let params = new HttpParams();
    
    if (filtros.rol) params = params.set('rol', filtros.rol);
    if (filtros.activo !== undefined) params = params.set('activo', filtros.activo.toString());
    if (filtros.eliminado !== undefined) params = params.set('eliminado', filtros.eliminado.toString());
    if (filtros.bloqueado !== undefined) params = params.set('bloqueado', filtros.bloqueado.toString());
    if (filtros.search) params = params.set('search', filtros.search);

    return this.http.get<any>(`${this.apiUrl}/buscar/filtros`, { params });
  }

  /** 👤 ACTUALIZAR PERFIL PROPIO */
  actualizarPerfil(userId: number, data: UpdateProfileDto): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/perfil/${userId}`, data);
  }

  /** 👤 OBTENER DATOS DEL PERFIL PROPIO */
  obtenerMiPerfil(): Observable<any> {
    // Nota: Necesitarías crear este endpoint en el backend o usar el existente
    // Por ahora usamos el endpoint general con el ID del usuario logeado
    const userId = this.getUserIdFromToken(); // Necesitas implementar esto
    return this.http.get<any>(`${this.apiUrl}/${userId}`);
  }

  // --- MÉTODO AUXILIAR (OPCIONAL) ---
  
  /** Obtener ID del usuario del token (necesitas implementar) */
  private getUserIdFromToken(): number {
    // Esto depende de cómo manejes el JWT en tu app
    // Ejemplo básico:
    const token = localStorage.getItem('token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId;
    }
    return 0;
  }
}