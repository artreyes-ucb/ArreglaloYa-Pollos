import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Rol } from '../common/enums/rol.enum';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Usuario } from '../entities/usuario.entity';
import { VisitaPrevia } from '../entities/visita-previa.entity';
import { Cotizacion } from '../entities/cotizacion.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CrearVisitaPreviaDto } from './dto/crear-visita-previa.dto';
import { ResponderVisitaPreviaDto } from './dto/responder-visita-previa.dto';

const ESTADOS_SOLICITUD_VISITA = ['ACTIVA', 'EN_COTIZACION', 'CONTRATADA', 'PROGRAMADA'];

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
    @InjectRepository(HistorialSolicitud) private readonly historialRepo: Repository<HistorialSolicitud>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
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

    const visita = this.visitaRepo.create({
      solicitud,
      perfil,
      usuarioSolicitante: usuario,
      usuarioRespuesta: null,
      fechaPropuesta: fecha,
      horaPropuesta: hora,
      fechaConfirmada: null,
      horaConfirmada: null,
      estado: 'SOLICITADA',
      resultado: dto.resultado?.trim() || null,
    });
    const guardada = await this.visitaRepo.save(visita);

    await this.historialRepo.save(this.historialRepo.create({
      solicitud: { idSolicitud: solicitud.idSolicitud },
      usuarioActor: { idUsuario: usuario.idUsuario },
      tipoEvento: 'VISITA_PREVIA_SOLICITADA',
      estadoAnterior: solicitud.estado,
      estadoNuevo: solicitud.estado,
      detalle: { idVisita: guardada.idVisita, fechaPropuesta: fecha, horaPropuesta: hora, idPerfil: perfil?.idPerfil ?? null },
    }));
    await this.auditService.registrarEvento(usuario.idUsuario, 'VISITA_PREVIA_SOLICITADA', 'visitas_previas', guardada.idVisita, { idSolicitud: solicitud.idSolicitud });

    const destinatario = usuario.rolActivo === Rol.TRABAJADOR ? solicitud.cliente.idUsuario : perfil?.usuario.idUsuario;
    if (destinatario && destinatario !== usuario.idUsuario) {
      await this.notificationsService.crearNotificacion({
        idUsuario: destinatario,
        tipo: 'VISITA_PREVIA',
        titulo: 'Visita previa solicitada',
        mensaje: `Se solicitó una visita previa para el ${fecha} a las ${hora.slice(0,5)}.`,
        entidadRelacionada: 'VISITA_PREVIA',
        idEntidadRelacionada: guardada.idVisita,
      });
    }
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
    return visitas.map((v) => this.serializar(v));
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
    }
    if ((visita.fechaConfirmada && !visita.horaConfirmada) || (!visita.fechaConfirmada && visita.horaConfirmada)) {
      throw new BadRequestException('Fecha y hora confirmada deben enviarse juntas.');
    }

    const guardada = await this.visitaRepo.save(visita);
    await this.historialRepo.save(this.historialRepo.create({
      solicitud: { idSolicitud: visita.solicitud.idSolicitud },
      usuarioActor: { idUsuario: usuario.idUsuario },
      tipoEvento: `VISITA_PREVIA_${dto.estado}`,
      estadoAnterior,
      estadoNuevo: dto.estado,
      detalle: { idVisita, resultado: guardada.resultado },
    }));
    await this.auditService.registrarEvento(usuario.idUsuario, `VISITA_PREVIA_${dto.estado}`, 'visitas_previas', idVisita, { idSolicitud: visita.solicitud.idSolicitud });

    const destinatario = esCliente ? visita.perfil?.usuario?.idUsuario : visita.solicitud.cliente.idUsuario;
    if (destinatario && destinatario !== usuario.idUsuario) {
      await this.notificationsService.crearNotificacion({
        idUsuario: destinatario,
        tipo: 'VISITA_PREVIA',
        titulo: 'Actualización de visita previa',
        mensaje: `La visita previa pasó a estado ${dto.estado}.`,
        entidadRelacionada: 'VISITA_PREVIA',
        idEntidadRelacionada: idVisita,
      });
    }
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
  private serializar(v: VisitaPrevia) {
    return {
      idVisita: v.idVisita,
      idSolicitud: v.solicitud?.idSolicitud,
      estado: v.estado,
      fechaPropuesta: v.fechaPropuesta,
      horaPropuesta: v.horaPropuesta,
      fechaConfirmada: v.fechaConfirmada,
      horaConfirmada: v.horaConfirmada,
      resultado: v.resultado,
      fechaCreacion: v.fechaCreacion,
      fechaActualizacion: v.fechaActualizacion,
      solicitante: v.usuarioSolicitante ? { idUsuario: v.usuarioSolicitante.idUsuario, nombres: v.usuarioSolicitante.nombres, apellidos: v.usuarioSolicitante.apellidos } : null,
      respondedor: v.usuarioRespuesta ? { idUsuario: v.usuarioRespuesta.idUsuario, nombres: v.usuarioRespuesta.nombres, apellidos: v.usuarioRespuesta.apellidos } : null,
      trabajador: v.perfil?.usuario ? { idPerfil: v.perfil.idPerfil, nombres: v.perfil.usuario.nombres, apellidos: v.perfil.usuario.apellidos } : null,
    };
  }
}
