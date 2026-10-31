import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import Joi from 'joi';
import { databaseOptions } from './database/data-source';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AppController } from './app.controller';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AccessLogMiddleware } from './common/access-log.middleware';
import { isBusinessTimezone } from './common/business-timezone';
import { HttpExceptionFilter } from './common/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().port().default(3000),
        FRONTEND_ORIGIN: Joi.string().uri().required(),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().default(3306),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        DB_NAME: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN_SECONDS: Joi.number().integer().positive().default(3600),
        BUSINESS_TIMEZONE: Joi.string()
          .custom((value: string, helpers) =>
            isBusinessTimezone(value) ? value : helpers.error('any.invalid'),
          )
          .default('Asia/Jakarta'),
        UPLOAD_DIR: Joi.string().default('storage'),
        MAX_UPLOAD_BYTES: Joi.number().integer().positive().default(5242880),
        SEED_HRD_EMAIL: Joi.string().optional(),
        SEED_HRD_PASSWORD: Joi.string().optional(),
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...databaseOptions,
        host: config.getOrThrow<string>('DB_HOST'),
        port: Number(config.getOrThrow<number>('DB_PORT')),
        username: config.getOrThrow<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD', ''),
        database: config.getOrThrow<string>('DB_NAME'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DashboardModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, AccessLogMiddleware)
      .forRoutes({ path: '{*path}', method: RequestMethod.ALL });
  }
}
