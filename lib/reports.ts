import { SAFETY_LIMITS } from "@/constants/safety";
import { createClient } from "./supabase/server";

export async function createReport({
  reporterId,
  reportedUserId,
  sessionId,
  reason,
  notes,
}: {
  reporterId: string;
  reportedUserId: string;
  sessionId?: string | null;
  reason: string;
  notes?: string | null;
}) {
  if (reporterId === reportedUserId) {
    throw new Error("You cannot report yourself.");
  }

  const cleanNotes = notes?.trim() || null;

  if (cleanNotes && cleanNotes.length > SAFETY_LIMITS.maxReportNotesLength) {
    throw new Error(
      `Notes cannot exceed ${SAFETY_LIMITS.maxReportNotesLength} characters.`,
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      session_id: sessionId || null,
      reason,
      notes: cleanNotes,
      status: "open",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getOpenReports() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .select(
      `
      *,
      reporter:profiles!reports_reporter_id_fkey(
        id,
        display_name,
        country
      ),
      reported_user:profiles!reports_reported_user_id_fkey(
        id,
        display_name,
        country,
        is_banned
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function updateReportStatus(
  reportId: string,
  status: "open" | "reviewing" | "resolved" | "dismissed",
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}