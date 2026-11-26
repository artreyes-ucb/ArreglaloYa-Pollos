import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Rol } from '../common/enums/rol.enum';
import { Cotizacion } from '../entities/cotizacion.entity';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { Notificacion } from '../entities/notificacion.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity';
import { ReprogramacionVisita } from '../entities/reprogramacion-visita.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Usuario } from '../entities/usuario.entity';
import { VisitaPrevia } from '../entities/visita-previa.entity';
import { CrearVisitaPreviaDto } from './dto/crear-visita-previa.dto';
import { ResponderReprogramacionVisitaDto } from './dto/responder-reprogramacion-visita.dto';
import { ResponderVisitaPreviaDto } from './dto/responder-visita-previa.dto';
import { SolicitarReprogramacionVisitaDto } from './dto/solicitar-reprogramacion-visita.dto';

const ESTADOS_SOLICITUD_VISITA = ['ACTIVA', 'EN_COTIZACION', 'CONTRATADA', 'PROGRAMADA'];
const ESTADOS_VISITA_REPROGRAMABLE = ['SOLICITADA', 'ACEPTADA'];
const DURACION_VISITA_DEFECTO_MIN = 60;

const TRANSICIONES_VISITA: Record<string, string[]> = {
  SOLICITADA: ['ACEPTADA', 'RECHAZADA', 'CANCELADA'],
  ACEPTADA: ['CANCELADA', 'REALIZADA', 'NO_REALIZADA'],
};

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(VisitaPrevia) private readonly visitaRepo: Repository<VisitaPrevia>,
    @InjectRepository(SolicitudServicio) private readonly solicitudRepo: Repository<SolicitudServicio>,
    @InjectRepository(PerfilTrabajador) private readonly perfilRepo: Repository<PerfilTrabajador>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Cotizacion) private readonly cotizacionRepo: Repository<Cotizacion>,
  ) {}

  async crear(usuario: Usuario, dto: CrearVisitaPreviaDto) {
    const solicitud = await this.solicitudRepo.findOne({ where: { idSolicitud: dto.idSolicitud }, relations: { cliente: true } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');
    if (!ESTADOS_SOLICITUD_VISITA.includes(solicitud.estado)) {
      throw new BadRequestException('La solicitud no admite visitas previas en su estado actual.');
    }

    const esCliente = solicitud.cliente.idUsuario === usuario.idUsuario;
    let perfil: PerfilTrabajador | null = null;

    if (usuario.rolActivo === Rol.TRABAJADOR) {
      perfil = await this.perfilRepo.findOne({ where: { usuario: { idUsuario: usuario.idUsuario } }, relations: { usuario: true } });
      if (!perfil || perfil.estadoValidacion !== 'APROBADO') throw new ForbiddenException('Necesitas un perfil de trabajador aprobado.');
      if (dto.idPerfil && dto.idPerfil !== perfil.idPerfil) throw new ForbiddenException('No puedes registrar visitas para otro perfil.');
    } else if (usuario.rolActivo === Rol.CLIENTE) {
      if (!esCliente) throw new ForbiddenException('Solo el cliente propietario puede solicitar la visita.');
      if (dto.idPerfil) {
        perfil = await this.perfilRepo.findOne({ where: { idPerfil: dto.idPerfil }, relations: { usuario: true } });
        if (!perfil) throw new NotFoundException('Perfil de trabajador no encontrado.');
      }
    } else {
      throw new ForbiddenException('Rol no autorizado para crear visitas previas.');
    }

    const fecha = this.normalizarFecha(dto.fechaPropuesta);
    const hora = this.normalizarHora(dto.horaPropuesta);
    this.validarFechaFutura(fecha, hora);
    const horaFin = this.sumarMinutosHora(hora, DURACION_VISITA_DEFECTO_MIN);

    const visita = this.visitaRepo.create({
      solicitud,
      perfil,
      usuarioSolicitante: usuario,
      usuarioRespuesta: null,
      fechaPropuesta: fecha,
      horaPropuesta: hora,
      horaFinPropuesta: horaFin,
      fechaConfirmada: null,
      horaConfirmada: null,
      horaFinConfirmada: null,
      estado: 'SOLICITADA',
      resultado: dto.resultado?.trim() || null,
    });
    const guardada = await this.dataSource.transaction(async (manager) => {
      const nueva = await manager.getRepository(VisitaPrevia).save(visita);

      await manager.getRepository(HistorialSolicitud).save(
        manager.getRepository(HistorialSolicitud).create({
          solicitud: { idSolicitud: solicitud.idSolicitud },
          usuarioActor: { idUsuario: usuario.idUsuario },
          tipoEvento: 'VISITA_PREVIA_SOLICITADA',
          estadoAnterior: solicitud.estado,
          estadoNuevo: solicitud.estado,
          detalle: { idVisita: nueva.idVisita, fechaPropuesta: fecha, horaPropuesta: hora, horaFinPropuesta: horaFin, idPerfil: perfil?.idPerfil ?? null },
        }),
      );

      await manager.getRepository(RegistroAuditoria).save(
        manager.getRepository(RegistroAuditoria).create({
          usuarioActor: { idUsuario: usuario.idUsuario },
          accion: 'VISITA_PREVIA_SOLICITADA',
          entidadAfectada: 'visitas_previas',
          idEntidadAfectada: nueva.idVisita,
          detalle: { idSolicitud: solicitud.idSolicitud },
        }),
      );

      const destinatario = usuario.rolActivo === Rol.TRABAJADOR ? solicitud.cliente.idUsuario : perfil?.usuario.idUsuario;
      if (destinatario && destinatario !== usuario.idUsuario) {
        await manager.getRepository(Notificacion).save(
          manager.getRepository(Notificacion).create({
            usuario: { idUsuario: destinatario },
            tipo: 'VISITA_PREVIA',
            titulo: 'Visita previa solicitada',
            mensaje: `Se solicitó una visita previa para el ${fecha} a las ${hora.slice(0,5)}.`,
            entidadRelacionada: 'VISITA_PREVIA',
            idEntidadRelacionada: nueva.idVisita,
            leida: false,
            fechaLectura: null,
          }),
        );
      }

      return nueva;
    });

    return this.serializar(guardada);
  }

  async listarPorSolicitud(usuario: Usuario, idSolicitud: string) {
    const solicitud = await this.solicitudRepo.findOne({ where: { idSolicitud }, relations: { cliente: true } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada.');

    const esCliente = solicitud.cliente.idUsuario === usuario.idUsuario;
    const perfil = await this.perfilRepo.findOne({ where: { usuario: { idUsuario: usuario.idUsuario } } });
    if (!esCliente && !perfil && ![Rol.ADMIN, Rol.SUPERADMIN].includes(usuario.rolActivo)) {
      throw new ForbiddenException('No tienes permiso para ver estas visitas.');
    }

    const qb = this.visitaRepo.createQueryBuilder('v')
      .leftJoinAndSelect('v.solicitud', 's')
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('v.perfil', 'perfil')
      .leftJoinAndSelect('perfil.usuario', 'trabajador')
      .leftJoinAndSelect('v.usuarioSolicitante', 'solicitante')
      .leftJoinAndSelect('v.usuarioRespuesta', 'respondedor')
      .where('s.id_solicitud = :idSolicitud', { idSolicitud })
      .orderBy('v.fechaCreacion', 'DESC');

    if (!esCliente && ![Rol.ADMIN, Rol.SUPERADMIN].includes(usuario.rolActivo)) {
      qb.andWhere('perfil.id_perfil = :idPerfil', { idPerfil: perfil!.idPerfil });
    }

    const visitas = await qb.getMany();
    const ids = visitas.map((v) => v.idVisita);
    const reprogramaciones = ids.length
      ? await this.dataSource.getRepository(ReprogramacionVisita).find({
          where: ids.map((idVisita) => ({ visita: { idVisita } })) as any,
          relations: { usuarioSolicitante: true, usuarioRespuesta: true, visita: true },
          order: { fechaCreacion: 'DESC' },
        })
      : [];
    const mapa = new Map<string, ReprogramacionVisita[]>();
    for (const r of reprogramaciones) {
      const id = r.visita.idVisita;
      const arr = mapa.get(id) ?? [];
      arr.push(r);
      mapa.set(id, arr);
    }
    return visitas.map((v) => this.serializar(v, mapa.get(v.idVisita) ?? []));
  }

  async responder(usuario: Usuario, idVisita: string, dto: ResponderVisitaPreviaDto) {
    const visita = await this.visitaRepo.findOne({
      where: { idVisita },
      relations: { solicitud: { cliente: true }, perfil: { usuario: true }, usuarioSolicitante: true },
    });
    if (!visita) throw new NotFoundException('Visita previa no encontrada.');
    if (['REALIZADA', 'NO_REALIZADA', 'CANCELADA', 'RECHAZADA'].includes(visita.estado)) {
      throw new BadRequestException('La visita ya no puede modificarse.');
    }

    const esCliente = visita.solicitud.cliente.idUsuario === usuario.idUsuario;
    const perfilActor = await this.perfilRepo.findOne({ where: { usuario: { idUsuario: usuario.idUsuario } } });
    let esTrabajador = visita.perfil?.usuario?.idUsuario === usuario.idUsuario;

    if (!esTrabajador && perfilActor && !visita.perfil) {
      const cotizada = await this.cotizacionRepo.findOne({
        where: {
          solicitud: { idSolicitud: visita.solicitud.idSolicitud } as any,
          perfil: { idPerfil: perfilActor.idPerfil } as any,
          estado: 'ACEPTADA',
        },
      });
      if (cotizada) {
        esTrabajador = true;
        visita.perfil = perfilActor;
      }
    }

    if (!esCliente && !esTrabajador && ![Rol.ADMIN, Rol.SUPERADMIN].includes(usuario.rolActivo)) {
      throw new ForbiddenException('No tienes permiso para responder esta visita.');
    }

    const transicionesPermitidas = TRANSICIONES_VISITA[visita.estado] ?? [];
    if (dto.estado === visita.estado || !transicionesPermitidas.includes(dto.estado)) {
      throw new BadRequestException('Transición de estado de visita no permitida.');
    }
    if (
      ['REALIZADA', 'NO_REALIZADA'].includes(dto.estado) &&
      !esTrabajador &&
      ![Rol.ADMIN, Rol.SUPERADMIN].includes(usuario.rolActivo)
    ) {
      throw new ForbiddenException('Solo el trabajador puede finalizar la visita.');
    }

    const estadoAnterior = visita.estado;
    visita.estado = dto.estado;
    visita.usuarioRespuesta = usuario;

    if (dto.fechaConfirmada) {
      const fechaConfirmada = this.normalizarFecha(dto.fechaConfirmada);
      this.validarFechaFutura(
        fechaConfirmada,
        dto.horaConfirmada ? this.normalizarHora(dto.horaConfirmada) : visita.horaPropuesta,
      );
      visita.fechaConfirmada = fechaConfirmada;
    }
    if (dto.horaConfirmada) visita.horaConfirmada = this.normalizarHora(dto.horaConfirmada);
    if (dto.resultado?.trim()) visita.resultado = dto.resultado.trim();
    if (dto.estado === 'ACEPTADA') {
      visita.fechaConfirmada = visita.fechaConfirmada ?? visita.fechaPropuesta;
      visita.horaConfirmada = visita.horaConfirmada ?? visita.horaPropuesta;
      visita.horaFinConfirmada = visita.horaFinConfirmada ?? visita.horaFinPropuesta ?? this.sumarMinutosHora(visita.horaConfirmada, DURACION_VISITA_DEFECTO_MIN);
    }
    if ((visita.fechaConfirmada && !visita.horaConfirmada) || (!visita.fechaConfirmada && visita.horaConfirmada)) {
      throw new BadRequestException('Fecha y hora confirmada deben enviarse juntas.');
    }

    const guardada = await this.dataSource.transaction(async (manager) => {
      if (['CANCELADA', 'RECHAZADA', 'REALIZADA', 'NO_REALIZADA'].includes(dto.estado)) {
        await this.cancelarPendientesReprogramacion(manager, visita, usuario, `VISITA_${dto.estado}`);
      }
      const actualizada = await manager.getRepository(VisitaPrevia).save(visita);

      await manager.getRepository(HistorialSolicitud).save(
        manager.getRepository(HistorialSolicitud).create({
          solicitud: { idSolicitud: visita.solicitud.idSolicitud },
          usuarioActor: { idUsuario: usuario.idUsuario },
          tipoEvento: `VISITA_PREVIA_${dto.estado}`,
          estadoAnterior,
          estadoNuevo: dto.estado,
          detalle: { idVisita, resultado: actualizada.resultado },
        }),
      );

      await manager.getRepository(RegistroAuditoria).save(
        manager.getRepository(RegistroAuditoria).create({
          usuarioActor: { idUsuario: usuario.idUsuario },
          accion: `VISITA_PREVIA_${dto.estado}`,
          entidadAfectada: 'visitas_previas',
          idEntidadAfectada: idVisita,
          detalle: { idSolicitud: visita.solicitud.idSolicitud },
        }),
      );

      const destinatario = esCliente ? visita.perfil?.usuario?.idUsuario : visita.solicitud.cliente.idUsuario;
      if (destinatario && destinatario !== usuario.idUsuario) {
        await manager.getRepository(Notificacion).save(
          manager.getRepository(Notificacion).create({
            usuario: { idUsuario: destinatario },
            tipo: 'VISITA_PREVIA',
            titulo: 'Actualización de visita previa',
            mensaje: `La visita previa pasó a estado ${dto.estado}.`,
            entidadRelacionada: 'VISITA_PREVIA',
            idEntidadRelacionada: idVisita,
            leida: false,
            fechaLectura: null,
          }),
        );
      }

      return actualizada;
    });

    return this.serializar(guardada);
  }

  private normalizarFecha(value: string): string {
    const fecha = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new BadRequestException('Fecha inválida.');
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaValidada = new Date(Date.UTC(anio, mes - 1, dia));
    if (
      fechaValidada.getUTCFullYear() !== anio ||
      fechaValidada.getUTCMonth() !== mes - 1 ||
      fechaValidada.getUTCDate() !== dia
    ) {
      throw new BadRequestException('Fecha inválida.');
    }
    return fecha;
  }
  private normalizarHora(value: string): string {
    const m = value.match(/^([01]\d|2[0-3]):([0-5]\d)/);
    if (!m) throw new BadRequestException('Hora inválida.');
    return `${m[1]}:${m[2]}:00`;
  }
  private validarFechaFutura(fecha: string, hora: string) {
    const dt = new Date(`${fecha}T${hora}`);
    if (Number.isNaN(dt.getTime()) || dt.getTime() < Date.now() - 60000) {
      throw new BadRequestException('La visita debe programarse en una fecha/hora válida y no pasada.');
    }
  }
  private serializar(v: VisitaPrevia, reprogramaciones: ReprogramacionVisita[] = []) {
    return {
      idVisita: v.idVisita,
      idSolicitud: v.solicitud?.idSolicitud,
      estado: v.estado,
      fechaPropuesta: v.fechaPropuesta,
      horaPropuesta: v.horaPropuesta,
      horaFinPropuesta: v.horaFinPropuesta,
      fechaConfirmada: v.fechaConfirmada,
      horaConfirmada: v.horaConfirmada,
      horaFinConfirmada: v.horaFinConfirmada,
      resultado: v.resultado,
      fechaCreacion: v.fechaCreacion,
      fechaActualizacion: v.fechaActualizacion,
      solicitante: v.usuarioSolicitante ? { idUsuario: v.usuarioSolicitante.idUsuario, nombres: v.usuarioSolicitante.nombres, apellidos: v.usuarioSolicitante.apellidos } : null,
      respondedor: v.usuarioRespuesta ? { idUsuario: v.usuarioRespuesta.idUsuario, nombres: v.usuarioRespuesta.nombres, apellidos: v.usuarioRespuesta.apellidos } : null,
      trabajador: v.perfil?.usuario ? { idPerfil: v.perfil.idPerfil, nombres: v.perfil.usuario.nombres, apellidos: v.perfil.usuario.apellidos } : null,
      reprogramaciones: reprogramaciones.map((r) => this.serializarReprogramacion(r)),
    };
  }

  private serializarReprogramacion(r: ReprogramacionVisita, usuarioSolicitante?: Usuario) {
    const solicitante = r.usuarioSolicitante ?? usuarioSolicitante;
    return {
      idReprogramacion: r.idReprogramacion,
      idVisita: r.visita?.idVisita,
      estado: r.estado,
      rolSolicitante: r.rolSolicitante,
      fechaAnterior: r.fechaAnterior,
      horaInicioAnterior: r.horaInicioAnterior,
      horaFinAnterior: r.horaFinAnterior,
      fechaPropuesta: r.fechaPropuesta,
      horaInicioPropuesta: r.horaInicioPropuesta,
      horaFinPropuesta: r.horaFinPropuesta,
      motivo: r.motivo,
      motivoRespuesta: r.motivoRespuesta,
      fechaCreacion: r.fechaCreacion,
      fechaRespuesta: r.fechaRespuesta,
      solicitante: solicitante ? { idUsuario: solicitante.idUsuario, nombres: solicitante.nombres, apellidos: solicitante.apellidos } : null,
      respondedor: r.usuarioRespuesta ? { idUsuario: r.usuarioRespuesta.idUsuario, nombres: r.usuarioRespuesta.nombres, apellidos: r.usuarioRespuesta.apellidos } : null,
    };
  }

  async solicitarReprogramacion(usuario: Usuario, idVisita: string, dto: SolicitarReprogramacionVisitaDto) {
    const fechaPropuesta = this.normalizarFecha(dto.fechaPropuesta);
    const horaInicioPropuesta = this.normalizarHora(dto.horaInicioPropuesta);
    const horaFinPropuesta = dto.horaFinPropuesta ? this.normalizarHora(dto.horaFinPropuesta) : this.sumarMinutosHora(horaInicioPropuesta, DURACION_VISITA_DEFECTO_MIN);
    if (horaFinPropuesta <= horaInicioPropuesta) throw new BadRequestException('La hora de finalización debe ser posterior a la hora de inicio.');
    this.validarFechaFutura(fechaPropuesta, horaInicioPropuesta);
    const motivo = dto.motivo.trim();
    if (!motivo) throw new BadRequestException('El motivo del cambio es obligatorio.');

    return this.dataSource.transaction(async (manager) => {
      const visita = await this.obtenerVisitaParaActualizacion(manager, idVisita);
      if (!ESTADOS_VISITA_REPROGRAMABLE.includes(visita.estado)) {
        throw new BadRequestException('No puedes reprogramar esta visita en su estado actual.');
      }

      const { esCliente, esTrabajador, perfil } = await this.resolverParticipacion(manager, usuario, visita);
      if (!esCliente && !esTrabajador) throw new ForbiddenException('No tienes permiso para reprogramar esta visita.');
      if (!perfil) throw new BadRequestException('No se puede reprogramar: primero debe existir un trabajador asignado a la visita.');

      const pendiente = await manager.getRepository(ReprogramacionVisita).findOne({ where: { visita: { idVisita } as any, estado: 'PENDIENTE' } });
      if (pendiente) throw new ConflictException('Ya existe una propuesta de reprogramación pendiente para esta visita.');

      await this.validarDisponibilidadReprogramacion(manager, perfil, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta, visita.idVisita);

      const anterior = this.obtenerHorarioActual(visita);
      const propuesta = manager.getRepository(ReprogramacionVisita).create({
        visita,
        usuarioSolicitante: { idUsuario: usuario.idUsuario } as Usuario,
        rolSolicitante: esCliente ? 'CLIENTE' : 'TRABAJADOR',
        fechaAnterior: anterior.fecha,
        horaInicioAnterior: anterior.horaInicio,
        horaFinAnterior: anterior.horaFin,
        fechaPropuesta,
        horaInicioPropuesta,
        horaFinPropuesta,
        motivo,
        estado: 'PENDIENTE',
        usuarioRespuesta: null,
        fechaRespuesta: null,
        motivoRespuesta: null,
      });
      const guardada = await manager.getRepository(ReprogramacionVisita).save(propuesta);

      await this.registrarEvento(manager, {
        idSolicitud: visita.solicitud.idSolicitud,
        idUsuario: usuario.idUsuario,
        tipoEvento: 'REPROGRAMACION_SOLICITADA',
        estado: visita.estado,
        accion: 'REPROGRAMACION_SOLICITADA',
        entidad: 'reprogramaciones_visita',
        idEntidad: guardada.idReprogramacion,
        detalle: { idVisita, fechaAnterior: anterior.fecha, horaInicioAnterior: anterior.horaInicio, horaFinAnterior: anterior.horaFin, fechaPropuesta, horaInicioPropuesta, horaFinPropuesta, motivo },
      });

      const destinatario = esCliente ? visita.perfil?.usuario?.idUsuario : visita.solicitud.cliente.idUsuario;
      if (destinatario && destinatario !== usuario.idUsuario) {
        await this.crearNotificacion(manager, {
          idUsuario: destinatario,
          tipo: 'REPROGRAMACION_VISITA',
          titulo: 'Solicitud de reprogramación de visita',
          mensaje: `Se solicitó reprogramar la visita para el ${fechaPropuesta} de ${horaInicioPropuesta.slice(0, 5)} a ${horaFinPropuesta.slice(0, 5)}.`,
          entidadRelacionada: 'REPROGRAMACION_VISITA',
          idEntidadRelacionada: guardada.idReprogramacion,
        });
      }

      return this.serializarReprogramacion(guardada, usuario);
    });
  }

  async responderReprogramacion(usuario: Usuario, idVisita: string, idReprogramacion: string, dto: ResponderReprogramacionVisitaDto) {
    return this.dataSource.transaction(async (manager) => {
      const propuesta = await this.obtenerPropuestaParaActualizacion(manager, idVisita, idReprogramacion);
      if (propuesta.estado !== 'PENDIENTE') throw new BadRequestException('La propuesta ya fue respondida o no está pendiente.');

      const visita = await this.obtenerVisitaParaActualizacion(manager, idVisita);
      if (!ESTADOS_VISITA_REPROGRAMABLE.includes(visita.estado)) throw new BadRequestException('No puedes responder esta propuesta en el estado actual de la visita.');

      const { esCliente, esTrabajador, perfil } = await this.resolverParticipacion(manager, usuario, visita);
      if (!esCliente && !esTrabajador) throw new ForbiddenException('No tienes permiso para responder esta propuesta.');
      if (propuesta.usuarioSolicitante.idUsuario === usuario.idUsuario) throw new ForbiddenException('No puedes aceptar tu propia propuesta.');
      const esContraparte = (propuesta.rolSolicitante === 'CLIENTE' && esTrabajador) || (propuesta.rolSolicitante === 'TRABAJADOR' && esCliente);
      if (!esContraparte) throw new ForbiddenException('Solo la contraparte puede responder esta propuesta.');

      propuesta.usuarioRespuesta = { idUsuario: usuario.idUsuario } as Usuario;
      propuesta.fechaRespuesta = new Date();
      propuesta.motivoRespuesta = dto.motivoRespuesta?.trim() || null;

      if (dto.decision === 'RECHAZADA') {
        propuesta.estado = 'RECHAZADA';
        const guardada = await manager.getRepository(ReprogramacionVisita).save(propuesta);
        await this.registrarEvento(manager, {
          idSolicitud: visita.solicitud.idSolicitud,
          idUsuario: usuario.idUsuario,
          tipoEvento: 'REPROGRAMACION_RECHAZADA',
          estado: visita.estado,
          accion: 'REPROGRAMACION_RECHAZADA',
          entidad: 'reprogramaciones_visita',
          idEntidad: guardada.idReprogramacion,
          detalle: { idVisita, idReprogramacion },
        });
        await this.crearNotificacion(manager, {
          idUsuario: propuesta.usuarioSolicitante.idUsuario,
          tipo: 'REPROGRAMACION_VISITA',
          titulo: 'Propuesta de reprogramación rechazada',
          mensaje: 'La contraparte rechazó la propuesta de reprogramación.',
          entidadRelacionada: 'REPROGRAMACION_VISITA',
          idEntidadRelacionada: guardada.idReprogramacion,
        });
        return this.serializarReprogramacion(guardada);
      }

      if (!perfil) throw new BadRequestException('No se puede reprogramar: primero debe existir un trabajador asignado a la visita.');
      try {
        await this.validarDisponibilidadReprogramacion(manager, perfil, propuesta.fechaPropuesta, propuesta.horaInicioPropuesta, propuesta.horaFinPropuesta, visita.idVisita);
      } catch (error) {
        if (error instanceof BadRequestException || error instanceof ConflictException) {
          propuesta.estado = 'RECHAZADA';
          propuesta.motivoRespuesta = error.message;
          const guardada = await manager.getRepository(ReprogramacionVisita).save(propuesta);
          await this.registrarEvento(manager, {
            idSolicitud: visita.solicitud.idSolicitud,
            idUsuario: usuario.idUsuario,
            tipoEvento: 'REPROGRAMACION_RECHAZADA_CONFLICTO',
            estado: visita.estado,
            accion: 'REPROGRAMACION_RECHAZADA_CONFLICTO',
            entidad: 'reprogramaciones_visita',
            idEntidad: guardada.idReprogramacion,
            detalle: { idVisita, idReprogramacion, motivo: error.message },
          });
          await this.crearNotificacion(manager, {
            idUsuario: propuesta.usuarioSolicitante.idUsuario,
            tipo: 'REPROGRAMACION_VISITA',
            titulo: 'Reprogramación rechazada por conflicto',
            mensaje: error.message,
            entidadRelacionada: 'REPROGRAMACION_VISITA',
            idEntidadRelacionada: guardada.idReprogramacion,
          });
          return this.serializarReprogramacion(guardada);
        }
        throw error;
      }

      propuesta.estado = 'ACEPTADA';
      const guardada = await manager.getRepository(ReprogramacionVisita).save(propuesta);

      visita.fechaPropuesta = propuesta.fechaPropuesta;
      visita.horaPropuesta = propuesta.horaInicioPropuesta;
      visita.horaFinPropuesta = propuesta.horaFinPropuesta;
      visita.fechaConfirmada = propuesta.fechaPropuesta;
      visita.horaConfirmada = propuesta.horaInicioPropuesta;
      visita.horaFinConfirmada = propuesta.horaFinPropuesta;
      visita.estado = 'ACEPTADA';
      visita.usuarioRespuesta = { idUsuario: usuario.idUsuario } as Usuario;
      await manager.getRepository(VisitaPrevia).save(visita);

      await this.registrarEvento(manager, {
        idSolicitud: visita.solicitud.idSolicitud,
        idUsuario: usuario.idUsuario,
        tipoEvento: 'REPROGRAMACION_ACEPTADA',
        estado: visita.estado,
        accion: 'REPROGRAMACION_ACEPTADA',
        entidad: 'reprogramaciones_visita',
        idEntidad: guardada.idReprogramacion,
        detalle: { idVisita, idReprogramacion, fechaPropuesta: propuesta.fechaPropuesta, horaInicioPropuesta: propuesta.horaInicioPropuesta, horaFinPropuesta: propuesta.horaFinPropuesta },
      });

      const contraparte = propuesta.usuarioSolicitante.idUsuario;
      const destinatarios = [contraparte, visita.solicitud.cliente.idUsuario, visita.perfil?.usuario?.idUsuario].filter((id): id is string => !!id && id !== usuario.idUsuario);
      for (const idUsuario of [...new Set(destinatarios)]) {
        await this.crearNotificacion(manager, {
          idUsuario,
          tipo: 'REPROGRAMACION_VISITA',
          titulo: 'Visita reprogramada',
          mensaje: `La visita fue reprogramada para el ${propuesta.fechaPropuesta} de ${propuesta.horaInicioPropuesta.slice(0, 5)} a ${propuesta.horaFinPropuesta.slice(0, 5)}.`,
          entidadRelacionada: 'REPROGRAMACION_VISITA',
          idEntidadRelacionada: guardada.idReprogramacion,
        });
      }

      return this.serializarReprogramacion(guardada);
    });
  }

  async cancelarReprogramacion(usuario: Usuario, idVisita: string, idReprogramacion: string) {
    return this.dataSource.transaction(async (manager) => {
      const propuesta = await this.obtenerPropuestaParaActualizacion(manager, idVisita, idReprogramacion);
      if (propuesta.estado !== 'PENDIENTE') throw new BadRequestException('La propuesta ya fue respondida o no está pendiente.');
      if (propuesta.usuarioSolicitante.idUsuario !== usuario.idUsuario) {
        throw new ForbiddenException('Solo el solicitante puede cancelar la propuesta.');
      }

      const visita = await this.obtenerVisitaParaActualizacion(manager, idVisita);
      propuesta.estado = 'CANCELADA';
      propuesta.usuarioRespuesta = { idUsuario: usuario.idUsuario } as Usuario;
      propuesta.fechaRespuesta = new Date();
      const guardada = await manager.getRepository(ReprogramacionVisita).save(propuesta);

      await this.registrarEvento(manager, {
        idSolicitud: visita.solicitud.idSolicitud,
        idUsuario: usuario.idUsuario,
        tipoEvento: 'REPROGRAMACION_CANCELADA',
        estado: visita.estado,
        accion: 'REPROGRAMACION_CANCELADA',
        entidad: 'reprogramaciones_visita',
        idEntidad: guardada.idReprogramacion,
        detalle: { idVisita, idReprogramacion },
      });

      const destinatario = propuesta.rolSolicitante === 'CLIENTE' ? visita.perfil?.usuario?.idUsuario : visita.solicitud.cliente.idUsuario;
      if (destinatario && destinatario !== usuario.idUsuario) {
        await this.crearNotificacion(manager, {
          idUsuario: destinatario,
          tipo: 'REPROGRAMACION_VISITA',
          titulo: 'Propuesta de reprogramación cancelada',
          mensaje: 'El solicitante canceló la propuesta de reprogramación.',
          entidadRelacionada: 'REPROGRAMACION_VISITA',
          idEntidadRelacionada: guardada.idReprogramacion,
        });
      }

      return this.serializarReprogramacion(guardada);
    });
  }

  private async obtenerVisitaParaActualizacion(manager: EntityManager, idVisita: string) {
    const base = await manager.createQueryBuilder(VisitaPrevia, 'v')
      .setLock('pessimistic_write')
      .where('v.idVisita = :idVisita', { idVisita })
      .getOne();
    if (!base) throw new NotFoundException('Visita previa no encontrada.');
    const visita = await manager.getRepository(VisitaPrevia).findOne({
      where: { idVisita },
      relations: { solicitud: { cliente: true }, perfil: { usuario: true }, usuarioSolicitante: true, usuarioRespuesta: true },
    });
    if (!visita) throw new NotFoundException('Visita previa no encontrada.');
    return visita;
  }

  private async obtenerPropuestaParaActualizacion(manager: EntityManager, idVisita: string, idReprogramacion: string) {
    const base = await manager.createQueryBuilder(ReprogramacionVisita, 'r')
      .innerJoin('r.visita', 'v')
      .setLock('pessimistic_write')
      .where('r.idReprogramacion = :idReprogramacion', { idReprogramacion })
      .andWhere('v.idVisita = :idVisita', { idVisita })
      .getOne();
    if (!base) throw new NotFoundException('Propuesta de reprogramación no encontrada.');
    const propuesta = await manager.getRepository(ReprogramacionVisita).findOne({
      where: { idReprogramacion, visita: { idVisita } as any },
      relations: { visita: { solicitud: { cliente: true }, perfil: { usuario: true } }, usuarioSolicitante: true, usuarioRespuesta: true },
    });
    if (!propuesta) throw new NotFoundException('Propuesta de reprogramación no encontrada.');
    return propuesta;
  }

  private async resolverParticipacion(manager: EntityManager, usuario: Usuario, visita: VisitaPrevia) {
    const esCliente = visita.solicitud.cliente.idUsuario === usuario.idUsuario;
    const perfil = visita.perfil ?? await manager.getRepository(PerfilTrabajador).findOne({ where: { usuario: { idUsuario: usuario.idUsuario } }, relations: { usuario: true } });
    let esTrabajador = visita.perfil?.usuario?.idUsuario === usuario.idUsuario;
    if (!esTrabajador && perfil && !visita.perfil) {
      const cotizada = await manager.getRepository(Cotizacion).findOne({
        where: { solicitud: { idSolicitud: visita.solicitud.idSolicitud } as any, perfil: { idPerfil: perfil.idPerfil } as any, estado: 'ACEPTADA' },
      });
      if (cotizada) { esTrabajador = true; visita.perfil = perfil; }
    }
    return { esCliente, esTrabajador, perfil: visita.perfil ?? perfil };
  }

  private obtenerHorarioActual(visita: VisitaPrevia) {
    const fecha = visita.fechaConfirmada ?? visita.fechaPropuesta;
    const horaInicio = visita.horaConfirmada ?? visita.horaPropuesta;
    const horaFin = visita.horaFinConfirmada ?? visita.horaFinPropuesta ?? this.sumarMinutosHora(horaInicio, DURACION_VISITA_DEFECTO_MIN);
    return { fecha, horaInicio, horaFin };
  }

  private async cancelarPendientesReprogramacion(manager: EntityManager, visita: VisitaPrevia, actor: Usuario, motivo: string) {
    const pendientes = await manager.getRepository(ReprogramacionVisita).find({
      where: { visita: { idVisita: visita.idVisita } as any, estado: 'PENDIENTE' },
      relations: { usuarioSolicitante: true },
    });
    for (const p of pendientes) {
      p.estado = 'CANCELADA';
      p.usuarioRespuesta = { idUsuario: actor.idUsuario } as Usuario;
      p.fechaRespuesta = new Date();
      p.motivoRespuesta = motivo;
      await manager.getRepository(ReprogramacionVisita).save(p);
      await this.registrarEvento(manager, {
        idSolicitud: visita.solicitud.idSolicitud,
        idUsuario: actor.idUsuario,
        tipoEvento: 'REPROGRAMACION_CANCELADA_SISTEMA',
        estado: visita.estado,
        accion: 'REPROGRAMACION_CANCELADA_SISTEMA',
        entidad: 'reprogramaciones_visita',
        idEntidad: p.idReprogramacion,
        detalle: { idVisita: visita.idVisita, motivo },
      });
    }
  }

  private async validarDisponibilidadReprogramacion(manager: EntityManager, perfil: PerfilTrabajador, fecha: string, inicio: string, fin: string, excluirVisitaId: string) {
    const dia = new Date(`${fecha}T00:00:00`).getUTCDay();
    const disponibilidades = await manager.getRepository(DisponibilidadTrabajador).find({
      where: { perfil: { idPerfil: perfil.idPerfil } as any, disponible: true },
    });
    if (disponibilidades.length) {
      const ok = disponibilidades.some((d) => Number(d.diaSemana) === dia && d.horaInicio.slice(0,8) <= inicio && d.horaFin.slice(0,8) >= fin);
      if (!ok) throw new BadRequestException('El horario propuesto no está dentro de la disponibilidad del trabajador.');
    }

    const visitas = await manager.getRepository(VisitaPrevia).createQueryBuilder('v')
      .leftJoin('v.perfil', 'p')
      .where('p.id_perfil = :idPerfil', { idPerfil: perfil.idPerfil })
      .andWhere('v.id_visita <> :excluirVisitaId', { excluirVisitaId })
      .andWhere('v.estado IN (:...estados)', { estados: ['SOLICITADA', 'ACEPTADA'] })
      .andWhere('COALESCE(v.fecha_confirmada, v.fecha_propuesta) = :fecha', { fecha })
      .getMany();
    for (const v of visitas) {
      const vInicio = (v.horaConfirmada ?? v.horaPropuesta).slice(0, 8);
      const vFin = (v.horaFinConfirmada ?? v.horaFinPropuesta ?? this.sumarMinutosHora(vInicio, DURACION_VISITA_DEFECTO_MIN)).slice(0, 8);
      if (this.intervalosSolapan(inicio, fin, vInicio, vFin)) {
        throw new ConflictException('El horario propuesto se solapa con otra visita previa.');
      }
    }

    const servicios = await manager.getRepository(ServicioProgramado).createQueryBuilder('s')
      .leftJoin('s.perfil', 'p')
      .leftJoin('p.usuario', 'u')
      .where('u.id_usuario = :idUsuario', { idUsuario: perfil.usuario.idUsuario })
      .andWhere('s.estado IN (:...estados)', { estados: ['ACEPTADO', 'EN_PROGRESO', 'PROGRAMADO'] })
      .andWhere('s.fechaServicio = :fecha', { fecha })
      .getMany();
    for (const svc of servicios) {
      const sInicio = (svc.horaInicio || '00:00:00').slice(0, 8);
      const sFin = (svc.horaFin || this.sumarMinutosHora(sInicio, 60)).slice(0, 8);
      if (this.intervalosSolapan(inicio, fin, sInicio, sFin)) {
        throw new ConflictException('El horario propuesto se solapa con un servicio programado.');
      }
    }
  }

  private async registrarEvento(manager: EntityManager, params: { idSolicitud: string; idUsuario: string; tipoEvento: string; estado: string; accion: string; entidad: string; idEntidad: string; detalle: any }) {
    await manager.getRepository(HistorialSolicitud).save(manager.getRepository(HistorialSolicitud).create({
      solicitud: { idSolicitud: params.idSolicitud },
      usuarioActor: { idUsuario: params.idUsuario },
      tipoEvento: params.tipoEvento,
      estadoAnterior: params.estado,
      estadoNuevo: params.estado,
      detalle: params.detalle,
    }));
    await manager.getRepository(RegistroAuditoria).save(manager.getRepository(RegistroAuditoria).create({
      usuarioActor: { idUsuario: params.idUsuario },
      accion: params.accion,
      entidadAfectada: params.entidad,
      idEntidadAfectada: params.idEntidad,
      detalle: params.detalle,
    }));
  }

  private async crearNotificacion(manager: EntityManager, params: { idUsuario: string; tipo: string; titulo: string; mensaje: string; entidadRelacionada: string; idEntidadRelacionada: string }) {
    await manager.getRepository(Notificacion).save(manager.getRepository(Notificacion).create({
      usuario: { idUsuario: params.idUsuario },
      tipo: params.tipo,
      titulo: params.titulo,
      mensaje: params.mensaje,
      entidadRelacionada: params.entidadRelacionada,
      idEntidadRelacionada: params.idEntidadRelacionada,
      leida: false,
      fechaLectura: null,
    }));
  }

  private sumarMinutosHora(hora: string, minutos: number): string {
    const [h, m] = hora.slice(0, 5).split(':').map(Number);
    const total = h * 60 + m + minutos;
    const hh = Math.floor((total % (24 * 60)) / 60).toString().padStart(2, '0');
    const mm = (total % 60).toString().padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  private intervalosSolapan(aInicio: string, aFin: string, bInicio: string, bFin: string) {
    const toMin = (t: string) => { const [h, m] = t.slice(0, 5).split(':').map(Number); return h * 60 + m; };
    return toMin(aInicio) < toMin(bFin) && toMin(bInicio) < toMin(aFin);
  }

}
