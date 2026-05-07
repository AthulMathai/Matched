import { PRESET_PING_MESSAGES, SAFETY_LIMITS } from "@/constants/safety";
import { hasBlockBetween } from "./blocks";
import { createClient } from "./supabase/server";

export async function createPing({
  senderId,
  receiverId,
  sessionId,
  presetMessage,
}: {
  senderId: string;
  receiverId: string;
  sessionId?: string | null;
  presetMessage: string;
}) {
  if (senderId === receiverId) {
    throw new Error("You cannot ping yourself.");
  }

  if (!PRESET_PING_MESSAGES.includes(presetMessage)) {
    throw new Error("Invalid ping message.");
  }

  if (presetMessage.length > SAFETY_LIMITS.maxPingMessageLength) {
    throw new Error("Ping message is too long.");
  }

  const blocked = await hasBlockBetween(senderId, receiverId);

  if (blocked) {
    throw new Error("You cannot ping this user.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pings")
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      session_id: sessionId || null,
      preset_message: presetMessage,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getReceivedPings(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pings")
    .select(
      `
      *,
      sender_profile:profiles!pings_sender_id_fkey(
        id,
        display_name,
        avatar_url,
        country
      )
    `,
    )
    .eq("receiver_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function getSentPings(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pings")
    .select(
      `
      *,
      receiver_profile:profiles!pings_receiver_id_fkey(
        id,
        display_name,
        avatar_url,
        country
      )
    `,
    )
    .eq("sender_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function updatePingStatus({
  pingId,
  userId,
  status,
}: {
  pingId: string;
  userId: string;
  status: "accepted" | "ignored" | "blocked";
}) {
  const supabase = await createClient();

  const { data: ping, error: pingError } = await supabase
    .from("pings")
    .select("*")
    .eq("id", pingId)
    .eq("receiver_id", userId)
    .single();

  if (pingError || !ping) {
    throw new Error("Ping not found.");
  }

  const { data, error } = await supabase
    .from("pings")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pingId)
    .eq("receiver_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function canMessageOnPing(pingId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pings")
    .select("id, sender_id, receiver_id, status")
    .eq("id", pingId)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .single();

  if (error || !data) return false;

  return data.status === "accepted";
}