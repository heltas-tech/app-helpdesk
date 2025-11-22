import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseConocimientoService } from '../../services/base-conocimiento.service';
import { 
  BaseConocimiento, 
  BaseConocimientoResponse 
} from '../../interfaces/base-conocimiento.interface';

@Component({
  selector: 'app-base-conocimiento',
  imports: [CommonModule, FormsModule],
  templateUrl: './base-conocimiento.html',
  styleUrl: './base-conocimiento.scss'
})
export class BaseConocimientoComponent implements OnInit {
  // Variables para búsqueda en frontend
  textoBusqueda: string = '';
  
  // Variables para listado
  basesConocimiento: BaseConocimiento[] = [];
  basesFiltradas: BaseConocimiento[] = [];
  baseSeleccionada: BaseConocimiento | null = null;
  
  // Estados de carga
  cargando: boolean = false;
  
  // Filtros y ordenamiento
  filtroUtilidad: string = 'todas';
  ordenamiento: string = 'fecha';
  
  // Estadísticas
  estadisticas = {
    total: 0,
    utiles: 0,
    recientes: 0
  };

  constructor(private baseConocimientoService: BaseConocimientoService) {}

  ngOnInit() {
    this.cargarBasesConocimiento();
  }

  /** Cargar todas las bases de conocimiento */
  cargarBasesConocimiento(): void {
    this.cargando = true;
    this.baseConocimientoService.getAll().subscribe({
      next: (response: BaseConocimientoResponse) => {
        if (response.isSuccess) {
          // ✅ CORREGIDO: Acceder correctamente a los datos
          if (response.data && typeof response.data === 'object' && 'activos' in response.data) {
            this.basesConocimiento = response.data.activos || [];
          } else if (Array.isArray(response.data)) {
            this.basesConocimiento = response.data;
          } else {
            this.basesConocimiento = [];
          }
          
          this.aplicarFiltrosYOrden();
          this.aplicarBusqueda(); // Aplicar búsqueda si hay texto
          this.calcularEstadisticas();
          console.log('✅ Bases cargadas:', this.basesConocimiento.length);
        } else {
          this.basesConocimiento = [];
          console.error('❌ Error en respuesta:', response.message);
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar bases:', error);
        this.cargando = false;
        this.basesConocimiento = [];
      }
    });
  }

  /** ✅ NUEVO: Búsqueda en frontend (como categorías) */
  aplicarFiltroBusqueda(event: any): void {
    this.textoBusqueda = event.target.value.toLowerCase().trim();
    this.aplicarBusqueda();
  }

  /** ✅ NUEVO: Aplicar búsqueda en los datos cargados */
  private aplicarBusqueda(): void {
    if (!this.textoBusqueda) {
      this.aplicarFiltrosYOrden();
      return;
    }

    const resultados = this.basesConocimiento.filter(base => 
      base.titulo.toLowerCase().includes(this.textoBusqueda) ||
      base.contenido.toLowerCase().includes(this.textoBusqueda) ||
      (base.palabras_clave && base.palabras_clave.toLowerCase().includes(this.textoBusqueda))
    );

    // Aplicar filtros adicionales a los resultados de búsqueda
    let basesFiltradas = resultados;

    if (this.filtroUtilidad === 'utiles') {
      basesFiltradas = basesFiltradas.filter(base => base.utilidad > 0);
    } else if (this.filtroUtilidad === 'populares') {
      basesFiltradas = basesFiltradas.filter(base => base.utilidad >= 5);
    }

    // Aplicar ordenamiento
    switch (this.ordenamiento) {
      case 'utilidad':
        basesFiltradas.sort((a, b) => b.utilidad - a.utilidad);
        break;
      case 'titulo':
        basesFiltradas.sort((a, b) => a.titulo.localeCompare(b.titulo));
        break;
      case 'fecha':
      default:
        basesFiltradas.sort((a, b) => new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime());
        break;
    }

    this.basesFiltradas = basesFiltradas;
  }

  /** Método para el botón buscar */
  buscar(): void {
    this.aplicarBusqueda();
  }

  /** Limpiar búsqueda */
  limpiarBusqueda(): void {
    this.textoBusqueda = '';
    this.aplicarFiltrosYOrden();
  }

  /** Aplicar filtros y ordenamiento (sin búsqueda) */
  aplicarFiltrosYOrden(): void {
    let bases = [...this.basesConocimiento];

    // Aplicar filtro de utilidad
    if (this.filtroUtilidad === 'utiles') {
      bases = bases.filter(base => base.utilidad > 0);
    } else if (this.filtroUtilidad === 'populares') {
      bases = bases.filter(base => base.utilidad >= 5);
    }

    // Aplicar ordenamiento
    switch (this.ordenamiento) {
      case 'utilidad':
        bases.sort((a, b) => b.utilidad - a.utilidad);
        break;
      case 'titulo':
        bases.sort((a, b) => a.titulo.localeCompare(b.titulo));
        break;
      case 'fecha':
      default:
        bases.sort((a, b) => new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime());
        break;
    }

    this.basesFiltradas = bases;
  }

  /** Calcular estadísticas */
  calcularEstadisticas(): void {
    this.estadisticas.total = this.basesConocimiento.length;
    this.estadisticas.utiles = this.basesConocimiento.filter(b => b.utilidad > 0).length;
    
    const unaSemanaAtras = new Date();
    unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);
    this.estadisticas.recientes = this.basesConocimiento.filter(b => 
      new Date(b.fecha_publicacion) > unaSemanaAtras
    ).length;
  }

  /** Seleccionar una base para ver detalles */
  seleccionarBase(base: BaseConocimiento): void {
    this.baseSeleccionada = base;
  }

  /** Votar por un artículo */
  votarUtil(id: number, util: boolean): void {
    this.baseConocimientoService.votar(id, util).subscribe({
      next: (response: BaseConocimientoResponse) => {
        if (response.isSuccess && response.data) {
          let baseActualizada: BaseConocimiento;
          
          if (Array.isArray(response.data)) {
            baseActualizada = response.data[0];
          } else if (typeof response.data === 'object' && 'id' in response.data) {
            baseActualizada = response.data as BaseConocimiento;
          } else {
            console.error('❌ Formato de respuesta inválido');
            return;
          }
          
          this.actualizarBaseEnListas(id, baseActualizada);
          console.log('✅ Voto registrado:', util ? 'Útil' : 'No útil');
        } else {
          console.error('❌ Error en respuesta de voto:', response.message);
        }
      },
      error: (error) => {
        console.error('❌ Error al votar:', error);
      }
    });
  }

  /** Actualizar base en todas las listas */
  private actualizarBaseEnListas(id: number, baseActualizada: BaseConocimiento): void {
    // Actualizar en basesConocimiento
    const index = this.basesConocimiento.findIndex(b => b.id === id);
    if (index !== -1) {
      this.basesConocimiento[index] = baseActualizada;
    }

    // Actualizar en basesFiltradas
    const indexFiltrado = this.basesFiltradas.findIndex(b => b.id === id);
    if (indexFiltrado !== -1) {
      this.basesFiltradas[indexFiltrado] = baseActualizada;
    }

    // Si está seleccionada, actualizarla
    if (this.baseSeleccionada && this.baseSeleccionada.id === id) {
      this.baseSeleccionada = baseActualizada;
    }

    // Re-aplicar búsqueda y filtros
    if (this.textoBusqueda) {
      this.aplicarBusqueda();
    } else {
      this.aplicarFiltrosYOrden();
    }
    
    this.calcularEstadisticas();
  }

  /** Obtener badge de utilidad */
  getBadgeUtilidad(utilidad: number): { texto: string, clase: string } {
    if (utilidad >= 10) return { texto: 'Muy útil', clase: 'bg-success' };
    if (utilidad >= 5) return { texto: 'Útil', clase: 'bg-primary' };
    if (utilidad >= 1) return { texto: 'Básico', clase: 'bg-info' };
    return { texto: 'Nuevo', clase: 'bg-secondary' };
  }

  /** Extraer palabras clave como array */
  getPalabrasClave(palabrasClave?: string): string[] {
    return palabrasClave ? palabrasClave.split(',').slice(0, 3) : [];
  }

  /** Cambiar filtro */
  cambiarFiltro(filtro: string): void {
    this.filtroUtilidad = filtro;
    if (this.textoBusqueda) {
      this.aplicarBusqueda();
    } else {
      this.aplicarFiltrosYOrden();
    }
  }

  /** Cambiar ordenamiento */
  cambiarOrden(orden: string): void {
    this.ordenamiento = orden;
    if (this.textoBusqueda) {
      this.aplicarBusqueda();
    } else {
      this.aplicarFiltrosYOrden();
    }
  }

  /** ✅ NUEVO: Obtener artículos a mostrar */
  getArticulosAMostrar(): BaseConocimiento[] {
    return this.textoBusqueda ? this.basesFiltradas : this.basesFiltradas;
  }

  /** ✅ NUEVO: Obtener contador de resultados */
  getContadorResultados(): number {
    return this.textoBusqueda ? this.basesFiltradas.length : this.basesFiltradas.length;
  }
}