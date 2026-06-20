import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { AccessTokenPayload, AuthenticatedUser } from "./auth.types";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authentication is required.");
    }

    const token = authHeader.slice("Bearer ".length);
    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET", "local-access-secret-change-me")
      });
      request.user = {
        id: payload.sub,
        email: payload.email,
        fullName: "",
        mustChangePassword: payload.mustChangePassword ?? false,
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? []
      };
      return true;
    } catch {
      throw new UnauthorizedException("Authentication is required.");
    }
  }
}
