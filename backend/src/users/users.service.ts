import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Rol } from '../common/enums/rol.enum';
import {
  toUsuarioResponse,
  UsuarioResponse,
} from '../common/utils/usuario-response.util';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { Usuario } from '../entities/usuario.entity';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { TokenService } from '../auth/token.service';

const ESTADO_VALIDACION_PENDIENTE = 'PENDIENTE';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilTrabajadorRepository: Repository<PerfilTrabajador>,
    private readonly auditService: AuditService,
    private readonly tokenService: TokenService,
  ) {}

  getProfile(usuario: Usuario): UsuarioResponse {
    return toUsuarioResponse(usuario);
  }

  async updateProfile(
    idUsuario: string,
    dto: UpdateProfileDto,
  ): Promise<UsuarioResponse> {
    const usuario = await this.obtenerUsuario(idUsuario);

    if (
      dto.nombres === undefined &&
      dto.apellidos === undefined &&
      dto.telefono === undefined
    ) {
      throw new BadRequestException(
        'Debe enviar al menos un campo para actualizar',
      );
    }

    const cambios: {
      nombres?: string;
      apellidos?: string;
      telefono?: string;
    } = {};

    if (dto.nombres !== undefined) {
      cambios.nombres = dto.nombres;
      usuario.nombres = dto.nombres;
    }
    if (dto.apellidos !== undefined) {
      cambios.apellidos = dto.apellidos;
      usuario.apellidos = dto.apellidos;
    }
    if (dto.telefono !== undefined) {
      cambios.telefono = dto.telefono;
      usuario.telefono = dto.telefono;
    }

    await this.usuarioRepository.update({ idUsuario }, cambios);
    return toUsuarioResponse(usuario);
  }

  async enableWorkerRole(
    idUsuario: string,
  ): Promise<{ access_token: string; usuario: UsuarioResponse }> {
    const usuario = await this.obtenerUsuario(idUsuario);

    const rolAgregado = !usuario.roles.includes(Rol.TRABAJADOR);

    if (rolAgregado) {
      const roles = [...usuario.roles, Rol.TRABAJADOR];
      await this.usuarioRepository.update(
        { idUsuario: usuario.idUsuario },
        { roles },
      );
      usuario.roles = roles;
    }

    let perfil = await this.perfilTrabajadorRepository.findOne({
      where: { usuario: { idUsuario: usuario.idUsuario } },
    });
    const perfilCreado = perfil === null;

    if (!perfil) {
      perfil = await this.perfilTrabajadorRepository.save(
        this.perfilTrabajadorRepository.create({
          usuario,
          estadoValidacion: ESTADO_VALIDACION_PENDIENTE,
        }),
      );
    }

    if (rolAgregado) {
      await this.auditService.registrarEvento(
        usuario.idUsuario,
        'HABILITACION_ROL_TRABAJADOR',
        'usuarios',
        usuario.idUsuario,
        {
          roles: usuario.roles,
          idPerfilTrabajador: perfil.idPerfil,
          estadoValidacion: perfil.estadoValidacion,
        },
      );
    } else if (perfilCreado) {
      await this.auditService.registrarEvento(
        usuario.idUsuario,
        'CREACION_PERFIL_TRABAJADOR',
        'perfiles_trabajador',
        perfil.idPerfil,
        { estadoValidacion: perfil.estadoValidacion },
      );
    }

    const access_token = await this.tokenService.generarToken(usuario);

    return {
      access_token,
      usuario: toUsuarioResponse(usuario),
    };
  }

  async switchRole(
    idUsuario: string,
    dto: SwitchRoleDto,
  ): Promise<{ access_token: string; usuario: UsuarioResponse }> {
    const usuario = await this.obtenerUsuario(idUsuario);

    if (!usuario.roles.includes(dto.nuevoRol)) {
      throw new BadRequestException(
        'El rol solicitado no está asignado a esta cuenta',
      );
    }

    const rolAnterior = usuario.rolActivo;
    await this.usuarioRepository.update(
      { idUsuario: usuario.idUsuario },
      { rolActivo: dto.nuevoRol },
    );
    usuario.rolActivo = dto.nuevoRol;

    const access_token = await this.tokenService.generarToken(usuario);

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'CAMBIO_ROL_ACTIVO',
      'usuarios',
      usuario.idUsuario,
      {
        rolAnterior,
        rolNuevo: dto.nuevoRol,
      },
    );

    return {
      access_token,
      usuario: toUsuarioResponse(usuario),
    };
  }

  private async obtenerUsuario(idUsuario: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { idUsuario },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }
}
