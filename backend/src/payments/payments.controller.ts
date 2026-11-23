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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import {
  CancelarServicioDto,
  ConfirmarPagoBilateralDto,
  CrearEvaluacionDto,
  CrearReclamoDto,
  RegistrarAnticipoDto,
  RegistrarPagoFinalDto,
  ResolverReclamoDto,
  ResolverReembolsoDto,
  SolicitarReembolsoDto,
} from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Bloque 5 - Pagos, Cierre, Evaluaciones y Reclamos')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('services')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR, Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Consultar estado e historial de servicios contratados (CU-21)' })
  listarMisServicios(@CurrentUser() usuario: Usuario) {
    return this.paymentsService.listarMisServicios(usuario);
  }

  @Post('services/:idProgramacion/anticipo')
  @Roles(Rol.CLIENTE)
  @ApiOperation({ summary: 'Calcular y registrar anticipo del 25% (CU-04 / HU-F08 / RN-08)' })
  registrarAnticipo(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
    @Body() dto: RegistrarAnticipoDto,
  ) {
    return this.paymentsService.registrarAnticipo(usuario, idProgramacion, dto);
  }

  @Post('services/:idProgramacion/pago-final')
  @Roles(Rol.CLIENTE)
  @ApiOperation({ summary: 'Registrar pago final del servicio (CU-18)' })
  registrarPagoFinal(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
    @Body() dto: RegistrarPagoFinalDto,
  ) {
    return this.paymentsService.registrarPagoFinal(usuario, idProgramacion, dto);
  }

  @Patch(':idPago/confirm')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  @ApiOperation({ summary: 'Confirmación manual bilateral de pago (CU-18 / HU-F14 / RNF-06)' })
  confirmarPagoBilateral(
    @CurrentUser() usuario: Usuario,
    @Param('idPago', new ParseUUIDPipe()) idPago: string,
    @Body() dto: ConfirmarPagoBilateralDto,
  ) {
    return this.paymentsService.confirmarPagoBilateral(usuario, idPago, dto);
  }

  @Post('services/:idProgramacion/comision')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN, Rol.TRABAJADOR)
  @ApiOperation({ summary: 'Calcular y registrar comisión del 5% plataforma / 95% trabajador (CU-20 / RN-09)' })
  calcularComision(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
  ) {
    return this.paymentsService.calcularComision(usuario, idProgramacion);
  }

  @Patch('services/:idProgramacion/worker-finish')
  @Roles(Rol.TRABAJADOR)
  @ApiOperation({ summary: 'Trabajador marca el servicio como terminado (CU-06 / HU-F12)' })
  marcarTerminado(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
  ) {
    return this.paymentsService.marcarTerminadoPorTrabajador(usuario, idProgramacion);
  }

  @Patch('services/:idProgramacion/client-confirm')
  @Roles(Rol.CLIENTE)
  @ApiOperation({ summary: 'Cliente confirma conclusión del servicio - Cierre dual (CU-06 / HU-F13)' })
  confirmarConclusion(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
  ) {
    return this.paymentsService.confirmarConclusionPorCliente(usuario, idProgramacion);
  }

  @Patch('services/:idProgramacion/cancel')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  @ApiOperation({ summary: 'Cancelar servicio contratado validando límite de 3h (CU-17 / RN-13)' })
  cancelarServicio(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
    @Body() dto: CancelarServicioDto,
  ) {
    return this.paymentsService.cancelarServicioContratado(usuario, idProgramacion, dto);
  }

  @Post('services/:idProgramacion/reembolso')
  @Roles(Rol.CLIENTE)
  @ApiOperation({ summary: 'Solicitar reembolso del anticipo tras cancelación (CU-19)' })
  solicitarReembolso(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
    @Body() dto: SolicitarReembolsoDto,
  ) {
    return this.paymentsService.solicitarReembolso(usuario, idProgramacion, dto);
  }

  @Get('reembolsos')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Listar solicitudes de reembolso para revisión administrativa (CU-19)' })
  listarReembolsosAdmin() {
    return this.paymentsService.listarReembolsosAdmin();
  }

  @Patch('reembolsos/:idReembolso/resolve')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Aprobar o rechazar reembolso de anticipo (CU-19)' })
  resolverReembolso(
    @CurrentUser() admin: Usuario,
    @Param('idReembolso', new ParseUUIDPipe()) idReembolso: string,
    @Body() dto: ResolverReembolsoDto,
  ) {
    return this.paymentsService.resolverReembolso(admin, idReembolso, dto);
  }

  @Post('services/:idProgramacion/evaluacion')
  @Roles(Rol.CLIENTE)
  @ApiOperation({ summary: 'Calificar al trabajador tras concluir el servicio (CU-08 / HU-F15)' })
  crearEvaluacion(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
    @Body() dto: CrearEvaluacionDto,
  ) {
    return this.paymentsService.crearEvaluacion(usuario, idProgramacion, dto);
  }

  @Post('services/:idProgramacion/reclamo')
  @Roles(Rol.CLIENTE)
  @ApiOperation({ summary: 'Presentar reclamo formal dentro de 7 días (CU-07 / HU-F16)' })
  crearReclamo(
    @CurrentUser() usuario: Usuario,
    @Param('idProgramacion', new ParseUUIDPipe()) idProgramacion: string,
    @Body() dto: CrearReclamoDto,
  ) {
    return this.paymentsService.crearReclamo(usuario, idProgramacion, dto);
  }

  @Get('reclamos')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR, Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Listar reclamos propios o todos para administración (CU-07 / HU-F17)' })
  listarReclamos(@CurrentUser() usuario: Usuario) {
    return this.paymentsService.listarReclamos(usuario);
  }

  @Patch('reclamos/:idReclamo/resolve')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({ summary: 'Resolver reclamo con trazabilidad en auditoría (CU-07 / HU-F17 / HU-F22)' })
  resolverReclamo(
    @CurrentUser() admin: Usuario,
    @Param('idReclamo', new ParseUUIDPipe()) idReclamo: string,
    @Body() dto: ResolverReclamoDto,
  ) {
    return this.paymentsService.resolverReclamo(admin, idReclamo, dto);
  }
}