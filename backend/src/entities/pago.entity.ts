import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudServicio } from './solicitud-servicio.entity';

@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn('uuid', { name: 'id_pago' })
  idPago: string;

  @ManyToOne(() => SolicitudServicio, { nullable: true })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio | null;

  @Column({ name: 'tipo', type: 'varchar', length: 30 })
  tipo: string;

  @Column({
    name: 'monto',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  monto: string;

  @Column({
    name: 'comision_plataforma',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  comisionPlataforma: string;

  @Column({
    name: 'confirmado_cliente',
    type: 'boolean',
    default: false,
  })
  confirmadoCliente: boolean;

  @Column({
    name: 'confirmado_trabajador',
    type: 'boolean',
    default: false,
  })
  confirmadoTrabajador: boolean;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: 'PENDIENTE',
  })
  estado: string;

  @CreateDateColumn({ name: 'fecha_pago', type: 'timestamp' })
  fechaPago: Date;
}
