// Conversation model (spec section 9.3). Versioned storage key lets the shape
// migrate later without clobbering existing local data.

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  status: "streaming" | "complete" | "error";
  evidenceIds?: string[];
  errorCode?: string;
}

export interface Conversation {
  id: string;
  title: string;
  rToken: string | null;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}