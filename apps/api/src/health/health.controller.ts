import { Controller, Get } from "@nestjs/common";
import type { ApiHealthResponse } from "@mms/shared";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): Promise<ApiHealthResponse> {
    return this.healthService.check();
  }
}
