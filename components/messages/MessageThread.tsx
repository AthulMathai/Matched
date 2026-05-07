"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

type MessageItem = {
  id: string;
  ping_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

type MessageThreadProps = {
  pingId: string;
  currentUserId: string;
  otherUserId: string;
  initialMessages: MessageItem[];
};

export default function MessageThread({
  pingId,
  currentUserId,
  otherUserId,
  initialMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage() {
    const cleanBody = body.trim();

    if (!cleanBody) return;

    try {
      setBusy(true);
      setError("");

      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pingId,
          receiverId: otherUserId,
          body: cleanBody,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to send message.");
      }

      setMessages((current) => [...current, result.message]);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-700/70 p-5">
        <h2 className="text-xl font-black">Message Thread</h2>
        <p className="mt-1 text-sm text-slate-400">
          Messaging is available only after a ping is accepted.
        </p>
      </div>

      <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl p-4 ${
                    mine
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  <p className="text-sm leading-6">{message.body}</p>
                  <p
                    className={`mt-2 text-xs ${
                      mine ? "text-slate-700" : "text-slate-500"
                    }`}
                  >
                    {formatDateTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error ? (
        <div className="mx-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="border-t border-slate-700/70 p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <textarea
            className="input min-h-24 flex-1 resize-none"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Type your message..."
            maxLength={1000}
          />

          <Button type="button" disabled={busy || !body.trim()} onClick={sendMessage}>
            {busy ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </Card>
  );
}