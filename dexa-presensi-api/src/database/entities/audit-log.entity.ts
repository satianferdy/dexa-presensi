import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'actor_user_id', type: 'varchar', length: 36, nullable: true }) actorUserId!:
    string | null;
  @Column({ length: 60 }) action!: string;
  @Column({ name: 'entity_type', length: 40 }) entityType!: string;
  @Column({ name: 'entity_id' }) entityId!: string;
  @Column({ name: 'metadata_json', type: 'json', nullable: true }) metadataJson!: Record<
    string,
    unknown
  > | null;
  @Column({ name: 'request_id', type: 'varchar', length: 80, nullable: true }) requestId!:
    string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 }) createdAt!: Date;
}
