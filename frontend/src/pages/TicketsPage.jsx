import { useEffect, useMemo, useState } from 'react';
import {
    addTicketComment,
    createTicket,
    deleteTicketComment,
    editTicketComment,
    fetchFromAPI,
    getAllTickets,
    getMyTickets,
    updateTicketStatus,
} from '../services/api';

const initialTicket = {
    title: '',
    location: '',
    priority: 'MEDIUM',
    description: '',
};

const TicketsPage = () => {
    const [user, setUser] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [formData, setFormData] = useState(initialTicket);
    const [commentInputs, setCommentInputs] = useState({});
    const [feedback, setFeedback] = useState('');
    const isAdmin = user?.roles?.includes('ROLE_ADMIN');

    const counts = useMemo(() => {
        return tickets.reduce(
            (acc, item) => {
                acc[item.status] = (acc[item.status] || 0) + 1;
                return acc;
            },
            { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 }
        );
    }, [tickets]);

    const loadTickets = async (currentUser) => {
        const data = currentUser?.roles?.includes('ROLE_ADMIN') ? await getAllTickets() : await getMyTickets();
        setTickets(Array.isArray(data) ? data : []);
    };

    useEffect(() => {
        const init = async () => {
            try {
                const userData = await fetchFromAPI('/auth/user');
                if (!userData?.authenticated) {
                    window.location.href = '/';
                    return;
                }
                setUser(userData);
                await loadTickets(userData);
            } catch (error) {
                setFeedback(`Failed to load tickets: ${error.message}`);
            }
        };
        init();
    }, []);

    const submitTicket = async (e) => {
        e.preventDefault();
        try {
            await createTicket(formData);
            setFormData(initialTicket);
            setFeedback('Ticket created successfully.');
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Ticket creation failed: ${error.message}`);
        }
    };

    const updateStatus = async (id, status) => {
        if (!isAdmin) return;
        try {
            await updateTicketStatus(id, { status });
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Status update failed: ${error.message}`);
        }
    };

    const submitComment = async (ticketId) => {
        const text = (commentInputs[ticketId] || '').trim();
        if (!text) return;
        try {
            await addTicketComment(ticketId, text);
            setCommentInputs((prev) => ({ ...prev, [ticketId]: '' }));
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Comment failed: ${error.message}`);
        }
    };

    const handleEditComment = async (ticketId, comment) => {
        const nextText = window.prompt('Edit comment', comment.text);
        if (!nextText || nextText.trim() === comment.text) return;
        try {
            await editTicketComment(ticketId, comment.id, nextText.trim());
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Edit failed: ${error.message}`);
        }
    };

    const handleDeleteComment = async (ticketId, commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await deleteTicketComment(ticketId, commentId);
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Delete failed: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Module C</p>
                    <h1 className="text-3xl font-black mt-2">Maintenance & Incident Ticketing</h1>
                    <p className="text-slate-400 mt-2">Create incidents and track operational resolution workflow.</p>
                </header>
                {feedback && (
                    <div className="rounded-xl border border-cyan-700/60 bg-cyan-900/20 px-4 py-2 text-cyan-100 text-sm">
                        {feedback}
                    </div>
                )}

                <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(counts).map(([key, value]) => (
                        <div key={key} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                            <p className="text-xs text-slate-400">{key.replace('_', ' ')}</p>
                            <p className="text-2xl font-bold">{value}</p>
                        </div>
                    ))}
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <form onSubmit={submitTicket} className="xl:col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
                        <h2 className="text-xl font-semibold">Create Ticket</h2>
                        <input
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            placeholder="Issue title"
                            value={formData.title}
                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                            required
                        />
                        <input
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            placeholder="Location"
                            value={formData.location}
                            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                            required
                        />
                        <select
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            value={formData.priority}
                            onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="CRITICAL">Critical</option>
                        </select>
                        <textarea
                            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2"
                            placeholder="Describe the incident"
                            rows={4}
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            required
                        />
                        <button className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2">
                            Submit Ticket
                        </button>
                    </form>

                    <section className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Live Ticket Queue</h2>
                            <button
                                onClick={() => (window.location.href = '/dashboard')}
                                className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:border-cyan-400"
                            >
                                Back
                            </button>
                        </div>
                        <div className="mt-4 space-y-3">
                            {tickets.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-slate-400">
                                    No tickets yet. Create one from the form.
                                </div>
                            )}
                            {tickets.map((ticket) => (
                                <div key={ticket.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                                    <div className="flex flex-wrap justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{ticket.title}</p>
                                            <p className="text-xs text-slate-400">
                                                {ticket.id} | {ticket.location} | {ticket.createdAt}
                                            </p>
                                            <p className="text-sm mt-1 text-slate-300">{ticket.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block rounded-full bg-cyan-900/40 border border-cyan-700 px-2 py-0.5 text-xs text-cyan-200">
                                                {ticket.priority}
                                            </span>
                                            <p className="mt-2 text-xs text-slate-400">Status</p>
                                            <select
                                                value={ticket.status}
                                                onChange={(e) => updateStatus(ticket.id, e.target.value)}
                                                className="mt-1 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-sm"
                                                disabled={!isAdmin}
                                            >
                                                <option value="OPEN">OPEN</option>
                                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                <option value="RESOLVED">RESOLVED</option>
                                                <option value="CLOSED">CLOSED</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                                        <p className="text-xs uppercase tracking-wide text-slate-400">Comments</p>
                                        {(ticket.comments || []).length === 0 && (
                                            <p className="text-xs text-slate-500">No comments yet.</p>
                                        )}
                                        {(ticket.comments || []).map((comment) => (
                                            <div key={comment.id} className="rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs text-slate-400">{comment.authorEmail}</p>
                                                    {(isAdmin || user?.email === comment.authorEmail) && (
                                                        <div className="flex gap-2 text-xs">
                                                            <button onClick={() => handleEditComment(ticket.id, comment)} className="text-cyan-300">Edit</button>
                                                            <button onClick={() => handleDeleteComment(ticket.id, comment.id)} className="text-rose-300">Delete</button>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-200">{comment.text}</p>
                                            </div>
                                        ))}
                                        <div className="flex gap-2">
                                            <input
                                                value={commentInputs[ticket.id] || ''}
                                                onChange={(e) =>
                                                    setCommentInputs((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                                                }
                                                placeholder="Add comment"
                                                className="flex-1 rounded bg-slate-800 border border-slate-700 px-2 py-1 text-sm"
                                            />
                                            <button
                                                onClick={() => submitComment(ticket.id)}
                                                className="rounded bg-cyan-600 px-2 py-1 text-xs font-semibold"
                                            >
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default TicketsPage;
