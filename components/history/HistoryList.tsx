"use client";

import { useState } from "react";
import HistoryCard from "@/components/history/HistoryCard";

type HistoryItem = {
  id: number;
  other_user_id: string;
  session_id: string;
  duration_seconds: number;
  created_at: string;
  other_profile:
    | {
        id: string;
        display_name: string | null;
        country: string | null;
        language: string | null;
        avatar_url: string | null;
      }
    | null
    | {
        id: string;
        display_name: string | null;
        country: string | null;
        language: string | null;
        avatar_url: string | null;
      }[];
};

type HistoryListProps = {
  items: HistoryItem[];
};

function getProfile(item: HistoryItem) {
  if (Array.isArray(item.other_profile)) {
    return item.other_profile[0] || null;
  }

  return item.other_profile;
}

export default function HistoryList({ items }: HistoryListProps) {
  const [visibleItems, setVisibleItems] = useState(items);

  function removeItem(historyId: number) {
    setVisibleItems((current) =>
      current.filter((item) => item.id !== historyId),
    );
  }

  if (visibleItems.length === 0) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-2xl font-black">No chat history yet</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Only conversations that last 10 minutes or more appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visibleItems.map((item) => {
        const profile = getProfile(item);

        return (
          <HistoryCard
            key={item.id}
            historyId={item.id}
            otherUserId={item.other_user_id}
            sessionId={item.session_id}
            displayName={profile?.display_name || null}
            country={profile?.country || null}
            language={profile?.language || null}
            avatarUrl={profile?.avatar_url || null}
            durationSeconds={item.duration_seconds}
            createdAt={item.created_at}
            onHidden={removeItem}
          />
        );
      })}
    </div>
  );
}