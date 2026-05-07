import { createClient } from "./supabase/server";

export async function skipUser({
  skipperId,
  skippedUserId,
  sessionId,
}: {
  skipperId: string;
  skippedUserId: string;
  sessionId?: string | null;
}) {
  if (skipperId === skippedUserId) return false;

  const supabase = await createClient();

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { error } = await supabase.from("skipped_users").upsert(
    {
      skipper_id: skipperId,
      skipped_user_id: skippedUserId,
      session_id: sessionId || null,
      expires_at: expiresAt,
    },
    {
      onConflict: "skipper_id,skipped_user_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function hasActiveSkipBetween(userAId: string, userBId: string) {
  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("skipped_users")
    .select("id")
    .or(
      `and(skipper_id.eq.${userAId},skipped_user_id.eq.${userBId}),and(skipper_id.eq.${userBId},skipped_user_id.eq.${userAId})`,
    )
    .gt("expires_at", now)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}