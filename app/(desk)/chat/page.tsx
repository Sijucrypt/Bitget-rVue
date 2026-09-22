"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createConversation } from "@/lib/chat/store";
import { ConversationView } from "@/components/chat/ConversationView";

// /chat — new conversation page. If ?rToken=X is present, pin the asset.
// Immediately creates a conversation and redirects to /chat/[id] so the URL
// is stable from the first message (spec section 7.6).

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rTokenParam = searchParams.get("rToken");
  const [convId, setConvId] = useState<string | null>(null);

  useEffect(() => {
    const conv = createConversation({
      rToken: rTokenParam || null,
      title: rTokenParam ? `${rTokenParam} — New conversation` : "New conversation",
    });
    // Replace so the back button doesn't recreate conversations endlessly.
    router.replace("/chat/" + conv.id);
    setConvId(conv.id);
  }, [rTokenParam, router]);

  // While redirecting, show the conversation view so it feels instant.
  if (convId) {
    return <ConversationView conversationId={convId} initialRToken={rTokenParam ?? undefined} />;
  }

  return null;
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}