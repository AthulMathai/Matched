import Card from "@/components/ui/Card";
import { formatDateTime, formatDuration } from "@/lib/utils";

type SessionRow = {
  id: string;
  user_1_id: string;
  user_2_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  ended_reason: string | null;
};

type SessionAuditTableProps = {
  sessions: SessionRow[];
};

export default function SessionAuditTable({ sessions }: SessionAuditTableProps) {
  if (sessions.length === 0) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-2xl font-black">No sessions found</h2>
        <p className="mt-3 text-sm text-slate-400">
          Video chat sessions will appear here.
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
              <th className="p-4">Started</th>
              <th className="p-4">Status</th>
              <th className="p-4">Duration</th>
              <th className="p-4">End Reason</th>
              <th className="p-4">User 1</th>
              <th className="p-4">User 2</th>
            </tr>
          </thead>

          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-b border-slate-800/80">
                <td className="p-4 text-slate-400">
                  {formatDateTime(session.started_at)}
                </td>
                <td className="p-4">
                  <span className="badge uppercase">{session.status}</span>
                </td>
                <td className="p-4 text-slate-300">
                  {session.duration_seconds
                    ? formatDuration(session.duration_seconds)
                    : "-"}
                </td>
                <td className="p-4 text-slate-400">
                  {session.ended_reason || "-"}
                </td>
                <td className="p-4 text-xs text-slate-500">
                  {session.user_1_id}
                </td>
                <td className="p-4 text-xs text-slate-500">
                  {session.user_2_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}