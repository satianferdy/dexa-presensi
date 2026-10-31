import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { Employee } from '../../database/entities/employee.entity';
import { User, UserRole } from '../../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListEmployeesDto) {
    const builder = this.employees
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user');
    if (query.search) {
      builder.andWhere(
        '(employee.fullName LIKE :search OR employee.employeeNumber LIKE :search OR user.email LIKE :search)',
        { search: `%${query.search}%` },
      );
    }
    if (query.status)
      builder.andWhere('user.isActive = :active', { active: query.status === 'active' });
    const [items, total] = await builder
      .orderBy(
        query.sortBy === 'employeeNumber' ? 'employee.employeeNumber' : 'employee.fullName',
        query.order === 'DESC' ? 'DESC' : 'ASC',
      )
      .addOrderBy('employee.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items: items.map((employee) => this.serialize(employee)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async get(id: string) {
    return this.serialize(await this.find(id));
  }

  async create(dto: CreateEmployeeDto, actorUserId: string, requestId?: string) {
    const email = dto.email.trim().toLowerCase();
    try {
      const employee = await this.dataSource.transaction(async (manager) => {
        const user = await manager.getRepository(User).save({
          email,
          passwordHash: await argon2.hash(dto.password),
          role: UserRole.EMPLOYEE,
          isActive: true,
        });
        const created = await manager.getRepository(Employee).save({
          userId: user.id,
          employeeNumber: dto.employeeNumber.trim(),
          fullName: dto.fullName.trim(),
          department: dto.department.trim(),
          position: dto.position?.trim() || null,
          phone: dto.phone?.trim() || null,
        });
        await this.audit.record(manager, {
          actorUserId,
          action: 'EMPLOYEE_CREATED',
          entityType: 'EMPLOYEE',
          entityId: created.id,
          requestId,
        });
        return created;
      });
      return this.get(employee.id);
    } catch (error) {
      this.handleDuplicate(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto, actorUserId: string, requestId?: string) {
    await this.find(id);
    try {
      await this.dataSource.transaction(async (manager) => {
        const employee = await manager
          .getRepository(Employee)
          .findOneOrFail({ where: { id }, relations: { user: true } });
        if (dto.email !== undefined) employee.user.email = dto.email.trim().toLowerCase();
        if (dto.employeeNumber !== undefined) employee.employeeNumber = dto.employeeNumber.trim();
        if (dto.fullName !== undefined) employee.fullName = dto.fullName.trim();
        if (dto.department !== undefined) employee.department = dto.department.trim();
        if (dto.position !== undefined) employee.position = dto.position.trim() || null;
        if (dto.phone !== undefined) employee.phone = dto.phone.trim() || null;
        await manager.save(employee.user);
        await manager.save(employee);
        await this.audit.record(manager, {
          actorUserId,
          action: 'EMPLOYEE_UPDATED',
          entityType: 'EMPLOYEE',
          entityId: id,
          metadata: { fields: Object.keys(dto) },
          requestId,
        });
      });
      return this.get(id);
    } catch (error) {
      this.handleDuplicate(error);
      throw error;
    }
  }

  async setStatus(id: string, isActive: boolean, actorUserId: string, requestId?: string) {
    await this.find(id);
    await this.dataSource.transaction(async (manager) => {
      const employee = await manager
        .getRepository(Employee)
        .findOneOrFail({ where: { id }, relations: { user: true } });
      employee.user.isActive = isActive;
      await manager.save(employee.user);
      await this.audit.record(manager, {
        actorUserId,
        action: isActive ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED',
        entityType: 'EMPLOYEE',
        entityId: id,
        requestId,
      });
    });
    return this.get(id);
  }

  private async find(id: string): Promise<Employee> {
    const employee = await this.employees.findOne({ where: { id }, relations: { user: true } });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  private serialize(employee: Employee) {
    return {
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: employee.fullName,
      department: employee.department,
      position: employee.position,
      phone: employee.phone,
      email: employee.user.email,
      isActive: employee.user.isActive,
      createdAt: employee.createdAt,
    };
  }

  private handleDuplicate(error: unknown): void {
    if (!error || typeof error !== 'object') return;
    const wrapped = error as {
      driverError?: { code?: string; sqlMessage?: string };
      code?: string;
      sqlMessage?: string;
    };
    const driver = wrapped.driverError || wrapped;
    if (driver.code !== 'ER_DUP_ENTRY') return;
    const field = driver.sqlMessage?.includes('uq_users_email')
      ? 'email'
      : driver.sqlMessage?.includes('uq_employees_number')
        ? 'employeeNumber'
        : undefined;
    throw new ConflictException({
      message:
        field === 'email'
          ? 'Email is already in use'
          : field === 'employeeNumber'
            ? 'Employee ID is already in use'
            : 'Email or employee ID is already in use',
      field,
    });
  }
}
