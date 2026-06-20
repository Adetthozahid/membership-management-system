import { Injectable } from "@nestjs/common";
import { APP_NAME, type ApiHealthResponse } from "@mms/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<ApiHealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString(),
      service: APP_NAME
    };
  }
}
