import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '../common/enums/rol.enum';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Usuario } from '../entities/usuario.entity';
import { CancelSolicitudDto } from './dto/cancel-solicitud.dto';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { SearchSolicitudesDto } from './dto/search-solicitudes.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { WhatsappLinkQueryDto } from './dto/whatsapp-link-query.dto';
import { RequestsService } from './requests.service';

const UPLOADS_REQUESTS_DIR = join(process.cwd(), 'uploads', 'requests');
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSION_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@ApiTags('Solicitudes de Servicio')
@ApiBearerAuth()
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('catalogs')
  @ApiOperation({
    summary: 'Listar categorías de servicio y zonas disponibles',
    description:
      'Devuelve el catálogo vigente de categorías y zonas de Cochabamba para publicación y búsqueda de solicitudes.',
  })
  @ApiResponse({ status: 200, description: 'Catálogos obtenidos correctamente' })
  obtenerCatalogos() {
    return this.requestsService.obtenerCatalogos();
  }

  @Post('upload-photo')
  @Roles(Rol.CLIENTE)
  @ApiOperation({
    summary: 'Subir fotografía opcional para una solicitud (CU-01)',
    description:
      'Recibe una imagen JPG, PNG o WEBP de hasta 5 MB y devuelve la ruta relativa lista para adjuntar al crear o editar una solicitud.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Fotografía almacenada con éxito' })
  @ApiResponse({ status: 400, description: 'Archivo faltante o formato no permitido' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOADS_REQUESTS_DIR, { recursive: true });
          cb(null, UPLOADS_REQUESTS_DIR);
        },
        filename: (_req, file, cb) => {
          const ext =
            EXTENSION_POR_MIME[file.mimetype] ??
            extname(file.originalname).toLowerCase() ??
            '.jpg';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!MIME_PERMITIDOS.has(file.mimetype)) {
          cb(
            new BadRequestException(
              'Solo se permiten fotografías en formato JPG, PNG o WEBP',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  subirFotografia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo de imagen');
    }

    return {
      rutaImagen: `/uploads/requests/${file.filename}`,
      nombreOriginal: file.originalname,
      tamano: file.size,
      tipo: file.mimetype,
    };
  }

  @Post()
  @Roles(Rol.CLIENTE)
  @ApiOperation({
    summary: 'Publicar nueva solicitud de servicio (CU-01 / HU-F04)',
    description:
      'Registra una solicitud en estado ACTIVA con vigencia máxima de 30 días, fotografías opcionales y notificaciones automáticas.',
  })
  @ApiResponse({ status: 201, description: 'Solicitud creada correctamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o incompletos' })
  @ApiResponse({ status: 403, description: 'El rol activo debe ser CLIENTE' })
  crearSolicitud(
    @CurrentUser() usuario: Usuario,
    @Body() dto: CreateSolicitudDto,
  ) {
    return this.requestsService.crearSolicitud(usuario, dto);
  }

  @Get('mine')
  @Roles(Rol.CLIENTE)
  @ApiOperation({
    summary: 'Listar las solicitudes publicadas por el cliente autenticado',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    description:
      'Filtro opcional por estado (ACTIVA, PRIORIDAD_REDUCIDA, PROGRAMADA, CANCELADA, VENCIDA)',
  })
  @ApiResponse({ status: 200, description: 'Listado de solicitudes propias' })
  listarMisSolicitudes(
    @CurrentUser() usuario: Usuario,
    @Query('estado') estado?: string,
  ) {
    return this.requestsService.listarMisSolicitudes(usuario, estado);
  }

  @Get('search')
  @Roles(Rol.TRABAJADOR)
  @ApiOperation({
    summary: 'Buscar y filtrar solicitudes activas (CU-13 / HU-F05)',
    description:
      'Permite al trabajador consultar solicitudes disponibles filtrando por especialidad, zona o texto libre, priorizando coincidencias con su perfil y solicitudes ACTIVA sobre PRIORIDAD_REDUCIDA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes disponibles priorizadas sin exponer datos sensibles',
  })
  @ApiResponse({ status: 403, description: 'El rol activo debe ser TRABAJADOR' })
  buscarSolicitudes(
    @CurrentUser() usuario: Usuario,
    @Query() filtros: SearchSolicitudesDto,
  ) {
    return this.requestsService.buscarParaTrabajador(usuario, filtros);
  }

  @Post('vigencia/evaluar')
  @Roles(Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({
    summary: 'Evaluar vigencia de solicitudes (RF-09 / RN-05)',
    description:
      'Aplica las reglas de negocio de 3 días sin respuesta (PRIORIDAD_REDUCIDA) y caducidad máxima de 30 días (VENCIDA), generando historial, auditoría y notificaciones.',
  })
  @ApiResponse({
    status: 201,
    description: 'Resumen de solicitudes evaluadas y actualizadas',
  })
  evaluarVigencia() {
    return this.requestsService.evaluarVigenciaSolicitudes(true);
  }

  @Get(':id')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR, Rol.ADMIN, Rol.SUPERADMIN)
  @ApiOperation({
    summary: 'Consultar detalle e historial de una solicitud',
  })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Detalle de la solicitud' })
  @ApiResponse({ status: 403, description: 'Sin permiso para consultar la solicitud' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  obtenerDetalle(
    @CurrentUser() usuario: Usuario,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.requestsService.obtenerDetalle(usuario, id);
  }

  @Patch(':id')
  @Roles(Rol.CLIENTE)
  @ApiOperation({
    summary: 'Modificar una solicitud propia antes de la contratación (CU-14)',
  })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada correctamente' })
  @ApiResponse({ status: 400, description: 'Estado no modificable o datos inválidos' })
  @ApiResponse({ status: 403, description: 'Solo el cliente propietario puede modificarla' })
  modificarSolicitud(
    @CurrentUser() usuario: Usuario,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSolicitudDto,
  ) {
    return this.requestsService.modificarSolicitud(usuario, id, dto);
  }

  @Patch(':id/cancel')
  @Roles(Rol.CLIENTE)
  @ApiOperation({
    summary: 'Cancelar una solicitud propia antes de la contratación (CU-14)',
    description:
      'Marca la solicitud como CANCELADA si aún no fue contratada ni programada. Si ya tiene servicio contratado, rechaza la operación y remite al procedimiento CU-17.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud cancelada correctamente' })
  @ApiResponse({ status: 400, description: 'Estado no cancelable o servicio ya contratado' })
  @ApiResponse({ status: 403, description: 'Solo el cliente propietario puede cancelarla' })
  cancelarSolicitud(
    @CurrentUser() usuario: Usuario,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CancelSolicitudDto,
  ) {
    return this.requestsService.cancelarSolicitud(usuario, id, dto);
  }

  @Get(':id/whatsapp-link')
  @Roles(Rol.CLIENTE, Rol.TRABAJADOR)
  @ApiOperation({
    summary: 'Generar enlace dinámico de WhatsApp (CU-25 / HU-F20 / RNF-09)',
    description:
      'Construye un enlace seguro hacia WhatsApp con la contraparte autorizada del servicio e incluye la advertencia obligatoria de canal externo.',
  })
  @ApiParam({ name: 'id', description: 'UUID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Enlace dinámico de WhatsApp generado con advertencia de canal externo',
  })
  @ApiResponse({ status: 400, description: 'Contacto no disponible o solicitud cerrada' })
  @ApiResponse({ status: 403, description: 'Usuario no autorizado o perfil no aprobado' })
  generarEnlaceWhatsapp(
    @CurrentUser() usuario: Usuario,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: WhatsappLinkQueryDto,
  ) {
    return this.requestsService.generarEnlaceWhatsapp(
      usuario,
      id,
      query.idPerfilTrabajador,
    );
  }
}
