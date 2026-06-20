import type { Prisma } from "@prisma/client";

export interface AuditEvent {
  userId?: string;
  module: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}
