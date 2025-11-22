import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubcategoriasService {
  private apiUrl = `${environment.apiAuthUrl}`;

  constructor(private http: HttpClient) {}

  lista(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/subcategorias`);
  }

  crear(subcategoria: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/subcategorias`, subcategoria);
  }

  actualizar(id: number, subcategoria: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/subcategorias/${id}`, subcategoria);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/subcategorias/${id}`);
  }
}
