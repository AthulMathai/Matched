import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/LoginForm";
import Card from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import { createProfileIfMissing, getProfile } from "@/lib/users";
import { getUserPreferences } from "@/lib/preferences";

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

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getNextPath(user.id));
  }

  async function authAction(formData: FormData) {
    "use server";

    const mode = String(formData.get("mode") || "login");
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      redirect("/login?error=missing");
    }

    const serverSupabase = await createClient();

    if (mode === "signup") {
      const { data, error } = await serverSupabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        redirect(`/login?error=${encodeURIComponent(error.message)}`);
      }

      if (data.user) {
        await createProfileIfMissing(data.user.id, data.user.email || email);
      }

      redirect("/onboarding");
    }

    const { data, error } = await serverSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      redirect("/login?error=Invalid email or password");
    }

    await createProfileIfMissing(data.user.id, data.user.email || email);

    redirect(await getNextPath(data.user.id));
  }

  const errorMessage =
    params?.error === "missing"
      ? "Please enter your email and password."
      : params?.error || "";

  return (
    <main className="page-shell flex items-center justify-center">
      <Card className="w-full max-w-md p-6 md:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-2xl font-black text-slate-950">
            M
          </div>

          <h1 className="text-3xl font-black">Welcome to Matched</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Login or create an account to start matching.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <LoginForm action={authAction} />

        <p className="mt-6 text-center text-xs leading-5 text-slate-500">
          Matched is currently for users 18+ only.
        </p>
      </Card>
    </main>
  );
}