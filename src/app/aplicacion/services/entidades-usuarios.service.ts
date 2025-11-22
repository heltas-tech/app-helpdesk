import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateEntidadUsuarioDto, UpdateEntidadUsuarioDto } from '../interfaces/entidad-usuario.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EntidadesUsuariosService {
  private apiUrl = `${environment.apiAuthUrl}/entidades-usuarios`;

  constructor(private http: HttpClient) {}

  lista(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  crear(entidadUsuario: CreateEntidadUsuarioDto): Observable<any> {
    return this.http.post<any>(this.apiUrl, entidadUsuario);
  }

  actualizar(id: number, entidadUsuario: UpdateEntidadUsuarioDto): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, entidadUsuario);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  toggleActivo(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/toggle-activo`, {});
  }

  getByEntidad(entidadId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?entidadId=${entidadId}`);
  }

  getByUsuario(usuarioId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}?usuarioId=${usuarioId}`);
  }
}