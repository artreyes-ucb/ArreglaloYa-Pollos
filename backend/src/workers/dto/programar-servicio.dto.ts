
import { IsString, IsUUID, Matches } from 'class-validator';

export class ProgramarServicioDto {
  @IsUUID()
  idSolicitud: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  })
  fechaServicio: string;

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
}

