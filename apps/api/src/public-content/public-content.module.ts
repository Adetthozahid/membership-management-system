import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminWebsiteController, MemberContentController, PublicContentController } from "./public-content.controller";
import { PublicContentService } from "./public-content.service";

@Module({
  imports: [AuthModule],
  controllers: [PublicContentController, MemberContentController, AdminWebsiteController],
  providers: [PublicContentService]
})
export class PublicContentModule {}
