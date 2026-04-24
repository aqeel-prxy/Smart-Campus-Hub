import React, { useEffect, useState } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeNotifications,
} from '../services/api';

export default function NotificationsPanel({ userId }) {
  const [notes, setNotes] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [streamStatus, setStreamStatus] = useState('connecting');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [notificationsRes, preferencesRes] = await Promise.all([
          getNotifications(userId),
          getNotificationPreferences(),
        ]);
        setNotes(notificationsRes.data || []);
        setPreferences(preferencesRes.data || null);
      } catch (error) {
        console.error('Notification fetch failed', error);
      }
    };

    fetch();

    const unsubscribe = subscribeNotifications({
      onNotification: (notification) => {
        setStreamStatus('live');
        setNotes((current) => {
          const exists = current.some((item) => item.id === notification.id);
          if (exists) {
            return current.map((item) => (item.id === notification.id ? notification : item));
          }
          return [notification, ...current];
        });
      },
      onError: () => {
        setStreamStatus('reconnecting');
      },
    });

    const interval = setInterval(fetch, 30000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [userId]);

  const handleRead = async (id) => {
    await markNotificationRead(id);
    setNotes((n) => n.map(x => x.id === id ? { ...x, read: true } : x));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotes((current) => current.map((item) => ({ ...item, read: true })));
  };

  const handlePreferenceChange = (field, value) => {
    setPreferences((current) => ({
      ...(current || {}),
      [field]: value,
    }));
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;
    setIsSavingPreferences(true);
    try {
      const res = await updateNotificationPreferences(preferences);
      setPreferences(res.data);
    } catch (error) {
      console.error('Failed to save notification preferences', error);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white">Module D - Notifications</h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-semibold ${streamStatus === 'live' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {streamStatus === 'live' ? 'LIVE STREAM' : 'RECONNECTING'}
          </span>
          <button
            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-cyan-400 hover:text-cyan-200"
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </button>
        </div>
      </div>

      {preferences && (
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-300">Notification Preferences</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-sm text-slate-200 flex items-center gap-2">
              <input type="checkbox" checked={Boolean(preferences.realtimeEnabled)} onChange={(e) => handlePreferenceChange('realtimeEnabled', e.target.checked)} />
              Real-time in-app notifications
            </label>
            <label className="text-sm text-slate-200 flex items-center gap-2">
              <input type="checkbox" checked={Boolean(preferences.emailEnabled)} onChange={(e) => handlePreferenceChange('emailEnabled', e.target.checked)} />
              Email notifications
            </label>
            <label className="text-sm text-slate-200 flex items-center gap-2">
              <input type="checkbox" checked={Boolean(preferences.bookingUpdates)} onChange={(e) => handlePreferenceChange('bookingUpdates', e.target.checked)} />
              Booking status updates
            </label>
            <label className="text-sm text-slate-200 flex items-center gap-2">
              <input type="checkbox" checked={Boolean(preferences.ticketUpdates)} onChange={(e) => handlePreferenceChange('ticketUpdates', e.target.checked)} />
              Ticket activity updates
            </label>
            <label className="text-sm text-slate-200 flex items-center gap-2 md:col-span-2">
              <input type="checkbox" checked={Boolean(preferences.systemAnnouncements)} onChange={(e) => handlePreferenceChange('systemAnnouncements', e.target.checked)} />
              System announcements
            </label>
          </div>
          <button
            className="mt-3 rounded bg-cyan-600 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            disabled={isSavingPreferences}
            onClick={handleSavePreferences}
          >
            {isSavingPreferences ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {notes.length === 0 && (
          <li className="text-sm text-slate-400">No notifications yet.</li>
        )}
        {notes.map(n => (
          <li key={n.id} className={`rounded-lg border px-3 py-2 text-sm ${n.read ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-cyan-800 bg-cyan-900/20 text-cyan-100'}`}>
            <p className="font-medium">{n.message}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{n.type || 'GENERAL'}</p>
            {!n.read && <button className="mt-2 text-xs text-cyan-300" onClick={() => handleRead(n.id)}>Mark as read</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
