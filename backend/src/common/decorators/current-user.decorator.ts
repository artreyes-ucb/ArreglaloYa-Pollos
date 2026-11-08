import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Usuario } from '../../entities/usuario.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Usuario => {
    const request = context.switchToHttp().getRequest<{ user: Usuario }>();
    return request.user;
  },
);
