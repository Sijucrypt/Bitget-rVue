import type { ChatMessage, Conversation } from "./types";

// Browser-only conversation store (spec section 9.3). Guarded against SSR and
// against storage failure (private mode / quota): on failure it degrades to an
// in-memory list so the app never crashes. Keys are versioned (rvue.chats.v1).

const KEY = "rvue.chats.v1";

let memory: Conversation[] = [];
let storageAvailable = true;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function readAll(): Conversation[] {
  if (typeof window === "undefined") return memory;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return memory;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    storageAvailable = false;
    return memory;
  }
}

function writeAll(list: Conversation[]): void {
  memory = list;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    storageAvailable = false;
  }
  try {
    window.dispatchEvent(new CustomEvent("rvue:chats"));
  } catch {
    // ignore
  }
}

export function isStorageAvailable(): boolean {
  return storageAvailable;
}

export function listConversations(): Conversation[] {
  return readAll().slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(id: string): Conversation | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function createConversation(
  partial: Partial<Pick<Conversation, "id" | "title" | "rToken">> = {},
): Conversation {
  const now = Date.now();
  const conversation: Conversation = {
    id: partial.id ?? newId(),
    title: partial.title ?? "New conversation",
    rToken: partial.rToken ?? null,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  const list = readAll();
  list.push(conversation);
  writeAll(list);
  return conversation;
}

export function upsertConversation(conversation: Conversation): Conversation {
  const list = readAll();
  const index = list.findIndex((c) => c.id === conversation.id);
  if (index >= 0) list[index] = conversation;
  else list.push(conversation);
  writeAll(list);
  return conversation;
}

export function renameConversation(id: string, title: string): Conversation | null {
  const list = readAll();
  const conversation = list.find((c) => c.id === id);
  if (conversation) {
    conversation.title = title;
    conversation.updatedAt = Date.now();
    writeAll(list);
  }
  return conversation ?? null;
}

export function deleteConversation(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function appendMessage(conversationId: string, message: ChatMessage): Conversation | null {
  const list = readAll();
  const conversation = list.find((c) => c.id === conversationId);
  if (conversation) {
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    writeAll(list);
  }
  return conversation ?? null;
}

export function patchMessage(
  conversationId: string,
  messageId: string,
  patch: Partial<ChatMessage>,
): Conversation | null {
  const list = readAll();
  const conversation = list.find((c) => c.id === conversationId);
  if (conversation) {
    const message = conversation.messages.find((m) => m.id === messageId);
    if (message) Object.assign(message, patch);
    conversation.updatedAt = Date.now();
    writeAll(list);
  }
  return conversation ?? null;
}