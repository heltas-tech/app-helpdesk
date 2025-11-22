import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PersonaInterface } from '../interfaces/personas.interface';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PersonasService {
  private apiUrl = `${environment.apiAuthUrl}/personas`;

  constructor(private http: HttpClient) {}

  lista(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  crear(persona: PersonaInterface): Observable<any> {
    return this.http.post<any>(this.apiUrl, persona);
  }

  actualizar(id: number, persona: PersonaInterface): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${id}`, persona);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
