import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminEstadoDto } from './dto/update-admin-estado.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { SuperadminService } from './superadmin.service';

@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.SUPERADMIN)
export class SuperadminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('admins')
  listarAdmins() {
    return this.superadminService.listarAdmins();
  }

  @Post('admins')
  crearAdmin(@CurrentUser() actor: Usuario, @Body() dto: CreateAdminDto) {
    return this.superadminService.crearAdmin(actor, dto);
  }

  @Patch('admins/:id/estado')
  cambiarEstadoAdmin(
    @CurrentUser() actor: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminEstadoDto,
  ) {
    return this.superadminService.actualizarAdmin(actor, id, {
      estado: dto.estado,
    });
  }

  @Patch('admins/:id')
  actualizarAdmin(
    @CurrentUser() actor: Usuario,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
  ) {
    return this.superadminService.actualizarAdmin(actor, id, dto);
  }

  @Get('audit-logs')
  listarAuditoria() {
    return this.superadminService.listarAuditoria();
  }
}
