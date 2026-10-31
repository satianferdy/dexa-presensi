import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

@Entity('attendances')
@Unique('uq_attendance_employee_date', ['employeeId', 'workDate'])
@Index('idx_attendance_date_employee', ['workDate', 'employeeId'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'employee_id' }) employeeId!: string;
  @ManyToOne(() => Employee, (employee) => employee.attendances)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;
  @Column({ name: 'work_date', type: 'date' }) workDate!: string;
  @Column({ name: 'check_in_at', type: 'datetime', precision: 3 }) checkInAt!: Date;
  @Column({ name: 'check_in_photo_key', length: 500 }) checkInPhotoKey!: string;
  @Column({ name: 'check_in_note', type: 'varchar', length: 500, nullable: true }) checkInNote!:
    string | null;
  @Column({ name: 'check_out_at', type: 'datetime', precision: 3, nullable: true })
  checkOutAt!: Date | null;
  @Column({ name: 'check_out_photo_key', type: 'varchar', length: 500, nullable: true })
  checkOutPhotoKey!: string | null;
  @Column({ name: 'check_out_note', type: 'varchar', length: 500, nullable: true }) checkOutNote!:
    string | null;
  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 3 }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 3 }) updatedAt!: Date;
}
