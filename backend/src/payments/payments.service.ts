import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { TIPO_EVENTO_HISTORIAL } from '../common/constants/historial-eventos';
import { Rol } from '../common/enums/rol.enum';
import { construirEventoHistorial } from '../common/utils/historial-solicitud.util';
import { Comision } from '../entities/comision.entity';
import { Evaluacion } from '../entities/evaluacion.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { Pago } from '../entities/pago.entity';
import { Reclamo } from '../entities/reclamo.entity';
import { Reembolso } from '../entities/reembolso.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Usuario } from '../entities/usuario.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CancelarServicioDto,
  ConfirmarPagoBilateralDto,
  CrearEvaluacionDto,
  CrearReclamoDto,
  RegistrarAnticipoDto,
  RegistrarPagoFinalDto,
  ResolverReclamoDto,
  ResolverReembolsoDto,
  SolicitarReembolsoDto,
} from './dto/payments.dto';

const PORCENTAJE_ANTICIPO = 0.25;
const PORCENTAJE_COMISION = 0.05;
const HORAS_LIMITE_CANCELACION = 3;
const DIAS_LIMITE_RECLAMO = 7;

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(ServicioProgramado)
    private readonly servicioRepo: Repository<ServicioProgramado>,
    @InjectRepository(SolicitudServicio)
    private readonly solicitudRepo: Repository<SolicitudServicio>,
    @InjectRepository(Pago)
    private readonly pagoRepo: Repository<Pago>,
    @InjectRepository(Comision)
    private readonly comisionRepo: Repository<Comision>,
    @InjectRepository(Reembolso)
    private readonly reembolsoRepo: Repository<Reembolso>,
    @InjectRepository(Evaluacion)
    private readonly evaluacionRepo: Repository<Evaluacion>,
    @InjectRepository(Reclamo)
    private readonly reclamoRepo: Repository<Reclamo>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * CU-21: Listar servicios contratados/programados del usuario (Cliente, Trabajador o Admin)
   * junto con sus pagos, comisión, evaluación y reclamos.
   */
  async listarMisServicios(usuario: Usuario) {
    const qb = this.servicioRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.solicitud', 'solicitud')
      .leftJoinAndSelect('solicitud.cliente', 'cliente')
      .leftJoinAndSelect('solicitud.categoria', 'categoria')
      .leftJoinAndSelect('solicitud.zona', 'zona')
      .leftJoinAndSelect('sp.perfil', 'perfil')
      .leftJoinAndSelect('perfil.usuario', 'trabajador')
      .orderBy('sp.fechaCreacion', 'DESC');

    if (usuario.rolActivo === Rol.CLIENTE) {
      qb.where('cliente.idUsuario = :idUsuario', { idUsuario: usuario.idUsuario });
    } else if (usuario.rolActivo === Rol.TRABAJADOR) {
      qb.where('trabajador.idUsuario = :idUsuario', { idUsuario: usuario.idUsuario });
    }

    const servicios = await qb.getMany();
    const resultados = await Promise.all(
      servicios.map((sp) => this.enriquecerServicio(sp)),
    );
    return resultados;
  }

  /**
   * Tarjeta 1 [CU-04][HU-F08][RN-08]: Calcular y registrar anticipo del 25%.
   */
  async registrarAnticipo(
    usuario: Usuario,
    idProgramacion: string,
    dto: RegistrarAnticipoDto,
  ) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    this.verificarClienteDelServicio(sp, usuario);

    if (sp.estado === 'CANCELADO') {
      throw new BadRequestException('No se puede registrar anticipo en un servicio cancelado');
    }

    const anticipoExistente = await this.pagoRepo.findOne({
      where: { idProgramacion, tipo: 'ANTICIPO_25' },
    });
    if (anticipoExistente) {
      throw new BadRequestException('El anticipo del 25% ya fue registrado para este servicio');
    }

    const montoAnticipo = Number((dto.precioAcordado * PORCENTAJE_ANTICIPO).toFixed(2));

    sp.precioAcordado = dto.precioAcordado.toFixed(2);
    await this.servicioRepo.save(sp);

    const pago = this.pagoRepo.create({
      solicitud: sp.solicitud,
      idProgramacion: sp.idProgramacion,
      programacion: sp,
      tipo: 'ANTICIPO_25',
      monto: montoAnticipo.toFixed(2),
      comisionPlataforma: '0.00',
      montoReportadoCliente: montoAnticipo.toFixed(2),
      confirmadoCliente: true,
      fechaConfirmacionCliente: new Date(),
      confirmadoTrabajador: false,
      estado: 'PENDIENTE',
      referencia: dto.referencia?.trim() || null,
    });

    const guardado = await this.pagoRepo.save(pago);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'REGISTRAR_ANTICIPO_25',
      'pagos',
      guardado.idPago,
      { idProgramacion, precioAcordado: dto.precioAcordado, montoAnticipo },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: sp.perfil.usuario.idUsuario,
      tipo: 'ANTICIPO_REGISTRADO',
      titulo: 'Anticipo del 25% registrado',
      mensaje: `El cliente registró el anticipo de Bs. ${montoAnticipo.toFixed(2)}. Confirma la recepción para conciliar el pago.`,
      entidadRelacionada: 'servicios_programados',
      idEntidadRelacionada: sp.idProgramacion,
    });

    return guardado;
  }

  /**
   * Registrar pago final del servicio (saldo restante).
   */
  async registrarPagoFinal(
    usuario: Usuario,
    idProgramacion: string,
    dto: RegistrarPagoFinalDto,
  ) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    this.verificarClienteDelServicio(sp, usuario);

    if (sp.estado === 'CANCELADO') {
      throw new BadRequestException('No se puede registrar pago en un servicio cancelado');
    }

    const pagoFinalExistente = await this.pagoRepo.findOne({
      where: { idProgramacion, tipo: 'PAGO_FINAL' },
    });
    if (pagoFinalExistente) {
      throw new BadRequestException('El pago final ya fue registrado para este servicio');
    }

    const pago = this.pagoRepo.create({
      solicitud: sp.solicitud,
      idProgramacion: sp.idProgramacion,
      programacion: sp,
      tipo: 'PAGO_FINAL',
      monto: dto.monto.toFixed(2),
      comisionPlataforma: '0.00',
      montoReportadoCliente: dto.monto.toFixed(2),
      confirmadoCliente: true,
      fechaConfirmacionCliente: new Date(),
      confirmadoTrabajador: false,
      estado: 'PENDIENTE',
      referencia: dto.referencia?.trim() || null,
    });

    const guardado = await this.pagoRepo.save(pago);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'REGISTRAR_PAGO_FINAL',
      'pagos',
      guardado.idPago,
      { idProgramacion, monto: dto.monto },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: sp.perfil.usuario.idUsuario,
      tipo: 'PAGO_FINAL_REGISTRADO',
      titulo: 'Pago final registrado',
      mensaje: `El cliente registró el pago final de Bs. ${dto.monto.toFixed(2)}. Confirma el monto recibido.`,
      entidadRelacionada: 'servicios_programados',
      idEntidadRelacionada: sp.idProgramacion,
    });

    return guardado;
  }

  /**
   * Tarjeta 2 [CU-18][HU-F14][RNF-06]: Confirmación manual bilateral de pagos
   * con detección automática de PENDIENTE, CONCILIADO o DISCREPANTE.
   */
  async confirmarPagoBilateral(
    usuario: Usuario,
    idPago: string,
    dto: ConfirmarPagoBilateralDto,
  ) {
    const pago = await this.pagoRepo.findOne({
      where: { idPago },
      relations: {
        programacion: { solicitud: { cliente: true }, perfil: { usuario: true } },
      },
    });

    if (!pago || !pago.programacion) {
      throw new NotFoundException('Pago no encontrado');
    }

    const sp = pago.programacion;
    const esCliente = sp.solicitud.cliente.idUsuario === usuario.idUsuario;
    const esTrabajador = sp.perfil.usuario.idUsuario === usuario.idUsuario;

    if (!esCliente && !esTrabajador) {
      throw new ForbiddenException('No participas en este servicio para confirmar el pago');
    }

    const ahora = new Date();
    if (esCliente && usuario.rolActivo === Rol.CLIENTE) {
      pago.montoReportadoCliente = dto.montoReportado.toFixed(2);
      pago.confirmadoCliente = true;
      pago.fechaConfirmacionCliente = ahora;
    } else if (esTrabajador && usuario.rolActivo === Rol.TRABAJADOR) {
      pago.montoReportadoTrabajador = dto.montoReportado.toFixed(2);
      pago.confirmadoTrabajador = true;
      pago.fechaConfirmacionTrabajador = ahora;
    } else {
      throw new ForbiddenException('Cambia a tu rol correspondiente (Cliente o Trabajador) para confirmar');
    }

    if (dto.referencia?.trim()) {
      pago.referencia = dto.referencia.trim();
    }

    // Regla RNF-06: Solo se marca CONCILIADO si ambas partes confirmaron el mismo monto.
    if (pago.confirmadoCliente && pago.confirmadoTrabajador) {
      const mCliente = Number(pago.montoReportadoCliente);
      const mTrabajador = Number(pago.montoReportadoTrabajador);
      if (Math.abs(mCliente - mTrabajador) < 0.01) {
        pago.estado = 'CONCILIADO';
      } else {
        pago.estado = 'DISCREPANTE';
      }
    } else {
      pago.estado = 'PENDIENTE';
    }

    const guardado = await this.pagoRepo.save(pago);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CONFIRMAR_PAGO_BILATERAL',
      'pagos',
      guardado.idPago,
      {
        rol: usuario.rolActivo,
        montoReportado: dto.montoReportado,
        estadoResultante: guardado.estado,
      },
    );

    // Si el servicio ya está completado y el pago final se concilió, calcular comisión 5% automáticamente
    if (guardado.tipo === 'PAGO_FINAL' && guardado.estado === 'CONCILIADO' && sp.estado === 'COMPLETADO') {
      await this.calcularComisionInterna(sp, usuario.idUsuario);
    }

    return guardado;
  }

  /**
   * Tarjeta 3 [CU-20][RN-09]: Calcular y registrar comisión del 5% plataforma / 95% trabajador.
   */
  async calcularComision(usuario: Usuario, idProgramacion: string) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    if (sp.estado !== 'COMPLETADO') {
      throw new BadRequestException(
        'La comisión del 5% solo se calcula sobre servicios completados',
      );
    }
    return this.calcularComisionInterna(sp, usuario.idUsuario);
  }

  private async calcularComisionInterna(sp: ServicioProgramado, idActor: string) {
    const existente = await this.comisionRepo.findOne({
      where: { idProgramacion: sp.idProgramacion },
    });
    if (existente) {
      return existente;
    }

    const precioFinal = Number(sp.precioAcordado);
    if (precioFinal <= 0) {
      throw new BadRequestException('El servicio no tiene un precio acordado válido para calcular comisión');
    }

    const montoComision = Number((precioFinal * PORCENTAJE_COMISION).toFixed(2));
    const montoNetoTrabajador = Number((precioFinal - montoComision).toFixed(2));

    const comision = this.comisionRepo.create({
      idProgramacion: sp.idProgramacion,
      programacion: sp,
      precioFinal: precioFinal.toFixed(2),
      porcentaje: '5.00',
      montoComision: montoComision.toFixed(2),
      montoNetoTrabajador: montoNetoTrabajador.toFixed(2),
      estado: 'REGISTRADA',
    });

    const guardada = await this.comisionRepo.save(comision);

    await this.auditService.registrarEvento(
      idActor,
      'CALCULAR_COMISION_5',
      'comisiones',
      guardada.idComision,
      {
        idProgramacion: sp.idProgramacion,
        precioFinal,
        montoComision,
        montoNetoTrabajador,
      },
    );

    return guardada;
  }

  /**
   * Tarjeta 5 [CU-06][HU-F12]: Trabajador declara servicio terminado.
   */
  async marcarTerminadoPorTrabajador(usuario: Usuario, idProgramacion: string) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    if (sp.perfil.usuario.idUsuario !== usuario.idUsuario) {
      throw new ForbiddenException('Solo el trabajador asignado puede marcar el servicio como terminado');
    }
    if (sp.estado === 'CANCELADO' || sp.estado === 'COMPLETADO') {
      throw new BadRequestException(`El servicio ya está en estado ${sp.estado}`);
    }

    const estadoAnteriorServicio = sp.estado;
    sp.marcadoTerminadoPorTrabajador = true;
    sp.fechaDeclaracionTrabajador = new Date();
    sp.estado = 'EN_PROCESO';

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ServicioProgramado).save(sp);
      await manager.getRepository(HistorialSolicitud).save(
        manager.getRepository(HistorialSolicitud).create(
          construirEventoHistorial({
            idSolicitud: sp.solicitud.idSolicitud,
            actor: usuario,
            tipoEvento: TIPO_EVENTO_HISTORIAL.SERVICIO_EN_PROCESO,
            estadoAnterior: sp.solicitud.estado,
            estadoNuevo: sp.solicitud.estado,
            detalle: {
              idProgramacion: sp.idProgramacion,
              estadoServicioAnterior: estadoAnteriorServicio,
              estadoServicioNuevo: sp.estado,
            },
          }),
        ),
      );
    });

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'TRABAJADOR_MARCA_TERMINADO',
      'servicios_programados',
      sp.idProgramacion,
      { fechaDeclaracion: sp.fechaDeclaracionTrabajador },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: sp.solicitud.cliente.idUsuario,
      tipo: 'SERVICIO_TERMINADO_TRABAJADOR',
      titulo: 'El trabajador marcó el servicio como terminado',
      mensaje: 'Revisa el trabajo realizado y confirma su conclusión para cerrar el servicio o evaluar.',
      entidadRelacionada: 'servicios_programados',
      idEntidadRelacionada: sp.idProgramacion,
    });

    return this.enriquecerServicio(sp);
  }

  /**
   * Tarjeta 5 [CU-06][HU-F13]: Cliente confirma conclusión del servicio (Cierre dual).
   */
  async confirmarConclusionPorCliente(usuario: Usuario, idProgramacion: string) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    this.verificarClienteDelServicio(sp, usuario);

    if (!sp.marcadoTerminadoPorTrabajador) {
      throw new BadRequestException(
        'El trabajador debe marcar primero el servicio como terminado antes de confirmar la conclusión',
      );
    }
    if (sp.estado === 'CANCELADO' || sp.estado === 'COMPLETADO') {
      throw new BadRequestException(`El servicio ya está en estado ${sp.estado}`);
    }

    const estadoAnteriorSolicitud = sp.solicitud.estado;
    sp.confirmadoPorCliente = true;
    sp.fechaConfirmacionCliente = new Date();
    sp.estado = 'COMPLETADO';
    sp.solicitud.estado = 'COMPLETADA';

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ServicioProgramado).save(sp);
      await manager.getRepository(SolicitudServicio).save(sp.solicitud);
      await manager.getRepository(HistorialSolicitud).save(
        manager.getRepository(HistorialSolicitud).create(
          construirEventoHistorial({
            idSolicitud: sp.solicitud.idSolicitud,
            actor: usuario,
            tipoEvento: TIPO_EVENTO_HISTORIAL.SERVICIO_COMPLETADO,
            estadoAnterior: estadoAnteriorSolicitud,
            estadoNuevo: 'COMPLETADA',
            detalle: { idProgramacion: sp.idProgramacion },
          }),
        ),
      );
    });

    // Calcular comisión del 5% automáticamente si ya existe precio acordado
    if (Number(sp.precioAcordado) > 0) {
      await this.calcularComisionInterna(sp, usuario.idUsuario);
    }

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CLIENTE_CONFIRMA_CONCLUSION',
      'servicios_programados',
      sp.idProgramacion,
      { fechaConfirmacion: sp.fechaConfirmacionCliente },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: sp.perfil.usuario.idUsuario,
      tipo: 'SERVICIO_COMPLETADO',
      titulo: 'Servicio confirmado y completado',
      mensaje: 'El cliente confirmó la conclusión del servicio. Se registró el cálculo de comisión del 5%.',
      entidadRelacionada: 'servicios_programados',
      idEntidadRelacionada: sp.idProgramacion,
    });

    return this.enriquecerServicio(sp);
  }

  /**
   * Tarjeta 4 [CU-17][RN-13]: Cancelar servicio contratado validando límite de 3 horas antes de la cita.
   */
  async cancelarServicioContratado(
    usuario: Usuario,
    idProgramacion: string,
    dto: CancelarServicioDto,
  ) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    const esCliente = sp.solicitud.cliente.idUsuario === usuario.idUsuario;
    const esTrabajador = sp.perfil.usuario.idUsuario === usuario.idUsuario;

    if (!esCliente && !esTrabajador) {
      throw new ForbiddenException('No tienes permiso para cancelar este servicio');
    }
    if (sp.estado === 'COMPLETADO' || sp.estado === 'CANCELADO') {
      throw new BadRequestException(`No se puede cancelar un servicio en estado ${sp.estado}`);
    }

    // Validar límite de 3 horas antes de la cita (Sección 7.5 del documento)
    const fechaHoraCita = new Date(`${sp.fechaServicio}T${sp.horaInicio}`);
    const horasRestantes = (fechaHoraCita.getTime() - Date.now()) / (1000 * 60 * 60);

    if (esCliente && horasRestantes < HORAS_LIMITE_CANCELACION) {
      throw new BadRequestException(
        `Solo se permite cancelar hasta ${HORAS_LIMITE_CANCELACION} horas antes de la cita programada.`,
      );
    }

    const estadoAnteriorSolicitud = sp.solicitud.estado;
    sp.estado = 'CANCELADO';
    sp.motivoCancelacion = dto.motivo.trim();
    sp.canceladoPorUsuarioId = usuario.idUsuario;
    sp.fechaCancelacion = new Date();
    sp.solicitud.estado = 'CANCELADA';

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ServicioProgramado).save(sp);
      await manager.getRepository(SolicitudServicio).save(sp.solicitud);
      await manager.getRepository(HistorialSolicitud).save(
        manager.getRepository(HistorialSolicitud).create(
          construirEventoHistorial({
            idSolicitud: sp.solicitud.idSolicitud,
            actor: usuario,
            tipoEvento: TIPO_EVENTO_HISTORIAL.SERVICIO_CANCELADO,
            estadoAnterior: estadoAnteriorSolicitud,
            estadoNuevo: 'CANCELADA',
            detalle: {
              idProgramacion: sp.idProgramacion,
              motivo: sp.motivoCancelacion,
            },
          }),
        ),
      );
    });

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CANCELAR_SERVICIO_CONTRATADO',
      'servicios_programados',
      sp.idProgramacion,
      { motivo: sp.motivoCancelacion, horasRestantes: Number(horasRestantes.toFixed(2)) },
    );

    const idContraparte = esCliente
      ? sp.perfil.usuario.idUsuario
      : sp.solicitud.cliente.idUsuario;

    await this.notificationsService.crearNotificacion({
      idUsuario: idContraparte,
      tipo: 'SERVICIO_CANCELADO',
      titulo: 'Servicio contratado cancelado',
      mensaje: `El servicio del ${sp.fechaServicio} fue cancelado. Motivo: ${sp.motivoCancelacion}`,
      entidadRelacionada: 'servicios_programados',
      idEntidadRelacionada: sp.idProgramacion,
    });

    return this.enriquecerServicio(sp);
  }

  /**
   * Tarjeta 4 [CU-19]: Solicitar reembolso de anticipo tras cancelación válida.
   */
  async solicitarReembolso(
    usuario: Usuario,
    idProgramacion: string,
    dto: SolicitarReembolsoDto,
  ) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    this.verificarClienteDelServicio(sp, usuario);

    if (sp.estado !== 'CANCELADO') {
      throw new BadRequestException('Solo se puede solicitar reembolso de un servicio cancelado');
    }

    const anticipo = await this.pagoRepo.findOne({
      where: { idProgramacion, tipo: 'ANTICIPO_25' },
    });
    if (!anticipo) {
      throw new BadRequestException('No existe un anticipo registrado para este servicio');
    }

    const yaExiste = await this.reembolsoRepo.findOne({
      where: { idProgramacion },
    });
    if (yaExiste) {
      throw new BadRequestException('Ya existe una solicitud de reembolso para este servicio');
    }

    const reembolso = this.reembolsoRepo.create({
      idProgramacion: sp.idProgramacion,
      programacion: sp,
      idPago: anticipo.idPago,
      pago: anticipo,
      idCliente: usuario.idUsuario,
      cliente: usuario,
      montoSolicitado: anticipo.monto,
      motivo: dto.motivo.trim(),
      estado: 'PENDIENTE',
    });

    const guardado = await this.reembolsoRepo.save(reembolso);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'SOLICITAR_REEMBOLSO',
      'reembolsos',
      guardado.idReembolso,
      { idProgramacion, montoSolicitado: anticipo.monto },
    );

    return guardado;
  }

  /**
   * Tarjeta 4 [CU-19]: Administrador resuelve solicitud de reembolso.
   */
  async resolverReembolso(
    admin: Usuario,
    idReembolso: string,
    dto: ResolverReembolsoDto,
  ) {
    const reembolso = await this.reembolsoRepo.findOne({
      where: { idReembolso },
    });
    if (!reembolso) {
      throw new NotFoundException('Solicitud de reembolso no encontrada');
    }

    reembolso.estado = dto.estado;
    reembolso.resueltoPorAdminId = admin.idUsuario;
    reembolso.observacionAdmin = dto.observacionAdmin?.trim() || null;
    reembolso.fechaResolucion = new Date();

    const guardado = await this.reembolsoRepo.save(reembolso);

    await this.auditService.registrarEvento(
      admin.idUsuario,
      `REEMBOLSO_${dto.estado}`,
      'reembolsos',
      guardado.idReembolso,
      { estado: dto.estado, observacionAdmin: guardado.observacionAdmin },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: reembolso.idCliente,
      tipo: 'REEMBOLSO_RESUELTO',
      titulo: `Reembolso ${dto.estado.toLowerCase()}`,
      mensaje: `Tu solicitud de reembolso de Bs. ${reembolso.montoSolicitado} fue marcada como ${dto.estado}.`,
      entidadRelacionada: 'reembolsos',
      idEntidadRelacionada: guardado.idReembolso,
    });

    return guardado;
  }

  async listarReembolsosAdmin() {
    return this.reembolsoRepo.find({
      relations: { cliente: true, programacion: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  /**
   * Tarjeta 6 [CU-08][HU-F15]: Registrar calificación del cliente hacia el trabajador (1-5).
   */
  async crearEvaluacion(
    usuario: Usuario,
    idProgramacion: string,
    dto: CrearEvaluacionDto,
  ) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    this.verificarClienteDelServicio(sp, usuario);

    if (sp.estado !== 'COMPLETADO') {
      throw new BadRequestException('Solo puedes calificar un servicio completado');
    }

    const existente = await this.evaluacionRepo.findOne({ where: { idProgramacion } });
    if (existente) {
      throw new BadRequestException('Este servicio ya fue calificado');
    }

    const evaluacion = this.evaluacionRepo.create({
      idProgramacion: sp.idProgramacion,
      programacion: sp,
      idCliente: usuario.idUsuario,
      cliente: usuario,
      idTrabajador: sp.perfil.usuario.idUsuario,
      trabajador: sp.perfil.usuario,
      puntuacion: dto.puntuacion,
      comentario: dto.comentario?.trim() || null,
    });

    const guardada = await this.evaluacionRepo.save(evaluacion);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'EVALUAR_TRABAJADOR',
      'evaluaciones',
      guardada.idEvaluacion,
      { idProgramacion, puntuacion: dto.puntuacion },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: sp.perfil.usuario.idUsuario,
      tipo: 'NUEVA_EVALUACION',
      titulo: `Recibiste una calificación de ${dto.puntuacion}/5`,
      mensaje: dto.comentario?.trim()
        ? `Comentario del cliente: "${dto.comentario.trim()}"`
        : 'Un cliente calificó tu servicio completado.',
      entidadRelacionada: 'evaluaciones',
      idEntidadRelacionada: guardada.idEvaluacion,
    });

    return guardada;
  }

  /**
   * Tarjeta 7 [CU-07][HU-F16]: Presentar reclamo dentro de los 7 días posteriores a la finalización.
   */
  async crearReclamo(
    usuario: Usuario,
    idProgramacion: string,
    dto: CrearReclamoDto,
  ) {
    const sp = await this.obtenerServicioConRelaciones(idProgramacion);
    this.verificarClienteDelServicio(sp, usuario);

    if (sp.estado !== 'COMPLETADO' || !sp.fechaConfirmacionCliente) {
      throw new BadRequestException(
        'Solo se pueden presentar reclamos formales sobre servicios finalizados',
      );
    }

    const diasTranscurridos =
      (Date.now() - new Date(sp.fechaConfirmacionCliente).getTime()) / (1000 * 60 * 60 * 24);

    if (diasTranscurridos > DIAS_LIMITE_RECLAMO) {
      throw new BadRequestException(
        `El plazo máximo de ${DIAS_LIMITE_RECLAMO} días para presentar un reclamo ha vencido.`,
      );
    }

    const reclamo = this.reclamoRepo.create({
      idProgramacion: sp.idProgramacion,
      programacion: sp,
      idCliente: usuario.idUsuario,
      cliente: usuario,
      idTrabajador: sp.perfil.usuario.idUsuario,
      trabajador: sp.perfil.usuario,
      descripcion: dto.descripcion.trim(),
      evidenciaUrl: dto.evidenciaUrl?.trim() || null,
      estado: 'ABIERTO',
    });

    const guardado = await this.reclamoRepo.save(reclamo);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CREAR_RECLAMO',
      'reclamos',
      guardado.idReclamo,
      { idProgramacion, diasTranscurridos: Number(diasTranscurridos.toFixed(2)) },
    );

    await this.notificationsService.crearNotificacion({
      idUsuario: sp.perfil.usuario.idUsuario,
      tipo: 'RECLAMO_RECIBIDO',
      titulo: 'Se registró un reclamo en tu servicio',
      mensaje: 'Un cliente presentó un reclamo formal que será revisado por administración.',
      entidadRelacionada: 'reclamos',
      idEntidadRelacionada: guardado.idReclamo,
    });

    return guardado;
  }

  /**
   * Tarjeta 7 [CU-07][HU-F17][HU-F22]: Listar y resolver reclamos (Admin / Superadmin) con auditoría inmutable.
   */
  async listarReclamos(usuario: Usuario) {
    if (usuario.rolActivo === Rol.ADMIN || usuario.rolActivo === Rol.SUPERADMIN) {
      return this.reclamoRepo.find({
        relations: { cliente: true, trabajador: true, programacion: true },
        order: { fechaReclamo: 'DESC' },
      });
    }
    return this.reclamoRepo.find({
      where: [{ idCliente: usuario.idUsuario }, { idTrabajador: usuario.idUsuario }],
      relations: { cliente: true, trabajador: true, programacion: true },
      order: { fechaReclamo: 'DESC' },
    });
  }

  async resolverReclamo(
    admin: Usuario,
    idReclamo: string,
    dto: ResolverReclamoDto,
  ) {
    const reclamo = await this.reclamoRepo.findOne({ where: { idReclamo } });
    if (!reclamo) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    const estadoAnterior = reclamo.estado;
    reclamo.estado = dto.estado;
    reclamo.resolucion = dto.resolucion.trim();
    reclamo.resueltoPorAdminId = admin.idUsuario;
    reclamo.fechaResolucion = new Date();

    const guardado = await this.reclamoRepo.save(reclamo);

    await this.auditService.registrarEvento(
      admin.idUsuario,
      'RESOLVER_RECLAMO',
      'reclamos',
      guardado.idReclamo,
      { estadoAnterior, estadoNuevo: dto.estado, resolucion: guardado.resolucion },
    );

    await this.notificationsService.crearNotificacionesMasivas([
      {
        idUsuario: reclamo.idCliente,
        tipo: 'RECLAMO_RESUELTO',
        titulo: `Actualización de tu reclamo (${dto.estado})`,
        mensaje: `Resolución administrativa: ${guardado.resolucion}`,
        entidadRelacionada: 'reclamos',
        idEntidadRelacionada: guardado.idReclamo,
      },
      {
        idUsuario: reclamo.idTrabajador,
        tipo: 'RECLAMO_RESUELTO',
        titulo: `Resolución de reclamo (${dto.estado})`,
        mensaje: `Resolución administrativa: ${guardado.resolucion}`,
        entidadRelacionada: 'reclamos',
        idEntidadRelacionada: guardado.idReclamo,
      },
    ]);

    return guardado;
  }

  private async obtenerServicioConRelaciones(idProgramacion: string) {
    const sp = await this.servicioRepo.findOne({
      where: { idProgramacion },
      relations: {
        solicitud: { cliente: true, categoria: true, zona: true },
        perfil: { usuario: true },
      },
    });
    if (!sp) {
      throw new NotFoundException('Servicio programado no encontrado');
    }
    return sp;
  }

  private verificarClienteDelServicio(sp: ServicioProgramado, usuario: Usuario) {
    if (sp.solicitud.cliente.idUsuario !== usuario.idUsuario) {
      throw new ForbiddenException('Solo el cliente titular del servicio puede realizar esta acción');
    }
  }

  private async enriquecerServicio(sp: ServicioProgramado) {
    const [pagos, comision, evaluacion, reclamos, reembolso] = await Promise.all([
      this.pagoRepo.find({ where: { idProgramacion: sp.idProgramacion }, order: { fechaPago: 'ASC' } }),
      this.comisionRepo.findOne({ where: { idProgramacion: sp.idProgramacion } }),
      this.evaluacionRepo.findOne({ where: { idProgramacion: sp.idProgramacion } }),
      this.reclamoRepo.find({ where: { idProgramacion: sp.idProgramacion }, order: { fechaReclamo: 'DESC' } }),
      this.reembolsoRepo.findOne({ where: { idProgramacion: sp.idProgramacion } }),
    ]);

    return {
      idProgramacion: sp.idProgramacion,
      estado: sp.estado,
      fechaServicio: sp.fechaServicio,
      horaInicio: sp.horaInicio,
      horaFin: sp.horaFin,
      precioAcordado: Number(sp.precioAcordado),
      anticipoReferencia25: Number((Number(sp.precioAcordado) * PORCENTAJE_ANTICIPO).toFixed(2)),
      marcadoTerminadoPorTrabajador: sp.marcadoTerminadoPorTrabajador,
      fechaDeclaracionTrabajador: sp.fechaDeclaracionTrabajador,
      confirmadoPorCliente: sp.confirmadoPorCliente,
      fechaConfirmacionCliente: sp.fechaConfirmacionCliente,
      motivoCancelacion: sp.motivoCancelacion,
      fechaCancelacion: sp.fechaCancelacion,
      solicitud: {
        idSolicitud: sp.solicitud.idSolicitud,
        descripcion: sp.solicitud.descripcion,
        ubicacionGeneral: sp.solicitud.ubicacionGeneral,
        categoria: sp.solicitud.categoria?.nombre ?? 'Servicio',
        zona: sp.solicitud.zona?.nombre ?? 'Sin zona',
      },
      cliente: {
        idUsuario: sp.solicitud.cliente.idUsuario,
        nombre: `${sp.solicitud.cliente.nombres} ${sp.solicitud.cliente.apellidos}`,
      },
      trabajador: {
        idUsuario: sp.perfil.usuario.idUsuario,
        nombre: `${sp.perfil.usuario.nombres} ${sp.perfil.usuario.apellidos}`,
      },
      pagos,
      comision,
      evaluacion,
      reclamos,
      reembolso,
    };
  }
}