// services/entidades.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EntidadInterface } from '../interfaces/entidades.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class EntidadesService {
  private apiUrl = `${environment.apiAuthUrl}/entidades`;

  constructor(private http: HttpClient) {}

  lista(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  crear(entidad: EntidadInterface): Observable<any> {
    return this.http.post<any>(this.apiUrl, entidad);
  }

  actualizar(id: number, entidad: EntidadInterface): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, entidad);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}