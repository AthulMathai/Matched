import { createClient } from "./supabase/server";

export async function blockUser(
  blockerId: string,
  blockedUserId: string,
  reason?: string,
) {
  if (blockerId === blockedUserId) {
    throw new Error("You cannot block yourself.");
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blocked_users")
    .upsert(
      {
        blocker_id: blockerId,
        blocked_user_id: blockedUserId,
        reason: reason || null,
      },
      {
        onConflict: "blocker_id,blocked_user_id",
      },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from("chat_history")
    .update({
      is_hidden: true,
    })
    .eq("user_id", blockerId)
    .eq("other_user_id", blockedUserId);

  await supabase
    .from("pings")
    .update({
      status: "blocked",
      updated_at: new Date().toISOString(),
    })
    .or(
      `and(sender_id.eq.${blockerId},receiver_id.eq.${blockedUserId}),and(sender_id.eq.${blockedUserId},receiver_id.eq.${blockerId})`,
    )
    .eq("status", "pending");

  return data;
}

export async function unblockUser(blockerId: string, blockedUserId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_user_id", blockedUserId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function hasBlockBetween(userAId: string, userBId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blocked_users")
    .select("id")
    .or(
      `and(blocker_id.eq.${userAId},blocked_user_id.eq.${userBId}),and(blocker_id.eq.${userBId},blocked_user_id.eq.${userAId})`,
    )
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data?.length);
}

export async function getBlockedUsers(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blocked_users")
    .select(
      `
      *,
      blocked_profile:profiles!blocked_users_blocked_user_id_fkey(
        id,
        display_name,
        avatar_url,
        country
      )
    `,
    )
    .eq("blocker_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}