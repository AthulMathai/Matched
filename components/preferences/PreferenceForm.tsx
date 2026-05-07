"use client";

import { useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import TagSelector from "@/components/preferences/TagSelector";
import { COUNTRY_OPTIONS } from "@/constants/countries";
import { PREFERRED_GENDER_OPTIONS } from "@/constants/genders";
import { LANGUAGE_OPTIONS } from "@/constants/languages";

type PreferenceFormProps = {
  initialPreferredGender?: string;
  initialPreferredCountry?: string;
  initialPreferredLanguage?: string;
  initialTags?: string[];
  action: (formData: FormData) => Promise<void>;
};

export default function PreferenceForm({
  initialPreferredGender = "any",
  initialPreferredCountry = "global",
  initialPreferredLanguage = "any",
  initialTags = [],
  action,
}: PreferenceFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [isPending, startTransition] = useTransition();

  function submitForm(formData: FormData) {
    selectedTags.forEach((tag) => {
      formData.append("tags", tag);
    });

    startTransition(() => {
      action(formData);
    });
  }

  return (
    <Card className="w-full max-w-3xl p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black">Matching Preferences</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Choose who you want to meet. Tags help Matched connect you with people
          who share similar interests.
        </p>
      </div>

      <form action={submitForm} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label="Preferred gender"
            name="preferred_gender"
            defaultValue={initialPreferredGender}
            options={PREFERRED_GENDER_OPTIONS}
          />

          <Select
            label="Preferred country"
            name="preferred_country"
            defaultValue={initialPreferredCountry}
            options={COUNTRY_OPTIONS}
          />

          <Select
            label="Preferred language"
            name="preferred_language"
            defaultValue={initialPreferredLanguage}
            options={LANGUAGE_OPTIONS}
          />
        </div>

        <TagSelector selectedTags={selectedTags} onChange={setSelectedTags} />

        <div className="rounded-3xl border border-slate-700/70 bg-slate-950/50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="allow_global"
              defaultChecked
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block text-sm font-bold text-slate-200">
                Allow global fallback
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-400">
                If no exact match is available, Matched can connect you with
                someone outside your selected country or language.
              </span>
            </span>
          </label>
        </div>

        <Button type="submit" fullWidth disabled={isPending}>
          {isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </Card>
  );
}