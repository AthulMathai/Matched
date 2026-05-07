export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export type Report = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  session_id: string | null;
  reason: string;
  notes: string | null;
  status: ReportStatus;
  created_at: string;
};

export type BlockedUser = {
  id: number;
  blocker_id: string;
  blocked_user_id: string;
  reason: string | null;
  created_at: string;
};

export type AdImpression = {
  id: string;
  user_id: string;
  placement: string;
  watched_seconds: number;
  completed: boolean;
  created_at: string;
};