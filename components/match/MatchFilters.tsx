"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type MatchFiltersProps = {
  preferredGender?: string | null;
  preferredCountry?: string | null;
  preferredLanguage?: string | null;
  tags?: string[];
};

export default function MatchFilters({
  preferredGender = "any",
  preferredCountry = "global",
  preferredLanguage = "any",
  tags = [],
}: MatchFiltersProps) {
  return (
    <Card className="w-full max-w-2xl p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-black">Current Match Filters</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Matched will use these preferences when searching.
          </p>
        </div>

        <Link href="/preferences">
          <Button type="button" variant="secondary">
            Edit
          </Button>
        </Link>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Gender
          </p>
          <p className="mt-1 font-black capitalize">{preferredGender}</p>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Country
          </p>
          <p className="mt-1 font-black">{preferredCountry}</p>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-950/50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Language
          </p>
          <p className="mt-1 font-black">{preferredLanguage}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-bold text-slate-300">Tags</p>

        {tags.length === 0 ? (
          <p className="text-sm text-slate-500">No tags selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="badge">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}