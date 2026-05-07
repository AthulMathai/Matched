import Card from "@/components/ui/Card";
import { getCountryName } from "@/constants/countries";
import { getInitials } from "@/lib/utils";

type UserModerationCardProps = {
  user: {
    id: string;
    display_name: string | null;
    country: string | null;
    language: string | null;
    avatar_url: string | null;
    age_verified: boolean;
    is_banned: boolean;
    created_at: string;
  };
};

export default function UserModerationCard({ user }: UserModerationCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            className="h-14 w-14 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950">
            {getInitials(user.display_name)}
          </div>
        )}

        <div className="min-w-0">
          <h2 className="truncate text-lg font-black">
            {user.display_name || "Matched User"}
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {user.country ? getCountryName(user.country) : "Unknown country"}
            {user.language ? ` • ${user.language.toUpperCase()}` : ""}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="badge">
              {user.age_verified ? "Age verified" : "Not verified"}
            </span>
            <span className="badge">
              {user.is_banned ? "Banned" : "Active"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}