"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LogoutButton from "@/components/layout/LogoutButton";
import { createClient } from "@/lib/supabase/client";

export default function NavAuthActions() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setLoggedIn(Boolean(user));
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(Boolean(session?.user));
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (loading) return null;

  if (loggedIn) {
    return <LogoutButton />;
  }

  return (
    <Link
      href="/login"
      className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-300"
    >
      Login / Sign up
    </Link>
  );
}