import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ValidarPerfilTrabajadorDto {
  @IsIn(['APROBADO', 'RECHAZADO'], {
    message: 'La decisión debe ser APROBADO o RECHAZADO',
  })
  estado: 'APROBADO' | 'RECHAZADO';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacion?: string;
}
