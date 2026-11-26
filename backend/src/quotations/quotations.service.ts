
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { TIPO_EVENTO_HISTORIAL } from '../common/constants/historial-eventos';
import { construirEventoHistorial } from '../common/utils/historial-solicitud.util';
import { Cotizacion } from '../entities/cotizacion.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { Notificacion } from '../entities/notificacion.entity';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity';
import { Usuario } from '../entities/usuario.entity';

import { CrearCotizacionDto } from './dto/crear-cotizacion.dto';
import { ResponderCotizacionDto } from './dto/responder-cotizacion.dto';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Cotizacion)
    private readonly cotizacionRepository: Repository<Cotizacion>,

    @InjectRepository(SolicitudServicio)
    private readonly solicitudRepository: Repository<SolicitudServicio>,

    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,

    private readonly dataSource: DataSource,
  ) {}

  async crearCotizacion(
    usuario: Usuario,
    dto: CrearCotizacionDto,
  ): Promise<Cotizacion> {
    const perfil = await this.perfilRepository.findOne({
      where: { usuario: { idUsuario: usuario.idUsuario } },
      relations: { usuario: true },
    });

    if (!perfil || perfil.estadoValidacion !== 'APROBADO') {
      throw new ForbiddenException(
        'Necesitas tener un perfil de trabajador aprobado para cotizar.',
      );
    }

    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud: dto.idSolicitud },
      relations: { cliente: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    if (
      !['ACTIVA', 'PRIORIDAD_REDUCIDA', 'EN_COTIZACION'].includes(
        solicitud.estado,
      )
    ) {
      throw new BadRequestException(
        'La solicitud ya no admite nuevas cotizaciones.',
      );
    }

    if (
      solicitud.fechaVencimiento &&
      new Date(solicitud.fechaVencimiento).getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'La solicitud ya venció y no admite nuevas cotizaciones.',
      );
    }

    const existente = await this.cotizacionRepository.findOne({
      where: {
        solicitud: { idSolicitud: dto.idSolicitud },
        perfil: { idPerfil: perfil.idPerfil },
        estado: 'ENVIADA',
      },
    });

    if (existente) {
      throw new BadRequestException(
        'Ya tienes una cotización pendiente para esta solicitud.',
      );
    }

    const manoObra = Number(dto.precioManoObra);
    const materiales = Number(dto.precioMateriales);
    const total = manoObra + materiales;

    if (
      !Number.isFinite(manoObra) ||
      !Number.isFinite(materiales) ||
      manoObra < 0 ||
      materiales < 0 ||
      total <= 0
    ) {
      throw new BadRequestException(
        'El precio total de la cotización debe ser mayor a cero.',
      );
    }

    if (!dto.alcance || dto.alcance.trim().length < 5) {
      throw new BadRequestException(
        'El alcance debe contener al menos cinco caracteres.',
      );
    }

    const cotizacion = this.cotizacionRepository.create({
      solicitud,
      perfil,
      precioManoObra: manoObra.toFixed(2),
      precioMateriales: materiales.toFixed(2),
      precioTotal: total.toFixed(2),
      alcance: dto.alcance.trim(),
      condiciones: dto.condiciones?.trim() || null,
      estado: 'ENVIADA',
      fechaRespuesta: null,
      fechaVencimiento: solicitud.fechaVencimiento,
      usuarioDecision: null,
    });

    const guardada = await this.dataSource.transaction(
      async (manager) => {
        const nueva = await manager.save(Cotizacion, cotizacion);

        const historial = manager.create(
          HistorialSolicitud,
          construirEventoHistorial({
            idSolicitud: solicitud.idSolicitud,
            actor: usuario,
            tipoEvento: TIPO_EVENTO_HISTORIAL.COTIZACION_ENVIADA,
            estadoAnterior: solicitud.estado,
            estadoNuevo:
              solicitud.estado === 'ACTIVA'
                ? 'EN_COTIZACION'
                : solicitud.estado,
            detalle: {
              idCotizacion: nueva.idCotizacion,
              precioTotal: total.toFixed(2),
            },
          }),
        );

        await manager.save(HistorialSolicitud, historial);

        if (solicitud.estado === 'ACTIVA') {
          solicitud.estado = 'EN_COTIZACION';
          await manager.save(SolicitudServicio, solicitud);
        }

        await manager.getRepository(RegistroAuditoria).save(
          manager.getRepository(RegistroAuditoria).create({
            usuarioActor: { idUsuario: usuario.idUsuario },
            accion: 'COTIZACION_ENVIADA',
            entidadAfectada: 'COTIZACION',
            idEntidadAfectada: nueva.idCotizacion,
            detalle: {
              idSolicitud: solicitud.idSolicitud,
              precioTotal: total,
            },
          }),
        );

        await manager.getRepository(Notificacion).save(
          manager.getRepository(Notificacion).create({
            usuario: { idUsuario: solicitud.cliente.idUsuario },
            tipo: 'COTIZACION',
            titulo: 'Nueva cotización recibida',
            mensaje: `Un trabajador ha enviado una cotización por Bs ${total.toFixed(2)}.`,
            entidadRelacionada: 'COTIZACION',
            idEntidadRelacionada: nueva.idCotizacion,
            leida: false,
            fechaLectura: null,
          }),
        );

        return nueva;
      },
    );

    return guardada;
  }

  async listarPorSolicitud(
    usuario: Usuario,
    idSolicitud: string,
  ) {
    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: { cliente: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada.');
    }

    const esCliente =
      solicitud.cliente.idUsuario === usuario.idUsuario;

    const perfil = await this.perfilRepository.findOne({
      where: { usuario: { idUsuario: usuario.idUsuario } },
    });

    if (!esCliente && !perfil) {
      throw new ForbiddenException(
        'No tienes permiso para consultar estas cotizaciones.',
      );
    }

    const cotizaciones = await this.cotizacionRepository.find({
      where: esCliente
        ? { solicitud: { idSolicitud } }
        : {
            solicitud: { idSolicitud },
            perfil: { idPerfil: perfil!.idPerfil },
          },
      relations: { perfil: { usuario: true } },
      order: { fechaEnvio: 'DESC' },
    });

    return cotizaciones.map((cotizacion) => ({
      idCotizacion: cotizacion.idCotizacion,
      idSolicitud,
      precioManoObra: cotizacion.precioManoObra,
      precioMateriales: cotizacion.precioMateriales,
      precioTotal: cotizacion.precioTotal,
      alcance: cotizacion.alcance,
      condiciones: cotizacion.condiciones,
      estado: cotizacion.estado,
      fechaEnvio: cotizacion.fechaEnvio,
      fechaRespuesta: cotizacion.fechaRespuesta,
      fechaVencimiento: cotizacion.fechaVencimiento,
      trabajador: {
        idPerfil: cotizacion.perfil.idPerfil,
        nombres: cotizacion.perfil.usuario.nombres,
        apellidos: cotizacion.perfil.usuario.apellidos,
        descripcion: cotizacion.perfil.descripcion,
        anosExperiencia: cotizacion.perfil.anosExperiencia,
      },
    }));
  }

  async responderCotizacion(
    usuario: Usuario,
    idCotizacion: string,
    dto: ResponderCotizacionDto,
  ): Promise<Cotizacion> {
    const cotizacion = await this.cotizacionRepository.findOne({
      where: { idCotizacion },
      relations: {
        solicitud: { cliente: true },
        perfil: { usuario: true },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    if (
      cotizacion.solicitud.cliente.idUsuario !== usuario.idUsuario
    ) {
      throw new ForbiddenException(
        'Solo el cliente propietario puede responder esta cotización.',
      );
    }

    if (cotizacion.estado !== 'ENVIADA') {
      throw new BadRequestException(
        'Esta cotización ya fue respondida.',
      );
    }

    const resultado = await this.dataSource.transaction(
      async (manager) => {
        const cotizacionBloqueada = await manager
          .getRepository(Cotizacion)
          .findOne({
            where: { idCotizacion },
            lock: { mode: 'pessimistic_write' },
          });

        if (!cotizacionBloqueada || cotizacionBloqueada.estado !== 'ENVIADA') {
          throw new BadRequestException(
            'Esta cotización ya fue respondida.',
          );
        }

        if (dto.decision === 'ACEPTADA') {
          const otraAceptada = await manager
            .getRepository(Cotizacion)
            .createQueryBuilder('cotizacion')
            .where('cotizacion.solicitud.idSolicitud = :idSolicitud', {
              idSolicitud: cotizacion.solicitud.idSolicitud,
            })
            .andWhere('cotizacion.idCotizacion != :idCotizacion', {
              idCotizacion,
            })
            .andWhere("cotizacion.estado = 'ACEPTADA'")
            .getOne();

          if (otraAceptada) {
            throw new BadRequestException(
              'Ya existe una cotización aceptada para esta solicitud.',
            );
          }
        }

        cotizacion.estado = dto.decision;
        cotizacion.fechaRespuesta = new Date();
        cotizacion.usuarioDecision = usuario;

        const actualizada = await manager.save(
          Cotizacion,
          cotizacion,
        );

        const historial = manager.create(
          HistorialSolicitud,
          construirEventoHistorial({
            idSolicitud: cotizacion.solicitud.idSolicitud,
            actor: usuario,
            tipoEvento:
              dto.decision === 'ACEPTADA'
                ? TIPO_EVENTO_HISTORIAL.COTIZACION_ACEPTADA
                : TIPO_EVENTO_HISTORIAL.COTIZACION_RECHAZADA,
            estadoAnterior: 'ENVIADA',
            estadoNuevo: dto.decision,
            detalle: {
              idCotizacion,
              precioTotal: cotizacion.precioTotal,
            },
          }),
        );

        await manager.save(HistorialSolicitud, historial);

        if (dto.decision === 'ACEPTADA') {
          const solicitudRepository =
            manager.getRepository(SolicitudServicio);

          const solicitud = await solicitudRepository.findOne({
            where: {
              idSolicitud: cotizacion.solicitud.idSolicitud,
            },
            lock: { mode: 'pessimistic_write' },
          });

          if (!solicitud) {
            throw new NotFoundException('Solicitud no encontrada.');
          }

          if (
            !['ACTIVA', 'EN_COTIZACION', 'CONTRATADA'].includes(
              solicitud.estado,
            )
          ) {
            throw new BadRequestException(
              'La solicitud ya no puede ser contratada.',
            );
          }

          if (solicitud.estado !== 'CONTRATADA') {
            const estadoAnterior = solicitud.estado;

            solicitud.estado = 'CONTRATADA';
            await solicitudRepository.save(solicitud);

            const historialContratacion = manager.create(
              HistorialSolicitud,
              construirEventoHistorial({
                idSolicitud: solicitud.idSolicitud,
                actor: usuario,
                tipoEvento: TIPO_EVENTO_HISTORIAL.SOLICITUD_CONTRATADA,
                estadoAnterior,
                estadoNuevo: 'CONTRATADA',
                detalle: {
                  idCotizacion,
                  precioTotal: cotizacion.precioTotal,
                },
              }),
            );

            await manager.save(
              HistorialSolicitud,
              historialContratacion,
            );
          }
        }

        await manager.getRepository(RegistroAuditoria).save(
          manager.getRepository(RegistroAuditoria).create({
            usuarioActor: { idUsuario: usuario.idUsuario },
            accion: `COTIZACION_${dto.decision}`,
            entidadAfectada: 'COTIZACION',
            idEntidadAfectada: idCotizacion,
            detalle: {
              idSolicitud: cotizacion.solicitud.idSolicitud,
            },
          }),
        );

        await manager.getRepository(Notificacion).save(
          manager.getRepository(Notificacion).create({
            usuario: { idUsuario: cotizacion.perfil.usuario.idUsuario },
            tipo: 'COTIZACION',
            titulo: `Cotización ${dto.decision.toLowerCase()}`,
            mensaje: `El cliente ha ${dto.decision.toLowerCase()} tu cotización.`,
            entidadRelacionada: 'COTIZACION',
            idEntidadRelacionada: idCotizacion,
            leida: false,
            fechaLectura: null,
          }),
        );

        return actualizada;
      },
    );

    return resultado;
  }
}
