import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PerfilTrabajador } from './perfil-trabajador.entity';

@Entity('disponibilidad_trabajador')
export class DisponibilidadTrabajador {
  @PrimaryGeneratedColumn('uuid', { name: 'id_disponibilidad' })
  idDisponibilidad: string;

  @ManyToOne(() => PerfilTrabajador, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_perfil' })
  perfil: PerfilTrabajador;

  @Column({ name: 'dia_semana', type: 'smallint' })
  diaSemana: number;

  @Column({ name: 'hora_inicio', type: 'time' })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time' })
  horaFin: string;

  @Column({ name: 'disponible', type: 'boolean', default: true })
  disponible: boolean;
}
