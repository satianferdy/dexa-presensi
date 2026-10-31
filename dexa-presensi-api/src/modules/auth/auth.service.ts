import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.employee', 'employee')
      .where('user.email = :email', { email: dto.email.trim().toLowerCase() })
      .getOne();
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      user: this.summary(user),
    };
  }

  async me(userId: string) {
    const user = await this.users.findOne({
      where: { id: userId, isActive: true },
      relations: { employee: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.summary(user);
  }

  private summary(user: User) {
    return {
      timezone: this.config.get<string>('BUSINESS_TIMEZONE', 'Asia/Jakarta'),
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeNumber: user.employee.employeeNumber,
            fullName: user.employee.fullName,
            department: user.employee.department,
          }
        : null,
    };
  }
}
