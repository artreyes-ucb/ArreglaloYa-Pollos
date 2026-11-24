import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import { CrearVisitaPreviaDto } from './dto/crear-visita-previa.dto';
import { ResponderVisitaPreviaDto } from './dto/responder-visita-previa.dto';
import { VisitsService } from './visits.service';

@ApiTags('Visitas previas')
@ApiBearerAuth()
@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  @ApiOperation({ summary: 'Registrar una visita previa para una solicitud' })
  crear(@CurrentUser() usuario: Usuario, @Body() dto: CrearVisitaPreviaDto) {
    return this.visitsService.crear(usuario, dto);
  }

  @Get('request/:idSolicitud')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR, Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Listar visitas previas de una solicitud' })
  listar(@CurrentUser() usuario: Usuario, @Param('idSolicitud', new ParseUUIDPipe()) idSolicitud: string) {
    return this.visitsService.listarPorSolicitud(usuario, idSolicitud);
  }

  @Patch(':idVisita/response')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR, Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Responder o actualizar estado de una visita previa' })
  responder(
    @CurrentUser() usuario: Usuario,
    @Param('idVisita', new ParseUUIDPipe()) idVisita: string,
    @Body() dto: ResponderVisitaPreviaDto,
  ) {
    return this.visitsService.responder(usuario, idVisita, dto);
  }
}
