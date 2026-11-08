import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Usuario } from '../../entities/usuario.entity';
import { Rol } from '../enums/rol.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: Usuario }>();
    const usuario = request.user;

    if (!usuario) {
      throw new ForbiddenException('No hay un usuario autenticado');
    }

    const autorizado = rolesRequeridos.some(
      (rol) =>
        usuario.rolActivo === rol ||
        (Array.isArray(usuario.roles) && usuario.roles.includes(rol)),
    );

    if (!autorizado) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a este recurso',
      );
    }

    return true;
  }
}
