import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../../database/entities/attendance.entity';
import { AuditModule } from '../audit/audit.module';
import { FilesModule } from '../files/files.module';
import { FilesController } from '../files/files.controller';
import { RolesGuard } from '../../common/roles.guard';
import { AttendancePolicyService } from './attendance-policy.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance]), AuditModule, FilesModule],
  controllers: [AttendanceController, FilesController],
  providers: [AttendanceService, AttendancePolicyService, RolesGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}
