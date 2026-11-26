import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { VisitaPrevia } from './visita-previa.entity';

@Entity('reprogramaciones_visita')
export class ReprogramacionVisita {
  @PrimaryGeneratedColumn('uuid', { name: 'id_reprogramacion' })
  idReprogramacion: string;

  @ManyToOne(() => VisitaPrevia, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_visita' })
  visita: VisitaPrevia;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_solicitante' })
  usuarioSolicitante: Usuario;

  @Column({ name: 'rol_solicitante', type: 'varchar', length: 20 })
  rolSolicitante: 'CLIENTE' | 'TRABAJADOR';

  @Column({ name: 'fecha_anterior', type: 'date' })
  fechaAnterior: string;

  @Column({ name: 'hora_inicio_anterior', type: 'time' })
  horaInicioAnterior: string;

  @Column({ name: 'hora_fin_anterior', type: 'time', nullable: true })
  horaFinAnterior: string | null;

  @Column({ name: 'fecha_propuesta', type: 'date' })
  fechaPropuesta: string;

  @Column({ name: 'hora_inicio_propuesta', type: 'time' })
  horaInicioPropuesta: string;

  @Column({ name: 'hora_fin_propuesta', type: 'time' })
  horaFinPropuesta: string;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({ name: 'estado', type: 'varchar', length: 20, default: 'PENDIENTE' })
  estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_respuesta' })
  usuarioRespuesta: Usuario | null;

  @Column({ name: 'fecha_respuesta', type: 'timestamp', nullable: true })
  fechaRespuesta: Date | null;

  @Column({ name: 'motivo_respuesta', type: 'text', nullable: true })
  motivoRespuesta: string | null;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion: Date;
}
