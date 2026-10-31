import { ApiErrors } from '../../common/api-errors.decorator';
import {
  AttendanceResponseDto,
  AttendancePageDto,
  AttendanceRecapDto,
  TodayAttendanceDto,
  NotCheckedInDto,
} from '../../common/responses.dto';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
  ApiExtraModels,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthUser } from '../../common/auth-user';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { UserRole } from '../../database/entities/user.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceActionDto } from './dto/attendance-action.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';

@ApiErrors(400, 401, 403, 429, 500)
@ApiExtraModels(TodayAttendanceDto, NotCheckedInDto)
@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @ApiOperation({ summary: 'Get today-s attendance and the latest previous incomplete record' })
  @ApiOkResponse({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(TodayAttendanceDto) },
        { $ref: getSchemaPath(NotCheckedInDto) },
      ],
    },
  })
  @Get('today')
  @Roles(UserRole.EMPLOYEE)
  today(@CurrentUser() user: AuthUser) {
    return this.attendance.today(user);
  }

  @ApiOperation({ summary: 'Check in once for the current business date' })
  @ApiCreatedResponse({ type: AttendanceResponseDto })
  @ApiErrors(409, 413)
  @Post('check-in')
  @Roles(UserRole.EMPLOYEE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: {
        photo: { type: 'string', format: 'binary' },
        note: { type: 'string', maxLength: 500 },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  checkIn(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AttendanceActionDto,
    @Req() request: Request,
  ) {
    return this.attendance.checkIn(user, file, dto.note, request.id);
  }

  @ApiOperation({
    summary: 'Check out after today-s check-in; overnight checkout is not supported',
  })
  @ApiCreatedResponse({ type: AttendanceResponseDto })
  @ApiErrors(409, 413)
  @Post('check-out')
  @Roles(UserRole.EMPLOYEE)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['photo'],
      properties: {
        photo: { type: 'string', format: 'binary' },
        note: { type: 'string', maxLength: 500 },
      },
    },
  })
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 5 * 1024 * 1024 } }))
  checkOut(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AttendanceActionDto,
    @Req() request: Request,
  ) {
    return this.attendance.checkOut(user, file, dto.note, request.id);
  }

  @ApiOperation({ summary: 'List your own attendance with pagination and date filters' })
  @ApiOkResponse({ type: AttendancePageDto })
  @Get('me')
  @Roles(UserRole.EMPLOYEE)
  mine(@CurrentUser() user: AuthUser, @Query() query: AttendanceQueryDto) {
    return this.attendance.mine(user, query);
  }

  @ApiOperation({ summary: 'List employee attendance; HR admin only' })
  @ApiOkResponse({ type: AttendancePageDto })
  @Get()
  @Roles(UserRole.HRD_ADMIN)
  list(@Query() query: AttendanceQueryDto) {
    return this.attendance.list(query);
  }

  @ApiOperation({ summary: 'Get employee/date recap; both dates required, maximum 62 days' })
  @ApiOkResponse({ type: AttendanceRecapDto })
  @ApiQuery({
    name: 'dateFrom',
    required: true,
    type: String,
    format: 'date',
    description: 'Inclusive start date, YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'dateTo',
    required: true,
    type: String,
    format: 'date',
    description: 'Inclusive end date; ordered range of 1-62 days',
  })
  @Get('recap')
  @Roles(UserRole.HRD_ADMIN)
  recap(@Query() query: AttendanceQueryDto) {
    return this.attendance.recap(query);
  }

  @ApiOperation({ summary: 'Get attendance details; HR admin or record owner' })
  @ApiOkResponse({ type: AttendanceResponseDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Attendance UUID v4' })
  @ApiErrors(404)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: AuthUser) {
    return this.attendance.get(id, user);
  }
}
