import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cotizacion } from './cotizacion.entity';
import { Usuario } from './usuario.entity';

@Entity('incrementos_cotizacion')
export class IncrementoCotizacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id_incremento' })
  idIncremento: string;

  @ManyToOne(() => Cotizacion, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_cotizacion' })
  cotizacion: Cotizacion;

  @Column({ name: 'motivo', type: 'text' })
  motivo: string;

  @Column({
    name: 'precio_anterior',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  precioAnterior: string;

  @Column({
    name: 'monto_incremento',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  montoIncremento: string;

  @Column({
    name: 'precio_nuevo',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  precioNuevo: string;

  @Column({
    name: 'conceptos_adicionales',
    type: 'jsonb',
    nullable: true,
  })
  conceptosAdicionales: Record<string, unknown> | null;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: 'PENDIENTE',
  })
  estado: string;

  @CreateDateColumn({
    name: 'fecha_solicitud',
    type: 'timestamp',
  })
  fechaSolicitud: Date;

  @Column({
    name: 'fecha_respuesta',
    type: 'timestamp',
    nullable: true,
  })
  fechaRespuesta: Date | null;

  @ManyToOne(() => Usuario, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_usuario_decision' })
  usuarioDecision: Usuario | null;
}