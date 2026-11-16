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
}
