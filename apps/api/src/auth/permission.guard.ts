import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY, type RequiredPermission } from "./permissions.decorator";
import type { AuthenticatedUser } from "./auth.types";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RequiredPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("You do not have permission to access this resource.");
    }

    if (user.roles.includes("super-admin")) {
      return true;
    }

    const hasPermission = required.every((permission) =>
      user.permissions.includes(`${permission.module}:${permission.action}`)
    );

    if (!hasPermission) {
      throw new ForbiddenException("You do not have permission to access this resource.");
    }

    return true;
  }
}
