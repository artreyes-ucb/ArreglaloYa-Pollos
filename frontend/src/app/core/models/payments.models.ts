export interface CategoriaComisionItem {
  idCategoria: number;
  nombre: string;
  descripcion: string | null;
  porcentajeComision: number;
}

export interface PagoItem {
  idPago: string;
  idProgramacion: string | null;
  tipo: 'ANTICIPO_25' | 'PAGO_FINAL' | 'REEMBOLSO' | string;
  monto: string;
  comisionPlataforma: string;
  montoReportadoCliente: string | null;
  confirmadoCliente: boolean;
  fechaConfirmacionCliente: string | null;
  montoReportadoTrabajador: string | null;
  confirmadoTrabajador: boolean;
  fechaConfirmacionTrabajador: string | null;
  estado: 'PENDIENTE' | 'CONCILIADO' | 'DISCREPANTE' | 'RECHAZADO' | string;
  referencia: string | null;
  fechaPago: string;
}

export interface ComisionItem {
  idComision: string;
  idProgramacion: string;
  precioFinal: string;
  porcentaje: string;
  montoComision: string;
  montoNetoTrabajador: string;
  estado: 'REGISTRADA' | 'LIQUIDADA';
  fechaRegistro: string;
}

export interface EvaluacionItem {
  idEvaluacion: string;
  idProgramacion: string;
  puntuacion: number;
  comentario: string | null;
  fechaEvaluacion: string;
}

export interface ReclamoItem {
  idReclamo: string;
  idProgramacion: string;
  descripcion: string;
  evidenciaUrl: string | null;
  estado: 'ABIERTO' | 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO' | 'CERRADO';
  resolucion: string | null;
  fechaReclamo: string;
  fechaResolucion: string | null;
}

export interface ReembolsoItem {
  idReembolso: string;
  idProgramacion: string;
  idPago: string;
  montoSolicitado: string;
  motivo: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'COMPLETADO';
  observacionAdmin: string | null;
  fechaSolicitud: string;
  fechaResolucion: string | null;
}

export interface ServicioEconomicoItem {
  idProgramacion: string;
  estado: 'PROGRAMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO' | string;
  fechaServicio: string;
  horaInicio: string;
  horaFin: string;
  precioAcordado: number;
  anticipoReferencia25: number;
  porcentajeComisionVigente: number;
  marcadoTerminadoPorTrabajador: boolean;
  fechaDeclaracionTrabajador: string | null;
  confirmadoPorCliente: boolean;
  fechaConfirmacionCliente: string | null;
  motivoCancelacion: string | null;
  fechaCancelacion: string | null;
  solicitud: {
    idSolicitud: string;
    descripcion: string;
    ubicacionGeneral: string;
    idCategoria: number | null;
    categoria: string;
    porcentajeComisionCategoria: number;
    zona: string;
  };
  cliente: { idUsuario: string; nombre: string };
  trabajador: { idUsuario: string; nombre: string };
  pagos: PagoItem[];
  comision: ComisionItem | null;
  evaluacion: EvaluacionItem | null;
  reclamos: ReclamoItem[];
  reembolso: ReembolsoItem | null;
}