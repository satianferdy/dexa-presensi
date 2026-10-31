import { ApiErrors } from '../../common/api-errors.decorator';
import { Controller, Get, Param, ParseUUIDPipe, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiOkResponse, ApiParam } from '@nestjs/swagger';
import { Response } from 'express';
import { CurrentUser } from '../../common/current-user.decorator';
import { AuthUser } from '../../common/auth-user';
import { AttendanceService } from '../attendance/attendance.service';
import { FilesService } from './files.service';

@ApiErrors(400, 401, 403, 404, 429, 500)
@ApiTags('files')
@ApiBearerAuth()
@Controller('files')
@UseGuards(AuthGuard('jwt'))
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly attendance: AttendanceService,
  ) {}
  @ApiOperation({
    summary: 'Download a private attendance proof photo',
    description:
      'Requires bearer authentication and HR access or record ownership. Cache-Control: private, no-store.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Attendance UUID v4' })
  @ApiParam({ name: 'kind', enum: ['check-in', 'check-out'] })
  @ApiOkResponse({
    content: {
      'image/jpeg': { schema: { type: 'string', format: 'binary' } },
      'image/png': { schema: { type: 'string', format: 'binary' } },
      'image/webp': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @Get('attendance/:id/:kind')
  async photo(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('kind') kind: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const key = await this.attendance.photoKey(id, kind, user);
    const photo = await this.files.read(key);
    response.setHeader('Content-Type', photo.mimeType);
    response.setHeader('Cache-Control', 'private, no-store');
    response.send(photo.buffer);
  }
}
