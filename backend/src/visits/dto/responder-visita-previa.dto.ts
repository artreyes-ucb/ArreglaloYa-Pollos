import { IsDateString, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResponderVisitaPreviaDto {
  @IsIn(['ACEPTADA', 'RECHAZADA', 'CANCELADA', 'REALIZADA', 'NO_REALIZADA'])
  estado: 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA' | 'REALIZADA' | 'NO_REALIZADA';

  @IsOptional()
  @IsDateString()
  fechaConfirmada?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'horaConfirmada debe tener formato HH:mm' })
  horaConfirmada?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  resultado?: string;
}
