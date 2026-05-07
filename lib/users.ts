import type { Profile } from "@/types/user";
import { createClient } from "./supabase/server";

export async function getProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (error) return null;

  return data;
}

export async function getProfileOrRedirect(userId: string) {
  const profile = await getProfile(userId);

  if (!profile) {
    return null;
  }

  return profile;
}

export async function isUserAllowedToMatch(userId: string) {
  const profile = await getProfile(userId);

  if (!profile) {
    return {
      allowed: false,
      reason: "Profile not found",
    };
  }

  if (profile.is_banned) {
    return {
      allowed: false,
      reason: "Account is banned",
    };
  }

  if (!profile.age_verified) {
    return {
      allowed: false,
      reason: "Age verification required",
    };
  }

  return {
    allowed: true,
    reason: null,
  };
}

export async function updateProfile(
  userId: string,
  values: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("*")
    .single<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createProfileIfMissing(userId: string, email?: string) {
  const supabase = await createClient();

  const existing = await getProfile(userId);

  if (existing) return existing;

  const defaultName = email?.split("@")[0] || "Matched User";

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      display_name: defaultName,
      age_verified: false,
      is_banned: false,
    })
    .select("*")
    .single<Profile>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}