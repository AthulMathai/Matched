import { redirect } from "next/navigation";
import PreferenceForm from "@/components/preferences/PreferenceForm";
import { requireUser } from "@/lib/auth";
import { getUserPreferences, upsertUserPreferences } from "@/lib/preferences";
import { getProfile } from "@/lib/users";
import { getUserTags, replaceUserTags } from "@/lib/tags";

export default async function PreferencesPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.age_verified) {
    redirect("/onboarding");
  }

  const preferences = await getUserPreferences(user.id);
  const tags = await getUserTags(user.id);

  async function savePreferencesAction(formData: FormData) {
    "use server";

    const currentUser = await requireUser();

    const preferredGender =
      String(formData.get("preferred_gender") || "any") || "any";

    const preferredCountry =
      String(formData.get("preferred_country") || "global") || "global";

    const preferredLanguage =
      String(formData.get("preferred_language") || "any") || "any";

    const allowGlobal = formData.get("allow_global") === "on";

    const selectedTags = formData
      .getAll("tags")
      .map((tag) => String(tag))
      .filter(Boolean);

    await upsertUserPreferences(currentUser.id, {
      preferred_gender:
        preferredGender === "male" || preferredGender === "female"
          ? preferredGender
          : "any",
      preferred_country: preferredCountry,
      preferred_language: preferredLanguage,
      allow_global: allowGlobal,
    });

    await replaceUserTags(currentUser.id, selectedTags);

    redirect("/match");
  }

  return (
    <main className="page-shell flex items-center justify-center">
      <PreferenceForm
        initialPreferredGender={preferences?.preferred_gender || "any"}
        initialPreferredCountry={preferences?.preferred_country || "global"}
        initialPreferredLanguage={preferences?.preferred_language || "any"}
        initialTags={tags.map((tag) => tag.name)}
        action={savePreferencesAction}
      />
    </main>
  );
}