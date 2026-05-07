import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPreferences } from "@/lib/preferences";
import { createProfileIfMissing, getProfile } from "@/lib/users";

async function getNextPath(userId: string) {
  const profile = await getProfile(userId);

  if (!profile || !profile.age_verified) {
    return "/onboarding";
  }

  const preferences = await getUserPreferences(userId);

  if (!preferences) {
    return "/preferences";
  }

  return "/match";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Missing auth code", request.url));
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=Login failed", request.url));
  }

  await createProfileIfMissing(user.id, user.email || undefined);

  return NextResponse.redirect(new URL(await getNextPath(user.id), request.url));
}