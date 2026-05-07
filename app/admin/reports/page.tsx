import Sidebar from "@/components/layout/Sidebar";
import ReportTable from "@/components/moderation/ReportTable";
import { requireUser } from "@/lib/auth";
import { getOpenReports } from "@/lib/reports";

export default async function AdminReportsPage() {
  await requireUser();

  const reports = await getOpenReports();

  return (
    <main className="page-shell">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_1fr]">
        <Sidebar />

        <section>
          <div className="mb-6">
            <h1 className="text-3xl font-black">Reports</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Review user-submitted safety reports.
            </p>
          </div>

          <ReportTable reports={reports as any} />
        </section>
      </div>
    </main>
  );
}