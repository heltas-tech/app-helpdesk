import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SlasService {
  private apiUrl = `${environment.apiAuthUrl}`;

  constructor(private http: HttpClient) {}

  lista(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/slas`);
  }

  crear(sla: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/slas`, sla);
  }

  actualizar(id: number, sla: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/slas/${id}`, sla);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/slas/${id}`);
  }

  listaEliminados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/slas/deleted`);
  }

  restaurar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/slas/${id}/restore`, {});
  }
}