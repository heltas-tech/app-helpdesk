import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CategoriaInterface } from '../interfaces/categoria.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  update(id: any, element: any) {
    throw new Error('Method not implemented.');
  }
  private apiUrl = `${environment.apiAuthUrl}`;

  constructor(private http: HttpClient) {}

  lista(): Observable<CategoriaInterface[]> {
    return this.http.get<CategoriaInterface[]>(`${this.apiUrl}/categorias`);
  }
  crear(categoria: CategoriaInterface): Observable<CategoriaInterface> {
    return this.http.post<CategoriaInterface>(`${this.apiUrl}/categorias`, categoria);
  }
  actualizar(id: number, categoria: CategoriaInterface): Observable<CategoriaInterface> {
    return this.http.patch<CategoriaInterface>(`${this.apiUrl}/categorias/${id}`, categoria);
  }
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/categorias/${id}`);
  }
}
