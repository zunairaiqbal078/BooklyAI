import type { Request, Response } from "express";
import { sendSuccess } from "../../utils/api-response.js";
import type { ChatMessageInput, FallbackBookInput } from "./chat.schema.js";
import { chatService } from "./chat.service.js";

export class ChatController {
  async createSession(req: Request, res: Response): Promise<void> {
    const title = (req.body as { title?: string }).title;
    const session = await chatService.createSession(req.user!, title);
    sendSuccess(res, { session }, 201);
  }

  async listMessages(req: Request, res: Response): Promise<void> {
    const params = (req.validatedParams ?? req.params) as { id: string };
    const messages = await chatService.listMessages(req.user!, params.id);
    sendSuccess(res, { sessionId: params.id, messages });
  }

  async sendMessage(req: Request, res: Response): Promise<void> {
    const result = await chatService.sendMessage(req.user!, req.body as ChatMessageInput);
    sendSuccess(res, result);
  }

  async bookFromForm(req: Request, res: Response): Promise<void> {
    const result = await chatService.bookFromForm(req.user!, req.body as FallbackBookInput);
    sendSuccess(res, result, 201);
  }
}

export const chatController = new ChatController();
