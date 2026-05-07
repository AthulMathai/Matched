import { redirect } from "next/navigation";
import Card from "@/components/ui/Card";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import { SAFETY_LIMITS } from "@/constants/safety";
import { requireUser } from "@/lib/auth";
import { createProfileIfMissing, updateProfile } from "@/lib/users";

function getAgeFromDateOfBirth(dateOfBirth: string) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasBirthdayPassed) {
    age -= 1;
  }

  return age;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const profile = await createProfileIfMissing(user.id, user.email || undefined);
  const params = await searchParams;

  async function completeOnboardingAction(formData: FormData) {
    "use server";

    const currentUser = await requireUser();

    const displayName = String(formData.get("display_name") || "").trim();
    const gender = String(formData.get("gender") || "");
    const country = String(formData.get("country") || "").trim();
    const language = String(formData.get("language") || "");
    const dateOfBirth = String(formData.get("date_of_birth") || "");

    if (!displayName || !gender || !country || !language || !dateOfBirth) {
      redirect("/onboarding?error=missing");
    }

    const age = getAgeFromDateOfBirth(dateOfBirth);

    if (age < SAFETY_LIMITS.minAge) {
      redirect("/onboarding?error=underage");
    }

    await updateProfile(currentUser.id, {
      display_name: displayName,
      gender:
        gender === "male" ||
        gender === "female" ||
        gender === "other" ||
        gender === "prefer_not_to_say"
          ? gender
          : "prefer_not_to_say",
      country,
      language,
      date_of_birth: dateOfBirth,
      age_verified: true,
    });

    redirect("/preferences");
  }

  const errorMessage =
    params?.error === "underage"
      ? "Matched is currently available for users 18+ only."
      : params?.error === "missing"
        ? "Please complete all required fields."
        : "";

  return (
    <main className="page-shell flex items-center justify-center">
      <Card className="w-full max-w-2xl p-6 md:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-black">Set up your profile</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            Matched is 18+ only. Your country is detected automatically and
            shown to people you match with.
          </p>
        </div>

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
            {errorMessage}
          </div>
        ) : null}

        <OnboardingForm
          action={completeOnboardingAction}
          profile={{
            display_name: profile.display_name,
            gender: profile.gender,
            country: profile.country,
            language: profile.language,
            date_of_birth: profile.date_of_birth,
          }}
        />
      </Card>
    </main>
  );
}