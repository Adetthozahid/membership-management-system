import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChatController } from "./chat.controller";
import { ChatCryptoService } from "./chat-crypto.service";
import { ChatService } from "./chat.service";

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatCryptoService, ChatService]
})
export class ChatModule {}
