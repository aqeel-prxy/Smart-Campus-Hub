import { useEffect, useMemo, useState } from 'react';
import {
    cancelBooking,
    createBooking,
    decideBooking,
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
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Module B</p>
                            <h1 className="text-3xl font-bold">Booking Command Center</h1>
                            <p className="text-slate-400 mt-1">
                                Submit requests, track workflow, and handle approvals with conflict-safe scheduling.
                            </p>
                        </div>
                        <button
                            onClick={() => (window.location.href = '/dashboard')}
                            className="px-4 py-2 rounded-xl border border-slate-700 hover:border-cyan-400 transition-colors"
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

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <form onSubmit={handleCreate} className="xl:col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4">
                        <h2 className="text-xl font-semibold">New Booking Request</h2>

                        <select
                            value={formData.resourceId}
                            onChange={(e) => setFormData((prev) => ({ ...prev, resourceId: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
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
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                            required
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                                required
                            />
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
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
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                            placeholder="Expected attendees"
                            required
                        />

                        <textarea
                            value={formData.purpose}
                            onChange={(e) => setFormData((prev) => ({ ...prev, purpose: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                            placeholder="Purpose"
                            rows={4}
                            required
                        />

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 transition-colors disabled:opacity-60"
                        >
                            {submitting ? 'Submitting...' : 'Submit Booking'}
                        </button>
                    </form>

                    <section className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
                        <div className="space-y-3">
                            {myBookings.length === 0 && <p className="text-slate-400">No bookings yet.</p>}
                            {myBookings.map((booking) => (
                                <div key={booking.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                    <div className="flex flex-wrap justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{booking.resourceName || resourceMap[booking.resourceId]?.name || 'Resource'}</p>
                                            <p className="text-sm text-slate-400">
                                                {booking.bookingDate} | {booking.startTime} - {booking.endTime}
                                            </p>
                                            <p className="text-sm text-slate-300 mt-1">{booking.purpose}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor[booking.status] || ''}`}>
                                                {booking.status}
                                            </span>
                                            {(booking.status === 'PENDING' || booking.status === 'APPROVED') && (
                                                <button
                                                    onClick={() => handleCancel(booking.id)}
                                                    className="block mt-3 text-sm text-rose-300 hover:text-rose-200"
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
                    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <div className="flex flex-wrap justify-between gap-3 mb-4">
                            <h2 className="text-xl font-semibold">Admin Review Queue</h2>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={adminFilters.status}
                                    onChange={(e) => setAdminFilters((prev) => ({ ...prev, status: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
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
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                                />
                                <input
                                    type="date"
                                    value={adminFilters.toDate}
                                    onChange={(e) => setAdminFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                                />
                                <button
                                    onClick={applyAdminFilters}
                                    className="rounded-lg bg-slate-200 text-slate-900 px-3 py-2 font-semibold"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {adminBookings.length === 0 && <p className="text-slate-400">No bookings for selected filter.</p>}
                            {adminBookings.map((booking) => (
                                <div key={booking.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                    <div className="flex flex-wrap justify-between gap-3">
                                        <div>
                                            <p className="font-semibold">{booking.resourceName}</p>
                                            <p className="text-sm text-slate-400">
                                                {booking.requesterEmail} | {booking.bookingDate} | {booking.startTime}-{booking.endTime}
                                            </p>
                                            <p className="text-sm mt-1 text-slate-300">{booking.purpose}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor[booking.status] || ''}`}>
                                                {booking.status}
                                            </span>
                                            {booking.status === 'PENDING' && (
                                                <div className="flex gap-2 mt-3">
                                                    <button
                                                        onClick={() => handleDecision(booking.id, 'APPROVED')}
                                                        className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleDecision(booking.id, 'REJECTED')}
                                                        className="px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-sm font-semibold"
                                                    >
                                                        Reject
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
