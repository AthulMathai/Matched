import type { UserPreferences } from "@/types/preferences";
import { createClient } from "./supabase/server";

export async function getUserPreferences(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single<UserPreferences>();

  if (error) return null;

  return data;
}

export async function upsertUserPreferences(
  userId: string,
  values: Partial<Omit<UserPreferences, "user_id" | "updated_at">>,
) {
  const supabase = await createClient();

  const payload = {
    user_id: userId,
    preferred_gender: values.preferred_gender || "any",
    preferred_country: values.preferred_country || "global",
    preferred_language: values.preferred_language || "any",
    allow_global: values.allow_global ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(payload, {
      onConflict: "user_id",
    })
    .select("*")
    .single<UserPreferences>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}