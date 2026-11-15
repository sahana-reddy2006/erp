import { Bell, CheckCheck } from 'lucide-react';
import type { NotificationItem } from '../../types/erp';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
}

export function NotificationsView({
  notifications,
  onMarkRead,
  onMarkAllRead,
}: NotificationsViewProps) {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Notifications & Alerts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {unreadCount} unread · Synchronized across Web, Android, and iOS push channels
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            Mark All Read
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
        {notifications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Bell className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No notifications yet. Activity from any family device will appear here instantly.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                n.isRead ? 'opacity-75' : 'bg-emerald-50/30 dark:bg-emerald-950/15'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {n.title}
                  </h3>
                  {!n.isRead && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                      New
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {n.message}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {n.category} · {new Date(n.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              {!n.isRead && (
                <button
                  type="button"
                  onClick={() => onMarkRead(n.id)}
                  className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
