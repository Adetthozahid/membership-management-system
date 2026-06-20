export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  typ: "refresh";
}

export interface AuthRequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}
