import { SAFETY_LIMITS } from "@/constants/safety";
import { canMessageOnPing } from "./pings";
import { createClient } from "./supabase/server";

export async function sendMessage({
  pingId,
  senderId,
  receiverId,
  body,
}: {
  pingId: string;
  senderId: string;
  receiverId: string;
  body: string;
}) {
  const cleanBody = body.trim();

  if (!cleanBody) {
    throw new Error("Message cannot be empty.");
  }

  if (cleanBody.length > SAFETY_LIMITS.maxTextMessageLength) {
    throw new Error(
      `Message cannot exceed ${SAFETY_LIMITS.maxTextMessageLength} characters.`,
    );
  }

  const allowed = await canMessageOnPing(pingId, senderId);

  if (!allowed) {
    throw new Error("Messaging is not available for this ping.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      ping_id: pingId,
      sender_id: senderId,
      receiver_id: receiverId,
      body: cleanBody,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getMessagesForPing(pingId: string, userId: string) {
  const allowed = await canMessageOnPing(pingId, userId);

  if (!allowed) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("ping_id", pingId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function markMessagesRead(pingId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("messages")
    .update({
      is_read: true,
    })
    .eq("ping_id", pingId)
    .eq("receiver_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}