    import { Injectable } from '@angular/core';
    import { HttpClient, HttpParams } from '@angular/common/http';
    import { Observable } from 'rxjs';
    import { environment } from '../../../environments/environment';
    import { 
    ApiResponse, 
    DashboardStatsResponse, 
    RecentTicketResponse, 
    CalendarMonthResponse, 
    TopTecnicoResponse, 
    CategoriaMetricaResponse,
    DashboardQuery,
    EstadoSLA,
    EstadoTicket,
    PrioridadTicket 
    } from '../interfaces/dashboard.interface';

    @Injectable({
    providedIn: 'root'
    })
    export class DashboardService {
    private apiUrl = `${environment.apiUrl}/dashboard`;

    constructor(private http: HttpClient) { }

    // ==================== DASHBOARD POR ROL ====================

    /** Obtener dashboard según rol del usuario */
    getMiDashboard(): Observable<ApiResponse<DashboardStatsResponse>> {
        return this.http.get<ApiResponse<DashboardStatsResponse>>(`${this.apiUrl}/mi-dashboard`);
    }

    /** Dashboard para administrador */
    getDashboardAdmin(): Observable<ApiResponse<DashboardStatsResponse>> {
        return this.http.get<ApiResponse<DashboardStatsResponse>>(`${this.apiUrl}/admin`);
    }

    /** Dashboard para técnico */
    getDashboardTecnico(): Observable<ApiResponse<DashboardStatsResponse>> {
        return this.http.get<ApiResponse<DashboardStatsResponse>>(`${this.apiUrl}/tecnico`);
    }

    /** Dashboard para cliente */
    getDashboardCliente(): Observable<ApiResponse<DashboardStatsResponse>> {
        return this.http.get<ApiResponse<DashboardStatsResponse>>(`${this.apiUrl}/cliente`);
    }

    /** Método inteligente que determina qué dashboard obtener según el rol */
    getDashboardByRol(rol: string): Observable<ApiResponse<DashboardStatsResponse>> {
        switch (rol) {
        case 'ADMINISTRADOR':
            return this.getDashboardAdmin();
        case 'TECNICO':
            return this.getDashboardTecnico();
        case 'CLIENTE':
            return this.getDashboardCliente();
        default:
            return this.getMiDashboard();
        }
    }

    // ==================== TICKETS RECIENTES ====================

    /** Obtener tickets recientes según rol */
    getTicketsRecientes(limit: number = 10): Observable<ApiResponse<RecentTicketResponse[]>> {
        let params = new HttpParams();
        if (limit !== 10) {
        params = params.set('limit', limit.toString());
        }
        return this.http.get<ApiResponse<RecentTicketResponse[]>>(`${this.apiUrl}/tickets-recientes`, { params });
    }

    // ==================== CALENDARIO ====================

    /** Obtener calendario según rol */
    getCalendario(mes?: number, anio?: number): Observable<ApiResponse<CalendarMonthResponse>> {
        let params = new HttpParams();
        
        const hoy = new Date();
        const mesParam = mes !== undefined ? mes : hoy.getMonth();
        const anioParam = anio !== undefined ? anio : hoy.getFullYear();
        
        params = params.set('mes', mesParam.toString());
        params = params.set('anio', anioParam.toString());
        
        return this.http.get<ApiResponse<CalendarMonthResponse>>(`${this.apiUrl}/calendario`, { params });
    }

    // ==================== REPORTES ESPECIALES (SOLO ADMIN) ====================

    /** Obtener métricas por categoría (solo admin) */
    getMetricasCategorias(): Observable<ApiResponse<CategoriaMetricaResponse[]>> {
        return this.http.get<ApiResponse<CategoriaMetricaResponse[]>>(`${this.apiUrl}/metricas-categorias`);
    }

    /** Obtener top técnicos (solo admin) */
    getTopTecnicos(limit: number = 5): Observable<ApiResponse<TopTecnicoResponse[]>> {
        let params = new HttpParams();
        if (limit !== 5) {
        params = params.set('limit', limit.toString());
        }
        return this.http.get<ApiResponse<TopTecnicoResponse[]>>(`${this.apiUrl}/tecnicos-top`, { params });
    }

    // ==================== HEALTH CHECK ====================

    /** Verificar estado del servicio */
    getHealthCheck(): Observable<ApiResponse<{ status: string; timestamp: string }>> {
        return this.http.get<ApiResponse<{ status: string; timestamp: string }>>(`${this.apiUrl}/health`);
    }

    // ==================== UTILIDADES PARA UI ====================

    /** Formatear tiempo para mostrar en UI */
    formatTiempoParaUI(tiempo: string): string {
        if (!tiempo || tiempo === '0h 0m') return 'Sin datos';
        
        const diasMatch = tiempo.match(/(\d+)d/);
        const horasMatch = tiempo.match(/(\d+)h/);
        const minutosMatch = tiempo.match(/(\d+)m/);
        
        let result = '';
        if (diasMatch) result += `${diasMatch[1]} días `;
        if (horasMatch) result += `${horasMatch[1]} horas `;
        if (minutosMatch) result += `${minutosMatch[1]} minutos`;
        
        return result.trim() || tiempo;
    }

    /** Calcular porcentaje de completado */
    calcularPorcentajeCompletado(resueltos: number, total: number): number {
        if (total === 0) return 0;
        return Math.round((resueltos / total) * 100);
    }

    /** Obtener color según prioridad */
    getColorPrioridad(nivel: number | undefined): string {
        const nivelSeguro = nivel || 1;
        switch (nivelSeguro) {
        case PrioridadTicket.BAJA: return '#4caf50'; // Verde
        case PrioridadTicket.MEDIA: return '#2196f3'; // Azul
        case PrioridadTicket.ALTA: return '#ff9800'; // Naranja
        case PrioridadTicket.URGENTE: return '#f44336'; // Rojo
        default: return '#9e9e9e'; // Gris
        }
    }

    /** Obtener nombre de prioridad */
    getNombrePrioridad(nivel: number | undefined): string {
        const nivelSeguro = nivel || 1;
        switch (nivelSeguro) {
        case PrioridadTicket.BAJA: return 'Baja';
        case PrioridadTicket.MEDIA: return 'Media';
        case PrioridadTicket.ALTA: return 'Alta';
        case PrioridadTicket.URGENTE: return 'Urgente';
        default: return 'Normal';
        }
    }

    /** Obtener icono según prioridad */
    getIconoPrioridad(nivel: number): string {
        switch (nivel) {
        case PrioridadTicket.BAJA: return 'arrow_downward';
        case PrioridadTicket.MEDIA: return 'remove';
        case PrioridadTicket.ALTA: return 'arrow_upward';
        case PrioridadTicket.URGENTE: return 'warning';
        default: return 'help_outline';
        }
    }

    /** Obtener color según estado del ticket */
    getColorEstado(estado: string): string {
        switch (estado) {
        case EstadoTicket.NUEVO: return '#2196f3'; // Azul
        case EstadoTicket.EN_PROCESO: return '#ff9800'; // Naranja
        case EstadoTicket.PENDIENTE: return '#9c27b0'; // Púrpura
        case EstadoTicket.RESUELTO: return '#4caf50'; // Verde
        case EstadoTicket.CERRADO: return '#607d8b'; // Gris azulado
        case EstadoTicket.REABIERTO: return '#ff5722'; // Naranja oscuro
        default: return '#9e9e9e'; // Gris
        }
    }

    /** Obtener texto para estado del ticket */
    getTextoEstado(estado: string): string {
        switch (estado) {
        case EstadoTicket.NUEVO: return 'Nuevo';
        case EstadoTicket.EN_PROCESO: return 'En Proceso';
        case EstadoTicket.PENDIENTE: return 'Pendiente';
        case EstadoTicket.RESUELTO: return 'Resuelto';
        case EstadoTicket.CERRADO: return 'Cerrado';
        case EstadoTicket.REABIERTO: return 'Reabierto';
        default: return estado;
        }
    }

    /** Obtener color según estado de SLA */
    getColorSLA(estado: string): string {
        switch (estado) {
        case EstadoSLA.DENTRO_TIEMPO: return '#4caf50'; // Verde
        case EstadoSLA.POR_VENCER: return '#ff9800'; // Naranja
        case EstadoSLA.VENCIDO: return '#f44336'; // Rojo
        case EstadoSLA.SIN_SLA: return '#9e9e9e'; // Gris
        default: return '#9e9e9e';
        }
    }

    /** Obtener texto para estado de SLA */
    getTextoSLA(estado: string): string {
        switch (estado) {
        case EstadoSLA.DENTRO_TIEMPO: return 'En tiempo';
        case EstadoSLA.POR_VENCER: return 'Por vencer';
        case EstadoSLA.VENCIDO: return 'Vencido';
        case EstadoSLA.SIN_SLA: return 'Sin SLA';
        default: return estado;
        }
    }

    /** Obtener badge color según métrica */
    getBadgeColorPorcentaje(porcentaje: number): string {
        if (porcentaje >= 80) return 'success';
        if (porcentaje >= 60) return 'warning';
        return 'danger';
    }

    /** Calcular eficiencia para mostrar */
    calcularEficiencia(resueltos: number, asignados: number): number {
        if (asignados === 0) return 0;
        return Math.round((resueltos / asignados) * 100);
    }

    /** Obtener tiempo transcurrido desde fecha */
    getTiempoTranscurrido(isoFecha: string): string {
        const fecha = new Date(isoFecha);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fecha.getTime();
        const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDias = Math.floor(diffHoras / 24);

        if (diffDias > 0) {
        return `${diffDias} día${diffDias > 1 ? 's' : ''}`;
        } else if (diffHoras > 0) {
        return `${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
        } else {
        return 'Menos de 1 hora';
        }
    }

    /** Generar datos para gráfico de dona */
    generarDatosGraficoTickets(abiertos: number, resueltos: number): any {
        return {
        labels: ['Abiertos', 'Resueltos'],
        datasets: [
            {
            data: [abiertos, resueltos],
            backgroundColor: ['#FF6384', '#36A2EB'],
            hoverBackgroundColor: ['#FF6384', '#36A2EB']
            }
        ]
        };
    }

    /** Generar datos para gráfico de barras por categoría */
    generarDatosGraficoCategorias(categorias: CategoriaMetricaResponse[]): any {
        const topCategorias = categorias.slice(0, 7); // Tomar las primeras 7 categorías
        
        return {
        labels: topCategorias.map(c => c.nombre),
        datasets: [
            {
            label: 'Total Tickets',
            data: topCategorias.map(c => c.total_tickets),
            backgroundColor: topCategorias.map(c => c.color),
            borderColor: topCategorias.map(c => this.darkenColor(c.color, 20)),
            borderWidth: 1
            }
        ]
        };
    }

    /** Oscurecer color para bordes */
    private darkenColor(color: string, percent: number): string {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }



    }