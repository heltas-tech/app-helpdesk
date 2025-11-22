import { Routes } from "@angular/router";
import { Paginas } from "./paginas";
import { Inicio } from "./inicio/inicio";
import { Analisis } from "./analisis/analisis";
import { TicketsComponent } from "./ticket/ticket";
import { BaseConocimientoComponent } from "./base-conocimiento/base-conocimiento";
import { CategoriasComponent } from "./categorias/categorias";
import { SubcategoriasComponent } from "./subcategorias/subcategorias";
import { PersonasComponent } from "./personas/personas";
import { PrioridadesComponent } from "./prioridades/prioridades";
import { EntidadesComponent } from "./entidades/entidades";
import { SlasComponent } from "./slas/slas";
import { Contratos } from "./contratos/contratos";
import { UsuariosComponent } from "./usuarios/usuarios";
import { EntidadesUsuariosComponent } from "./entidades-usuarios/entidades-usuarios";
import { CrearTicketComponent } from "./crear-ticket/crear-ticket";
import { MisTicketsComponent } from "./mis-tickets/mis-tickets";
import { TestRouteComponent } from "./test-route/test-route.component";
import { InicioTecnicoComponent } from "./tecnico/inicio-tecnico/inicio-tecnico";
import { TicketsTecnicoComponent } from "./tecnico/tickets-tecnico/tickets-tecnico";

// Importa los nuevos componentes que necesitarás crear
import { AdminDashboardComponent } from "./inicio-administrador/admin-dashboard.component";
import { ClienteInicioComponent } from "./inicio-cliente.ts/cliente-inicio.component";
import { AccesoDenegadoComponent } from "../seguridad/acceso-denegado/acceso-denegado";
import { CambioContrasenaObligatorioComponent } from "../seguridad/cambio-contrasena-obligatorio/cambio-contrasena-obligatorio";
import { RestablecerContrasenaComponent } from "../seguridad/restablecer-contrasena/restablecer-contrasena";
import { MiPerfilComponent } from "./mi-perfil/mi-perfil";

export default[
    {
        path: '', 
        component: Paginas,
        children: [
            // Rutas públicas/comunes
            {path: '', component: Inicio},
            {path: 'inicio', component: Inicio},
            {path: 'base-conocimiento', component: BaseConocimientoComponent},
            
            // Rutas de ADMINISTRADOR
            {path: 'admin/dashboard', component: AdminDashboardComponent},
            {path: 'analisis', component: Analisis},
            {path: 'ticket', component: TicketsComponent},
            {path: 'categorias', component: CategoriasComponent},
            {path: 'subcategorias', component: SubcategoriasComponent},
            {path: 'personas', component: PersonasComponent},
            {path: 'prioridades', component: PrioridadesComponent},
            {path: 'entidades', component: EntidadesComponent},
            {path: 'slas', component: SlasComponent},
            {path: 'contratos', component: Contratos},
            {path: 'usuarios', component: UsuariosComponent},
            {path: 'entidades-usuarios', component: EntidadesUsuariosComponent},
            {path: 'mi-perfil', component: MiPerfilComponent},
            
            // Rutas de TÉCNICO
            {path: 'tecnico/inicio', component: InicioTecnicoComponent},
            {path: 'tecnico/tickets', component: TicketsTecnicoComponent},
            {path: 'tickets-tecnico', component: TicketsTecnicoComponent},
            
            // Rutas de CLIENTE
            {path: 'cliente/inicio', component: ClienteInicioComponent},
            {path: 'crear-ticket', component: CrearTicketComponent},
            {path: 'mis-tickets', component: MisTicketsComponent},
            
            // Rutas de prueba
            { path: 'test-route', component: TestRouteComponent },
            { path: 'acceso-denegado', component: AccesoDenegadoComponent }

        ]
   }, 
   {
     path: 'auth',
     children: [
       { path: 'cambio-contrasena-obligatorio', component: CambioContrasenaObligatorioComponent },
       { path: 'restablecer-contrasena', component: RestablecerContrasenaComponent }
     ]
   }
] as Routes;