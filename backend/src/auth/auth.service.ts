import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { EstadoUsuario } from '../common/enums/estado-usuario.enum';
import { Rol } from '../common/enums/rol.enum';
import {
  toUsuarioResponse,
  UsuarioResponse,
} from '../common/utils/usuario-response.util';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { Usuario } from '../entities/usuario.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TokenService } from './token.service';

const CODIGO_VIGENCIA_MINUTOS = 15;
const CODIGO_LONGITUD = 6;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilTrabajadorRepository: Repository<PerfilTrabajador>,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ usuario: UsuarioResponse }> {
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

    const roles = dto.registrarseComoTrabajador
      ? [Rol.CLIENTE, Rol.TRABAJADOR]
      : [Rol.CLIENTE];

    const usuario = this.usuarioRepository.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      correo,
      telefono: dto.telefono,
      contrasenaHash,
      roles,
      rolActivo: Rol.CLIENTE,
      estado: EstadoUsuario.ACTIVO,
    });

    const usuarioGuardado = await this.usuarioRepository.save(usuario);

    const registraPerfilTrabajador = usuarioGuardado.roles.includes(
      Rol.TRABAJADOR,
    );

    if (registraPerfilTrabajador) {
      await this.perfilTrabajadorRepository.save(
        this.perfilTrabajadorRepository.create({
          usuario: usuarioGuardado,
          estadoValidacion: 'PENDIENTE',
        }),
      );
    }

    await this.auditService.registrarEvento(
      usuarioGuardado.idUsuario,
      'REGISTRO_USUARIO',
      'usuarios',
      usuarioGuardado.idUsuario,
      {
        correo: usuarioGuardado.correo,
        roles: usuarioGuardado.roles,
        perfilTrabajadorCreado: registraPerfilTrabajador,
      },
    );

    return { usuario: toUsuarioResponse(usuarioGuardado) };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ access_token: string; usuario: UsuarioResponse }> {
    const correo = dto.correo.trim().toLowerCase();

    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasenaHash')
      .where('usuario.correo = :correo', { correo })
      .getOne();

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const contrasenaValida = await bcrypt.compare(
      dto.contrasena,
      usuario.contrasenaHash,
    );

    if (!contrasenaValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new ForbiddenException(
        'La cuenta está inactiva o suspendida y no puede iniciar sesión',
      );
    }

    const access_token = await this.tokenService.generarToken(usuario);

    return {
      access_token,
      usuario: toUsuarioResponse(usuario),
    };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{
    message: string;
    codigo?: string;
    expiraEnMinutos?: number;
  }> {
    const correo = dto.correo.trim().toLowerCase();

    const usuario = await this.usuarioRepository.findOne({
      where: { correo },
    });

    if (!usuario) {
      return {
        message:
          'Si el correo está registrado, se generó un código de recuperación.',
      };
    }

    const codigo = this.generarCodigoNumerico();
    const expira = new Date(Date.now() + CODIGO_VIGENCIA_MINUTOS * 60 * 1000);

    await this.usuarioRepository.update(
      { idUsuario: usuario.idUsuario },
      { resetToken: codigo, resetTokenExpira: expira },
    );

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'SOLICITUD_RECUPERACION_CONTRASENA',
      'usuarios',
      usuario.idUsuario,
      {
        correo: usuario.correo,
        expira: expira.toISOString(),
      },
    );

    return {
      message: 'Código de recuperación generado. Es válido por 15 minutos.',
      codigo,
      expiraEnMinutos: CODIGO_VIGENCIA_MINUTOS,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const correo = dto.correo.trim().toLowerCase();

    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.resetToken')
      .where('usuario.correo = :correo', { correo })
      .getOne();

    if (!usuario || !usuario.resetToken || !usuario.resetTokenExpira) {
      throw new BadRequestException(
        'El código de recuperación es inválido o expiró',
      );
    }

    const codigoValido = usuario.resetToken === dto.codigo;
    const vigente = usuario.resetTokenExpira.getTime() > Date.now();

    if (!codigoValido || !vigente) {
      throw new BadRequestException(
        'El código de recuperación es inválido o expiró',
      );
    }

    const contrasenaHash = await bcrypt.hash(
      dto.nuevaContrasena,
      this.obtenerRondasBcrypt(),
    );

    await this.usuarioRepository.update(
      { idUsuario: usuario.idUsuario },
      {
        contrasenaHash,
        resetToken: null,
        resetTokenExpira: null,
      },
    );

    await this.auditService.registrarEvento(
      usuario.idUsuario,
      'RESTABLECIMIENTO_CONTRASENA',
      'usuarios',
      usuario.idUsuario,
      { correo: usuario.correo },
    );

    return { message: 'Contraseña restablecida correctamente' };
  }

  private generarCodigoNumerico(): string {
    return randomInt(0, 10 ** CODIGO_LONGITUD)
      .toString()
      .padStart(CODIGO_LONGITUD, '0');
  }

  private obtenerRondasBcrypt(): number {
    const rondas = Number(this.configService.get('BCRYPT_ROUNDS', 12));
    return Number.isFinite(rondas) && rondas >= 10 ? rondas : 12;
  }
}
