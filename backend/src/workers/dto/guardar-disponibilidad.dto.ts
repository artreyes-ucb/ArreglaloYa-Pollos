import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class GuardarDisponibilidadDto {
  @IsInt()
  @Min(1)
  @Max(7)
  diaSemana: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de inicio debe tener formato HH:mm',
  })
  horaInicio: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora de fin debe tener formato HH:mm',
  })
  horaFin: string;

  @IsOptional()
  @IsBoolean()
  disponible?: boolean;
}
