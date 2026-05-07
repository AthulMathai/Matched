export type ChatHistoryItem = {
  id: number;
  user_id: string;
  other_user_id: string;
  session_id: string;
  duration_seconds: number;
  is_hidden: boolean;
  created_at: string;
};

export type ChatHistoryWithProfile = ChatHistoryItem & {
  other_profile: {
    id: string;
    display_name: string | null;
    gender: string | null;
    country: string | null;
    language: string | null;
    avatar_url: string | null;
  } | null;
};