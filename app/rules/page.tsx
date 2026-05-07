import Card from "@/components/ui/Card";

const rules = [
  "Matched is for users 18+ only.",
  "Keep your face clearly visible during video chat.",
  "No nudity, sexual content, harassment, hate speech, threats, scams, or illegal activity.",
  "Do not record, screenshot, or share another person without consent.",
  "Use Skip, Report, or Block if a conversation feels unsafe.",
  "Repeated reports or serious violations may result in account restriction or ban.",
];

export default function RulesPage() {
  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <Card className="p-6 md:p-8">
          <h1 className="text-3xl font-black">Community Rules</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Matched is built for respectful adult conversations. These rules
            apply to video chat, message requests, and private messages.
          </p>

          <div className="mt-8 space-y-4">
            {rules.map((rule, index) => (
              <div
                key={rule}
                className="rounded-3xl border border-slate-700/70 bg-slate-950/50 p-5"
              >
                <p className="text-sm font-black text-cyan-300">
                  Rule {index + 1}
                </p>
                <p className="mt-2 text-slate-200">{rule}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}