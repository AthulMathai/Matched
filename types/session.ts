export type ChatSessionStatus = "active" | "ended" | "reported";

export type ChatSession = {
  id: string;
  user_1_id: string;
  user_2_id: string;
  status: ChatSessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  created_at: string;
};

export type MatchQueueStatus = "waiting" | "matched" | "cancelled";

export type MatchQueueItem = {
  id: number;
  user_id: string;
  preferred_gender: string | null;
  preferred_country: string | null;
  preferred_language: string | null;
  status: MatchQueueStatus;
  created_at: string;
};