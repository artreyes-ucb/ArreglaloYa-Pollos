import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServicioProgramado } from './servicio-programado.entity';
import { Usuario } from './usuario.entity';

@Entity('evaluaciones')
export class Evaluacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id_evaluacion' })
  idEvaluacion: string;

  @Column({ name: 'id_programacion', type: 'uuid', unique: true })
  idProgramacion: string;

  @OneToOne(() => ServicioProgramado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_programacion' })
  programacion: ServicioProgramado;

  @Column({ name: 'id_cliente', type: 'uuid' })
  idCliente: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_cliente' })
  cliente: Usuario;

  @Column({ name: 'id_trabajador', type: 'uuid' })
  idTrabajador: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'id_trabajador' })
  trabajador: Usuario;

  @Column({ name: 'puntuacion', type: 'smallint' })
  puntuacion: number;

  @Column({ name: 'comentario', type: 'text', nullable: true })
  comentario: string | null;

  @CreateDateColumn({ name: 'fecha_evaluacion', type: 'timestamp' })
  fechaEvaluacion: Date;
}