ng g c aplicacion/seguridad/login --skip-tests
ng g c aplicacion/seguridad/registro --skip-tests

ng g c aplicacion/paginas --skip-tests
ng g r aplicacion/paginas --skip-tests
ng g c aplicacion/paginas/inicio --skip-tests

ng g c aplicacion/paginas/analisis --skip-tests
ng g c aplicacion/paginas/ticket --skip-tests

ng g c aplicacion/paginas/categorias --skip-tests
ng g c aplicacion/paginas/categoriasModal --skip-tests

ng g c aplicacion/paginas/subcategorias --skip-tests
ng g c aplicacion/paginas/subcategoriasModal --skip-tests

ng g c aplicacion/paginas/personas --skip-tests
ng g c aplicacion/paginas/personasModal --skip-tests

ng g c aplicacion/paginas/prioridades --skip-tests
ng g c aplicacion/paginas/prioridadesModal --skip-tests

ng g c aplicacion/paginas/entidades --skip-tests
ng g c aplicacion/paginas/entidadesModal --skip-tests

ng g c aplicacion/paginas/slas --skip-tests
ng g c aplicacion/paginas/slasModal --skip-tests

ng g c aplicacion/paginas/contratos --skip-tests
ng g c aplicacion/paginas/contratosModal --skip-tests

ng g c aplicacion/paginas/usuarios --skip-tests
ng g c aplicacion/paginas/usuariosModal --skip-tests

ng g c aplicacion/paginas/entidades-usuarios --skip-tests
ng g c aplicacion/paginas/entidades-usuariosModal --skip-tests

ng g c aplicacion/paginas/ticket --skip-tests
ng g c aplicacion/paginas/ticketModal --skip-tests
ng g c aplicacion/paginas/crear-ticket --skip-tests
ng g c aplicacion/paginas/detalle-ticket --skip-tests

ng g c aplicacion/paginas/inicio-tecnico --skip-tests
ng g c aplicacion/paginas/tickets-tecnico --skip-tests



# creacion de servicios
ng g service aplicacion/services/acceso --skip-tests
ng g service aplicacion/services/subcategorias --skip-tests
ng g service aplicacion/services/globalFuntions --skip-tests

ng g interceptor aplicacion/custom/auth --skip-tests
ng g guard aplicacion/custom/auth --skip-tests

ng g service aplicacion/services/categorias.service --skip-tests

ng g service aplicacion/services/personas --skip-tests

ng g service aplicacion/services/prioridades --skip-tests

ng g service aplicacion/services/entidades.service --skip-tests

ng g service aplicacion/services/slas.service --skip-tests

ng g service aplicacion/services/contratos.service --skip-tests

ng g service aplicacion/services/usuarios.service --skip-tests

ng g service aplicacion/services/entidades-usuarios.service --skip-tests

ng g service aplicacion/services/ticket.service --skip-tests

ng g service aplicacion/services/mensajes-tickets.service --skip-tests


# creacion de interfaces
ng g i aplicacion/interfaces/login
ng g i aplicacion/interfaces/usuario
ng g i aplicacion/interfaces/responseAcceso 
ng g i aplicacion/interfaces/responseRegistro
ng g i aplicacion/interfaces/sistema
ng g i aplicacion/interfaces/datosUsuario

ng g i aplicacion/interfaces/categoria.interface
ng g i aplicacion/interfaces/subcategorias.interface
ng g i aplicacion/interfaces/personas.interface
ng g i aplicacion/interfaces/prioridades.interface
ng g i aplicacion/interfaces/entidades.interface
ng g i aplicacion/interfaces/slas.interface
ng g i aplicacion/interfaces/contratos.interface

ng g i aplicacion/interfaces/usuarios.interface
ng g i aplicacion/interfaces/entidad-usuario.interface
ng g i aplicacion/interfaces/ticket.interface
ng g i aplicacion/interfaces/mensaje-ticket.interface
