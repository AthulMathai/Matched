"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  action: (formData: FormData) => Promise<void>;
};

export default function LoginForm({ action }: LoginFormProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isPending, startTransition] = useTransition();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  function submitForm(formData: FormData) {
    formData.set("mode", mode);

    startTransition(() => {
      action(formData);
    });
  }

  async function loginWithGoogle() {
    try {
      setGoogleLoading(true);
      setError("");

      const supabase = createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

      const redirectTo = `${siteUrl}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google login failed.");
      setGoogleLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={googleLoading || isPending}
        onClick={loginWithGoogle}
        className="gap-3"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-slate-900">
          G
        </span>
        {googleLoading ? "Opening Google..." : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-300/30" />
        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
          or
        </span>
        <div className="h-px flex-1 bg-slate-300/30" />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form action={submitForm} className="space-y-5">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-700/20 bg-slate-950/5 p-1 dark:border-slate-700/70 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-xl px-4 py-3 text-sm font-black ${
              mode === "login"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-xl px-4 py-3 text-sm font-black ${
              mode === "signup"
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            Sign Up
          </button>
        </div>

        <Input
          label="Email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Minimum 6 characters"
        />

        <Button type="submit" fullWidth disabled={isPending || googleLoading}>
          {isPending
            ? "Please wait..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </Button>
      </form>
    </div>
  );
}