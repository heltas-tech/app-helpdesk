export interface UsuarioSesion {
  id: number;                 // ID del usuario
  nombre_usuario: string;     // Nombre completo
  correo_electronico: string; // Email
  rol: string;                // Rol: ADMINISTRADOR, TECNICO, CLIENTE
  token: string;              // JWT para autenticación
  activo: boolean;            // Para validar si el usuario está activo
}
