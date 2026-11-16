import { Type, Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ServicioTrabajadorDto } from './servicio-trabajador.dto';

export class UpdatePerfilTrabajadorDto {
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(5000, { message: 'La descripción no puede superar 5000 caracteres' })
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Los años de experiencia deben ser un número entero' })
  @Min(0, { message: 'Los años de experiencia no pueden ser negativos' })
  @Max(80, { message: 'Los años de experiencia no pueden superar 80' })
  anosExperiencia?: number;

  // Se acepta aquí únicamente porque este endpoint modifica el perfil propio.
  // Nunca se incluirá este dato en la respuesta pública.
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Los datos bancarios deben ser texto' })
  @MaxLength(200, { message: 'Los datos bancarios no pueden superar 200 caracteres' })
  datosBancarios?: string;

  // Si se envía, reemplaza la lista completa de servicios ofrecidos.
  @IsOptional()
  @IsArray({ message: 'Los servicios deben enviarse como una lista' })
  @ValidateNested({ each: true })
  @Type(() => ServicioTrabajadorDto)
  servicios?: ServicioTrabajadorDto[];

  // Si se envía, reemplaza las zonas de cobertura actuales.
  @IsOptional()
  @IsArray({ message: 'Las zonas deben enviarse como una lista' })
  @ArrayUnique({ message: 'No se permiten zonas repetidas' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Cada zona debe tener un identificador entero' })
  @Min(1, { each: true, message: 'Cada zona debe tener un identificador válido' })
  zonasIds?: number[];
}
