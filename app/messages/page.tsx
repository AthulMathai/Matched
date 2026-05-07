import MessagesClient from "@/components/messages/MessagesClient";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    tab?: string;
  }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const params = searchParams ? await searchParams : {};
  const initialTab = params.tab || "messages";

  const { data: requests } = await supabase
    .from("connection_requests")
    .select("id, sender_id, receiver_id, status, message, created_at")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    });

  const requestSenderIds = [
    ...new Set((requests || []).map((item) => item.sender_id)),
  ];

  const { data: senderProfiles } =
    requestSenderIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, country")
          .in("id", requestSenderIds)
      : { data: [] };

  const senderProfileMap = new Map(
    (senderProfiles || []).map((profile) => [profile.id, profile]),
  );

  const requestsWithProfiles = (requests || []).map((request) => ({
    ...request,
    sender_profile: senderProfileMap.get(request.sender_id) || null,
  }));

  const { data: partyInvites } = await supabase
    .from("party_invites")
    .select("id, party_id, sender_id, receiver_id, status, created_at")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", {
      ascending: false,
    });

  const partyInviteSenderIds = [
    ...new Set((partyInvites || []).map((invite) => invite.sender_id)),
  ];

  const { data: partyInviteSenderProfiles } =
    partyInviteSenderIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, country, language")
          .in("id", partyInviteSenderIds)
      : { data: [] };

  const partyInviteProfileMap = new Map(
    (partyInviteSenderProfiles || []).map((profile) => [profile.id, profile]),
  );

  const partyInvitesWithProfiles = (partyInvites || []).map((invite) => ({
    ...invite,
    sender_profile: partyInviteProfileMap.get(invite.sender_id) || null,
  }));

  const { data: friends } = await supabase
    .from("friends")
    .select("id, user_1_id, user_2_id, created_at")
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .order("created_at", {
      ascending: false,
    });

  const friendUserIds = [
    ...new Set(
      (friends || []).map((friend) =>
        friend.user_1_id === user.id ? friend.user_2_id : friend.user_1_id,
      ),
    ),
  ];

  const { data: friendProfiles } =
    friendUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, country, language")
          .in("id", friendUserIds)
      : { data: [] };

  const friendProfileMap = new Map(
    (friendProfiles || []).map((profile) => [profile.id, profile]),
  );

  const friendsWithProfiles = (friends || []).map((friend) => {
    const friendId =
      friend.user_1_id === user.id ? friend.user_2_id : friend.user_1_id;

    return {
      ...friend,
      friend_id: friendId,
      friend_profile: friendProfileMap.get(friendId) || null,
    };
  });

  const { data: directMessages } =
    friendUserIds.length > 0
      ? await supabase
          .from("direct_messages")
          .select("id, sender_id, receiver_id, body, created_at")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("created_at", {
            ascending: true,
          })
      : { data: [] };

  return (
    <MessagesClient
      currentUserId={user.id}
      initialTab={initialTab}
      requests={requestsWithProfiles}
      friends={friendsWithProfiles}
      directMessages={directMessages || []}
      partyInvites={partyInvitesWithProfiles}
    />
  );
}