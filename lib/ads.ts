import { createClient } from "./supabase/server";

export async function createAdImpression({
  userId,
  placement,
}: {
  userId: string;
  placement: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_impressions")
    .insert({
      user_id: userId,
      placement,
      watched_seconds: 0,
      completed: false,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function completeAdImpression({
  impressionId,
  watchedSeconds,
}: {
  impressionId: string;
  watchedSeconds: number;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ad_impressions")
    .update({
      watched_seconds: watchedSeconds,
      completed: true,
    })
    .eq("id", impressionId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function hasCompletedRecentStartAd(userId: string) {
  const supabase = await createClient();

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("ad_impressions")
    .select("id")
    .eq("user_id", userId)
    .eq("placement", "pre_match")
    .eq("completed", true)
    .gte("created_at", fifteenMinutesAgo)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}