import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import {
  describirEventoHistorial,
  etiquetaEventoHistorial,
  TIPO_EVENTO_HISTORIAL,
} from '../common/constants/historial-eventos';
import { Rol } from '../common/enums/rol.enum';
import { construirEventoHistorial } from '../common/utils/historial-solicitud.util';
import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { FotografiaSolicitud } from '../entities/fotografia-solicitud.entity';
import { HistorialSolicitud } from '../entities/historial-solicitud.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { ServicioProgramado } from '../entities/servicio-programado.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Usuario } from '../entities/usuario.entity';
import { Zona } from '../entities/zona.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { CancelSolicitudDto } from './dto/cancel-solicitud.dto';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { FotografiaSolicitudDto } from './dto/fotografia-solicitud.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { SearchSolicitudesDto } from './dto/search-solicitudes.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import {
  ADVERTENCIA_WHATSAPP,
  DIAS_CADUCIDAD_MAXIMA,
  DIAS_PERDIDA_PRIORIDAD,
  ESTADOS_CONTRATADOS_O_PROGRAMADOS,
  ESTADOS_DISPONIBLES_BUSQUEDA,
  ESTADOS_MODIFICABLES_CLIENTE,
  ESTADO_SOLICITUD,
} from './requests.constants';

export interface FotografiaRespuesta {
  idFotografia: string;
  rutaImagen: string;
  descripcion: string | null;
  fechaSubida: Date;
}

export interface HistorialActorRespuesta {
  idUsuario: string | null;
  nombre: string;
  rol: string | null;
  automatico: boolean;
}

export interface HistorialSolicitudRespuesta {
  idEvento: string;
  tipoEvento: string;
  tituloEvento: string;
  descripcion: string;
  estadoAnterior: string | null;
  estadoNuevo: string | null;
  detalle: Record<string, unknown> | null;
  actor: HistorialActorRespuesta;
  /** Compatibilidad con la vista anterior del detalle. */
  actorNombre: string | null;
  fechaEvento: Date;
}

export interface HistorialActorOpcionRespuesta {
  idUsuario: string;
  nombre: string;
  rol: string | null;
}

export interface HistorialFiltrosDisponiblesRespuesta {
  tiposEvento: { valor: string; etiqueta: string }[];
  actores: HistorialActorOpcionRespuesta[];
}

export interface HistorialPaginadoRespuesta {
  data: HistorialSolicitudRespuesta[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    order: 'ASC' | 'DESC';
    filtrosDisponibles: HistorialFiltrosDisponiblesRespuesta;
  };
}

export interface SolicitudResumenRespuesta {
  idSolicitud: string;
  referencia: string;
  categoria: { idCategoria: number; nombre: string } | null;
  zona: { idZona: number; nombre: string } | null;
  descripcion: string;
  ubicacionGeneral: string;
  fechaPreferida: string | null;
  estado: string;
  fechaPublicacion: Date;
  fechaVencimiento: Date | null;
  diasTranscurridos: number;
  diasRestantes: number;
  prioridadReducida: boolean;
  puedeModificar: boolean;
  puedeCancelar: boolean;
  clienteNombrePublico: string;
  fotografias: FotografiaRespuesta[];
  coincideEspecialidad?: boolean;
  coincideZona?: boolean;
  puntajeRelevancia?: number;
  programacion?: {
    idProgramacion: string;
    idPerfilTrabajador: string;
    trabajadorNombre: string;
    fechaServicio: string;
    horaInicio: string;
    horaFin: string;
    estado: string;
  } | null;
}

export interface SolicitudDetalleRespuesta extends SolicitudResumenRespuesta {
  historial: HistorialSolicitudRespuesta[];
}

export interface WhatsappLinkRespuesta {
  url: string;
  destinatarioNombre: string;
  destinatarioRol: string;
  referenciaSolicitud: string;
  mensajePrellenado: string;
  advertencia: string;
  canalExterno: true;
}

@Injectable()
export class RequestsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestsService.name);
  private vigenciaTimer: NodeJS.Timeout | null = null;
  private ultimaEvaluacionMs = 0;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(SolicitudServicio)
    private readonly solicitudRepository: Repository<SolicitudServicio>,
    @InjectRepository(CategoriaServicio)
    private readonly categoriaRepository: Repository<CategoriaServicio>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(ServicioProgramado)
    private readonly programacionRepository: Repository<ServicioProgramado>,
    @InjectRepository(HistorialSolicitud)
    private readonly historialRepository: Repository<HistorialSolicitud>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    // Evalúa vigencia periódicamente (cada 15 minutos) sin bloquear el cierre de Node/Jest.
    this.vigenciaTimer = setInterval(
      () => {
        void this.evaluarVigenciaSolicitudes(true).catch((error: unknown) => {
          this.logger.warn(
            `No se pudo ejecutar la evaluación periódica de vigencia: ${String(error)}`,
          );
        });
      },
      15 * 60 * 1000,
    );
    this.vigenciaTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.vigenciaTimer) {
      clearInterval(this.vigenciaTimer);
      this.vigenciaTimer = null;
    }
  }

  async obtenerCatalogos() {
    const [categorias, zonas] = await Promise.all([
      this.categoriaRepository.find({ order: { nombre: 'ASC' } }),
      this.zonaRepository.find({ order: { nombre: 'ASC' } }),
    ]);

    return {
      categorias: categorias.map((c) => ({
        idCategoria: c.idCategoria,
        nombre: c.nombre,
        descripcion: c.descripcion,
      })),
      zonas: zonas.map((z) => ({
        idZona: z.idZona,
        nombre: z.nombre,
        descripcion: z.descripcion,
      })),
    };
  }

  /**
   * CU-01 / HU-F04: Publicación de solicitud de servicio doméstico por parte del cliente.
   */
  async crearSolicitud(
    usuario: Usuario,
    dto: CreateSolicitudDto,
  ): Promise<SolicitudDetalleRespuesta> {
    this.validarFechaPreferida(dto.fechaPreferida);
    this.validarFotografias(dto.fotografias);

    const [categoria, zona] = await Promise.all([
      this.categoriaRepository.findOne({
        where: { idCategoria: dto.idCategoria },
      }),
      this.zonaRepository.findOne({ where: { idZona: dto.idZona } }),
    ]);

    if (!categoria) {
      throw new BadRequestException(
        'La categoría de servicio seleccionada no existe',
      );
    }

    if (!zona) {
      throw new BadRequestException('La zona seleccionada no existe');
    }

    const ahora = new Date();
    const fechaVencimiento = new Date(
      ahora.getTime() + DIAS_CADUCIDAD_MAXIMA * 24 * 60 * 60 * 1000,
    );

    const idSolicitudCreada = await this.dataSource.transaction(
      async (manager) => {
        const solicitudRepo = manager.getRepository(SolicitudServicio);
        const fotoRepo = manager.getRepository(FotografiaSolicitud);
        const historialRepo = manager.getRepository(HistorialSolicitud);

        const nueva = solicitudRepo.create({
          cliente: { idUsuario: usuario.idUsuario },
          categoria,
          zona,
          descripcion: dto.descripcion.trim(),
          ubicacionGeneral: dto.ubicacionGeneral.trim(),
          fechaPreferida: dto.fechaPreferida ?? null,
          estado: ESTADO_SOLICITUD.ACTIVA,
          fechaPublicacion: ahora,
          fechaVencimiento,
        });

        const guardada = await solicitudRepo.save(nueva);

        if (dto.fotografias && dto.fotografias.length > 0) {
          const fotos = dto.fotografias.map((f) =>
            fotoRepo.create({
              solicitud: { idSolicitud: guardada.idSolicitud },
              rutaImagen: f.rutaImagen.trim(),
              descripcion: f.descripcion?.trim() || null,
            }),
          );
          await fotoRepo.save(fotos);
        }

        const evento = historialRepo.create(
          construirEventoHistorial({
            idSolicitud: guardada.idSolicitud,
            actor: usuario,
            tipoEvento: TIPO_EVENTO_HISTORIAL.SOLICITUD_PUBLICADA,
            estadoAnterior: null,
            estadoNuevo: ESTADO_SOLICITUD.ACTIVA,
            detalle: {
              idCategoria: categoria.idCategoria,
              categoria: categoria.nombre,
              idZona: zona.idZona,
              zona: zona.nombre,
              cantidadFotografias: dto.fotografias?.length ?? 0,
              fechaVencimiento: fechaVencimiento.toISOString(),
            },
          }),
        );
        await historialRepo.save(evento);

        return guardada.idSolicitud;
      },
    );

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CREAR_SOLICITUD',
      'solicitudes_servicio',
      idSolicitudCreada,
      {
        idCategoria: categoria.idCategoria,
        idZona: zona.idZona,
        cantidadFotografias: dto.fotografias?.length ?? 0,
      },
    );

    const referencia = this.construirReferencia(idSolicitudCreada);

    // Notificación al cliente confirmando la publicación (HU-F21).
    await this.notificationsService.crearNotificacion({
      idUsuario: usuario.idUsuario,
      tipo: 'SOLICITUD_PUBLICADA',
      titulo: `Solicitud #${referencia} publicada`,
      mensaje: `Tu solicitud de ${categoria.nombre} en ${zona.nombre} está activa y vigente por ${DIAS_CADUCIDAD_MAXIMA} días.`,
      entidadRelacionada: 'solicitudes_servicio',
      idEntidadRelacionada: idSolicitudCreada,
    });

    // Notificar a trabajadores aprobados que coinciden por especialidad o zona.
    await this.notificarTrabajadoresCompatibles(
      usuario.idUsuario,
      idSolicitudCreada,
      categoria,
      zona,
    );

    return this.obtenerDetalle(usuario, idSolicitudCreada);
  }

  /**
   * Lista las solicitudes del cliente autenticado (CU-01 / CU-14).
   */
  async listarMisSolicitudes(
    usuario: Usuario,
    estado?: string,
  ): Promise<SolicitudResumenRespuesta[]> {
    await this.evaluarVigenciaSiCorresponde();

    const qb = this.solicitudRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.categoria', 'categoria')
      .leftJoinAndSelect('s.zona', 'zona')
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('s.fotografias', 'fotografias')
      .where('cliente.idUsuario = :idCliente', {
        idCliente: usuario.idUsuario,
      })
      .orderBy('s.fechaPublicacion', 'DESC')
      .addOrderBy('fotografias.fechaSubida', 'ASC');

    if (estado && estado.trim()) {
      qb.andWhere('s.estado = :estado', {
        estado: estado.trim().toUpperCase(),
      });
    }

    const solicitudes = await qb.getMany();
    const programacionesMap = await this.cargarProgramacionesPorSolicitudes(
      solicitudes.map((s) => s.idSolicitud),
    );

    return solicitudes.map((s) =>
      this.serializarResumen(
        s,
        programacionesMap.get(s.idSolicitud) ?? null,
      ),
    );
  }

  /**
   * CU-13 / HU-F05: Buscador y filtrado de solicitudes activas por especialidad y zona.
   * Prioriza coincidencias con las especialidades y zonas de cobertura del trabajador
   * y sitúa solicitudes ACTIVA por encima de PRIORIDAD_REDUCIDA (RN-05).
   * Nunca expone datos sensibles ni dirección exacta del cliente (RNF-02).
   */
  async buscarParaTrabajador(
    usuario: Usuario,
    filtros: SearchSolicitudesDto,
  ): Promise<{
    perfilTrabajador: {
      estadoValidacion: string;
      categoriasIds: number[];
      zonasIds: number[];
    };
    total: number;
    solicitudes: SolicitudResumenRespuesta[];
  }> {
    await this.evaluarVigenciaSiCorresponde();

    const perfil = await this.perfilRepository.findOne({
      where: { usuario: { idUsuario: usuario.idUsuario } },
      relations: {
        servicios: { categoria: true },
        zonas: true,
      },
    });

    const categoriasTrabajador = new Set<number>(
      (perfil?.servicios ?? [])
        .map((s) => s.categoria?.idCategoria)
        .filter((id): id is number => typeof id === 'number'),
    );
    const zonasTrabajador = new Set<number>(
      (perfil?.zonas ?? []).map((z) => z.idZona),
    );

    const qb = this.solicitudRepository
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.categoria', 'categoria')
      .leftJoinAndSelect('s.zona', 'zona')
      .leftJoinAndSelect('s.cliente', 'cliente')
      .leftJoinAndSelect('s.fotografias', 'fotografias')
      .where('s.estado IN (:...estados)', {
        estados: ESTADOS_DISPONIBLES_BUSQUEDA,
      })
      .andWhere('cliente.idUsuario != :idUsuario', {
        idUsuario: usuario.idUsuario,
      });

    if (filtros.idCategoria) {
      qb.andWhere('categoria.idCategoria = :idCategoria', {
        idCategoria: filtros.idCategoria,
      });
    }

    if (filtros.idZona) {
      qb.andWhere('zona.idZona = :idZona', {
        idZona: filtros.idZona,
      });
    }

    if (filtros.q && filtros.q.trim()) {
      qb.andWhere(
        '(LOWER(s.descripcion) LIKE :termino OR LOWER(s.ubicacionGeneral) LIKE :termino)',
        { termino: `%${filtros.q.trim().toLowerCase()}%` },
      );
    }

    qb.orderBy('s.fechaPublicacion', 'DESC').addOrderBy(
      'fotografias.fechaSubida',
      'ASC',
    );

    const solicitudes = await qb.getMany();

    let resultados = solicitudes.map((s) => {
      const coincideEspecialidad =
        s.categoria !== null &&
        categoriasTrabajador.has(s.categoria.idCategoria);
      const coincideZona =
        s.zona !== null && zonasTrabajador.has(s.zona.idZona);

      const puntajeRelevancia =
        (coincideEspecialidad ? 2 : 0) + (coincideZona ? 1 : 0);

      const resumen = this.serializarResumen(s, null);
      return {
        ...resumen,
        coincideEspecialidad,
        coincideZona,
        puntajeRelevancia,
      };
    });

    if (filtros.soloMisCoincidencias) {
      resultados = resultados.filter(
        (r) => r.coincideEspecialidad || r.coincideZona,
      );
    }

    // Ordenamiento:
    // 1. ACTIVA / EN_COTIZACION antes que PRIORIDAD_REDUCIDA (RN-05).
    // 2. Mayor coincidencia con especialidad y zona del trabajador (CU-13).
    // 3. Más reciente primero.
    resultados.sort((a, b) => {
      const pesoEstadoA =
        a.estado === ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA ? 0 : 1;
      const pesoEstadoB =
        b.estado === ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA ? 0 : 1;
      if (pesoEstadoA !== pesoEstadoB) {
        return pesoEstadoB - pesoEstadoA;
      }

      const relA = a.puntajeRelevancia ?? 0;
      const relB = b.puntajeRelevancia ?? 0;
      if (relA !== relB) {
        return relB - relA;
      }

      return (
        new Date(b.fechaPublicacion).getTime() -
        new Date(a.fechaPublicacion).getTime()
      );
    });

    return {
      perfilTrabajador: {
        estadoValidacion: perfil?.estadoValidacion ?? 'SIN_PERFIL',
        categoriasIds: Array.from(categoriasTrabajador),
        zonasIds: Array.from(zonasTrabajador),
      },
      total: resultados.length,
      solicitudes: resultados,
    };
  }

  /**
   * Consulta el detalle autorizado de una solicitud e incluye su historial cronológico.
   */
  async obtenerDetalle(
    usuario: Usuario,
    idSolicitud: string,
  ): Promise<SolicitudDetalleRespuesta> {
    await this.evaluarVigenciaSiCorresponde();

    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: {
        cliente: true,
        categoria: true,
        zona: true,
        fotografias: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud de servicio no encontrada');
    }

    const programacion = await this.programacionRepository.findOne({
      where: { solicitud: { idSolicitud } },
      relations: { perfil: { usuario: true } },
    });

    const esPropietario = solicitud.cliente.idUsuario === usuario.idUsuario;
    const esAdmin =
      usuario.rolActivo === Rol.ADMIN || usuario.rolActivo === Rol.SUPERADMIN;
    const esTrabajadorAsignado =
      programacion?.perfil?.usuario?.idUsuario === usuario.idUsuario;

    if (usuario.rolActivo === Rol.CLIENTE && !esPropietario) {
      throw new ForbiddenException(
        'No tienes permiso para consultar una solicitud que no te pertenece',
      );
    }

    if (
      usuario.rolActivo === Rol.TRABAJADOR &&
      !esPropietario &&
      !esTrabajadorAsignado &&
      !ESTADOS_DISPONIBLES_BUSQUEDA.includes(solicitud.estado)
    ) {
      throw new ForbiddenException(
        'Esta solicitud ya no se encuentra disponible para consulta',
      );
    }

    const historial =
      esPropietario || esAdmin || esTrabajadorAsignado
        ? await this.historialRepository.find({
            where: { solicitud: { idSolicitud } },
            relations: { usuarioActor: true },
            order: { fechaEvento: 'DESC' },
          })
        : [];

    const resumen = this.serializarResumen(solicitud, programacion ?? null);

    return {
      ...resumen,
      historial: historial.map((h) => this.serializarEventoHistorial(h)),
    };
  }

  /**
   * Historial avanzado paginado y filtrado.
   *
   * Los filtros se aplican en PostgreSQL mediante QueryBuilder; nunca se
   * descarga el historial completo para filtrarlo en memoria. La autorización
   * reutiliza las mismas reglas del detalle: propietario, administrador o
   * trabajador asignado / habilitado para la solicitud.
   */
  async obtenerHistorial(
    usuario: Usuario,
    idSolicitud: string,
    filtros: HistoryQueryDto,
  ): Promise<HistorialPaginadoRespuesta> {
    await this.evaluarVigenciaSiCorresponde();

    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: { cliente: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud de servicio no encontrada');
    }

    await this.validarAccesoHistorial(usuario, solicitud);
    await this.validarRangoFechasHistorial(filtros);

    if (filtros.actor) {
      const actorExiste = await this.dataSource
        .getRepository(Usuario)
        .exists({ where: { idUsuario: filtros.actor } });

      if (!actorExiste) {
        throw new BadRequestException(
          'El usuario responsable indicado no existe',
        );
      }
    }

    const qb = this.historialRepository
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.usuarioActor', 'actor')
      .where('h.solicitud.idSolicitud = :idSolicitud', { idSolicitud });

    if (filtros.tipoEvento) {
      qb.andWhere('h.tipoEvento = :tipoEvento', {
        tipoEvento: filtros.tipoEvento,
      });
    }

    if (filtros.estado) {
      qb.andWhere(
        '(h.estadoAnterior = :estado OR h.estadoNuevo = :estado)',
        { estado: filtros.estado },
      );
    }

    if (filtros.actor) {
      qb.andWhere('h.usuarioActor.idUsuario = :actor', { actor: filtros.actor });
    }

    if (filtros.fechaDesde) {
      qb.andWhere('h.fechaEvento >= :fechaDesde', {
        fechaDesde: this.inicioDelDia(filtros.fechaDesde),
      });
    }

    if (filtros.fechaHasta) {
      qb.andWhere('h.fechaEvento <= :fechaHasta', {
        fechaHasta: this.finDelDia(filtros.fechaHasta),
      });
    }

    const order = filtros.order ?? 'DESC';
    qb.orderBy('h.fechaEvento', order).addOrderBy('h.idEvento', order);

    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 10;

    qb.skip((page - 1) * limit).take(limit);

    const [eventos, total] = await qb.getManyAndCount();
    const filtrosDisponibles =
      await this.obtenerFiltrosDisponiblesHistorial(idSolicitud);

    return {
      data: eventos.map((evento) => this.serializarEventoHistorial(evento)),
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        order,
        filtrosDisponibles,
      },
    };
  }

  /**
   * CU-14: Modificar una solicitud propia antes de la contratación.
   */
  async modificarSolicitud(
    usuario: Usuario,
    idSolicitud: string,
    dto: UpdateSolicitudDto,
  ): Promise<SolicitudDetalleRespuesta> {
    await this.evaluarVigenciaSiCorresponde();

    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: {
        cliente: true,
        categoria: true,
        zona: true,
        fotografias: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud de servicio no encontrada');
    }

    if (solicitud.cliente.idUsuario !== usuario.idUsuario) {
      throw new ForbiddenException(
        'Solo el cliente propietario puede modificar esta solicitud',
      );
    }

    if (ESTADOS_CONTRATADOS_O_PROGRAMADOS.includes(solicitud.estado)) {
      throw new BadRequestException(
        'Esta solicitud ya corresponde a un servicio programado o contratado y no puede modificarse aquí.',
      );
    }

    if (!ESTADOS_MODIFICABLES_CLIENTE.includes(solicitud.estado)) {
      throw new BadRequestException(
        `No es posible modificar una solicitud en estado ${solicitud.estado}.`,
      );
    }

    if (dto.fechaPreferida !== undefined && dto.fechaPreferida !== null && dto.fechaPreferida !== '') {
      this.validarFechaPreferida(dto.fechaPreferida);
    }
    this.validarFotografias(dto.fotografias);

    const camposModificados: string[] = [];

    let nuevaCategoria = solicitud.categoria;
    if (
      dto.idCategoria !== undefined &&
      dto.idCategoria !== solicitud.categoria?.idCategoria
    ) {
      const cat = await this.categoriaRepository.findOne({
        where: { idCategoria: dto.idCategoria },
      });
      if (!cat) {
        throw new BadRequestException(
          'La categoría de servicio seleccionada no existe',
        );
      }
      nuevaCategoria = cat;
      camposModificados.push('categoria');
    }

    let nuevaZona = solicitud.zona;
    if (dto.idZona !== undefined && dto.idZona !== solicitud.zona?.idZona) {
      const z = await this.zonaRepository.findOne({
        where: { idZona: dto.idZona },
      });
      if (!z) {
        throw new BadRequestException('La zona seleccionada no existe');
      }
      nuevaZona = z;
      camposModificados.push('zona');
    }

    if (
      dto.descripcion !== undefined &&
      dto.descripcion.trim() !== solicitud.descripcion
    ) {
      camposModificados.push('descripcion');
    }

    if (
      dto.ubicacionGeneral !== undefined &&
      dto.ubicacionGeneral.trim() !== solicitud.ubicacionGeneral
    ) {
      camposModificados.push('ubicacionGeneral');
    }

    const nuevaFechaPreferida =
      dto.fechaPreferida === undefined
        ? solicitud.fechaPreferida
        : dto.fechaPreferida === null || dto.fechaPreferida === ''
          ? null
          : dto.fechaPreferida;

    if (nuevaFechaPreferida !== solicitud.fechaPreferida) {
      camposModificados.push('fechaPreferida');
    }

    if (dto.fotografias !== undefined) {
      camposModificados.push('fotografias');
    }

    if (camposModificados.length === 0) {
      throw new BadRequestException(
        'No se detectaron cambios para actualizar en la solicitud',
      );
    }

    const estadoAnterior = solicitud.estado;

    await this.dataSource.transaction(async (manager) => {
      const solicitudRepo = manager.getRepository(SolicitudServicio);
      const fotoRepo = manager.getRepository(FotografiaSolicitud);
      const historialRepo = manager.getRepository(HistorialSolicitud);

      solicitud.categoria = nuevaCategoria;
      solicitud.zona = nuevaZona;
      if (dto.descripcion !== undefined) {
        solicitud.descripcion = dto.descripcion.trim();
      }
      if (dto.ubicacionGeneral !== undefined) {
        solicitud.ubicacionGeneral = dto.ubicacionGeneral.trim();
      }
      solicitud.fechaPreferida = nuevaFechaPreferida;

      await solicitudRepo.save(solicitud);

      if (dto.fotografias !== undefined) {
        await fotoRepo.delete({ solicitud: { idSolicitud } });
        if (dto.fotografias.length > 0) {
          const fotos = dto.fotografias.map((f) =>
            fotoRepo.create({
              solicitud: { idSolicitud },
              rutaImagen: f.rutaImagen.trim(),
              descripcion: f.descripcion?.trim() || null,
            }),
          );
          await fotoRepo.save(fotos);
        }
      }

      const evento = historialRepo.create(
        construirEventoHistorial({
          idSolicitud,
          actor: usuario,
          tipoEvento: TIPO_EVENTO_HISTORIAL.SOLICITUD_MODIFICADA,
          estadoAnterior,
          estadoNuevo: solicitud.estado,
          detalle: { camposModificados },
        }),
      );
      await historialRepo.save(evento);
    });

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'MODIFICAR_SOLICITUD',
      'solicitudes_servicio',
      idSolicitud,
      { camposModificados },
    );

    const referencia = this.construirReferencia(idSolicitud);
    await this.notificationsService.crearNotificacion({
      idUsuario: usuario.idUsuario,
      tipo: 'SOLICITUD_MODIFICADA',
      titulo: `Solicitud #${referencia} actualizada`,
      mensaje: `Se guardaron los cambios en tu solicitud (${camposModificados.join(', ')}).`,
      entidadRelacionada: 'solicitudes_servicio',
      idEntidadRelacionada: idSolicitud,
    });

    return this.obtenerDetalle(usuario, idSolicitud);
  }

  /**
   * CU-14: Cancelar una solicitud propia antes de la contratación.
   * Si el servicio ya está contratado/programado, impide cancelarla aquí y remite al CU-17.
   */
  async cancelarSolicitud(
    usuario: Usuario,
    idSolicitud: string,
    dto: CancelSolicitudDto,
  ): Promise<{ mensaje: string; solicitud: SolicitudDetalleRespuesta }> {
    await this.evaluarVigenciaSiCorresponde();

    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: { cliente: true, categoria: true, zona: true },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud de servicio no encontrada');
    }

    if (solicitud.cliente.idUsuario !== usuario.idUsuario) {
      throw new ForbiddenException(
        'Solo el cliente propietario puede cancelar esta solicitud',
      );
    }

    if (ESTADOS_CONTRATADOS_O_PROGRAMADOS.includes(solicitud.estado)) {
      throw new BadRequestException(
        'La solicitud ya cuenta con un servicio programado o contratado. Debes utilizar el procedimiento de cancelación de servicio contratado (CU-17).',
      );
    }

    if (!ESTADOS_MODIFICABLES_CLIENTE.includes(solicitud.estado)) {
      throw new BadRequestException(
        `La solicitud ya se encuentra en estado ${solicitud.estado} y no puede cancelarse.`,
      );
    }

    const estadoAnterior = solicitud.estado;
    const motivo = dto.motivo?.trim() || 'Cancelada por el cliente';

    await this.dataSource.transaction(async (manager) => {
      const solicitudRepo = manager.getRepository(SolicitudServicio);
      const historialRepo = manager.getRepository(HistorialSolicitud);

      solicitud.estado = ESTADO_SOLICITUD.CANCELADA;
      await solicitudRepo.save(solicitud);

      const evento = historialRepo.create(
        construirEventoHistorial({
          idSolicitud,
          actor: usuario,
          tipoEvento: TIPO_EVENTO_HISTORIAL.SOLICITUD_CANCELADA,
          estadoAnterior,
          estadoNuevo: ESTADO_SOLICITUD.CANCELADA,
          detalle: { motivo },
        }),
      );
      await historialRepo.save(evento);
    });

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CANCELAR_SOLICITUD',
      'solicitudes_servicio',
      idSolicitud,
      { estadoAnterior, motivo },
    );

    const referencia = this.construirReferencia(idSolicitud);
    await this.notificationsService.crearNotificacion({
      idUsuario: usuario.idUsuario,
      tipo: 'SOLICITUD_CANCELADA',
      titulo: `Solicitud #${referencia} cancelada`,
      mensaje: `Cancelaste tu solicitud de ${solicitud.categoria?.nombre ?? 'servicio'}. Motivo: ${motivo}.`,
      entidadRelacionada: 'solicitudes_servicio',
      idEntidadRelacionada: idSolicitud,
    });

    const detalle = await this.obtenerDetalle(usuario, idSolicitud);
    return {
      mensaje: 'Solicitud cancelada correctamente',
      solicitud: detalle,
    };
  }

  /**
   * RF-09 / RN-05: Control automático de vigencia y prioridad de solicitudes:
   * - Tras 3 días sin respuesta -> estado PRIORIDAD_REDUCIDA + aviso al cliente.
   * - Tras 30 días (fecha_vencimiento cumplida) -> estado VENCIDA + exclusión del buscador + aviso al cliente.
   */
  async evaluarVigenciaSolicitudes(forzar = false): Promise<{
    evaluadas: number;
    pasadasAPrioridadReducida: number;
    pasadasAVencida: number;
    fechaEvaluacion: string;
  }> {
    const ahora = new Date();
    if (!forzar && ahora.getTime() - this.ultimaEvaluacionMs < 15_000) {
      return {
        evaluadas: 0,
        pasadasAPrioridadReducida: 0,
        pasadasAVencida: 0,
        fechaEvaluacion: ahora.toISOString(),
      };
    }

    this.ultimaEvaluacionMs = ahora.getTime();

    const solicitudesAbiertas = await this.solicitudRepository.find({
      where: {
        estado: In([
          ESTADO_SOLICITUD.ACTIVA,
          ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
          ESTADO_SOLICITUD.EN_COTIZACION,
        ]),
      },
      relations: { cliente: true, categoria: true },
    });

    if (solicitudesAbiertas.length === 0) {
      return {
        evaluadas: 0,
        pasadasAPrioridadReducida: 0,
        pasadasAVencida: 0,
        fechaEvaluacion: ahora.toISOString(),
      };
    }

    const limite3DiasMs = DIAS_PERDIDA_PRIORIDAD * 24 * 60 * 60 * 1000;
    const limite30DiasMs = DIAS_CADUCIDAD_MAXIMA * 24 * 60 * 60 * 1000;

    let pasadasAPrioridadReducida = 0;
    let pasadasAVencida = 0;

    for (const solicitud of solicitudesAbiertas) {
      const fechaPub = new Date(solicitud.fechaPublicacion);
      const fechaVenc = solicitud.fechaVencimiento
        ? new Date(solicitud.fechaVencimiento)
        : new Date(fechaPub.getTime() + limite30DiasMs);

      const msTranscurridos = ahora.getTime() - fechaPub.getTime();
      const referencia = this.construirReferencia(solicitud.idSolicitud);

      // 1) Caducidad máxima a los 30 días.
      if (ahora.getTime() >= fechaVenc.getTime()) {
        const estadoAnterior = solicitud.estado;
        solicitud.estado = ESTADO_SOLICITUD.VENCIDA;
        solicitud.fechaVencimiento = fechaVenc;

        // El cambio de estado y su evento se confirman en la misma transacción.
        await this.dataSource.transaction(async (manager) => {
          await manager.getRepository(SolicitudServicio).save(solicitud);
          await manager.getRepository(HistorialSolicitud).save(
            manager.getRepository(HistorialSolicitud).create(
              construirEventoHistorial({
                idSolicitud: solicitud.idSolicitud,
                actor: null,
                automatico: true,
                tipoEvento: TIPO_EVENTO_HISTORIAL.SOLICITUD_VENCIDA,
                estadoAnterior,
                estadoNuevo: ESTADO_SOLICITUD.VENCIDA,
                detalle: {
                  regla: 'RN-05',
                  motivo: `Caducidad máxima alcanzada (${DIAS_CADUCIDAD_MAXIMA} días)`,
                },
              }),
            ),
          );
        });

        await this.auditService.registrarEvento(
          null,
          'SOLICITUD_VENCIDA_30_DIAS',
          'solicitudes_servicio',
          solicitud.idSolicitud,
          { estadoAnterior, diasVigencia: DIAS_CADUCIDAD_MAXIMA },
        );

        await this.notificationsService.crearNotificacion({
          idUsuario: solicitud.cliente.idUsuario,
          tipo: 'SOLICITUD_VENCIDA',
          titulo: `Solicitud #${referencia} vencida`,
          mensaje: `Tu solicitud de ${solicitud.categoria?.nombre ?? 'servicio'} cumplió el límite máximo de ${DIAS_CADUCIDAD_MAXIMA} días y dejó de recibir ofertas.`,
          entidadRelacionada: 'solicitudes_servicio',
          idEntidadRelacionada: solicitud.idSolicitud,
        });

        pasadasAVencida += 1;
        continue;
      }

      // 2) Pérdida de prioridad tras 3 días sin respuestas (solo si sigue en ACTIVA).
      if (
        solicitud.estado === ESTADO_SOLICITUD.ACTIVA &&
        msTranscurridos >= limite3DiasMs
      ) {
        solicitud.estado = ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA;

        await this.dataSource.transaction(async (manager) => {
          await manager.getRepository(SolicitudServicio).save(solicitud);
          await manager.getRepository(HistorialSolicitud).save(
            manager.getRepository(HistorialSolicitud).create(
              construirEventoHistorial({
                idSolicitud: solicitud.idSolicitud,
                actor: null,
                automatico: true,
                tipoEvento: TIPO_EVENTO_HISTORIAL.PRIORIDAD_REDUCIDA_3_DIAS,
                estadoAnterior: ESTADO_SOLICITUD.ACTIVA,
                estadoNuevo: ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
                detalle: {
                  regla: 'RN-05',
                  motivo: `Sin respuesta tras ${DIAS_PERDIDA_PRIORIDAD} días desde la publicación`,
                },
              }),
            ),
          );
        });

        await this.auditService.registrarEvento(
          null,
          'SOLICITUD_PRIORIDAD_REDUCIDA',
          'solicitudes_servicio',
          solicitud.idSolicitud,
          { diasSinRespuesta: DIAS_PERDIDA_PRIORIDAD },
        );

        await this.notificationsService.crearNotificacion({
          idUsuario: solicitud.cliente.idUsuario,
          tipo: 'SOLICITUD_PRIORIDAD_REDUCIDA',
          titulo: `Solicitud #${referencia} con prioridad reducida`,
          mensaje: `Han pasado ${DIAS_PERDIDA_PRIORIDAD} días sin respuestas en tu solicitud de ${solicitud.categoria?.nombre ?? 'servicio'}. Puedes actualizar los detalles o cancelarla si ya no la necesitas.`,
          entidadRelacionada: 'solicitudes_servicio',
          idEntidadRelacionada: solicitud.idSolicitud,
        });

        pasadasAPrioridadReducida += 1;
      }
    }

    return {
      evaluadas: solicitudesAbiertas.length,
      pasadasAPrioridadReducida,
      pasadasAVencida,
      fechaEvaluacion: ahora.toISOString(),
    };
  }

  /**
   * CU-25 / HU-F20 / RNF-09: Generador dinámico de enlaces a WhatsApp para usuarios autorizados.
   * No expone datos confidenciales innecesarios y advierte explícitamente que la comunicación
   * ocurre fuera de la plataforma Arréglalo Ya.
   */
  async generarEnlaceWhatsapp(
    usuario: Usuario,
    idSolicitud: string,
    idPerfilTrabajador?: string,
  ): Promise<WhatsappLinkRespuesta> {
    await this.evaluarVigenciaSiCorresponde();

    const solicitud = await this.solicitudRepository.findOne({
      where: { idSolicitud },
      relations: {
        cliente: true,
        categoria: true,
        zona: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException('Solicitud de servicio no encontrada');
    }

    const programacion = await this.programacionRepository.findOne({
      where: { solicitud: { idSolicitud } },
      relations: { perfil: { usuario: true } },
    });

    const referencia = this.construirReferencia(solicitud.idSolicitud);
    const categoriaNombre = solicitud.categoria?.nombre ?? 'servicio doméstico';
    const zonaNombre = solicitud.zona?.nombre ?? 'zona indicada';

    if (usuario.rolActivo === Rol.TRABAJADOR) {
      if (solicitud.cliente.idUsuario === usuario.idUsuario) {
        throw new BadRequestException(
          'No puedes generar un enlace de contacto hacia tu propia solicitud',
        );
      }

      const perfil = await this.perfilRepository.findOne({
        where: { usuario: { idUsuario: usuario.idUsuario } },
      });

      const esAsignado =
        programacion?.perfil?.usuario?.idUsuario === usuario.idUsuario;

      if (!perfil || (perfil.estadoValidacion !== 'APROBADO' && !esAsignado)) {
        throw new ForbiddenException(
          'Tu perfil de trabajador debe estar aprobado por un administrador para contactar clientes por WhatsApp',
        );
      }

      if (
        !esAsignado &&
        !ESTADOS_DISPONIBLES_BUSQUEDA.includes(solicitud.estado)
      ) {
        throw new BadRequestException(
          'Esta solicitud ya no admite nuevos contactos externos',
        );
      }

      const telefonoNormalizado = this.normalizarTelefonoWhatsapp(
        solicitud.cliente.telefono,
      );
      if (!telefonoNormalizado) {
        throw new BadRequestException(
          'El contacto del cliente no está disponible en este momento',
        );
      }

      const destinatarioNombre = this.formatearNombrePublico(solicitud.cliente);
      const mensajePrellenado = `Hola ${solicitud.cliente.nombres}, te contacto desde Arréglalo Ya respecto a tu solicitud #${referencia} de ${categoriaNombre} en ${zonaNombre}.`;

      return {
        url: `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensajePrellenado)}`,
        destinatarioNombre,
        destinatarioRol: Rol.CLIENTE,
        referenciaSolicitud: referencia,
        mensajePrellenado,
        advertencia: ADVERTENCIA_WHATSAPP,
        canalExterno: true,
      };
    }

    if (usuario.rolActivo === Rol.CLIENTE) {
      if (solicitud.cliente.idUsuario !== usuario.idUsuario) {
        throw new ForbiddenException(
          'No tienes permiso para generar el contacto de una solicitud ajena',
        );
      }

      let perfilDestino: PerfilTrabajador | null = programacion?.perfil ?? null;

      if (!perfilDestino && idPerfilTrabajador) {
        perfilDestino = await this.perfilRepository.findOne({
          where: {
            idPerfil: idPerfilTrabajador,
            estadoValidacion: 'APROBADO',
          },
          relations: { usuario: true },
        });
      }

      if (!perfilDestino || !perfilDestino.usuario) {
        throw new BadRequestException(
          'Aún no existe un trabajador asignado o seleccionado para contactar en esta solicitud',
        );
      }

      const telefonoNormalizado = this.normalizarTelefonoWhatsapp(
        perfilDestino.usuario.telefono,
      );
      if (!telefonoNormalizado) {
        throw new BadRequestException(
          'El contacto del trabajador no está disponible en este momento',
        );
      }

      const destinatarioNombre = `${perfilDestino.usuario.nombres} ${perfilDestino.usuario.apellidos}`;
      const mensajePrellenado = `Hola ${perfilDestino.usuario.nombres}, soy ${usuario.nombres} de Arréglalo Ya. Te escribo sobre mi solicitud #${referencia} de ${categoriaNombre} en ${zonaNombre}.`;

      return {
        url: `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensajePrellenado)}`,
        destinatarioNombre,
        destinatarioRol: Rol.TRABAJADOR,
        referenciaSolicitud: referencia,
        mensajePrellenado,
        advertencia: ADVERTENCIA_WHATSAPP,
        canalExterno: true,
      };
    }

    throw new ForbiddenException(
      'Solo clientes y trabajadores autorizados pueden generar enlaces de WhatsApp',
    );
  }

  private serializarEventoHistorial(
    evento: HistorialSolicitud,
  ): HistorialSolicitudRespuesta {
    const nombreActor =
      evento.actorNombre ??
      (evento.usuarioActor
        ? `${evento.usuarioActor.nombres} ${evento.usuarioActor.apellidos}`.trim()
        : null);

    return {
      idEvento: evento.idEvento,
      tipoEvento: evento.tipoEvento,
      tituloEvento: etiquetaEventoHistorial(evento.tipoEvento),
      descripcion: describirEventoHistorial(
        evento.tipoEvento,
        evento.detalle,
      ),
      estadoAnterior: evento.estadoAnterior,
      estadoNuevo: evento.estadoNuevo,
      detalle: evento.detalle,
      actor: {
        idUsuario: evento.usuarioActor?.idUsuario ?? null,
        nombre: nombreActor ?? 'Sistema',
        rol: evento.rolActor ?? evento.usuarioActor?.rolActivo ?? null,
        automatico: evento.automatico || !evento.usuarioActor,
      },
      actorNombre: nombreActor ?? 'Sistema',
      fechaEvento: evento.fechaEvento,
    };
  }

  private async validarAccesoHistorial(
    usuario: Usuario,
    solicitud: SolicitudServicio,
  ): Promise<void> {
    const esPropietario =
      solicitud.cliente?.idUsuario === usuario.idUsuario;
    const esAdmin =
      usuario.rolActivo === Rol.ADMIN || usuario.rolActivo === Rol.SUPERADMIN;

    if (esPropietario || esAdmin) {
      return;
    }

    if (usuario.rolActivo === Rol.CLIENTE) {
      throw new ForbiddenException(
        'No tienes permiso para consultar el historial de una solicitud que no te pertenece',
      );
    }

    if (usuario.rolActivo === Rol.TRABAJADOR) {
      const programacion = await this.programacionRepository.findOne({
        where: { solicitud: { idSolicitud: solicitud.idSolicitud } },
        relations: { perfil: { usuario: true } },
      });

      const esTrabajadorAsignado =
        programacion?.perfil?.usuario?.idUsuario === usuario.idUsuario;

      if (
        esTrabajadorAsignado ||
        ESTADOS_DISPONIBLES_BUSQUEDA.includes(solicitud.estado)
      ) {
        return;
      }

      throw new ForbiddenException(
        'No tienes permiso para consultar el historial de esta solicitud',
      );
    }

    throw new ForbiddenException(
      'No tienes permiso para consultar el historial de esta solicitud',
    );
  }

  private validarRangoFechasHistorial(filtros: HistoryQueryDto): void {
    if (!filtros.fechaDesde || !filtros.fechaHasta) {
      return;
    }

    const desde = this.inicioDelDia(filtros.fechaDesde);
    const hasta = this.finDelDia(filtros.fechaHasta);

    if (desde.getTime() > hasta.getTime()) {
      throw new BadRequestException(
        'La fecha desde no puede ser posterior a la fecha hasta',
      );
    }
  }

  /**
   * Acepta fechas `YYYY-MM-DD` o ISO 8601. Las fechas sin hora se interpretan
   * en la zona horaria del servidor para que el rango cubra el día completo.
   */
  private inicioDelDia(valor: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return new Date(`${valor}T00:00:00`);
    }
    return new Date(valor);
  }

  private finDelDia(valor: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return new Date(`${valor}T23:59:59.999`);
    }
    return new Date(valor);
  }

  private async obtenerFiltrosDisponiblesHistorial(
    idSolicitud: string,
  ): Promise<HistorialFiltrosDisponiblesRespuesta> {
    const tiposRaw = await this.historialRepository
      .createQueryBuilder('h')
      .select('DISTINCT h.tipoEvento', 'tipo')
      .where('h.solicitud.idSolicitud = :idSolicitud', { idSolicitud })
      .orderBy('h.tipoEvento', 'ASC')
      .getRawMany<{ tipo: string }>();

    const actoresRaw = await this.historialRepository
      .createQueryBuilder('h')
      .innerJoin('h.usuarioActor', 'actor')
      .select('actor.idUsuario', 'idUsuario')
      .addSelect('h.actorNombre', 'nombre')
      .addSelect('h.rolActor', 'rol')
      .where('h.solicitud.idSolicitud = :idSolicitud', { idSolicitud })
      .orderBy('h.actorNombre', 'ASC')
      .getRawMany<{
        idUsuario: string;
        nombre: string | null;
        rol: string | null;
      }>();

    const actoresUnicos = new Map<string, HistorialActorOpcionRespuesta>();
    for (const actor of actoresRaw) {
      if (!actoresUnicos.has(actor.idUsuario)) {
        actoresUnicos.set(actor.idUsuario, {
          idUsuario: actor.idUsuario,
          nombre: actor.nombre ?? 'Usuario',
          rol: actor.rol,
        });
      }
    }

    return {
      tiposEvento: tiposRaw.map((item) => ({
        valor: item.tipo,
        etiqueta: etiquetaEventoHistorial(item.tipo),
      })),
      actores: Array.from(actoresUnicos.values()),
    };
  }

  private async evaluarVigenciaSiCorresponde(): Promise<void> {
    await this.evaluarVigenciaSolicitudes(false);
  }

  private async notificarTrabajadoresCompatibles(
    idCliente: string,
    idSolicitud: string,
    categoria: CategoriaServicio,
    zona: Zona,
  ): Promise<void> {
    const perfilesCompatibles = await this.perfilRepository
      .createQueryBuilder('perfil')
      .innerJoinAndSelect('perfil.usuario', 'usuario')
      .leftJoin('perfil.servicios', 'servicio')
      .leftJoin('servicio.categoria', 'categoria')
      .leftJoin('perfil.zonas', 'zona')
      .where('perfil.estado_validacion = :aprobado', { aprobado: 'APROBADO' })
      .andWhere('usuario.estado = :activo', { activo: 'ACTIVO' })
      .andWhere('usuario.id_usuario != :idCliente', { idCliente })
      .andWhere(
        '(categoria.id_categoria = :idCategoria OR zona.id_zona = :idZona)',
        {
          idCategoria: categoria.idCategoria,
          idZona: zona.idZona,
        },
      )
      .take(50)
      .getMany();

    if (perfilesCompatibles.length === 0) {
      return;
    }

    const referencia = this.construirReferencia(idSolicitud);
    const idsUnicos = Array.from(
      new Set(perfilesCompatibles.map((p) => p.usuario.idUsuario)),
    );

    await this.notificationsService.crearNotificacionesMasivas(
      idsUnicos.map((idUsuario) => ({
        idUsuario,
        tipo: 'NUEVA_SOLICITUD_COMPATIBLE',
        titulo: `Nueva solicitud de ${categoria.nombre}`,
        mensaje: `Se publicó la solicitud #${referencia} de ${categoria.nombre} en ${zona.nombre}. Revisa el buscador para postularte.`,
        entidadRelacionada: 'solicitudes_servicio',
        idEntidadRelacionada: idSolicitud,
      })),
    );
  }

  private async cargarProgramacionesPorSolicitudes(
    idsSolicitudes: string[],
  ): Promise<Map<string, ServicioProgramado>> {
    const mapa = new Map<string, ServicioProgramado>();
    if (idsSolicitudes.length === 0) {
      return mapa;
    }

    const programaciones = await this.programacionRepository.find({
      where: { solicitud: { idSolicitud: In(idsSolicitudes) } },
      relations: { solicitud: true, perfil: { usuario: true } },
    });

    for (const p of programaciones) {
      mapa.set(p.solicitud.idSolicitud, p);
    }

    return mapa;
  }

  private serializarResumen(
    solicitud: SolicitudServicio,
    programacion: ServicioProgramado | null,
  ): SolicitudResumenRespuesta {
    const ahora = Date.now();
    const fechaPubMs = new Date(solicitud.fechaPublicacion).getTime();
    const fechaVenc = solicitud.fechaVencimiento
      ? new Date(solicitud.fechaVencimiento)
      : new Date(fechaPubMs + DIAS_CADUCIDAD_MAXIMA * 24 * 60 * 60 * 1000);

    const diasTranscurridos = Math.max(
      0,
      Math.floor((ahora - fechaPubMs) / (24 * 60 * 60 * 1000)),
    );
    const diasRestantes = Math.max(
      0,
      Math.ceil((fechaVenc.getTime() - ahora) / (24 * 60 * 60 * 1000)),
    );

    const editable = ESTADOS_MODIFICABLES_CLIENTE.includes(solicitud.estado);

    return {
      idSolicitud: solicitud.idSolicitud,
      referencia: this.construirReferencia(solicitud.idSolicitud),
      categoria: solicitud.categoria
        ? {
            idCategoria: solicitud.categoria.idCategoria,
            nombre: solicitud.categoria.nombre,
          }
        : null,
      zona: solicitud.zona
        ? {
            idZona: solicitud.zona.idZona,
            nombre: solicitud.zona.nombre,
          }
        : null,
      descripcion: solicitud.descripcion,
      ubicacionGeneral: solicitud.ubicacionGeneral,
      fechaPreferida: solicitud.fechaPreferida ?? null,
      estado: solicitud.estado,
      fechaPublicacion: solicitud.fechaPublicacion,
      fechaVencimiento: fechaVenc,
      diasTranscurridos,
      diasRestantes,
      prioridadReducida:
        solicitud.estado === ESTADO_SOLICITUD.PRIORIDAD_REDUCIDA,
      puedeModificar: editable,
      puedeCancelar: editable,
      clienteNombrePublico: solicitud.cliente
        ? this.formatearNombrePublico(solicitud.cliente)
        : 'Cliente',
      fotografias: (solicitud.fotografias ?? []).map((f) => ({
        idFotografia: f.idFotografia,
        rutaImagen: f.rutaImagen,
        descripcion: f.descripcion,
        fechaSubida: f.fechaSubida,
      })),
      programacion: programacion
        ? {
            idProgramacion: programacion.idProgramacion,
            idPerfilTrabajador: programacion.perfil.idPerfil,
            trabajadorNombre: programacion.perfil.usuario
              ? `${programacion.perfil.usuario.nombres} ${programacion.perfil.usuario.apellidos}`
              : 'Trabajador asignado',
            fechaServicio: programacion.fechaServicio,
            horaInicio: programacion.horaInicio,
            horaFin: programacion.horaFin,
            estado: programacion.estado,
          }
        : null,
    };
  }

  private validarFechaPreferida(fechaPreferida?: string): void {
    if (!fechaPreferida) {
      return;
    }

    const fecha = new Date(`${fechaPreferida}T12:00:00Z`);
    if (
      Number.isNaN(fecha.getTime()) ||
      fecha.toISOString().slice(0, 10) !== fechaPreferida
    ) {
      throw new BadRequestException('La fecha preferida no es una fecha válida');
    }

    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    if (fechaPreferida < hoyStr) {
      throw new BadRequestException(
        'La fecha preferida no puede ser anterior a hoy',
      );
    }
  }

  private validarFotografias(fotografias?: FotografiaSolicitudDto[]): void {
    if (!fotografias) {
      return;
    }

    for (const foto of fotografias) {
      const ruta = foto.rutaImagen.trim();
      const esRutaLocal = ruta.startsWith('/uploads/requests/');
      const esUrlHttp = /^https?:\/\/.+/i.test(ruta);

      if (!esRutaLocal && !esUrlHttp) {
        throw new BadRequestException(
          'Cada fotografía debe corresponder a una imagen subida en la plataforma o a una URL http/https válida',
        );
      }
    }
  }

  private normalizarTelefonoWhatsapp(telefono: string | null): string | null {
    if (!telefono) {
      return null;
    }

    const soloDigitos = telefono.replace(/\D/g, '');
    if (soloDigitos.length < 7) {
      return null;
    }

    // Teléfonos móviles/fijos en Bolivia suelen tener 8 dígitos (6xxxxxxx / 7xxxxxxx / 4xxxxxxx).
    if (soloDigitos.length === 8) {
      return `591${soloDigitos}`;
    }

    return soloDigitos;
  }

  private construirReferencia(idSolicitud: string): string {
    return idSolicitud.replace(/-/g, '').slice(0, 8).toUpperCase();
  }

  private formatearNombrePublico(usuario: Usuario): string {
    const inicialApellido = usuario.apellidos?.trim().charAt(0) ?? '';
    return inicialApellido
      ? `${usuario.nombres} ${inicialApellido}.`
      : usuario.nombres;
  }
}
