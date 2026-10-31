import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  HRD_ADMIN = 'HRD_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 255, unique: true }) email!: string;
  @Column({ name: 'password_hash', length: 255, select: false }) passwordHash!: string;
  @Column({ type: 'varchar', length: 20 }) role!: UserRole;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @OneToOne(() => Employee, (employee) => employee.user) employee?: Employee;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 }) updatedAt!: Date;
}
