import { createClient } from "@/lib/supabase/server";

export async function saveHistoryForBothUsers({
  sessionId,
  durationSeconds,
}: {
  sessionId: string;
  user1Id?: string;
  user2Id?: string;
  durationSeconds: number;
}) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("save_history_for_session", {
    p_session_id: sessionId,
    p_duration_seconds: durationSeconds,
  });

  if (error) {
    throw new Error(error.message);
  }
}