import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('preferencias_notificacion')
export class PreferenciaNotificacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id_preferencia' })
  idPreferencia: string;

  @OneToOne(() => Usuario, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'notif_solicitudes', type: 'boolean', default: true })
  notifSolicitudes: boolean;

  @Column({ name: 'notif_cotizaciones', type: 'boolean', default: true })
  notifCotizaciones: boolean;

  @Column({ name: 'notif_servicios', type: 'boolean', default: true })
  notifServicios: boolean;

  @Column({ name: 'notif_pagos', type: 'boolean', default: true })
  notifPagos: boolean;

  @Column({ name: 'notif_reclamos', type: 'boolean', default: true })
  notifReclamos: boolean;

  @Column({ name: 'notif_sistema', type: 'boolean', default: true })
  notifSistema: boolean;

  @CreateDateColumn({ name: 'fecha_creacion', type: 'timestamp' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'timestamp' })
  fechaActualizacion: Date;
}
