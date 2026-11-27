import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class RegistrarAnticipoDto {
  @ApiProperty({ description: 'Precio total acordado del servicio (Bs.)', example: 200 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1, { message: 'El precio acordado debe ser mayor a 0' })
  precioAcordado: number;

  @ApiPropertyOptional({ description: 'Referencia o comprobante del pago', example: 'TRANSF-98231' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  referencia?: string;
}

export class RegistrarPagoFinalDto {
  @ApiProperty({ description: 'Monto del pago final (Bs.)', example: 150 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto debe ser mayor a 0' })
  monto: number;

  @ApiPropertyOptional({ description: 'Referencia o comprobante', example: 'EFECTIVO-001' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  referencia?: string;
}

export class ConfirmarPagoBilateralDto {
  @ApiProperty({ description: 'Monto que la parte confirma haber pagado o recibido (Bs.)', example: 50 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El monto reportado debe ser mayor a 0' })
  montoReportado: number;

  @ApiPropertyOptional({ description: 'Referencia opcional de respaldo', example: 'RECIBO-441' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  referencia?: string;
}

export class CancelarServicioDto {
  @ApiProperty({ description: 'Motivo de la cancelación', example: 'Surgió una emergencia familiar' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de cancelación es obligatorio' })
  @MinLength(5, { message: 'Describe el motivo con al menos 5 caracteres' })
  @MaxLength(500)
  motivo: string;
}

export class SolicitarReembolsoDto {
  @ApiProperty({ description: 'Motivo de la solicitud de reembolso del anticipo' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del reembolso es obligatorio' })
  @MinLength(5)
  @MaxLength(500)
  motivo: string;
}

export class ResolverReembolsoDto {
  @ApiProperty({ enum: ['APROBADO', 'RECHAZADO', 'COMPLETADO'] })
  @IsIn(['APROBADO', 'RECHAZADO', 'COMPLETADO'], {
    message: 'El estado debe ser APROBADO, RECHAZADO o COMPLETADO',
  })
  estado: 'APROBADO' | 'RECHAZADO' | 'COMPLETADO';

  @ApiPropertyOptional({ description: 'Observación administrativa de la decisión' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacionAdmin?: string;
}

export class CrearEvaluacionDto {
  @ApiProperty({ description: 'Puntuación del 1 al 5', minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'La puntuación mínima es 1' })
  @Max(5, { message: 'La puntuación máxima es 5' })
  puntuacion: number;

  @ApiPropertyOptional({ description: 'Comentario opcional sobre el servicio' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}

export class CrearReclamoDto {
  @ApiProperty({ description: 'Descripción obligatoria del problema detectado' })
  @IsString()
  @IsNotEmpty({ message: 'La descripción del reclamo es obligatoria' })
  @MinLength(10, { message: 'Describe el reclamo con al menos 10 caracteres' })
  @MaxLength(2000)
  descripcion: string;

  @ApiPropertyOptional({ description: 'URL opcional de fotografía o evidencia' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  evidenciaUrl?: string;
}

export class ResolverReclamoDto {
  @ApiProperty({ enum: ['EN_REVISION', 'RESUELTO', 'RECHAZADO', 'CERRADO'] })
  @IsIn(['EN_REVISION', 'RESUELTO', 'RECHAZADO', 'CERRADO'], {
    message: 'Estado inválido para el reclamo',
  })
  estado: 'EN_REVISION' | 'RESUELTO' | 'RECHAZADO' | 'CERRADO';

  @ApiProperty({ description: 'Resolución administrativa documentada' })
  @IsString()
  @IsNotEmpty({ message: 'La resolución administrativa es obligatoria' })
  @MinLength(5)
  @MaxLength(2000)
  resolucion: string;
}

export class ActualizarComisionCategoriaDto {
  @ApiProperty({
    description: 'Nuevo porcentaje de comisión para la categoría (0% a 100%)',
    minimum: 0,
    maximum: 100,
    example: 7.5,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El porcentaje debe ser un número con máximo 2 decimales' },
  )
  @Min(0, { message: 'El porcentaje de comisión no puede ser negativo' })
  @Max(100, { message: 'El porcentaje de comisión no puede superar el 100%' })
  porcentajeComision: number;
}