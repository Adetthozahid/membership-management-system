import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "required_permissions";

export interface RequiredPermission {
  module: string;
  action: string;
}

export function RequirePermission(module: string, action: string) {
  return SetMetadata(PERMISSIONS_KEY, [{ module, action }] satisfies RequiredPermission[]);
}
