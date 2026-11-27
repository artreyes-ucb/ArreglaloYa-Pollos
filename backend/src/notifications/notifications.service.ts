import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Notificacion } from '../entities/notificacion.entity';
import { PreferenciaNotificacion } from '../entities/preferencia-notificacion.entity';
import { UpdatePreferenciasDto } from './dto/update-preferencias.dto';

export interface CrearNotificacionParams {
  idUsuario: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidadRelacionada?: string | null;
  idEntidadRelacionada?: string | null;
}

export interface NotificacionRespuesta {
  idNotificacion: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  entidadRelacionada: string | null;
  idEntidadRelacionada: string | null;
  leida: boolean;
  fechaEnvio: Date;
  fechaLectura: Date | null;
}

export interface PreferenciasNotificacionRespuesta {
  idPreferencia: string;
  notifSolicitudes: boolean;
  notifCotizaciones: boolean;
  notifServicios: boolean;
  notifPagos: boolean;
  notifReclamos: boolean;
  notifSistema: boolean;
  fechaActualizacion: Date;
}

export interface FiltrosNotificaciones {
  soloNoLeidas?: boolean;
  leida?: boolean;
  tipo?: string;
  q?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(PreferenciaNotificacion)
    private readonly preferenciaRepository: Repository<PreferenciaNotificacion>,
  ) {}

  /**
   * Determina la categoría de preferencia a la que pertenece un tipo de notificación.
   */
  categoriaParaTipo(tipo: string): 'solicitudes' | 'cotizaciones' | 'servicios' | 'pagos' | 'reclamos' | 'sistema' {
    switch (tipo) {
      case 'SOLICITUD_PUBLICADA':
      case 'SOLICITUD_MODIFICADA':
      case 'SOLICITUD_CANCELADA':
      case 'SOLICITUD_VENCIDA':
      case 'SOLICITUD_PRIORIDAD_REDUCIDA':
      case 'NUEVA_SOLICITUD_COMPATIBLE':
        return 'solicitudes';
      case 'COTIZACION':
        return 'cotizaciones';
      case 'VISITA_PREVIA':
      case 'PROGRAMACION':
      case 'SERVICIO_TERMINADO_TRABAJADOR':
      case 'SERVICIO_COMPLETADO':
      case 'SERVICIO_CANCELADO':
        return 'servicios';
      case 'ANTICIPO_25':
      case 'ANTICIPO_REGISTRADO':
      case 'PAGO_FINAL':
      case 'PAGO_FINAL_REGISTRADO':
      case 'REEMBOLSO_RESUELTO':
        return 'pagos';
      case 'RECLAMO_RECIBIDO':
      case 'RECLAMO_RESUELTO':
      case 'NUEVA_EVALUACION':
        return 'reclamos';
      default:
        return 'sistema';
    }
  }

  /**
   * Verifica si una notificación está permitida según las preferencias del usuario.
   */
  estaPermitida(tipo: string, pref: PreferenciaNotificacion): boolean {
    const cat = this.categoriaParaTipo(tipo);
    switch (cat) {
      case 'solicitudes':
        return pref.notifSolicitudes;
      case 'cotizaciones':
        return pref.notifCotizaciones;
      case 'servicios':
        return pref.notifServicios;
      case 'pagos':
        return pref.notifPagos;
      case 'reclamos':
        return pref.notifReclamos;
      case 'sistema':
        return pref.notifSistema;
      default:
        return true;
    }
  }

  /**
   * Obtiene las preferencias de notificación de un usuario, creándolas con valores por defecto si no existen.
   */
  async obtenerPreferencias(idUsuario: string): Promise<PreferenciasNotificacionRespuesta> {
    let pref = await this.preferenciaRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (!pref) {
      pref = this.preferenciaRepository.create({
        usuario: { idUsuario } as any,
        notifSolicitudes: true,
        notifCotizaciones: true,
        notifServicios: true,
        notifPagos: true,
        notifReclamos: true,
        notifSistema: true,
      });
      pref = await this.preferenciaRepository.save(pref);
    }

    return this.serializarPreferencias(pref);
  }

  /**
   * Actualiza las preferencias de notificación de un usuario autenticado.
   */
  async actualizarPreferencias(
    idUsuario: string,
    dto: UpdatePreferenciasDto,
  ): Promise<PreferenciasNotificacionRespuesta> {
    let pref = await this.preferenciaRepository.findOne({
      where: { usuario: { idUsuario } },
    });

    if (!pref) {
      pref = this.preferenciaRepository.create({
        usuario: { idUsuario } as any,
        notifSolicitudes: true,
        notifCotizaciones: true,
        notifServicios: true,
        notifPagos: true,
        notifReclamos: true,
        notifSistema: true,
      });
    }

    if (dto.notifSolicitudes !== undefined) {
      pref.notifSolicitudes = dto.notifSolicitudes;
    }
    if (dto.notifCotizaciones !== undefined) {
      pref.notifCotizaciones = dto.notifCotizaciones;
    }
    if (dto.notifServicios !== undefined) {
      pref.notifServicios = dto.notifServicios;
    }
    if (dto.notifPagos !== undefined) {
      pref.notifPagos = dto.notifPagos;
    }
    if (dto.notifReclamos !== undefined) {
      pref.notifReclamos = dto.notifReclamos;
    }
    if (dto.notifSistema !== undefined) {
      pref.notifSistema = dto.notifSistema;
    }

    const guardada = await this.preferenciaRepository.save(pref);
    return this.serializarPreferencias(guardada);
  }

  async crearNotificacion(
    params: CrearNotificacionParams,
  ): Promise<NotificacionRespuesta | null> {
    // Validar si el usuario tiene habilitada esta categoría de notificación
    const pref = await this.preferenciaRepository.findOne({
      where: { usuario: { idUsuario: params.idUsuario } },
    });

    if (pref && !this.estaPermitida(params.tipo, pref)) {
      // Notificación bloqueada por preferencia del usuario
      return null;
    }

    const entidad = this.notificacionRepository.create({
      usuario: { idUsuario: params.idUsuario },
      tipo: params.tipo,
      titulo: params.titulo,
      mensaje: params.mensaje,
      entidadRelacionada: params.entidadRelacionada ?? null,
      idEntidadRelacionada: params.idEntidadRelacionada ?? null,
      leida: false,
      fechaLectura: null,
    });

    const guardada = await this.notificacionRepository.save(entidad);
    return this.serializar(guardada);
  }

  async crearNotificacionesMasivas(
    items: CrearNotificacionParams[],
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }

    const userIds = Array.from(new Set(items.map((i) => i.idUsuario)));
    const preferencias = await this.preferenciaRepository.find({
      where: { usuario: { idUsuario: In(userIds) } },
      relations: { usuario: true },
    });

    const prefMap = new Map<string, PreferenciaNotificacion>();
    for (const p of preferencias) {
      if (p.usuario?.idUsuario) {
        prefMap.set(p.usuario.idUsuario, p);
      }
    }

    // Filtrar elementos según preferencias
    const itemsFiltrados = items.filter((item) => {
      const pref = prefMap.get(item.idUsuario);
      if (!pref) {
        return true; // Por defecto permitido
      }
      return this.estaPermitida(item.tipo, pref);
    });

    if (itemsFiltrados.length === 0) {
      return;
    }

    const entidades = itemsFiltrados.map((params) =>
      this.notificacionRepository.create({
        usuario: { idUsuario: params.idUsuario },
        tipo: params.tipo,
        titulo: params.titulo,
        mensaje: params.mensaje,
        entidadRelacionada: params.entidadRelacionada ?? null,
        idEntidadRelacionada: params.idEntidadRelacionada ?? null,
        leida: false,
        fechaLectura: null,
      }),
    );

    await this.notificacionRepository.save(entidades);
  }

  async listarMisNotificaciones(
    idUsuario: string,
    filtros?: boolean | FiltrosNotificaciones,
  ): Promise<{
    notificaciones: NotificacionRespuesta[];
    totalNoLeidas: number;
    total: number;
  }> {
    let soloNoLeidas = false;
    let leida: boolean | undefined = undefined;
    let tipo: string | undefined = undefined;
    let q: string | undefined = undefined;

    if (typeof filtros === 'boolean') {
      soloNoLeidas = filtros;
    } else if (filtros) {
      soloNoLeidas = filtros.soloNoLeidas ?? false;
      leida = filtros.leida;
      tipo = filtros.tipo;
      q = filtros.q;
    }

    const qb = this.notificacionRepository
      .createQueryBuilder('n')
      .where('n.id_usuario = :idUsuario', { idUsuario });

    if (leida !== undefined) {
      qb.andWhere('n.leida = :leida', { leida });
    } else if (soloNoLeidas) {
      qb.andWhere('n.leida = false');
    }

    if (tipo && tipo.trim()) {
      qb.andWhere('n.tipo = :tipo', { tipo: tipo.trim() });
    }

    if (q && q.trim()) {
      const termino = `%${q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(n.titulo) LIKE :termino OR LOWER(n.mensaje) LIKE :termino)', {
        termino,
      });
    }

    qb.orderBy('n.fecha_envio', 'DESC').take(100);

    const [notificaciones, totalNoLeidas, total] = await Promise.all([
      qb.getMany(),
      this.notificacionRepository.count({
        where: { usuario: { idUsuario }, leida: false },
      }),
      this.notificacionRepository.count({
        where: { usuario: { idUsuario } },
      }),
    ]);

    return {
      notificaciones: notificaciones.map((n) => this.serializar(n)),
      totalNoLeidas,
      total,
    };
  }

  async contarNoLeidas(idUsuario: string): Promise<{ totalNoLeidas: number }> {
    const totalNoLeidas = await this.notificacionRepository.count({
      where: { usuario: { idUsuario }, leida: false },
    });

    return { totalNoLeidas };
  }

  async marcarComoLeida(
    idUsuario: string,
    idNotificacion: string,
  ): Promise<NotificacionRespuesta> {
    const notificacion = await this.notificacionRepository.findOne({
      where: {
        idNotificacion,
        usuario: { idUsuario },
      },
    });

    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (!notificacion.leida) {
      notificacion.leida = true;
      notificacion.fechaLectura = new Date();
      await this.notificacionRepository.save(notificacion);
    }

    return this.serializar(notificacion);
  }

  async marcarComoNoLeida(
    idUsuario: string,
    idNotificacion: string,
  ): Promise<NotificacionRespuesta> {
    const notificacion = await this.notificacionRepository.findOne({
      where: {
        idNotificacion,
        usuario: { idUsuario },
      },
    });

    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (notificacion.leida) {
      notificacion.leida = false;
      notificacion.fechaLectura = null;
      await this.notificacionRepository.save(notificacion);
    }

    return this.serializar(notificacion);
  }

  async marcarTodasComoLeidas(
    idUsuario: string,
  ): Promise<{ actualizadas: number; mensaje: string }> {
    const resultado = await this.notificacionRepository
      .createQueryBuilder()
      .update(Notificacion)
      .set({ leida: true, fechaLectura: () => 'CURRENT_TIMESTAMP' })
      .where('id_usuario = :idUsuario', { idUsuario })
      .andWhere('leida = false')
      .execute();

    const actualizadas = resultado.affected ?? 0;

    return {
      actualizadas,
      mensaje:
        actualizadas > 0
          ? `Se marcaron ${actualizadas} notificación(es) como leídas.`
          : 'No había notificaciones pendientes por leer.',
    };
  }

  private serializar(notificacion: Notificacion): NotificacionRespuesta {
    return {
      idNotificacion: notificacion.idNotificacion,
      tipo: notificacion.tipo,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      entidadRelacionada: notificacion.entidadRelacionada,
      idEntidadRelacionada: notificacion.idEntidadRelacionada,
      leida: notificacion.leida,
      fechaEnvio: notificacion.fechaEnvio,
      fechaLectura: notificacion.fechaLectura,
    };
  }

  private serializarPreferencias(
    pref: PreferenciaNotificacion,
  ): PreferenciasNotificacionRespuesta {
    return {
      idPreferencia: pref.idPreferencia,
      notifSolicitudes: pref.notifSolicitudes,
      notifCotizaciones: pref.notifCotizaciones,
      notifServicios: pref.notifServicios,
      notifPagos: pref.notifPagos,
      notifReclamos: pref.notifReclamos,
      notifSistema: pref.notifSistema,
      fechaActualizacion: pref.fechaActualizacion,
    };
  }
}
