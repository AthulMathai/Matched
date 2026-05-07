import Link from "next/link";

const adminItems = [
  {
    label: "Dashboard",
    href: "/admin",
  },
  {
    label: "Reports",
    href: "/admin/reports",
  },
  {
    label: "Users",
    href: "/admin/users",
  },
  {
    label: "Sessions",
    href: "/admin/sessions",
  },
];

export default function Sidebar() {
  return (
    <aside className="card h-fit p-4">
      <p className="mb-4 px-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        Admin
      </p>

      <nav className="space-y-1">
        {adminItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-xl px-3 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}