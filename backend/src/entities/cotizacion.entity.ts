import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SolicitudServicio } from './solicitud-servicio.entity';
import { PerfilTrabajador } from './perfil-trabajador.entity';
import { Usuario } from './usuario.entity';

@Entity('cotizaciones')
export class Cotizacion {
  @PrimaryGeneratedColumn('uuid', { name: 'id_cotizacion' })
  idCotizacion: string;

  @ManyToOne(() => SolicitudServicio, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_solicitud' })
  solicitud: SolicitudServicio;

  @ManyToOne(() => PerfilTrabajador, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_perfil' })
  perfil: PerfilTrabajador;

  @Column({
    name: 'precio_mano_obra',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  precioManoObra: string;

  @Column({
    name: 'precio_materiales',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  precioMateriales: string;

  @Column({
    name: 'precio_total',
    type: 'numeric',
    precision: 10,
    scale: 2,
  })
  precioTotal: string;

  @Column({ name: 'alcance', type: 'text' })
  alcance: string;

  @Column({ name: 'condiciones', type: 'text', nullable: true })
  condiciones: string | null;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 30,
    default: 'ENVIADA',
  })
  estado: string;

  @CreateDateColumn({ name: 'fecha_envio', type: 'timestamp' })
  fechaEnvio: Date;

  @Column({ name: 'fecha_respuesta', type: 'timestamp', nullable: true })
  fechaRespuesta: Date | null;

  @Column({ name: 'fecha_vencimiento', type: 'timestamp', nullable: true })
  fechaVencimiento: Date | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario_decision' })
  usuarioDecision: Usuario | null;
}