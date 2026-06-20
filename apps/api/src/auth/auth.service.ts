import { randomUUID, createHash } from "node:crypto";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AccessTokenPayload, AuthRequestMetadata, AuthenticatedUser, RefreshTokenPayload } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService
  ) {}

  async loginAdmin(email: string, password: string, metadata: AuthRequestMetadata) {
    const user = await this.validateUser(email, password, metadata, "admin_login_failed");
    const profile = await this.getAuthProfile(user.id);

    if (!profile.permissions.includes("admin:access") && !profile.roles.includes("super-admin")) {
      await this.audit.log({
        userId: user.id,
        module: "auth",
        action: "admin_login_denied",
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await this.audit.log({
      userId: user.id,
      module: "auth",
      action: "admin_login_success",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    return this.issueTokens(profile, metadata);
  }

  async loginMember(email: string, password: string, metadata: AuthRequestMetadata) {
    const user = await this.validateUser(email, password, metadata, "member_login_failed");
    const profile = await this.getAuthProfile(user.id);

    if (!profile.permissions.includes("member:access")) {
      await this.audit.log({
        userId: user.id,
        module: "auth",
        action: "member_login_denied",
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    await this.audit.log({
      userId: user.id,
      module: "auth",
      action: "member_login_success",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    return this.issueTokens(profile, metadata);
  }

  async refresh(refreshToken: string | undefined, metadata: AuthRequestMetadata) {
    if (!refreshToken) {
      throw new UnauthorizedException("Refresh token is required.");
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const tokenHash = this.hashToken(refreshToken);
    const session = await this.prisma.refreshTokenSession.findUnique({
      where: { id: payload.sid }
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.tokenHash !== tokenHash ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException("Session has expired. Please login again.");
    }

    const profile = await this.getAuthProfile(payload.sub);
    const issued = await this.issueTokens(profile, metadata, session.id);

    await this.audit.log({
      userId: payload.sub,
      module: "auth",
      action: "refresh_token_rotated",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    return issued;
  }

  async logout(refreshToken: string | undefined, userId: string | undefined, metadata: AuthRequestMetadata) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshTokenSession.updateMany({
        where: {
          tokenHash,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    await this.audit.log({
      userId,
      module: "auth",
      action: "logout",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });
  }

  async getAuthProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user?.isActive) {
      throw new UnauthorizedException("Account is not active.");
    }

    const roles = user.roles.map((assignment) => assignment.role.slug);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((assignment) =>
          assignment.role.permissions.map((grant) => `${grant.permission.module}:${grant.permission.action}`)
        )
      )
    );

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      mustChangePassword: user.mustChangePassword,
      roles,
      permissions
    };
  }

  async changePassword(user: AuthenticatedUser, currentPassword: string, newPassword: string, metadata: AuthRequestMetadata) {
    if (currentPassword === newPassword) {
      throw new BadRequestException("New password must be different from the current password.");
    }

    const account = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!account?.isActive) {
      throw new UnauthorizedException("Account is not active.");
    }

    const passwordMatches = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!passwordMatches) {
      await this.audit.log({
        userId: user.id,
        module: "auth",
        action: "password_change_failed",
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: { reason: "password_mismatch" }
      });
      throw new BadRequestException("Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });

    await this.audit.log({
      userId: user.id,
      module: "auth",
      action: "password_changed",
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    });

    return { success: true };
  }

  private async validateUser(
    email: string,
    password: string,
    metadata: AuthRequestMetadata,
    failureAction: string
  ): Promise<User> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user?.isActive) {
      await this.audit.log({
        module: "auth",
        action: failureAction,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: { email: normalizedEmail, reason: "not_found_or_inactive" }
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await this.audit.log({
        userId: user.id,
        module: "auth",
        action: failureAction,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: { reason: "password_mismatch" }
      });
      throw new UnauthorizedException("Invalid email or password.");
    }

    return user;
  }

  private async issueTokens(profile: AuthenticatedUser, metadata: AuthRequestMetadata, previousSessionId?: string) {
    const accessPayload: AccessTokenPayload = {
      sub: profile.id,
      email: profile.email,
      mustChangePassword: profile.mustChangePassword,
      roles: profile.roles,
      permissions: profile.permissions
    };
    const accessTtlSeconds = Number(this.config.get<string | number>("JWT_ACCESS_TTL_SECONDS", 900));
    const refreshTtlDays = Number(this.config.get<string | number>("JWT_REFRESH_TTL_DAYS", 30));
    const sessionId = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: profile.id,
      sid: sessionId,
      typ: "refresh"
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.config.get<string>("JWT_ACCESS_SECRET", "local-access-secret-change-me"),
        expiresIn: accessTtlSeconds
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET", "local-refresh-secret-change-me"),
        expiresIn: `${refreshTtlDays}d`
      })
    ]);

    const expiresAt = new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      ...(previousSessionId
        ? [
            this.prisma.refreshTokenSession.update({
              where: { id: previousSessionId },
              data: {
                revokedAt: new Date(),
                replacedByTokenId: sessionId
              }
            })
          ]
        : []),
      this.prisma.refreshTokenSession.create({
        data: {
          id: sessionId,
          userId: profile.id,
          tokenHash: this.hashToken(refreshToken),
          expiresAt,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent
        }
      })
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtlSeconds,
      user: profile
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.get<string>("JWT_REFRESH_SECRET", "local-refresh-secret-change-me")
      });

      if (payload.typ !== "refresh") {
        throw new Error("Invalid token type");
      }

      return payload;
    } catch {
      throw new UnauthorizedException("Session has expired. Please login again.");
    }
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
