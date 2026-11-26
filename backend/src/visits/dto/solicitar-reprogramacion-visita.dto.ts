import { IsDateString, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class SolicitarReprogramacionVisitaDto {
  @IsDateString()
  fechaPropuesta: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'horaInicioPropuesta debe tener formato HH:mm' })
  horaInicioPropuesta: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: 'horaFinPropuesta debe tener formato HH:mm' })
  horaFinPropuesta: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo: string;
}
