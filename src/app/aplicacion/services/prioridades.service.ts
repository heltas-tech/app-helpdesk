  import { Injectable } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable } from 'rxjs';
  import { PrioridadesInterface } from '../interfaces/prioridades.interface';
  import { environment } from '../../../environments/environment';

  @Injectable({ providedIn: 'root' })
  export class PrioridadesService {
    private apiUrl = `${environment.apiAuthUrl}`;

    constructor(private http: HttpClient) {}

    lista(): Observable<PrioridadesInterface[]> {
      return this.http.get<PrioridadesInterface[]>(`${this.apiUrl}/prioridades`);
    }

    crear(prioridad: PrioridadesInterface): Observable<PrioridadesInterface> {
      return this.http.post<PrioridadesInterface>(`${this.apiUrl}/prioridades`, prioridad);
    }

    actualizar(id: number, prioridad: PrioridadesInterface): Observable<PrioridadesInterface> {
      return this.http.patch<PrioridadesInterface>(`${this.apiUrl}/prioridades/${id}`, prioridad);
    }

    eliminar(id: number): Observable<void> {
      return this.http.delete<void>(`${this.apiUrl}/prioridades/${id}`);
    }
  }
