import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

@Injectable()
export class AuditService {
  async record(
    manager: EntityManager,
    event: {
      actorUserId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, unknown>;
      requestId?: string;
    },
  ): Promise<void> {
    await manager.getRepository(AuditLog).save({
      actorUserId: event.actorUserId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadataJson: event.metadata ?? null,
      requestId: event.requestId ?? null,
    });
  }
}
