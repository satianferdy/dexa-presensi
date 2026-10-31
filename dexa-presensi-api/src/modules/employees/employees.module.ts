import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { AuditModule } from '../audit/audit.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { RolesGuard } from '../../common/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Employee]), AuditModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, RolesGuard],
})
export class EmployeesModule {}
