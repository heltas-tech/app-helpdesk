export type TipoContrato = 'SERVICIO' | 'MANTENIMIENTO' | 'SOPORTE_TECNICO' | 'CONSULTORIA' | 'DESARROLLO' | 'LICENCIAMIENTO' | 'CAPACITACION';
export type EstadoContrato = 'BORRADOR' | 'PENDIENTE_FIRMA' | 'VIGENTE' | 'SUSPENDIDO' | 'FINALIZADO' | 'CANCELADO' | 'RENOVADO';
export type Moneda = 'BOB' | 'USD' | 'EUR';
export type PeriodoFacturacion = 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL' | 'EVENTUAL';

export interface ContratoInterface {
  id: number;
  numero_contrato: string;
  codigo_contrato?: string | null;
  titulo: string;
  tipo_contrato: TipoContrato;
  descripcion?: string | null;
  entidad_id: number;
  sla_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_firma?: string | null;
  periodo_prueba?: number | null;
  monto_total?: number | null;
  moneda?: Moneda | null;
  periodo_facturacion?: PeriodoFacturacion | null;
  forma_pago?: string | null;
  cuenta_bancaria?: string | null;
  contacto_entidad?: string | null;
  telefono_contacto?: string | null;
  email_contacto?: string | null;
  representante_entidad?: string | null;
  representante_heltas?: string | null;
  terminos_condiciones?: string | null;
  servicios_incluidos?: string | null;
  exclusiones?: string | null;
  penalidades?: string | null;
  ruta_documento?: string | null;
  numero_documento?: string | null;
  fecha_carga_documento?: string | null;
  estado_contrato: EstadoContrato;
  motivo_estado?: string | null;
  alerta_vencimiento?: boolean | null;
  dias_alerta?: number | null;
  eliminado: boolean;
  fecha_eliminacion?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  prioridad_id: number;
  etiquetas?: string | null; 
  observaciones?: string | null;
  contrato_origen_id?: number | null;
tipo_sla_id?: number; // ✅ NUEVO
  tipo_sla?: { // ✅ NUEVA RELACIÓN
    id: number;
    nombre: string;
    color?: string;
    activo: boolean;
  };
  
  entidad?: {
    id: number;
    denominacion: string;
    nit: string;
    estado: boolean;
  };
  sla?: {
    id: number;
    nombre: string;
    tiempo_respuesta: number;
    tiempo_resolucion: number;
    estado: boolean;
    prioridad_id?: number;
  };
  prioridad?: { 
    id: number;
    nombre: string;
    nivel: number;
    color?: string;
    estado: boolean;
  };
}

// Interface para crear contrato
export interface CreateContratoInterface {
  titulo: string;
  tipo_contrato: TipoContrato;
  descripcion?: string;
  entidad_id: number;
  sla_id: number;
  fecha_inicio: string;
  fecha_fin: string;
  periodo_prueba?: number;
  monto_total?: number;
  moneda?: Moneda;
  periodo_facturacion?: PeriodoFacturacion;
  forma_pago?: string;
  cuenta_bancaria?: string;
  contacto_entidad?: string;
  telefono_contacto?: string;
  email_contacto?: string;
  representante_entidad?: string;
  representante_heltas?: string;
  terminos_condiciones?: string;
  servicios_incluidos?: string;
  exclusiones?: string;
  penalidades?: string;
  prioridad_id: number;
  etiquetas?: string; 
  observaciones?: string;
  alerta_vencimiento?: boolean;
  dias_alerta?: number;
  created_by: string;
}

// Interface para actualizar contrato
export interface UpdateContratoInterface {
  titulo?: string;
  tipo_contrato?: TipoContrato;
  descripcion?: string;
  entidad_id?: number;
  sla_id?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  periodo_prueba?: number;
  monto_total?: number;
  moneda?: Moneda;
  periodo_facturacion?: PeriodoFacturacion;
  forma_pago?: string;
  cuenta_bancaria?: string;
  contacto_entidad?: string;
  telefono_contacto?: string;
  email_contacto?: string;
  representante_entidad?: string;
  representante_heltas?: string;
  terminos_condiciones?: string;
  servicios_incluidos?: string;
  exclusiones?: string;
  penalidades?: string;
  estado_contrato?: EstadoContrato;
  motivo_estado?: string;
  prioridad_id: number;
  etiquetas?: string; 
  observaciones?: string;
  alerta_vencimiento?: boolean;
  dias_alerta?: number;
  updated_by?: string;
}

// Interface para respuesta de la API
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T | null;
}

// Interface específica para respuesta de contratos
export interface ContratosResponse extends ApiResponse<ContratoInterface[]> {}
export interface ContratoResponse extends ApiResponse<ContratoInterface> {}

// Interface para cambio de estado
export interface CambioEstadoRequest {
  estado: EstadoContrato;
  motivo: string;
}

// Interface para respuesta de PDF
export interface PdfResponse {
  contrato: ContratoInterface;
  pdfUrl: string;
}

export interface EstadoContratoUI {
  value: EstadoContrato;
  label: string;
  color: string;
  icon: string;
}

export const ESTADOS_CONTRATO: EstadoContratoUI[] = [
  { value: 'BORRADOR', label: 'Borrador', color: 'bg-gray-100 text-gray-800', icon: 'draft' },
  { value: 'PENDIENTE_FIRMA', label: 'Pendiente Firma', color: 'bg-yellow-100 text-yellow-800', icon: 'pending' },
  { value: 'VIGENTE', label: 'Vigente', color: 'bg-green-100 text-green-800', icon: 'check_circle' },
  { value: 'SUSPENDIDO', label: 'Suspendido', color: 'bg-orange-100 text-orange-800', icon: 'pause_circle' },
  { value: 'FINALIZADO', label: 'Finalizado', color: 'bg-blue-100 text-blue-800', icon: 'task_alt' },
  { value: 'CANCELADO', label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: 'cancel' },
  { value: 'RENOVADO', label: 'Renovado', color: 'bg-purple-100 text-purple-800', icon: 'autorenew' }
];

export interface TipoContratoUI {
  value: TipoContrato;
  label: string;
}

export const TIPOS_CONTRATO: TipoContratoUI[] = [
  { value: 'SERVICIO', label: 'Servicio de TI' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'SOPORTE_TECNICO', label: 'Soporte Técnico' },
  { value: 'CONSULTORIA', label: 'Consultoría' },
  { value: 'DESARROLLO', label: 'Desarrollo' },
  { value: 'LICENCIAMIENTO', label: 'Licenciamiento' },
  { value: 'CAPACITACION', label: 'Capacitación' }
];

export interface MonedaUI {
  value: Moneda;
  label: string;
}

export const MONEDAS: MonedaUI[] = [
  { value: 'BOB', label: 'Boliviano (BOB)' },
  { value: 'USD', label: 'Dólar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' }
];

export interface PeriodoFacturacionUI {
  value: PeriodoFacturacion;
  label: string;
}

export const PERIODOS_FACTURACION: PeriodoFacturacionUI[] = [
  { value: 'MENSUAL', label: 'Mensual' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'SEMESTRAL', label: 'Semestral' },
  { value: 'ANUAL', label: 'Anual' },
  { value: 'EVENTUAL', label: 'Eventual' }
];

// Utilidades para trabajar con contratos
export class ContratoUtils {
  static getEstadoInfo(estado: EstadoContrato): EstadoContratoUI {
    return ESTADOS_CONTRATO.find(e => e.value === estado) || ESTADOS_CONTRATO[0];
  }

  static getTipoContratoInfo(tipo: TipoContrato): TipoContratoUI {
    return TIPOS_CONTRATO.find(t => t.value === tipo) || TIPOS_CONTRATO[0];
  }

  static getMonedaInfo(moneda: Moneda): MonedaUI {
    return MONEDAS.find(m => m.value === moneda) || MONEDAS[0];
  }

  static getPeriodoFacturacionInfo(periodo: PeriodoFacturacion): PeriodoFacturacionUI {
    return PERIODOS_FACTURACION.find(p => p.value === periodo) || PERIODOS_FACTURACION[0];
  }

  // Verificar si un contrato está próximo a vencer
  static estaProximoVencer(contrato: ContratoInterface, diasAlerta: number = 30): boolean {
    if (!contrato.alerta_vencimiento) return false;
    
    const fechaFin = new Date(contrato.fecha_fin);
    const hoy = new Date();
    const diferenciaMs = fechaFin.getTime() - hoy.getTime();
    const diferenciaDias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
    
    return diferenciaDias <= diasAlerta && diferenciaDias >= 0;
  }

  // Verificar si un contrato está vencido
  static estaVencido(contrato: ContratoInterface): boolean {
    const fechaFin = new Date(contrato.fecha_fin);
    const hoy = new Date();
    return fechaFin < hoy;
  }

  // Obtener días restantes para vencimiento
  static getDiasRestantes(contrato: ContratoInterface): number {
    const fechaFin = new Date(contrato.fecha_fin);
    const hoy = new Date();
    const diferenciaMs = fechaFin.getTime() - hoy.getTime();
    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
  }

  // Parsear etiquetas de string JSON a array
  static parsearEtiquetas(etiquetasString: string | null): string[] {
    if (!etiquetasString) return [];
    try {
      return JSON.parse(etiquetasString);
    } catch (error) {
      console.warn('Error parseando etiquetas:', error);
      return [];
    }
  }

  // Convertir array de etiquetas a string JSON
  static stringificarEtiquetas(etiquetasArray: string[] | null): string | null {
    if (!etiquetasArray || etiquetasArray.length === 0) return null;
    return JSON.stringify(etiquetasArray);
  }
}

// Tipo para filtros de contratos
export interface ContratoFiltros {
  estado?: EstadoContrato;
  tipo_contrato?: TipoContrato;
  entidad_id?: number;
  prioridad_id?: number;
  etiquetas?: string[];
  fecha_inicio_desde?: string;
  fecha_inicio_hasta?: string;
  fecha_fin_desde?: string;
  fecha_fin_hasta?: string;
}

// Tipo para paginación
export interface PaginacionContratos {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}