"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    try {
      setLoading(true);

      const supabase = createClient();
      await supabase.auth.signOut();

      window.location.href = "/";
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded-xl border border-red-300/40 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-500/10 dark:border-red-400/30 dark:text-red-300"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}