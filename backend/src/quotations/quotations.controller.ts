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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';

import { CrearCotizacionDto } from './dto/crear-cotizacion.dto';
import { ResponderCotizacionDto } from './dto/responder-cotizacion.dto';
import { QuotationsService } from './quotations.service';

@ApiTags('Cotizaciones')
@ApiBearerAuth()
@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(
    private readonly quotationsService: QuotationsService,
  ) {}

  @Post()
  @Roles(Rol.TRABAJADOR)
  @ApiOperation({
    summary: 'Enviar una cotización para una solicitud de servicio',
  })
  crearCotizacion(
    @CurrentUser() usuario: Usuario,
    @Body() dto: CrearCotizacionDto,
  ) {
    return this.quotationsService.crearCotizacion(usuario, dto);
  }

  @Get('request/:idSolicitud')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  @ApiOperation({
    summary: 'Consultar cotizaciones de una solicitud',
  })
  listarPorSolicitud(
    @CurrentUser() usuario: Usuario,
    @Param('idSolicitud', new ParseUUIDPipe()) idSolicitud: string,
  ) {
    return this.quotationsService.listarPorSolicitud(
      usuario,
      idSolicitud,
    );
  }

  @Patch(':idCotizacion/response')
  @Roles(Rol.CLIENTE)
  @ApiOperation({
    summary: 'Aceptar o rechazar una cotización',
  })
  responderCotizacion(
    @CurrentUser() usuario: Usuario,
    @Param('idCotizacion', new ParseUUIDPipe()) idCotizacion: string,
    @Body() dto: ResponderCotizacionDto,
  ) {
    return this.quotationsService.responderCotizacion(
      usuario,
      idCotizacion,
      dto,
    );
  }
}