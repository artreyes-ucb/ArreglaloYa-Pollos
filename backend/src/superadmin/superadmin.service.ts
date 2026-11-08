import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ArrayContains, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { Rol } from '../common/enums/rol.enum';
import {
  toUsuarioResponse,
  UsuarioResponse,
} from '../common/utils/usuario-response.util';
import { RegistroAuditoria } from '../entities/registro-auditoria.entity';
import { Usuario } from '../entities/usuario.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

export interface ActorAuditoriaResponse {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
}

export interface AuditoriaResponse {
  idAuditoria: string;
  accion: string;
  entidadAfectada: string;
  idEntidadAfectada: string | null;
  detalle: Record<string, unknown> | null;
  fechaEvento: Date;
  actor: ActorAuditoriaResponse | null;
}

interface CambiosAdmin {
  nombres?: string;
  apellidos?: string;
  correo?: string;
  telefono?: string;
  roles?: Rol[];
  rolActivo?: Rol;
  estado?: EstadoUsuario;
}

@Injectable()
export class SuperadminService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async listarAdmins(): Promise<UsuarioResponse[]> {
    const administradores = await this.usuarioRepository.find({
      where: [
        { roles: ArrayContains([Rol.ADMIN]) },
        { roles: ArrayContains([Rol.SUPERADMIN]) },
      ],
      order: { fechaRegistro: 'ASC' },
    });

    return administradores.map((usuario) => toUsuarioResponse(usuario));
  }

  async crearAdmin(
    actor: Usuario,
    dto: CreateAdminDto,
  ): Promise<UsuarioResponse> {
    const correo = dto.correo.trim().toLowerCase();

    const existente = await this.usuarioRepository.findOne({
      where: { correo },
    });

    if (existente) {
      throw new ConflictException('El correo ya está registrado');
    }

    const contrasenaHash = await bcrypt.hash(
      dto.contrasena,
      this.obtenerRondasBcrypt(),
    );

    const usuario = this.usuarioRepository.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      correo,
      telefono: dto.telefono,
      contrasenaHash,
      roles: [Rol.ADMIN, Rol.CLIENTE],
      rolActivo: Rol.ADMIN,
      estado: EstadoUsuario.ACTIVO,
    });

    const guardado = await this.usuarioRepository.save(usuario);

    await this.auditService.registrarEvento(
      actor.idUsuario,
      'CREAR_ADMIN',
      'usuarios',
      guardado.idUsuario,
      {
        correo: guardado.correo,
        roles: guardado.roles,
        rolActivo: guardado.rolActivo,
        estado: guardado.estado,
      },
    );

    return toUsuarioResponse(guardado);
  }

  async actualizarAdmin(
    actor: Usuario,
    idAdmin: string,
    dto: UpdateAdminDto,
  ): Promise<UsuarioResponse> {
    const objetivo = await this.obtenerAdministrador(idAdmin);
    const esPropioUsuario = actor.idUsuario === objetivo.idUsuario;
    const cambios: CambiosAdmin = {};

    if (dto.nombres !== undefined) {
      cambios.nombres = dto.nombres;
    }
    if (dto.apellidos !== undefined) {
      cambios.apellidos = dto.apellidos;
    }
    if (dto.telefono !== undefined) {
      cambios.telefono = dto.telefono;
    }

    if (dto.correo !== undefined) {
      const correo = dto.correo.trim().toLowerCase();

      if (correo !== objetivo.correo) {
        const existente = await this.usuarioRepository.findOne({
          where: { correo },
        });

        if (existente && existente.idUsuario !== objetivo.idUsuario) {
          throw new ConflictException('El correo ya está registrado');
        }

        cambios.correo = correo;
      }
    }

    if (dto.roles !== undefined) {
      const roles = dto.roles;

      if (roles.length === 0) {
        throw new BadRequestException('Debe asignar al menos un rol');
      }

      if (esPropioUsuario && !roles.includes(Rol.SUPERADMIN)) {
        throw new BadRequestException(
          'No puede degradar su propio rol de SUPERADMIN',
        );
      }

      cambios.roles = roles;

      if (!roles.includes(objetivo.rolActivo)) {
        cambios.rolActivo = roles.includes(Rol.ADMIN) ? Rol.ADMIN : roles[0];
      }
    }

    if (dto.estado !== undefined) {
      if (esPropioUsuario && dto.estado === EstadoUsuario.INACTIVO) {
        throw new BadRequestException(
          'No puede desactivar su propia cuenta de SUPERADMIN',
        );
      }

      cambios.estado = dto.estado;
    }

    if (Object.keys(cambios).length === 0) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    await this.usuarioRepository.update(
      { idUsuario: objetivo.idUsuario },
      cambios,
    );

    await this.auditService.registrarEvento(
      actor.idUsuario,
      'ACTUALIZAR_ADMIN',
      'usuarios',
      objetivo.idUsuario,
      {
        correoAnterior: objetivo.correo,
        cambios,
      },
    );

    return toUsuarioResponse({ ...objetivo, ...cambios });
  }

  async listarAuditoria(): Promise<AuditoriaResponse[]> {
    const registros = await this.auditService.listarEventos();

    return registros.map((registro) => this.toAuditoriaResponse(registro));
  }

  private toAuditoriaResponse(registro: RegistroAuditoria): AuditoriaResponse {
    const actor = registro.usuarioActor;

    return {
      idAuditoria: registro.idAuditoria,
      accion: registro.accion,
      entidadAfectada: registro.entidadAfectada,
      idEntidadAfectada: registro.idEntidadAfectada,
      detalle: registro.detalle,
      fechaEvento: registro.fechaEvento,
      actor: actor
        ? {
            id: actor.idUsuario,
            nombres: actor.nombres,
            apellidos: actor.apellidos,
            correo: actor.correo,
          }
        : null,
    };
  }

  private async obtenerAdministrador(idUsuario: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { idUsuario },
    });

    const esAdministrador =
      usuario !== null &&
      (usuario.roles.includes(Rol.ADMIN) ||
        usuario.roles.includes(Rol.SUPERADMIN));

    if (!usuario || !esAdministrador) {
      throw new NotFoundException('Administrador no encontrado');
    }

    return usuario;
  }

  private obtenerRondasBcrypt(): number {
    const rondas = Number(this.configService.get('BCRYPT_ROUNDS', 12));
    return Number.isFinite(rondas) && rondas >= 10 ? rondas : 12;
  }
}
