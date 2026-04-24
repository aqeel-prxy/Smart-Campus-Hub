import React, { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '../services/api';

export default function NotificationsPanel({ userId }) {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNotifications(userId);
        setNotes(res.data || []);
      } catch (error) {
        console.error('Notification fetch failed', error);
      }
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [userId]);

  const handleRead = async (id) => {
    await markNotificationRead(id);
    setNotes((n) => n.map(x => x.id === id ? { ...x, read: true } : x));
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">Notifications</h3>
      <ul className="space-y-2">
        {notes.length === 0 && (
          <li className="text-sm text-slate-400">No notifications yet.</li>
        )}
        {notes.map(n => (
          <li key={n.id} className={`rounded-lg border px-3 py-2 text-sm ${n.read ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-cyan-800 bg-cyan-900/20 text-cyan-100'}`}>
            <p>{n.message}</p>
            {!n.read && <button className="mt-2 text-xs text-cyan-300" onClick={() => handleRead(n.id)}>Mark as read</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
