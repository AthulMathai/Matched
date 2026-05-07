"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getCountryName } from "@/constants/countries";
import { formatDateTime, getInitials } from "@/lib/utils";

type PingItem = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "ignored" | "blocked";
  preset_message: string | null;
  created_at: string;
  sender_profile?:
    | {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        country: string | null;
      }
    | null
    | {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        country: string | null;
      }[];
};

type PingListProps = {
  pings: PingItem[];
};

function getSenderProfile(ping: PingItem) {
  if (Array.isArray(ping.sender_profile)) {
    return ping.sender_profile[0] || null;
  }

  return ping.sender_profile || null;
}

export default function PingList({ pings }: PingListProps) {
  const [items, setItems] = useState(pings);
  const [error, setError] = useState("");

  async function updatePing(pingId: string, status: "accepted" | "ignored" | "blocked") {
    try {
      setError("");

      const response = await fetch("/api/ping", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pingId,
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update ping.");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === pingId ? { ...item, status } : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update ping.");
    }
  }

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-black">No message requests</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          When someone pings you from a 10+ minute chat, it will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {items.map((ping) => {
        const profile = getSenderProfile(ping);

        return (
          <Card key={ping.id} className="p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
                    {getInitials(profile?.display_name)}
                  </div>
                )}

                <div>
                  <h2 className="text-lg font-black">
                    {profile?.display_name || "Matched User"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {profile?.country
                      ? getCountryName(profile.country)
                      : "Unknown country"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateTime(ping.created_at)}
                  </p>
                </div>
              </div>

              <div className="md:text-right">
                <p className="text-sm font-bold text-slate-300">
                  {ping.preset_message || "Hey, want to reconnect?"}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {ping.status}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                  {ping.status === "pending" ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => updatePing(ping.id, "ignored")}
                      >
                        Ignore
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => updatePing(ping.id, "blocked")}
                      >
                        Block
                      </Button>
                      <Button
                        type="button"
                        onClick={() => updatePing(ping.id, "accepted")}
                      >
                        Accept
                      </Button>
                    </>
                  ) : null}

                  {ping.status === "accepted" ? (
                    <Link href={`/messages?ping=${ping.id}`}>
                      <Button type="button" variant="secondary">
                        Open Chat
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}