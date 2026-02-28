import { HiOutlineBell, HiOutlineCog6Tooth } from "react-icons/hi2";

export function TopBar() {
  return (
    <div className="flex items-center justify-between p-4 bg-white shadow">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">Admin Dashboard</h1>
      <div className="flex items-center space-x-4">
        <button
          className="p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          aria-label="Notifications"
        >
          <HiOutlineBell className="w-6 h-6" />
        </button>
        <a
          href="/admin/settings"
          className="p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          aria-label="Settings"
        >
          <HiOutlineCog6Tooth className="w-6 h-6" />
        </a>
      </div>
    </div>
  );
}
