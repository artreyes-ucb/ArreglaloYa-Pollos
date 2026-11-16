import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CategoriaServicio } from './categoria-servicio.entity';
import { PerfilTrabajador } from './perfil-trabajador.entity';

@Entity('servicios_trabajador')
@Unique('uq_servicio_trabajador_nombre', ['perfil', 'categoria', 'nombreServicio'])
export class ServicioTrabajador {
  @PrimaryGeneratedColumn('uuid', { name: 'id_servicio_trabajador' })
  idServicioTrabajador: string;

  @ManyToOne(() => PerfilTrabajador, (perfil) => perfil.servicios, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_perfil' })
  perfil: PerfilTrabajador;

  @ManyToOne(() => CategoriaServicio, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_categoria' })
  categoria: CategoriaServicio;

  @Column({ name: 'nombre_servicio', type: 'varchar', length: 100 })
  nombreServicio: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ name: 'precio_estimado', type: 'numeric', precision: 10, scale: 2 })
  precioEstimado: string;
}
