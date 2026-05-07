"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types/message";

export function useRealtimeMessages({
  pingId,
  initialMessages,
}: {
  pingId: string;
  initialMessages: Message[];
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!pingId) return;

    const channel = supabase
      .channel(`messages:${pingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `ping_id=eq.${pingId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((current) => {
            const exists = current.some((message) => message.id === newMessage.id);
            if (exists) return current;

            return [...current, newMessage];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pingId, supabase]);

  return {
    messages,
    setMessages,
  };
}