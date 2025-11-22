import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContratosService {
  private apiUrl = `${environment.apiAuthUrl}`;

  constructor(private http: HttpClient) {}

  // Listar contratos activos
  lista(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contratos`);
  }

  // Listar contratos eliminados
  listaEliminados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contratos/eliminados`);
  }

  // Obtener contrato por ID
  obtener(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contratos/${id}`);
  }

  // Crear contrato
  crear(contrato: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contratos`, contrato);
  }

  // Actualizar contrato
  actualizar(id: number, contrato: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/contratos/${id}`, contrato);
  }

  // Eliminar contrato (soft delete)
  eliminar(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/contratos/${id}`);
  }

  // Restaurar contrato
  restaurar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contratos/${id}/restore`, {});
  }

  // Cambiar estado del contrato
  // ✅ Esto recibe un objeto con estado y motivo
cambiarEstado(id: number, datos: { estado: string; motivo: string }): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/contratos/${id}/estado`, datos);
}

  // Generar PDF
  generarPdf(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contratos/${id}/generar-pdf`, {});
  }

  // Obtener URL del PDF
  obtenerPdfUrl(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contratos/${id}/pdf-url`);
  }

  // Descargar PDF
  descargarPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/contratos/${id}/descargar-pdf`, {
      responseType: 'blob'
    });
  }

  // Ver PDF
  verPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/contratos/${id}/ver-pdf`, {
      responseType: 'blob'
    });
  }
   obtenerContratoCompleto(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/contratos/${id}/completo`);
  }
}