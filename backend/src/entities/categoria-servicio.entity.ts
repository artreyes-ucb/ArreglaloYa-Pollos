import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorias_servicio')
export class CategoriaServicio {
  @PrimaryGeneratedColumn('increment', { name: 'id_categoria' })
  idCategoria: number;

  @Column({ name: 'nombre', type: 'varchar', length: 80, unique: true })
  nombre: string;

  @Column({ name: 'descripcion', type: 'text', nullable: true })
  descripcion: string | null;
}
