import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResponderReprogramacionVisitaDto {
  @IsIn(['ACEPTADA', 'RECHAZADA'])
  decision: 'ACEPTADA' | 'RECHAZADA';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRespuesta?: string;
}
