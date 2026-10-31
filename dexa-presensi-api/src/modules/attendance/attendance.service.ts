import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, IsNull, LessThan, Repository } from 'typeorm';
import { Employee } from '../../database/entities/employee.entity';
import { Attendance } from '../../database/entities/attendance.entity';
import { AuthUser } from '../../common/auth-user';
import { UserRole } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { FilesService } from '../files/files.service';
import { AttendancePolicyService } from './attendance-policy.service';
import { AttendanceQueryDto } from './dto/attendance-query.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendances: Repository<Attendance>,
    private readonly dataSource: DataSource,
    private readonly policy: AttendancePolicyService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
  ) {}

  async today(user: AuthUser) {
    const employeeId = this.requireEmployee(user);
    const workDate = this.policy.localParts(new Date()).workDate;
    const attendance = await this.attendances.findOne({ where: { employeeId, workDate } });
    const previous = await this.attendances.findOne({
      where: { employeeId, workDate: LessThan(workDate), checkOutAt: IsNull() },
      order: { workDate: 'DESC' },
    });
    return {
      ...(attendance ? this.serialize(attendance) : { status: 'NOT_CHECKED_IN', workDate }),
      previousIncomplete: previous
        ? { id: previous.id, workDate: previous.workDate, checkInAt: previous.checkInAt }
        : null,
    };
  }

  async checkIn(user: AuthUser, file?: Express.Multer.File, note?: string, requestId?: string) {
    const employeeId = this.requireEmployee(user);
    const now = new Date();
    const workDate = this.policy.localParts(now).workDate;
    const existing = await this.attendances.existsBy({ employeeId, workDate });
    if (existing) throw new ConflictException('You have already checked in today');
    const photo = await this.files.save(file);
    try {
      const attendance = await this.dataSource.transaction(async (manager) => {
        const created = await manager.getRepository(Attendance).save({
          employeeId,
          workDate,
          checkInAt: now,
          checkInPhotoKey: photo.key,
          checkInNote: note?.trim() || null,
        });
        await this.audit.record(manager, {
          actorUserId: user.id,
          action: 'ATTENDANCE_CHECKED_IN',
          entityType: 'ATTENDANCE',
          entityId: created.id,
          requestId,
        });
        return created;
      });
      return this.serialize(attendance);
    } catch (error) {
      await this.files.remove(photo.key);
      if (this.isDuplicate(error)) throw new ConflictException('You have already checked in today');
      throw error;
    }
  }

  async checkOut(user: AuthUser, file?: Express.Multer.File, note?: string, requestId?: string) {
    const employeeId = this.requireEmployee(user);
    const now = new Date();
    const workDate = this.policy.localParts(now).workDate;
    const photo = await this.files.save(file);
    try {
      const attendance = await this.dataSource.transaction(async (manager) => {
        const record = await manager
          .getRepository(Attendance)
          .createQueryBuilder('attendance')
          .setLock('pessimistic_write')
          .where('attendance.employeeId = :employeeId AND attendance.workDate = :workDate', {
            employeeId,
            workDate,
          })
          .getOne();
        if (!record) throw new ConflictException('You have not checked in today');
        if (record.checkOutAt) throw new ConflictException('You have already checked out today');
        record.checkOutAt = now;
        record.checkOutPhotoKey = photo.key;
        record.checkOutNote = note?.trim() || null;
        await manager.save(record);
        await this.audit.record(manager, {
          actorUserId: user.id,
          action: 'ATTENDANCE_CHECKED_OUT',
          entityType: 'ATTENDANCE',
          entityId: record.id,
          requestId,
        });
        return record;
      });
      return this.serialize(attendance);
    } catch (error) {
      await this.files.remove(photo.key);
      throw error;
    }
  }

  async mine(user: AuthUser, query: AttendanceQueryDto) {
    return this.listRecords({ ...query, employeeId: this.requireEmployee(user) });
  }

  async list(query: AttendanceQueryDto) {
    return this.listRecords(query);
  }

  async recap(query: AttendanceQueryDto) {
    const businessDate = this.policy.localParts(new Date()).workDate;
    const from = query.dateFrom,
      to = query.dateTo;
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to))
      throw new BadRequestException('Recap requires a start and end date');
    const count = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
    if (!Number.isFinite(count) || count < 1 || count > 62)
      throw new BadRequestException('Recap supports a date range of 1–62 days');
    const builder = this.dataSource
      .getRepository(Employee)
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user');
    if (query.employeeId)
      builder.andWhere('employee.id = :employeeId', { employeeId: query.employeeId });
    if (query.status) {
      const condition =
        query.status === 'COMPLETE'
          ? 'matching.check_out_at IS NOT NULL'
          : `matching.check_out_at IS NULL AND matching.work_date ${query.status === 'INCOMPLETE' ? '<' : '>='} :businessDate`;
      builder.andWhere(
        `EXISTS (SELECT 1 FROM attendances matching WHERE matching.employee_id = employee.id AND matching.work_date BETWEEN :from AND :to AND ${condition})`,
        { from, to, businessDate },
      );
    }
    const [employees, total] = await builder
      .orderBy('employee.fullName', 'ASC')
      .addOrderBy('employee.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    const records = employees.length
      ? await this.attendances.find({
          where: {
            employeeId: In(employees.map((employee) => employee.id)),
            workDate: Between(from, to),
          },
        })
      : [];
    return {
      items: employees.map((employee) => {
        const matching = records.filter(
          (record) =>
            record.employeeId === employee.id &&
            (!query.status ||
              this.policy.status(record.workDate, record.checkOutAt, businessDate) ===
                query.status),
        );
        return {
          id: employee.id,
          fullName: employee.fullName,
          employeeNumber: employee.employeeNumber,
          department: employee.department,
          isActive: employee.user.isActive,
          totalWorkedSeconds: matching.reduce(
            (total, record) =>
              total + (this.policy.workedSeconds(record.checkInAt, record.checkOutAt) ?? 0),
            0,
          ),
          records: matching.map((record) => this.serialize(record, false, businessDate)),
        };
      }),
      total,
      page: query.page,
      limit: query.limit,
      dateFrom: from,
      dateTo: to,
    };
  }

  async get(id: string, user: AuthUser) {
    const record = await this.findAuthorized(id, user);
    return this.serialize(record, true);
  }

  async photoKey(id: string, kind: string, user: AuthUser): Promise<string> {
    if (kind !== 'check-in' && kind !== 'check-out')
      throw new BadRequestException('Invalid photo type');
    const record = await this.findAuthorized(id, user);
    const key = kind === 'check-in' ? record.checkInPhotoKey : record.checkOutPhotoKey;
    if (!key) throw new NotFoundException('Photo not found');
    return key;
  }

  private async listRecords(query: AttendanceQueryDto) {
    const businessDate = this.policy.localParts(new Date()).workDate;
    const builder = this.attendances
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('employee.user', 'user');
    if (query.employeeId)
      builder.andWhere('attendance.employeeId = :employeeId', { employeeId: query.employeeId });
    if (query.dateFrom)
      builder.andWhere('attendance.workDate >= :dateFrom', { dateFrom: query.dateFrom });
    if (query.dateTo) builder.andWhere('attendance.workDate <= :dateTo', { dateTo: query.dateTo });
    if (query.status === 'COMPLETE') builder.andWhere('attendance.checkOutAt IS NOT NULL');
    if (query.status === 'CHECKED_IN')
      builder.andWhere('attendance.checkOutAt IS NULL AND attendance.workDate >= :businessDate', {
        businessDate,
      });
    if (query.status === 'INCOMPLETE')
      builder.andWhere('attendance.checkOutAt IS NULL AND attendance.workDate < :businessDate', {
        businessDate,
      });
    const summary = await builder
      .clone()
      .select(
        'COALESCE(SUM(CASE WHEN attendance.checkOutAt IS NOT NULL THEN GREATEST(0, TIMESTAMPDIFF(SECOND, attendance.checkInAt, attendance.checkOutAt)) ELSE 0 END), 0)',
        'totalWorkedSeconds',
      )
      .addSelect('COALESCE(SUM(attendance.checkOutAt IS NOT NULL), 0)', 'completedRecords')
      .addSelect(
        'COALESCE(SUM(attendance.checkOutAt IS NULL AND attendance.workDate < :businessDate), 0)',
        'incompleteRecords',
      )
      .addSelect(
        'COALESCE(SUM(attendance.checkOutAt IS NULL AND attendance.workDate >= :businessDate), 0)',
        'workingRecords',
      )
      .setParameter('businessDate', businessDate)
      .getRawOne<{
        totalWorkedSeconds: string;
        completedRecords: string;
        incompleteRecords: string;
        workingRecords: string;
      }>();
    const [items, total] = await builder
      .orderBy('attendance.workDate', 'DESC')
      .addOrderBy('attendance.checkInAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items: items.map((record) => this.serialize(record, true, businessDate)),
      total,
      page: query.page,
      limit: query.limit,
      summary: {
        totalWorkedSeconds: Number(summary?.totalWorkedSeconds ?? 0),
        completedRecords: Number(summary?.completedRecords ?? 0),
        incompleteRecords: Number(summary?.incompleteRecords ?? 0),
        workingRecords: Number(summary?.workingRecords ?? 0),
      },
    };
  }

  private async findAuthorized(id: string, user: AuthUser): Promise<Attendance> {
    const record = await this.attendances.findOne({ where: { id }, relations: { employee: true } });
    if (!record) throw new NotFoundException('Attendance record not found');
    if (user.role !== UserRole.HRD_ADMIN && record.employeeId !== user.employeeId)
      throw new ForbiddenException();
    return record;
  }

  private requireEmployee(user: AuthUser): string {
    if (user.role !== UserRole.EMPLOYEE || !user.employeeId)
      throw new ForbiddenException('Employee access required');
    return user.employeeId;
  }

  private serialize(
    record: Attendance,
    includeEmployee = false,
    businessDate = this.policy.localParts(new Date()).workDate,
  ) {
    return {
      id: record.id,
      employeeId: record.employeeId,
      ...(includeEmployee && record.employee
        ? {
            employee: {
              id: record.employee.id,
              employeeNumber: record.employee.employeeNumber,
              fullName: record.employee.fullName,
              department: record.employee.department,
            },
          }
        : {}),
      workDate: record.workDate,
      status: this.policy.status(record.workDate, record.checkOutAt, businessDate),
      checkInAt: record.checkInAt,
      checkOutAt: record.checkOutAt,
      workedSeconds: this.policy.workedSeconds(record.checkInAt, record.checkOutAt),
      checkInNote: record.checkInNote,
      checkOutNote: record.checkOutNote,
      isLate: this.policy.isLate(record.checkInAt),
      isEarlyCheckout: record.checkOutAt ? this.policy.isEarlyCheckout(record.checkOutAt) : null,
      checkInPhotoUrl: `/api/files/attendance/${record.id}/check-in`,
      checkOutPhotoUrl: record.checkOutAt ? `/api/files/attendance/${record.id}/check-out` : null,
    };
  }

  private isDuplicate(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) return false;
    return (error as { driverError?: { code?: string } }).driverError?.code === 'ER_DUP_ENTRY';
  }
}
