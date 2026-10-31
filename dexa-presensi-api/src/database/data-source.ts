import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Employee } from './entities/employee.entity';
import { Attendance } from './entities/attendance.entity';
import { AuditLog } from './entities/audit-log.entity';

export const databaseOptions = {
  type: 'mysql' as const,
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dexa_presensi',
  timezone: 'Z',
  entities: [User, Employee, Attendance, AuditLog],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false as const,
};

export default new DataSource(databaseOptions);
