import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from '../entities/notificacion.entity';

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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
  ) {}

  async crearNotificacion(
    params: CrearNotificacionParams,
  ): Promise<NotificacionRespuesta> {
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

    const entidades = items.map((params) =>
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
    soloNoLeidas = false,
  ): Promise<{
    notificaciones: NotificacionRespuesta[];
    totalNoLeidas: number;
  }> {
    const where: Record<string, unknown> = {
      usuario: { idUsuario },
    };

    if (soloNoLeidas) {
      where.leida = false;
    }

    const [notificaciones, totalNoLeidas] = await Promise.all([
      this.notificacionRepository.find({
        where,
        order: { fechaEnvio: 'DESC' },
        take: 100,
      }),
      this.notificacionRepository.count({
        where: { usuario: { idUsuario }, leida: false },
      }),
    ]);

    return {
      notificaciones: notificaciones.map((n) => this.serializar(n)),
      totalNoLeidas,
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
}
