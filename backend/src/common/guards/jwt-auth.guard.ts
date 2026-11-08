import {
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EstadoUsuario } from '../enums/estado-usuario.enum';
import { Usuario } from '../../entities/usuario.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = Usuario>(
    err: unknown,
    user: TUser | false,
  ): TUser {
    if (err instanceof HttpException) {
      throw err;
    }

    if (err) {
      throw new UnauthorizedException('Token inválido o no proporcionado');
    }

    if (!user) {
      throw new UnauthorizedException('Token inválido o no proporcionado');
    }

    const usuario = user as unknown as Usuario;
    if (usuario.estado !== EstadoUsuario.ACTIVO) {
      throw new ForbiddenException(
        'La cuenta está inactiva o suspendida y no puede acceder al sistema',
      );
    }

    return user;
  }
}
