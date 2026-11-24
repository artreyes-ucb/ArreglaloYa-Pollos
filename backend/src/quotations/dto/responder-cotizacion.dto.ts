import { IsIn } from 'class-validator';

export class ResponderCotizacionDto {
  @IsIn(['ACEPTADA', 'RECHAZADA'])
  decision: 'ACEPTADA' | 'RECHAZADA';
}