import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  sub: number;
  correo_electronico: string;
  rol: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3005/api/auth/login';

  constructor(private http: HttpClient) {}

  login(credentials: { correo_electronico: string; password: string }): Observable<any> {
    return this.http.post<any>(this.apiUrl, credentials);
  }

  // Guardar token y rol en localStorage
  setSession(token: string) {
    localStorage.setItem('token', token);
    const decoded = jwtDecode<TokenPayload>(token);
    localStorage.setItem('rol', decoded.rol);
    localStorage.setItem('email', decoded.correo_electronico);
  }

  getRole(): string | null {
    return localStorage.getItem('rol');
  }

  logout() {
    localStorage.clear();
  }
}
