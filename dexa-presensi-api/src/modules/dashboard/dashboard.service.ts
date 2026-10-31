import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { Employee } from '../../database/entities/employee.entity';
import { Attendance } from '../../database/entities/attendance.entity';
import { AttendancePolicyService } from '../attendance/attendance-policy.service';
import { SummaryQueryDto } from './dto/summary-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly db: DataSource,
    private readonly policy: AttendancePolicyService,
  ) {}
  async summary(query: SummaryQueryDto) {
    const businessDate = this.policy.localParts(new Date()).workDate;
    const to = query.dateTo || businessDate;
    const end = Date.parse(`${to}T00:00:00Z`);
    const from = query.dateFrom || new Date(end - 6 * 86400000).toISOString().slice(0, 10);
    const days = (end - Date.parse(`${from}T00:00:00Z`)) / 86400000 + 1;
    if (!Number.isFinite(days) || days < 1 || days > 31)
      throw new BadRequestException('Date range must be between 1 and 31 days');
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const employeeRows = await manager
        .getRepository(Employee)
        .createQueryBuilder('employee')
        .innerJoin(User, 'user', 'user.id = employee.userId')
        .select('COUNT(*)', 'total')
        .addSelect('COALESCE(SUM(user.isActive = 1), 0)', 'active')
        .getRawOne();
      const attendanceRows = await manager
        .getRepository(Attendance)
        .createQueryBuilder('attendance')
        .select("DATE_FORMAT(attendance.workDate, '%Y-%m-%d')", 'day')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(attendance.checkOutAt IS NOT NULL)', 'completed')
        .where(
          '(attendance.workDate BETWEEN :from AND :to) OR attendance.workDate = :businessDate',
          { from, to, businessDate },
        )
        .groupBy('attendance.workDate')
        .getRawMany<{ day: string; total: string; completed: string }>();
      const values = new Map(
        attendanceRows.map((row) => [
          row.day,
          { total: Number(row.total), completed: Number(row.completed) },
        ]),
      );
      const trend = Array.from({ length: days }, (_, index) => {
        const day = new Date(Date.parse(`${from}T00:00:00Z`) + index * 86400000)
          .toISOString()
          .slice(0, 10);
        return { day, ...(values.get(day) || { total: 0, completed: 0 }) };
      });
      const total = Number(employeeRows.total),
        active = Number(employeeRows.active);
      return {
        businessDate,
        timezone: this.policy.timezone,
        dateFrom: from,
        dateTo: to,
        employees: { total, active, inactive: total - active },
        today: values.get(businessDate) || { total: 0, completed: 0 },
        trend,
      };
    });
  }
}
