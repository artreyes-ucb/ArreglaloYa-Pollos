import { Cotizacion } from '../entities/cotizacion.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { ServicioTrabajador } from '../entities/servicio-trabajador.entity';
import { Zona } from '../entities/zona.entity';
import { UpdatePerfilTrabajadorDto } from './dto/update-perfil-trabajador.dto';
import { ValidarPerfilTrabajadorDto } from './dto/validar-perfil-trabajador.dto';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { GuardarDisponibilidadDto } from './dto/guardar-disponibilidad.dto';
import { ProgramarServicioDto } from './dto/programar-servicio.dto';
const RELACIONES_PERFIL = {
  usuario: true,
  servicios: { categoria: true },
  zonas: true,
} as const;

@Injectable()
export class WorkersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async obtenerMiPerfil(idUsuario: string) {
    const perfil = await this.dataSource.getRepository(PerfilTrabajador).findOne({
      where: { usuario: { idUsuario } },
      relations: RELACIONES_PERFIL,
    });

    if (!perfil) {
      throw new NotFoundException('No se encontró el perfil de trabajador');
    }

    return this.mapearPerfilPropio(perfil);
  }

  async actualizarMiPerfil(
    idUsuario: string,
    dto: UpdatePerfilTrabajadorDto,
  ) {
    const camposActualizables = [
      dto.descripcion,
      dto.anosExperiencia,
      dto.datosBancarios,
      dto.servicios,
      dto.zonasIds,
    ];
    if (camposActualizables.every((valor) => valor === undefined)) {
      throw new BadRequestException('Debe enviar al menos un campo para actualizar');
    }

    const resultado = await this.dataSource.transaction(async (manager) => {
      const perfilRepository = manager.getRepository(PerfilTrabajador);
      const servicioRepository = manager.getRepository(ServicioTrabajador);
      const categoriaRepository = manager.getRepository(CategoriaServicio);
      const zonaRepository = manager.getRepository(Zona);

      const perfil = await perfilRepository.findOne({
        where: { usuario: { idUsuario } },
        relations: RELACIONES_PERFIL,
      });
      if (!perfil) {
        throw new NotFoundException('No se encontró el perfil de trabajador');
      }

      if (dto.descripcion !== undefined) perfil.descripcion = dto.descripcion;
      if (dto.anosExperiencia !== undefined) {
        perfil.anosExperiencia = dto.anosExperiencia;
      }
      if (dto.datosBancarios !== undefined) {
        perfil.datosBancarios = dto.datosBancarios || null;
      }

      if (dto.servicios !== undefined) {
        const idsCategorias = [...new Set(dto.servicios.map((item) => item.idCategoria))];
        const categorias = idsCategorias.length
          ? await categoriaRepository.findBy({ idCategoria: In(idsCategorias) })
          : [];
        if (categorias.length !== idsCategorias.length) {
          throw new BadRequestException('Una o más categorías de servicio no existen');
        }

        await servicioRepository.delete({ perfil: { idPerfil: perfil.idPerfil } });
        const categoriasPorId = new Map(
          categorias.map((categoria) => [categoria.idCategoria, categoria]),
        );
        const nuevosServicios = dto.servicios.map((item) =>
          servicioRepository.create({
            perfil,
            categoria: categoriasPorId.get(item.idCategoria)!,
            nombreServicio: item.nombreServicio,
            descripcion: item.descripcion ?? null,
            precioEstimado: item.precioEstimado.toFixed(2),
          }),
        );
        if (nuevosServicios.length) {
          await servicioRepository.save(nuevosServicios);
        }
      }

      if (dto.zonasIds !== undefined) {
        const idsZonas = [...new Set(dto.zonasIds)];
        const zonas = idsZonas.length
          ? await zonaRepository.findBy({ idZona: In(idsZonas) })
          : [];
        if (zonas.length !== idsZonas.length) {
          throw new BadRequestException('Una o más zonas de cobertura no existen');
        }
        perfil.zonas = zonas;
      }

      await perfilRepository.save(perfil);

      return perfilRepository.findOne({
        where: { idPerfil: perfil.idPerfil },
        relations: RELACIONES_PERFIL,
      });
    });

    if (!resultado) {
      throw new NotFoundException('No se pudo recuperar el perfil actualizado');
    }

    await this.auditService.registrarEvento(
      idUsuario,
      'ACTUALIZACION_PERFIL_TRABAJADOR',
      'perfiles_trabajador',
      resultado.idPerfil,
      {
        camposActualizados: Object.keys(dto),
        cantidadServicios: resultado.servicios.length,
        cantidadZonas: resultado.zonas.length,
      },
    );

    return this.mapearPerfilPropio(resultado);
  }

  async obtenerPerfilPublico(idPerfil: string) {
    const perfil = await this.dataSource.getRepository(PerfilTrabajador).findOne({
      where: { idPerfil, estadoValidacion: 'APROBADO' },
      relations: RELACIONES_PERFIL,
    });

    // No revelar si existe un perfil pendiente/rechazado.
    if (!perfil) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }

    return {
      idPerfil: perfil.idPerfil,
      nombres: perfil.usuario.nombres,
      apellidos: perfil.usuario.apellidos,
      descripcion: perfil.descripcion,
      anosExperiencia: perfil.anosExperiencia,
      servicios: perfil.servicios.map((servicio) => ({
        idServicioTrabajador: servicio.idServicioTrabajador,
        categoria: {
          idCategoria: servicio.categoria.idCategoria,
          nombre: servicio.categoria.nombre,
        },
        nombreServicio: servicio.nombreServicio,
        descripcion: servicio.descripcion,
        precioEstimado: Number(servicio.precioEstimado),
      })),
      zonas: perfil.zonas.map((zona) => ({
        idZona: zona.idZona,
        nombre: zona.nombre,
      })),
    };
  }

  private mapearPerfilPropio(perfil: PerfilTrabajador) {
    return {
      idPerfil: perfil.idPerfil,
      idUsuario: perfil.usuario.idUsuario,
      descripcion: perfil.descripcion,
      anosExperiencia: perfil.anosExperiencia,
      // Datos privados: solo se incluyen en la ruta /workers/me.
      datosBancarios: perfil.datosBancarios,
      estadoValidacion: perfil.estadoValidacion,
      fechaValidacion: perfil.fechaValidacion,
      servicios: perfil.servicios.map((servicio) => ({
        idServicioTrabajador: servicio.idServicioTrabajador,
        idCategoria: servicio.categoria.idCategoria,
        categoria: servicio.categoria.nombre,
        nombreServicio: servicio.nombreServicio,
        descripcion: servicio.descripcion,
        precioEstimado: Number(servicio.precioEstimado),
      })),
      zonas: perfil.zonas.map((zona) => ({
        idZona: zona.idZona,
        nombre: zona.nombre,
      })),
    };
  }

async listarPerfilesPendientes() {
  const perfiles = await this.dataSource.getRepository(PerfilTrabajador).find({
    where: { estadoValidacion: 'PENDIENTE' },
    relations: { usuario: true },
    order: { idPerfil: 'ASC' },
  });

  return perfiles.map((perfil) => ({
    idPerfil: perfil.idPerfil,
    nombres: perfil.usuario.nombres,
    apellidos: perfil.usuario.apellidos,
    correo: perfil.usuario.correo,
    estadoValidacion: perfil.estadoValidacion,
  }));
}

async obtenerPerfilParaRevision(idPerfil: string) {
  const perfil = await this.dataSource.getRepository(PerfilTrabajador).findOne({
    where: { idPerfil },
    relations: { usuario: true },
  });

  if (!perfil) {
    throw new NotFoundException('Perfil de trabajador no encontrado');
  }

  return {
    idPerfil: perfil.idPerfil,
    nombres: perfil.usuario.nombres,
    apellidos: perfil.usuario.apellidos,
    correo: perfil.usuario.correo,
    telefono: perfil.usuario.telefono,
    descripcion: perfil.descripcion,
    anosExperiencia: perfil.anosExperiencia,
    documentoIdentidad: perfil.documentoIdentidad,
    estadoValidacion: perfil.estadoValidacion,
    fechaValidacion: perfil.fechaValidacion,
  };
}

async validarPerfil(
  idAdmin: string,
  idPerfil: string,
  dto: ValidarPerfilTrabajadorDto,
) {
  const perfilRepository = this.dataSource.getRepository(PerfilTrabajador);

  const perfil = await perfilRepository.findOne({
    where: { idPerfil },
    relations: { usuario: true },
  });

  if (!perfil) {
    throw new NotFoundException('Perfil de trabajador no encontrado');
  }

  if (perfil.estadoValidacion !== 'PENDIENTE') {
    throw new BadRequestException(
      'Solo se pueden validar perfiles pendientes',
    );
  }

  if (
    dto.estado === 'RECHAZADO' &&
    !dto.observacion?.trim()
  ) {
    throw new BadRequestException(
      'Debe indicar una observación para rechazar el perfil',
    );
  }

  perfil.estadoValidacion = dto.estado;
  perfil.fechaValidacion = new Date();

  await perfilRepository.save(perfil);

  await this.auditService.registrarEvento(
    idAdmin,
    `PERFIL_TRABAJADOR_${dto.estado}`,
    'perfiles_trabajador',
    perfil.idPerfil,
    {
      estadoAnterior: 'PENDIENTE',
      estadoNuevo: dto.estado,
      observacion: dto.observacion?.trim() || null,
    },
  );

  return {
    mensaje: `Perfil de trabajador ${dto.estado.toLowerCase()} correctamente`,
    idPerfil: perfil.idPerfil,
    estadoValidacion: perfil.estadoValidacion,
    fechaValidacion: perfil.fechaValidacion,
  };
}
async guardarDisponibilidad(
  idUsuario: string,
  dto: GuardarDisponibilidadDto,
) {
  if (dto.horaInicio >= dto.horaFin) {
    throw new BadRequestException(
      'La hora de fin debe ser posterior a la hora de inicio',
    );
  }

  const perfil = await this.dataSource
    .getRepository(PerfilTrabajador)
    .findOne({
      where: { usuario: { idUsuario } },
    });

  if (!perfil) {
    throw new NotFoundException('No se encontró el perfil de trabajador');
  }

  if (perfil.estadoValidacion !== 'APROBADO') {
    throw new BadRequestException(
      'El perfil debe estar aprobado para gestionar disponibilidad',
    );
  }

  const repository = this.dataSource.getRepository(DisponibilidadTrabajador);

  const existente = await repository.findOne({
    where: {
      perfil: { idPerfil: perfil.idPerfil },
      diaSemana: dto.diaSemana,
    },
  });

  const disponibilidad = repository.create({
    ...(existente ? { idDisponibilidad: existente.idDisponibilidad } : {}),
    perfil,
    diaSemana: dto.diaSemana,
    horaInicio: dto.horaInicio,
    horaFin: dto.horaFin,
    disponible: dto.disponible ?? true,
  });

  const guardado = await repository.save(disponibilidad);

  await this.auditService.registrarEvento(
    idUsuario,
    'ACTUALIZACION_DISPONIBILIDAD_TRABAJADOR',
    'disponibilidad_trabajador',
    guardado.idDisponibilidad,
    {
      diaSemana: dto.diaSemana,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      disponible: guardado.disponible,
    },
  );

  return {
    mensaje: 'Disponibilidad guardada correctamente',
    disponibilidad: guardado,
  };
}
async obtenerMiDisponibilidad(idUsuario: string) {
  const perfil = await this.dataSource
    .getRepository(PerfilTrabajador)
    .findOne({
      where: { usuario: { idUsuario } },
    });

  if (!perfil) {
    throw new NotFoundException('No se encontró el perfil de trabajador');
  }

  return this.dataSource
    .getRepository(DisponibilidadTrabajador)
    .find({
      where: { perfil: { idPerfil: perfil.idPerfil } },
      order: { diaSemana: 'ASC' },
    });
}

async programarServicio(
  idUsuario: string,
  dto: ProgramarServicioDto,
) {
  if (dto.horaInicio >= dto.horaFin) {
    throw new BadRequestException(
      'La hora de fin debe ser posterior a la hora de inicio',
    );
  }

  return this.dataSource.transaction(async (manager) => {
    const perfil = await manager
      .getRepository(PerfilTrabajador)
      .findOne({
        where: { usuario: { idUsuario } },
        lock: { mode: 'pessimistic_write' },
      });

    if (!perfil) {
      throw new NotFoundException(
        'No se encontró el perfil de trabajador',
      );
    }

    if (perfil.estadoValidacion !== 'APROBADO') {
      throw new BadRequestException(
        'El perfil debe estar aprobado para programar servicios',
      );
    }

    const solicitud = await manager
      .getRepository(SolicitudServicio)
      .findOne({
        where: { idSolicitud: dto.idSolicitud },
        lock: { mode: 'pessimistic_write' },
      });

    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const cotizacionAceptada = await manager
      .getRepository(Cotizacion)
      .findOne({
        where: {
          solicitud: { idSolicitud: solicitud.idSolicitud },
          perfil: { idPerfil: perfil.idPerfil },
          estado: 'ACEPTADA',
        },
      });

    if (!cotizacionAceptada) {
      throw new BadRequestException(
        'No existe una cotización aceptada para esta solicitud y trabajador',
      );
    }

    if (
      solicitud.estado === 'ACTIVA' ||
      solicitud.estado === 'EN_COTIZACION'
    ) {
      const estadoAnterior = solicitud.estado;

      solicitud.estado = 'CONTRATADA';

      await manager.getRepository(SolicitudServicio).save(solicitud);

      const historialContratacion = manager.create(
        HistorialSolicitud,
        {
          solicitud: {
            idSolicitud: solicitud.idSolicitud,
          },
          usuarioActor: { idUsuario },
          tipoEvento: 'SOLICITUD_CONTRATADA',
          estadoAnterior,
          estadoNuevo: 'CONTRATADA',
          detalle: {
            idCotizacion: cotizacionAceptada.idCotizacion,
            origen: 'regularizacion_programacion',
          },
        },
      );

      await manager.save(HistorialSolicitud, historialContratacion);
    }

    if (solicitud.estado !== 'CONTRATADA') {
      throw new BadRequestException(
        'La solicitud debe estar contratada para programar el servicio',
      );
    }

    const fecha = new Date(`${dto.fechaServicio}T12:00:00Z`);

    if (
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== dto.fechaServicio
    ) {
      throw new BadRequestException('La fecha del servicio no es válida');
    }

    const diaSemana = ((fecha.getUTCDay() + 6) % 7) + 1;

    const disponibilidad = await manager
      .getRepository(DisponibilidadTrabajador)
      .findOne({
        where: {
          perfil: { idPerfil: perfil.idPerfil },
          diaSemana,
          disponible: true,
        },
      });

    if (!disponibilidad) {
      throw new BadRequestException(
        'El trabajador no tiene disponibilidad ese día',
      );
    }

    const horaInicioSolicitada = dto.horaInicio.slice(0, 5);
const horaFinSolicitada = dto.horaFin.slice(0, 5);
const horaInicioDisponible = disponibilidad.horaInicio.slice(0, 5);
const horaFinDisponible = disponibilidad.horaFin.slice(0, 5);

if (
  horaInicioSolicitada < horaInicioDisponible ||
  horaFinSolicitada > horaFinDisponible
) {
      throw new BadRequestException(
        'El horario solicitado está fuera de la disponibilidad del trabajador',
      );
    }

    if (dto.fechaServicio < new Date().toISOString().slice(0, 10)) {
      throw new BadRequestException(
        'No se pueden programar servicios en fechas pasadas',
      );
    }

    const conflicto = await manager
      .getRepository(ServicioProgramado)
      .createQueryBuilder('programacion')
      .where('programacion.id_perfil = :idPerfil', {
        idPerfil: perfil.idPerfil,
      })
      .andWhere('programacion.fecha_servicio = :fecha', {
        fecha: dto.fechaServicio,
      })
      .andWhere('programacion.estado != :cancelado', {
        cancelado: 'CANCELADO',
      })
      .andWhere('programacion.hora_inicio < :horaFin', {
        horaFin: dto.horaFin,
      })
      .andWhere('programacion.hora_fin > :horaInicio', {
        horaInicio: dto.horaInicio,
      })
      .getOne();

    if (conflicto) {
      throw new BadRequestException(
        'El trabajador ya tiene otro servicio programado en ese horario',
      );
    }

    const programacionRepository = manager.getRepository(ServicioProgramado);

    const programacion = programacionRepository.create({
      solicitud,
      perfil,
      cotizacion: cotizacionAceptada,
      fechaServicio: dto.fechaServicio,
      horaInicio: dto.horaInicio,
      horaFin: dto.horaFin,
      estado: 'PROGRAMADO',
    });

    const guardado = await programacionRepository.save(programacion);

    solicitud.estado = 'PROGRAMADA';
    await manager.getRepository(SolicitudServicio).save(solicitud);

    await manager.getRepository(RegistroAuditoria).save(
      manager.getRepository(RegistroAuditoria).create({
        usuarioActor: { idUsuario } as any,
        accion: 'SERVICIO_PROGRAMADO',
        entidadAfectada: 'servicios_programados',
        idEntidadAfectada: guardado.idProgramacion,
        detalle: {
          idSolicitud: solicitud.idSolicitud,
          fechaServicio: dto.fechaServicio,
          horaInicio: dto.horaInicio,
          horaFin: dto.horaFin,
        },
      }),
    );

    return {
      mensaje: 'Servicio programado correctamente',
      programacion: guardado,
    };
  });
}

async obtenerMiAgenda(idUsuario: string) {
  const perfil = await this.dataSource
    .getRepository(PerfilTrabajador)
    .findOne({
      where: { usuario: { idUsuario } },
    });

  if (!perfil) {
    throw new NotFoundException(
      'No se encontró el perfil de trabajador',
    );
  }

  return this.dataSource
    .getRepository(ServicioProgramado)
    .find({
      where: { perfil: { idPerfil: perfil.idPerfil } },
      relations: { solicitud: true },
      order: {
        fechaServicio: 'ASC',
        horaInicio: 'ASC',
      },
    });
}

}
