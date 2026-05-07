import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=missing_code`);
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("AUTH_CALLBACK_EXCHANGE_ERROR:", exchangeError.message);
    return NextResponse.redirect(
      `${siteUrl}/login?error=auth_callback_failed`,
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("AUTH_CALLBACK_USER_ERROR:", userError?.message);
    return NextResponse.redirect(`${siteUrl}/login?error=user_not_found`);
  }

  const email = user.email || "";
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Matched user";

  const avatarUrl =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    null;

  const { data: existingProfile, error: profileReadError } = await supabase
    .from("profiles")
    .select("id, country, language")
    .eq("id", user.id)
    .maybeSingle();

  if (profileReadError) {
    console.error("PROFILE_READ_ERROR:", profileReadError.message);
  }

  if (!existingProfile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email,
      display_name: fullName,
      avatar_url: avatarUrl,
      country: null,
      language: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("PROFILE_CREATE_ERROR:", insertError.message);

      // Fallback if your profiles table does not have all optional columns.
      const { error: fallbackError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          country: null,
          language: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (fallbackError) {
        console.error("PROFILE_CREATE_FALLBACK_ERROR:", fallbackError.message);
        return NextResponse.redirect(
          `${siteUrl}/login?error=profile_create_failed`,
        );
      }
    }

    return NextResponse.redirect(`${siteUrl}/onboarding`);
  }

  if (!existingProfile.country || !existingProfile.language) {
    return NextResponse.redirect(`${siteUrl}/onboarding`);
  }

  return NextResponse.redirect(`${siteUrl}/match`);
}