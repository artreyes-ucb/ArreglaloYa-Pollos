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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import { SwitchRoleDto } from './dto/switch-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Consultar perfil del usuario autenticado (HU-F02)' })
  getMe(@CurrentUser() usuario: Usuario) {
    return this.usersService.getProfile(usuario);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Actualizar datos personales del usuario autenticado (HU-F02)' })
  updateMe(@CurrentUser() usuario: Usuario, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(usuario.idUsuario, dto);
  }

  @Post('enable-worker-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Habilitar rol de trabajador en la misma cuenta (HU-F03)' })
  enableWorkerRole(@CurrentUser() usuario: Usuario) {
    return this.usersService.enableWorkerRole(usuario.idUsuario);
  }

  @Patch('switch-role')
  @ApiOperation({ summary: 'Alternar rol activo y emitir nuevo JWT (HU-F03)' })
  switchRole(@CurrentUser() usuario: Usuario, @Body() dto: SwitchRoleDto) {
    return this.usersService.switchRole(usuario.idUsuario, dto);
  }
}
