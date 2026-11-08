import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() usuario: Usuario) {
    return this.usersService.getProfile(usuario);
  }

  @Patch('me')
  updateMe(@CurrentUser() usuario: Usuario, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(usuario.idUsuario, dto);
  }

  @Post('enable-worker-role')
  @HttpCode(HttpStatus.OK)
  enableWorkerRole(@CurrentUser() usuario: Usuario) {
    return this.usersService.enableWorkerRole(usuario.idUsuario);
  }

  @Patch('switch-role')
  switchRole(@CurrentUser() usuario: Usuario, @Body() dto: SwitchRoleDto) {
    return this.usersService.switchRole(usuario.idUsuario, dto);
  }
}
