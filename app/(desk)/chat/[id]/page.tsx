"use client";

// /chat/[id] — existing conversation view. Loads from local storage and
// renders the full ConversationView with streaming, citations, and evidence.
// The conversation must already exist (created by /chat page or sidebar).

import { useParams } from "next/navigation";
import { ConversationView } from "@/components/chat/ConversationView";

export default function ChatConversationPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  if (!id) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-24 text-center">
        <p className="text-sm text-muted">Invalid conversation ID.</p>
      </div>
    );
  }

  return <ConversationView conversationId={id} />;
}