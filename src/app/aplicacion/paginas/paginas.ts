import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { Acceso as AccesoService } from '../services/acceso';
import { AccessControlService } from '../services/access-control.service';
import { environment } from '../../../environments/environment';
import { GlobalFuntions as GlobalFunctionsService } from '../services/global-funtions';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { NotificacionesCampanitaComponent } from '../shared/notificaciones-campanita/notificaciones-campanita';

@Component({
  selector: 'app-paginas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterOutlet,
    MatIconModule,
    MatMenuModule,
    NotificacionesCampanitaComponent
],
  templateUrl: './paginas.html',
  styleUrls: ['./paginas.scss'],
})
export class Paginas implements OnInit {
  private accesoService = inject(AccesoService);
  private accessControl = inject(AccessControlService);
  private router = inject(Router);
  private global = inject(GlobalFunctionsService);

  public codSistema: string = environment.codSistema;
  public tituloSistema: string = environment.tituloSistema;
  public sistemaObjeto: any;
  public userDatosObjeto: any;
  public menu: any[] = [];
  public userRol: string = '';

  // Control del sidebar
  isSidebarOpen: boolean = window.innerWidth >= 768;

  ngOnInit() {
      console.log('🔍 PAGINAS: Componente iniciado en ruta:', this.router.url);

    // Mantiene el estado del sidebar según preferencia
    const savedPref = localStorage.getItem('sidebarPref');
    if (savedPref) {
      this.isSidebarOpen = savedPref === 'open';
    }

    // Validar token antes de cargar
    this.global.validacionToken();

    // Verificar acceso y obtener rol
      console.log('🔍 PAGINAS: Iniciando verificación de acceso...');

    this.verificarAccesoYCargarMenu();
  }

  /**
   * Verifica acceso y carga menú según rol
   */
  private verificarAccesoYCargarMenu(): void {
      console.log('🔍 PAGINAS: Llamando checkAccess()');

    this.accessControl.checkAccess().subscribe({
      next: (accessData) => {
              console.log('🔍 PAGINAS: Respuesta de checkAccess:', accessData);

        if (!accessData) {
          
          console.error('No se pudo obtener datos de acceso');
          this.router.navigate(['/login']);
          return;
        }

        if (!accessData.hasAccess) {
                  console.log('🔍 PAGINAS: Acceso denegado');

          this.router.navigate(['/acceso-denegado']);
          return;
        }

        this.userRol = accessData.rol;
              console.log('🔍 PAGINAS: Rol del usuario:', this.userRol);

        // Definir sistema
        this.sistemaObjeto = { cod_sistema: this.codSistema };

        // Cargar menú según rol

        this.cargarMenuPorRol(this.userRol);

        // Redirigir al dashboard correspondiente
              console.log('🔍 PAGINAS: Redirigiendo según rol...');

        this.redirigirSegunRol(this.userRol);
      },
      error: (error) => {
      console.error('🔍 PAGINAS: Error en checkAccess:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Carga menú según el rol del usuario
   */
  private cargarMenuPorRol(rol: string) {
    switch (rol.toUpperCase()) {
      case 'ADMINISTRADOR':
        this.menu = this.getMenuAdministrador();
        break;
      case 'TECNICO':
        this.menu = this.getMenuTecnico();
        break;
      case 'CLIENTE':
        this.menu = this.getMenuCliente();
        break;
      default:
        this.menu = this.getMenuDefault();
        break;
    }
  }

  /**
   * Redirige al usuario según su rol.
   */
  private redirigirSegunRol(rol: string) {
    const currentRoute = this.router.url;
    
    // Si ya está en una ruta específica de su rol, no redirigir
    if (currentRoute.includes('/admin/') && rol === 'ADMINISTRADOR') return;
    if (currentRoute.includes('/tecnico/') && rol === 'TECNICO') return;
    if (currentRoute.includes('/cliente/') && rol === 'CLIENTE') return;
    if (currentRoute !== '/') return

    switch (rol.toUpperCase()) {
      case 'ADMINISTRADOR':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'TECNICO':
        this.router.navigate(['/tecnico/inicio']);
        break;
      case 'CLIENTE':
        this.router.navigate(['/cliente/inicio']);
        break;
      default:
        this.router.navigate(['/inicio']);
        break;
    }
  }

  /**
   * Menú para ADMINISTRADOR
   */
  private getMenuAdministrador() {
    return [
      {
        menu: 'Panel Principal',
        icono: 'dashboard',
        expanded: true,
        hijos: [
          { menu: 'Dashboard', url: 'admin/dashboard' },
          { menu: 'Análisis', url: 'analisis' }
        ],
      },
      {
        menu: 'Gestión de Tickets',
        icono: 'confirmation_number',
        expanded: false,
        hijos: [
          { menu: 'Todos los Tickets', url: 'ticket' },
          { menu: 'Estadísticas', url: 'analisis' }
        ],
      },
      {
        menu: 'Base de Conocimiento',
        icono: 'menu_book',
        expanded: false,
        hijos: [{ menu: 'Consultas', url: 'base-conocimiento' }],
      },
      {
        menu: 'Catálogos',
        icono: 'category',
        expanded: false,
        hijos: [
          { menu: 'Categorías', url: 'categorias' },
          { menu: 'Subcategorías', url: 'subcategorias' },
          { menu: 'Prioridades', url: 'prioridades' },
        ],
      },
      {
        menu: 'Entidades y Usuarios',
        icono: 'business',
        expanded: false,
        hijos: [
          { menu: 'Entidades', url: 'entidades' },
          { menu: 'Usuarios', url: 'usuarios' },
          { menu: 'Asignación', url: 'entidades-usuarios' },
        ],
      },
      {
        menu: 'Contratos y SLAs',
        icono: 'assignment',
        expanded: false,
        hijos: [
          { menu: 'Contratos', url: 'contratos' },
          { menu: 'SLAs', url: 'slas' },
        ],
      },
      {
        menu: 'Personas',
        icono: 'people',
        expanded: false,
        hijos: [{ menu: 'Lista de Personas', url: 'personas' }],
      }
    ];
  }

  /**
   * Menú para TÉCNICO
   */
  private getMenuTecnico() {
    return [
      {
        menu: 'Panel Técnico',
        icono: 'dashboard',
        expanded: true,
        hijos: [
          { menu: 'Inicio', url: 'tecnico/inicio' },
          { menu: 'Mis Tickets', url: 'tecnico/tickets' }
        ],
      },
      
      {
        menu: 'Base de Conocimiento',
        icono: 'menu_book',
        expanded: false,
        hijos: [{ menu: 'Consultar', url: 'base-conocimiento' }],
      }
    ];
  }

  /**
   * Menú para CLIENTE
   */
  private getMenuCliente() {
    return [
      {
        menu: 'Mi Panel',
        icono: 'dashboard',
        expanded: true,
        hijos: [
          { menu: 'Inicio', url: 'cliente/inicio' },
          { menu: 'Mis Tickets', url: 'mis-tickets' }
        ],
      },
      {
        menu: 'Tickets',
        icono: 'confirmation_number',
        expanded: false,
        hijos: [
          { menu: 'Nuevo Ticket', url: 'crear-ticket' },
          { menu: 'Historial', url: 'mis-tickets' }
        ],
      },
      {
        menu: 'Base de Conocimiento',
        icono: 'menu_book',
        expanded: false,
        hijos: [{ menu: 'Consultar', url: 'base-conocimiento' }],
      }
    ];
  }

  /**
   * Menú por defecto
   */
  private getMenuDefault() {
    return [
      {
        menu: 'Inicio',
        icono: 'home',
        expanded: true,
        hijos: [{ menu: 'Página Principal', url: 'inicio' }],
      }
    ];
  }

  /**
   * Cierra sesión limpiando sesión y token
   */
  logout() {
    this.accesoService.logout().subscribe({
      next: (data) => {
        if (data.isSuccess) {
          this.global.limpiarSesionYRedirigir();
        }
      },
      error: () => {
        this.global.limpiarSesionYRedirigir();
      },
    });
  }

  /**
   * Alternar sidebar (modo móvil)
   */
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  /**
   * Persistencia de sidebar
   */
  toggleSidebarPersistent() {
    this.isSidebarOpen = !this.isSidebarOpen;
    localStorage.setItem('sidebarPref', this.isSidebarOpen ? 'open' : 'closed');
  }

  /**
   * Expandir o colapsar submenús
   */
  toggleSubmenu(item: any) {
    item.expanded = !item.expanded;
  }

  onSubmenuClick() {
    if (window.innerWidth < 768) {
      this.isSidebarOpen = false;
    }
  }
}