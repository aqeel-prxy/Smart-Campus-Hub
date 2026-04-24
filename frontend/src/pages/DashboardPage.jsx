import { useState, useEffect } from 'react';
import { fetchFromAPI, getNotifications, markNotificationRead, subscribeNotifications } from '../services/api';
import NotificationsPanel from '../components/NotificationsPanel';

const DashboardPage = () => {
    const [user, setUser] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);
    const [isBellOpen, setIsBellOpen] = useState(false);
    const [showNotificationCenter, setShowNotificationCenter] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const [userData, healthData] = await Promise.all([
                    fetchFromAPI('/auth/user'),
                    fetchFromAPI('/health'),
                ]);
                if (userData && userData.authenticated) {
                    setUser(userData);
                    setHealth(healthData);
                } else {
                    window.location.href = '/'; 
                }
            } catch (err) {
                window.location.href = '/';
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        if (!user?.email) return;

        const loadNotifications = async () => {
            try {
                const res = await getNotifications();
                setNotifications(res.data || []);
            } catch (error) {
                console.error('Failed to load notifications', error);
            }
        };

        loadNotifications();

        const unsubscribe = subscribeNotifications({
            onNotification: (incoming) => {
                setNotifications((prev) => {
                    const exists = prev.some((n) => n.id === incoming.id);
                    if (exists) {
                        return prev.map((n) => (n.id === incoming.id ? incoming : n));
                    }
                    return [incoming, ...prev];
                });
            },
            onError: () => {
            },
        });

        const interval = setInterval(loadNotifications, 15000);

        return () => {
            clearInterval(interval);
            unsubscribe?.();
        };
    }, [user?.email]);

    const isAdmin = user?.role === 'admin' || user?.roles?.includes('ROLE_ADMIN');
    const unreadCount = notifications.filter((n) => !n.read).length;
    const recentNotifications = notifications.slice(0, 6);

    const handleNotificationClick = async (notification) => {
        try {
            if (!notification.read) {
                await markNotificationRead(notification.id);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
                );
            }
        } catch (error) {
            console.error('Failed to mark notification as read', error);
        } finally {
            setIsBellOpen(false);
            setShowNotificationCenter(true);
        }
    };
    
    // Debug: Log user object to check role detection
    console.log('User object:', user);
    console.log('Is admin:', isAdmin);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                <h2 className="text-xl font-bold text-slate-200">Loading command center...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 px-4 py-10">
            <div className="max-w-7xl mx-auto space-y-8">
                <section className="relative rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
                    <p className="text-xs tracking-[0.25em] uppercase text-cyan-300 mb-2">Operations Dashboard</p>
                    <h1 className="text-3xl md:text-4xl font-black text-white">Welcome, {user?.name || 'User'}</h1>
                    <p className="text-slate-300 mt-2">Manage campus resources, bookings, and incidents from one place.</p>
                    <div className="absolute right-6 top-6 z-20">
                        <div className="relative">
                            <button
                                onClick={() => setIsBellOpen((prev) => !prev)}
                                className="relative h-11 w-11 rounded-xl border border-cyan-500/40 bg-slate-900/90 text-cyan-200 hover:bg-slate-800 transition-colors"
                                aria-label="Open notifications"
                                title="Notifications"
                            >
                                <span className="text-lg">🔔</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {isBellOpen && (
                                <div className="absolute right-0 mt-3 w-[360px] rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                                        <p className="text-sm font-semibold text-white">Recent Notifications</p>
                                        <button
                                            onClick={() => {
                                                setIsBellOpen(false);
                                                setShowNotificationCenter(true);
                                            }}
                                            className="text-xs text-cyan-300 hover:text-cyan-200"
                                        >
                                            View all
                                        </button>
                                    </div>

                                    <div className="max-h-80 overflow-y-auto">
                                        {recentNotifications.length === 0 ? (
                                            <p className="px-4 py-4 text-sm text-slate-400">No notifications yet.</p>
                                        ) : (
                                            recentNotifications.map((n, idx) => (
                                                <button
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className="w-full border-b border-slate-800/70 px-4 py-3 text-left hover:bg-slate-800/60"
                                                >
                                                    <div className="mb-1 flex items-center justify-between">
                                                        <span className="text-[11px] font-semibold text-cyan-300">#{idx + 1}</span>
                                                        {!n.read && <span className="text-[10px] font-bold text-rose-300">NEW</span>}
                                                    </div>
                                                    <p className={n.read ? 'text-sm text-slate-400' : 'text-sm text-slate-100'}>{n.message}</p>
                                                    <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{n.type || 'GENERAL'}</p>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {health?.mode && (
                        <div className="mt-3">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold border ${
                                health.mode === 'mongodb'
                                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200'
                                    : 'border-amber-500/40 bg-amber-500/20 text-amber-200'
                            }`}>
                                Data Mode: {health.mode === 'mongodb' ? 'MongoDB Connected' : 'In-Memory Fallback'}
                            </span>
                        </div>
                    )}
                    {isAdmin && (
                        <span className="mt-4 inline-block rounded-full border border-amber-400/50 bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200">
                            ADMIN ACCESS
                        </span>
                    )}
                </section>

                <section>
                    <h2 className="text-2xl font-bold text-white mb-4">
                        {isAdmin ? "Admin Dashboard" : "User Dashboard"}
                    </h2>
                    
                    {isAdmin ? (
                        <div className="space-y-6">
                            {/* Admin Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
                                    <p className="text-3xl mb-2">👥</p>
                                    <h3 className="text-xl font-bold text-amber-200">System Overview</h3>
                                    <p className="text-amber-300/70 mt-2 text-sm">Manage all users and system settings</p>
                                </div>
                                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6">
                                    <p className="text-3xl mb-2">📊</p>
                                    <h3 className="text-xl font-bold text-cyan-200">Analytics</h3>
                                    <p className="text-cyan-300/70 mt-2 text-sm">View system statistics and reports</p>
                                </div>
                                <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                                    <p className="text-3xl mb-2">🔧</p>
                                    <h3 className="text-xl font-bold text-green-200">System Control</h3>
                                    <p className="text-green-300/70 mt-2 text-sm">Full access to all modules</p>
                                </div>
                            </div>
                            
                            {/* Admin Modules */}
                            <div>
                                <h3 className="text-xl font-semibold text-white mb-4">All Modules (Admin Access)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    <article
                                        onClick={() => window.location.href = '/facilities'}
                                        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-amber-400/50 transition-colors cursor-pointer"
                                    >
                                        <p className="text-3xl mb-3">🏢</p>
                                        <h3 className="text-xl font-semibold text-white">Facilities Management</h3>
                                        <p className="text-slate-400 mt-2 text-sm">Full CRUD operations on all resources</p>
                                        <div className="mt-2 text-xs text-amber-300">Admin Access</div>
                                    </article>

                                    <article
                                        onClick={() => window.location.href = '/bookings'}
                                        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-amber-400/50 transition-colors cursor-pointer"
                                    >
                                        <p className="text-3xl mb-3">📅</p>
                                        <h3 className="text-xl font-semibold text-white">Booking Management</h3>
                                        <p className="text-slate-400 mt-2 text-sm">Approve/reject all booking requests</p>
                                        <div className="mt-2 text-xs text-amber-300">Admin Access</div>
                                    </article>

                                    <article
                                        onClick={() => window.location.href = '/tickets'}
                                        className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-amber-400/50 transition-colors cursor-pointer"
                                    >
                                        <p className="text-3xl mb-3">🛠️</p>
                                        <h3 className="text-xl font-semibold text-white">Ticket Management</h3>
                                        <p className="text-slate-400 mt-2 text-sm">View and manage all tickets</p>
                                        <div className="mt-2 text-xs text-amber-300">Admin Access</div>
                                    </article>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            <article
                                onClick={() => window.location.href = '/facilities'}
                                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-cyan-400/50 transition-colors cursor-pointer"
                            >
                                <p className="text-3xl mb-3">🏢</p>
                                <h3 className="text-xl font-semibold text-white">Module A - Facilities</h3>
                                <p className="text-slate-400 mt-2 text-sm">Browse and search campus resources</p>
                            </article>

                            <article
                                onClick={() => window.location.href = '/bookings'}
                                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-cyan-400/50 transition-colors cursor-pointer"
                            >
                                <p className="text-3xl mb-3">📅</p>
                                <h3 className="text-xl font-semibold text-white">Module B - Bookings</h3>
                                <p className="text-slate-400 mt-2 text-sm">Manage your booking requests</p>
                            </article>

                            <article
                                onClick={() => window.location.href = '/tickets'}
                                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 hover:border-cyan-400/50 transition-colors cursor-pointer"
                            >
                                <p className="text-3xl mb-3">🛠️</p>
                                <h3 className="text-xl font-semibold text-white">Module C - Ticketing</h3>
                                <p className="text-slate-400 mt-2 text-sm">Create and track your maintenance tickets</p>
                            </article>
                        </div>
                    )}
                </section>
                {user?.email && showNotificationCenter && (
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Notification Center</h3>
                            <button
                                onClick={() => setShowNotificationCenter(false)}
                                className="text-xs text-slate-400 hover:text-slate-200"
                            >
                                Close
                            </button>
                        </div>
                        <NotificationsPanel userId={user.email} />
                    </section>
                )}
            </div>
        </div>
    );
};

export default DashboardPage;