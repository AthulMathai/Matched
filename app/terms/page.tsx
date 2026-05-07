import Card from "@/components/ui/Card";

export default function TermsPage() {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <Card className="p-6 md:p-8">
          <h1 className="text-3xl font-black">Terms of Service</h1>

          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-300">
            <section>
              <h2 className="text-xl font-black text-white">Eligibility</h2>
              <p className="mt-2">
                You must be at least 18 years old to use Matched. By creating an
                account, you confirm that you meet this requirement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                Acceptable Use
              </h2>
              <p className="mt-2">
                You agree not to use Matched for harassment, explicit content,
                threats, hate speech, scams, impersonation, illegal activity, or
                any conduct that harms other users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                User Safety Tools
              </h2>
              <p className="mt-2">
                Matched provides Skip, Report, and Block tools. We may restrict
                or remove accounts that violate safety rules or receive serious
                reports.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                No Guarantee of Matches
              </h2>
              <p className="mt-2">
                Matching depends on available users, preferences, countries,
                languages, tags, and safety restrictions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">
                Ads and Monetization
              </h2>
              <p className="mt-2">
                Matched may display ads before matching or on non-chat screens.
                Premium features may be added later.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-white">Disclaimer</h2>
              <p className="mt-2">
                These starter terms are not legal advice. Have a lawyer review
                your final terms, privacy policy, age verification flow, and
                moderation policy before launch.
              </p>
            </section>
          </div>
        </Card>
      </div>
    </main>
  );
}