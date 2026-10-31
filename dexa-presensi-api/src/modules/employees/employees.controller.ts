import { ApiErrors } from '../../common/api-errors.decorator';
import { EmployeePageDto, EmployeeResponseDto } from '../../common/responses.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthUser } from '../../common/auth-user';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { UserRole } from '../../database/entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto, UpdateEmployeeStatusDto } from './dto/update-employee.dto';
import { ListEmployeesDto } from './dto/list-employees.dto';
import { EmployeesService } from './employees.service';

@ApiErrors(400, 401, 403, 429, 500)
@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.HRD_ADMIN)
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}
  @ApiOperation({ summary: 'List employees with search, status, sorting, and pagination' })
  @ApiOkResponse({ type: EmployeePageDto })
  @Get()
  list(@Query() query: ListEmployeesDto) {
    return this.employees.list(query);
  }
  @ApiOperation({ summary: 'Create an employee and login account' })
  @ApiCreatedResponse({ type: EmployeeResponseDto })
  @ApiErrors(409)
  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() actor: AuthUser, @Req() request: Request) {
    return this.employees.create(dto, actor.id, request.id);
  }
  @ApiOperation({ summary: 'Get an employee' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Employee UUID v4' })
  @ApiErrors(404)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.employees.get(id);
  }
  @ApiOperation({
    summary: 'Update employee fields; omitted fields are preserved and null is rejected',
  })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Employee UUID v4' })
  @ApiErrors(404)
  @ApiErrors(409)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.employees.update(id, dto, actor.id, request.id);
  }
  @ApiOperation({ summary: 'Activate or deactivate an employee account' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Employee UUID v4' })
  @ApiErrors(404)
  @Patch(':id/status')
  status(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.employees.setStatus(id, dto.isActive, actor.id, request.id);
  }
  @ApiOperation({ summary: 'Deactivate an employee without deleting attendance history' })
  @ApiOkResponse({ type: EmployeeResponseDto })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Employee UUID v4' })
  @ApiErrors(404)
  @Delete(':id')
  deactivate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.employees.setStatus(id, false, actor.id, request.id);
  }
}
