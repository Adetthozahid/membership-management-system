import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

type MembershipApprovedEmail = {
  to: string;
  fullName: string;
  memberId: string;
  username: string;
  temporaryPassword: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendMembershipApprovedEmail(input: MembershipApprovedEmail) {
    const loginUrl = this.memberLoginUrl();
    const subject = "Your membership has been approved";
    const text = [
      `Dear ${input.fullName},`,
      "",
      "Your membership application has been approved and your profile is now published on the website.",
      "",
      `Member ID: ${input.memberId}`,
      `Username: ${input.username}`,
      `Temporary password: ${input.temporaryPassword}`,
      "",
      `Login: ${loginUrl}`,
      "",
      "Please login and change your password as soon as possible."
    ].join("\n");
    const html = `
      <p>Dear ${this.escapeHtml(input.fullName)},</p>
      <p>Your membership application has been approved and your profile is now published on the website.</p>
      <p>
        <strong>Member ID:</strong> ${this.escapeHtml(input.memberId)}<br />
        <strong>Username:</strong> ${this.escapeHtml(input.username)}<br />
        <strong>Temporary password:</strong> ${this.escapeHtml(input.temporaryPassword)}
      </p>
      <p><a href="${this.escapeHtml(loginUrl)}">Login to your member account</a></p>
      <p>Please login and change your password as soon as possible.</p>
    `;

    const host = this.config.get<string>("SMTP_HOST");
    if (!host) {
      this.logger.warn(
        `SMTP_HOST is not configured. Membership approval email for ${input.to} was not sent. Username: ${input.username}; temporary password: ${input.temporaryPassword}`
      );
      return { sent: false, reason: "smtp_not_configured" as const };
    }

    const port = Number(this.config.get<string | number>("SMTP_PORT", 587));
    const secure = this.config.get<string>("SMTP_SECURE", "false") === "true";
    const user = this.config.get<string>("SMTP_USER");
    const pass = this.config.get<string>("SMTP_PASS");
    const from = this.config.get<string>("SMTP_FROM") ?? user;

    if (!from) {
      this.logger.warn("SMTP_FROM or SMTP_USER must be configured before approval emails can be sent.");
      return { sent: false, reason: "smtp_from_missing" as const };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      html
    });

    return { sent: true as const };
  }

  private memberLoginUrl() {
    const configured = this.config.get<string>("MEMBER_LOGIN_URL")?.trim();
    if (configured) return configured;
    const webOrigin = this.config.get<string>("WEB_ORIGIN")?.split(",")[0]?.trim() || "http://localhost:3000";
    return `${webOrigin.replace(/\/$/, "")}/member/login`;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
