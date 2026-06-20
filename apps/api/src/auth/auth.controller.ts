import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PermissionGuard } from "./permission.guard";
import { RequirePermission } from "./permissions.decorator";
import type { AuthenticatedUser } from "./auth.types";

const REFRESH_COOKIE = "mms_refresh_token";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService
  ) {}

  @Post("admin/login")
  async adminLogin(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.loginAdmin(dto.email, dto.password, this.getMetadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    return this.toAuthResponse(result);
  }

  @Post("member/login")
  async memberLogin(@Body() dto: LoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.loginMember(dto.email, dto.password, this.getMetadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    return this.toAuthResponse(result);
  }

  @Post("refresh")
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.refresh(request.cookies?.[REFRESH_COOKIE], this.getMetadata(request));
    this.setRefreshCookie(response, result.refreshToken);
    return this.toAuthResponse(result);
  }

  @Post("logout")
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const userId = this.getBearerUserId(request);
    await this.authService.logout(request.cookies?.[REFRESH_COOKIE], userId, this.getMetadata(request));
    response.clearCookie(REFRESH_COOKIE, this.cookieOptions());
    return { success: true };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.authService.changePassword(user, dto.currentPassword, dto.newPassword, this.getMetadata(request));
  }

  @Get("admin/protected")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("admin", "access")
  adminProtected(@CurrentUser() user: AuthenticatedUser) {
    return { ok: true, user };
  }

  @Get("admin/permission-check")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("roles", "manage")
  permissionCheck() {
    return { ok: true };
  }

  private toAuthResponse(result: Awaited<ReturnType<AuthService["loginAdmin"]>>) {
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      user: result.user
    };
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie(REFRESH_COOKIE, refreshToken, {
      ...this.cookieOptions(),
      maxAge: Number(this.config.get<string | number>("JWT_REFRESH_TTL_DAYS", 30)) * 24 * 60 * 60 * 1000
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.config.get<string>("NODE_ENV") === "production",
      sameSite: "lax" as const,
      path: "/api/auth"
    };
  }

  private getMetadata(request: Request) {
    return {
      ipAddress: request.ip,
      userAgent: request.get("user-agent")
    };
  }

  private getBearerUserId(request: Request) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return undefined;
    }

    try {
      const [, payload] = authHeader.split(".") as [string, string, string];
      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string };
      return decoded.sub;
    } catch {
      return undefined;
    }
  }
}
