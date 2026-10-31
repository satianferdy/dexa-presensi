import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from './responses.dto';

export function ApiErrors(...statuses: number[]) {
  const descriptions: Record<number, string> = {
    400: 'Invalid request fields, UUID, or date range',
    401: 'Invalid credentials, expired token, or inactive account',
    403: 'Role or record ownership does not allow this action',
    404: 'Requested record or photo was not found',
    409: 'Duplicate employee details or invalid attendance transition',
    413: 'Uploaded photo exceeds the multipart size limit',
    429: 'Request rate limit exceeded',
    500: 'Unexpected server error; use requestId to trace the failure',
  };
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: descriptions[status],
        type: ErrorResponseDto,
        headers: {
          'X-Request-Id': {
            description: 'Request correlation ID',
            schema: { type: 'string', format: 'uuid' },
          },
        },
      }),
    ),
  );
}
