import { useEffect, useMemo, useState } from 'react';
import {
    cancelBooking,
    createBooking,
    decideBooking,
    deleteBooking,
    fetchFromAPI,
    getAllBookings,
    getMyBookings,
} from '../services/api';

const initialForm = {
    resourceId: '',
    bookingDate: '',
    startTime: '',
    endTime: '',
    purpose: '',
    expectedAttendees: 1,
};

const statusColor = {
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    REJECTED: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    CANCELLED: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const BookingsPage = () => {
    const [user, setUser] = useState(null);
    const [resources, setResources] = useState([]);
    const [myBookings, setMyBookings] = useState([]);
    const [adminBookings, setAdminBookings] = useState([]);
    const [formData, setFormData] = useState(initialForm);
    const [adminFilters, setAdminFilters] = useState({
        status: '',
        fromDate: '',
        toDate: '',
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    const isAdmin = user?.roles?.includes('ROLE_ADMIN');

    const resourceMap = useMemo(
        () => resources.reduce((acc, current) => ({ ...acc, [current.id]: current }), {}),
        [resources]
    );

    const loadInitialData = async () => {
        try {
            const userData = await fetchFromAPI('/auth/user');

            if (!userData?.authenticated) {
                window.location.href = '/';
                return;
            }

            const [resourcesData, myBookingData] = await Promise.all([
                fetchFromAPI('/resources?page=0&size=200'),
                getMyBookings(),
            ]);

            setUser(userData);
            setResources(resourcesData?.content || []);
            setMyBookings(myBookingData || []);
            if (isAdmin || userData?.roles?.includes('ROLE_ADMIN')) {
                const all = await getAllBookings({});
                setAdminBookings(all || []);
            }
        } catch (error) {
            console.error('Bookings page load failed', error);
            setFeedback({ type: 'error', message: 'Failed to load booking data. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const refreshBookings = async () => {
        const myBookingData = await getMyBookings();
        setMyBookings(myBookingData || []);
        if (isAdmin) {
            const all = await getAllBookings(adminFilters);
            setAdminBookings(all || []);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback({ type: '', message: '' });

        try {
            await createBooking({
                ...formData,
                expectedAttendees: Number(formData.expectedAttendees),
            });
            setFormData(initialForm);
            setFeedback({ type: 'success', message: 'Booking request created successfully.' });
            await refreshBookings();
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Failed to create booking.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this booking?')) return;
        try {
            await cancelBooking(id);
            await refreshBookings();
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Failed to cancel booking.' });
        }
    };

    const handleDecision = async (id, decision) => {
        const reason = window.prompt(`Enter a reason to ${decision.toLowerCase()} this booking:`);
        if (!reason) return;
        try {
            await decideBooking(id, { decision, reason });
            await refreshBookings();
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Decision action failed.' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to completely delete this booking? This action cannot be undone.')) return;
        try {
            await deleteBooking(id);
            await refreshBookings();
            setFeedback({ type: 'success', message: 'Booking deleted successfully.' });
        } catch (error) {
            setFeedback({ type: 'error', message: error.message || 'Failed to delete booking.' });
        }
    };

    const applyAdminFilters = async () => {
        try {
            const all = await getAllBookings(adminFilters);
            setAdminBookings(all || []);
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to fetch filtered bookings.' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
                <p className="text-lg font-semibold">Preparing booking workspace...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-cyan-500/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none"></div>
            
            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                <div className="rounded-3xl border border-white/5 bg-slate-900/40 backdrop-blur-xl p-8 shadow-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400 font-semibold mb-2">Module B</p>
                            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Booking Command Center</h1>
                            <p className="text-slate-400 mt-2 text-lg font-medium">
                                Submit requests, track workflow, and handle approvals with conflict-safe scheduling.
                            </p>
                        </div>
                        <button
                            onClick={() => (window.location.href = '/dashboard')}
                            className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/50 transition-all duration-300 font-medium"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>

                {feedback.message && (
                    <div
                        className={`rounded-xl border px-4 py-3 ${
                            feedback.type === 'error'
                                ? 'border-rose-500/60 bg-rose-900/20 text-rose-200'
                                : 'border-emerald-500/60 bg-emerald-900/20 text-emerald-200'
                        }`}
                    >
                        {feedback.message}
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <form onSubmit={handleCreate} className="xl:col-span-1 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl space-y-5">
                        <h2 className="text-2xl font-bold tracking-tight mb-2">New Request</h2>

                        <div className="space-y-4">
                            <select
                                value={formData.resourceId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, resourceId: e.target.value }))}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                                required
                            >
                                <option value="">Select resource</option>
                                {resources.map((resource) => (
                                    <option key={resource.id} value={resource.id}>
                                        {resource.name} ({resource.location})
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={formData.bookingDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, bookingDate: e.target.value }))}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                                    required
                                />
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                                    required
                                />
                            </div>

                            <input
                                type="number"
                                min="0"
                                value={formData.expectedAttendees}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, expectedAttendees: e.target.value }))
                                }
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all"
                                placeholder="Expected attendees"
                                required
                            />

                            <textarea
                                value={formData.purpose}
                                onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 outline-none transition-all resize-none"
                                placeholder="Purpose of booking"
                                rows={4}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3.5 shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                            {submitting ? 'Submitting...' : 'Submit Booking'}
                        </button>
                    </form>

                    <section className="xl:col-span-2 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl flex flex-col">
                        <h2 className="text-2xl font-bold tracking-tight mb-6">My Bookings</h2>
                        <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {myBookings.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                                    <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                    <p className="text-lg font-medium">No bookings yet</p>
                                </div>
                            )}
                            {myBookings.map((booking) => (
                                <div key={booking.id} className="group rounded-xl border border-white/5 bg-slate-950/60 p-5 hover:bg-slate-800/80 hover:border-white/10 hover:shadow-lg transition-all duration-300">
                                    <div className="flex flex-wrap justify-between gap-4">
                                        <div>
                                            <p className="font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">{booking.resourceName || resourceMap[booking.resourceId]?.name || 'Resource'}</p>
                                            <p className="text-sm text-slate-400 font-medium tracking-wide mt-1">
                                                {booking.bookingDate} &bull; {booking.startTime} - {booking.endTime}
                                            </p>
                                            <p className="text-sm text-slate-300 mt-3 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-white/5">{booking.purpose}</p>
                                        </div>
                                        <div className="flex flex-col items-end justify-between">
                                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider ${statusColor[booking.status] || ''}`}>
                                                {booking.status}
                                            </span>
                                            {(booking.status === 'PENDING' || booking.status === 'APPROVED') && (
                                                <button
                                                    onClick={() => handleCancel(booking.id)}
                                                    className="mt-4 px-4 py-2 text-sm font-medium rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                                                >
                                                    Cancel booking
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {isAdmin && (
                    <section className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 pb-6 border-b border-white/5">
                            <h2 className="text-2xl font-bold tracking-tight">Admin Review Queue</h2>
                            <div className="flex flex-wrap items-center gap-3">
                                <select
                                    value={adminFilters.status}
                                    onChange={(e) => setAdminFilters((prev) => ({ ...prev, status: e.target.value }))}
                                    className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-sm"
                                >
                                    <option value="">All statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                                <input
                                    type="date"
                                    value={adminFilters.fromDate}
                                    onChange={(e) => setAdminFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                                    className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-sm"
                                />
                                <span className="text-slate-500 font-medium">to</span>
                                <input
                                    type="date"
                                    value={adminFilters.toDate}
                                    onChange={(e) => setAdminFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                                    className="bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all text-sm"
                                />
                                <button
                                    onClick={applyAdminFilters}
                                    className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 font-semibold transition-colors"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {adminBookings.length === 0 && (
                                <div className="flex flex-col items-center justify-center text-slate-500 py-8">
                                    <p className="text-lg font-medium">No bookings match the selected filters.</p>
                                </div>
                            )}
                            {adminBookings.map((booking) => (
                                <div key={booking.id} className="group rounded-xl border border-white/5 bg-slate-950/60 p-5 hover:bg-slate-800/80 hover:border-white/10 hover:shadow-lg transition-all duration-300">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-bold text-lg text-white group-hover:text-cyan-300 transition-colors">{booking.resourceName || 'Resource'}</p>
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${statusColor[booking.status] || ''}`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 font-medium flex items-center gap-2">
                                                <span className="text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">{booking.requesterEmail}</span>
                                                <span>&bull;</span>
                                                <span>{booking.bookingDate}</span>
                                                <span>&bull;</span>
                                                <span>{booking.startTime} - {booking.endTime}</span>
                                            </p>
                                            <p className="text-sm mt-3 text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-white/5">{booking.purpose}</p>
                                        </div>
                                        <div className="flex items-start md:items-center justify-end">
                                            {booking.status === 'PENDING' && (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={() => handleDecision(booking.id, 'APPROVED')}
                                                        className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900 text-sm font-bold transition-all shadow-sm"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecision(booking.id, 'REJECTED')}
                                                        className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white text-sm font-bold transition-all shadow-sm"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(booking.id)}
                                                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white text-sm font-bold transition-all shadow-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default BookingsPage;
