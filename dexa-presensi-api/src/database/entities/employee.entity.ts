import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Attendance } from './attendance.entity';

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', unique: true }) userId!: string;
  @OneToOne(() => User, (user) => user.employee) @JoinColumn({ name: 'user_id' }) user!: User;
  @Column({ name: 'employee_number', length: 50, unique: true }) employeeNumber!: string;
  @Column({ name: 'full_name', length: 150 }) fullName!: string;
  @Column({ length: 100 }) department!: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) position!: string | null;
  @Column({ type: 'varchar', length: 30, nullable: true }) phone!: string | null;
  @OneToMany(() => Attendance, (attendance) => attendance.employee) attendances?: Attendance[];
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 }) updatedAt!: Date;
}
