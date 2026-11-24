import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CrearVisitaPreviaDto {
  @IsUUID()
  idSolicitud: string;

  @IsOptional()
  @IsUUID()
  idPerfil?: string;

  @IsDateString()
  fechaPropuesta: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'horaPropuesta debe tener formato HH:mm' })
  horaPropuesta: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  resultado?: string;
}
