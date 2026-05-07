import Card from "@/components/ui/Card";

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <Card className="p-6 md:p-8">
          <h1 className="text-3xl font-black">Privacy Policy</h1>

          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="text-xl font-black text-white">
                Information We Collect
              </h2>
              <p className="mt-2">
                Matched may collect account information, profile preferences,
                country, language, selected tags, chat session records, reports,
                blocks, pings, messages, and ad impression records.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                Age Verification
              </h2>
              <p className="mt-2">
                Matched is intended for users 18 and older. The MVP stores an
                age verification flag based on the onboarding date of birth. For
                production, use a dedicated third-party age verification
                provider and avoid storing identity documents directly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                Video and Face Checks
              </h2>
              <p className="mt-2">
                Matched checks whether the camera feed is usable and whether the
                user remains visible. The MVP does not store video recordings or
                facial images. Production moderation tools should also avoid
                storing biometric data unless legally reviewed and required.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">Chat History</h2>
              <p className="mt-2">
                Only conversations lasting 10 minutes or more are saved in user
                history. Shorter sessions are not shown in chat history.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                Reports and Blocks
              </h2>
              <p className="mt-2">
                Reports and blocks are stored to support safety, moderation,
                and abuse prevention. Blocked users cannot match or message each
                other again.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">Contact</h2>
              <p className="mt-2">
                Replace this section with your business contact email before
                launch.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </main>
  );
}