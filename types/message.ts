export type PingStatus = "pending" | "accepted" | "ignored" | "blocked";

export type Ping = {
  id: string;
  sender_id: string;
  receiver_id: string;
  session_id: string | null;
  status: PingStatus;
  preset_message: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  ping_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export type PingWithProfile = Ping & {
  sender_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    country: string | null;
  } | null;
  receiver_profile?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    country: string | null;
  } | null;
};