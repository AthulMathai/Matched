import Card from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";

type ReportRow = {
  id: string;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
  reporter?:
    | {
        id: string;
        display_name: string | null;
        country: string | null;
      }
    | null
    | {
        id: string;
        display_name: string | null;
        country: string | null;
      }[];
  reported_user?:
    | {
        id: string;
        display_name: string | null;
        country: string | null;
        is_banned: boolean;
      }
    | null
    | {
        id: string;
        display_name: string | null;
        country: string | null;
        is_banned: boolean;
      }[];
};

type ReportTableProps = {
  reports: ReportRow[];
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

export default function ReportTable({ reports }: ReportTableProps) {
  if (reports.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-black">No reports found</h2>
        <p className="mt-3 text-sm text-slate-400">
          User reports will appear here for moderation review.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-700/70 bg-slate-950/70 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Reporter</th>
              <th className="p-4">Reported User</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Notes</th>
              <th className="p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {reports.map((report) => {
              const reporter = first(report.reporter);
              const reportedUser = first(report.reported_user);

              return (
                <tr key={report.id} className="border-b border-slate-800/80">
                  <td className="p-4 text-slate-400">
                    {formatDateTime(report.created_at)}
                  </td>
                  <td className="p-4">
                    {reporter?.display_name || "Unknown"}
                    <span className="block text-xs text-slate-500">
                      {reporter?.country || ""}
                    </span>
                  </td>
                  <td className="p-4">
                    {reportedUser?.display_name || "Unknown"}
                    <span className="block text-xs text-slate-500">
                      {reportedUser?.is_banned ? "Banned" : "Active"}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-slate-200">
                    {report.reason}
                  </td>
                  <td className="max-w-xs p-4 text-slate-400">
                    {report.notes || "-"}
                  </td>
                  <td className="p-4">
                    <span className="badge uppercase">{report.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}