import { redirect } from "next/navigation";
import VideoRoom from "@/components/chat/VideoRoom";
import { requireUser } from "@/lib/auth";
import {
  getChatSession,
  getOtherUserId,
  userCanAccessSession,
} from "@/lib/sessions";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPage({
  params,
}: {
  params: Promise<{
    sessionId: string;
  }>;
}) {
  const user = await requireUser();
  const { sessionId } = await params;

  const canAccess = await userCanAccessSession(user.id, sessionId);

  if (!canAccess) {
    redirect("/match");
  }

  const session = await getChatSession(sessionId);

  if (!session || session.status !== "active") {
    redirect("/match");
  }

  const otherUserId = getOtherUserId(session, user.id);

  if (!otherUserId) {
    redirect("/match");
  }

  const supabase = await createClient();

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("id, country")
    .eq("id", user.id)
    .maybeSingle();

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, country")
    .eq("id", otherUserId)
    .maybeSingle();

  const isCaller = session.user_1_id === user.id;

  return (
    <main className="h-[calc(100dvh-67px)] overflow-hidden px-0 py-0 md:h-[calc(100dvh-78px)] md:px-5 md:py-4">
      <VideoRoom
        sessionId={sessionId}
        currentUserId={user.id}
        otherUserId={otherUserId}
        isCaller={isCaller}
        myCountry={myProfile?.country || ""}
        otherCountry={otherProfile?.country || ""}
      />
    </main>
  );
}