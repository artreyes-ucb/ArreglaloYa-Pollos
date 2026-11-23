import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServicioProgramado } from './servicio-programado.entity';

@Entity('comisiones')
export class Comision {
  @PrimaryGeneratedColumn('uuid', { name: 'id_comision' })
  idComision: string;

  @Column({ name: 'id_programacion', type: 'uuid', unique: true })
  idProgramacion: string;

  @OneToOne(() => ServicioProgramado, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_programacion' })
  programacion: ServicioProgramado;

  @Column({ name: 'precio_final', type: 'numeric', precision: 10, scale: 2 })
  precioFinal: string;

  @Column({ name: 'porcentaje', type: 'numeric', precision: 5, scale: 2, default: 5.0 })
  porcentaje: string;

  @Column({ name: 'monto_comision', type: 'numeric', precision: 10, scale: 2 })
  montoComision: string;

  @Column({ name: 'monto_neto_trabajador', type: 'numeric', precision: 10, scale: 2 })
  montoNetoTrabajador: string;

  @Column({ name: 'estado', type: 'varchar', length: 30, default: 'REGISTRADA' })
  estado: 'REGISTRADA' | 'LIQUIDADA';

  @CreateDateColumn({ name: 'fecha_registro', type: 'timestamp' })
  fechaRegistro: Date;
}