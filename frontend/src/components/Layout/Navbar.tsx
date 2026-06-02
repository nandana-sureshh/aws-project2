import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../../api/notifications';
import { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export function Navbar({ title }: { title?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      setUnreadCount(res.data.count);
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      const res = await notificationsApi.getAll({ limit: 8 });
      setNotifications(res.data);
    } catch {}
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleBellClick = async () => {
    setShowDropdown((v) => !v);
    if (!showDropdown) {
      await fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications((n) => n.map((notif) => ({ ...notif, isRead: true })));
      toast.success('All notifications marked as read');
    } catch {}
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-30">
      <h2 className="text-white font-semibold text-lg">{title}</h2>

      <div className="relative" ref={dropdownRef}>
        <button
          id="notification-bell"
          onClick={handleBellClick}
          className="relative p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-slow">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-96 glass-card shadow-2xl shadow-black/50 z-50 animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
              <h3 className="text-white font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/30">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 hover:bg-white/5 transition-colors ${!n.isRead ? 'border-l-2 border-primary-500' : ''}`}
                  >
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>
                      {n.title}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">{n.message}</p>
                    <p className="text-slate-600 text-xs mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
