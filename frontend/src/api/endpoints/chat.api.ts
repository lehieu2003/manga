import type { SendChatMessageResponse } from "@/types";
import { request } from "../interceptors/auth.interceptor";

export const chatApi = {
  sendChatMessage(input: {
    conversationId?: string;
    message: string;
    routeContext?: {
      mangaId?: string;
      chapterId?: string;
    };
  }) {
    return request<SendChatMessageResponse>("/chat/messages", {
      method: "POST",
      body: JSON.stringify(input)
    });
  }
};
