"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { COUNTRY_OPTIONS, getCountryLabel } from "@/constants/countries";
import { GENDER_OPTIONS } from "@/constants/genders";
import { LANGUAGE_OPTIONS } from "@/constants/languages";
import { detectCountryFromBrowser } from "@/lib/detectCountry";

type OnboardingFormProps = {
  action: (formData: FormData) => Promise<void>;
  profile: {
    display_name?: string | null;
    gender?: string | null;
    country?: string | null;
    language?: string | null;
    date_of_birth?: string | null;
  };
};

export default function OnboardingForm({
  action,
  profile,
}: OnboardingFormProps) {
  const [country, setCountry] = useState(profile.country || "");
  const [showCountrySelect, setShowCountrySelect] = useState(false);

  useEffect(() => {
    if (profile.country) return;

    const detected = detectCountryFromBrowser();

    if (detected) {
      setCountry(detected);
    } else {
      setShowCountrySelect(true);
    }
  }, [profile.country]);

  return (
    <form action={action} className="space-y-5">
      <Input
        label="Display name"
        name="display_name"
        defaultValue={profile.display_name || ""}
        required
        minLength={2}
        maxLength={40}
        placeholder="Example: Alex"
      />

      <Input
        label="Date of birth"
        name="date_of_birth"
        type="date"
        defaultValue={profile.date_of_birth || ""}
        required
      />

      <input type="hidden" name="country" value={country} />

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          label="Gender"
          name="gender"
          defaultValue={profile.gender || ""}
          options={GENDER_OPTIONS}
          required
        />

        <Select
          label="Language"
          name="language"
          defaultValue={profile.language || ""}
          options={LANGUAGE_OPTIONS}
          required
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/60 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-400">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-black text-slate-900 dark:text-white">
              Detected country
            </p>
            <p className="mt-1">
              {country ? getCountryLabel(country) : "Unable to detect country"}
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowCountrySelect((current) => !current)}
          >
            {showCountrySelect ? "Hide" : "Change"}
          </Button>
        </div>

        {showCountrySelect ? (
          <div className="mt-4">
            <Select
              label="Country"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              options={COUNTRY_OPTIONS}
              required
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white/60 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-400">
        By continuing, you confirm you are at least 18 years old and agree to
        follow Matched safety rules.
      </div>

      <Button type="submit" fullWidth>
        Continue
      </Button>
    </form>
  );
}