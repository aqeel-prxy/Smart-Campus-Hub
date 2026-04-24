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
    category: 'GENERAL',
    priority: 'MEDIUM',
    description: '',
    preferredContact: 'email',
    imageAttachments: [],
};

const TicketsPage = () => {
    const [user, setUser] = useState(null);
    const [tickets, setTickets] = useState([]);
    const [formData, setFormData] = useState(initialTicket);
    const [commentInputs, setCommentInputs] = useState({});
    const [feedback, setFeedback] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [assignForm, setAssignForm] = useState({
        status: 'IN_PROGRESS',
        assignedToEmail: '',
        resolutionNotes: ''
    });
    
    // Debug: Log user object to check role detection
    console.log('TicketsPage - User object:', user);
    console.log('TicketsPage - Is admin:', isAdmin);

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
                setIsAdmin(userData?.roles?.includes('ROLE_ADMIN'));
                await loadTickets(userData);
            } catch (error) {
                setFeedback(`Failed to load tickets: ${error.message}`);
            }
        };
        init();
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 3) {
            setFeedback('Maximum 3 files allowed');
            return;
        }
        
        const validFiles = files.filter(file => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            if (!validTypes.includes(file.type)) {
                setFeedback(`Invalid file type: ${file.name}. Only JPG, PNG, GIF allowed`);
                return false;
            }
            
            if (file.size > maxSize) {
                setFeedback(`File too large: ${file.name}. Maximum 5MB allowed`);
                return false;
            }
            
            return true;
        });
        
        setSelectedFiles(validFiles);
    };

    const uploadImages = async () => {
        if (selectedFiles.length === 0) return [];
        
        setUploading(true);
        try {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });
            
            const response = await fetch('/api/tickets/upload', {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }
            
            const result = await response.json();
            return result.files.split(',');
        } catch (error) {
            setFeedback(`Upload failed: ${error.message}`);
            return [];
        } finally {
            setUploading(false);
        }
    };

    const submitTicket = async (e) => {
        e.preventDefault();
        try {
            let imageAttachments = [];
            
            // Upload images first if any selected
            if (selectedFiles.length > 0) {
                imageAttachments = await uploadImages();
                if (imageAttachments.length === 0) {
                    return; // Upload failed
                }
            }
            
            // Create ticket with image attachments
            const ticketData = {
                ...formData,
                imageAttachments
            };
            
            await createTicket(ticketData);
            setFormData(initialTicket);
            setSelectedFiles([]);
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

    const openAssignModal = (ticket) => {
        setSelectedTicket(ticket);
        setAssignForm({
            status: ticket.status || 'IN_PROGRESS',
            assignedToEmail: ticket.assignedToEmail || '',
            resolutionNotes: ticket.resolutionNotes || ''
        });
        setShowAssignModal(true);
    };

    const handleAssignTicket = async () => {
        if (!selectedTicket) return;
        try {
            await updateTicketStatus(selectedTicket.id, assignForm);
            setShowAssignModal(false);
            setFeedback('Ticket assigned successfully!');
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Assignment failed: ${error.message}`);
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Header */}
                <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 backdrop-blur-sm p-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 to-blue-600/10"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                            <p className="text-sm font-medium text-cyan-300 uppercase tracking-wider">Module C</p>
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-3">
                            Maintenance & Incident Ticketing
                        </h1>
                        <p className="text-slate-300 text-lg">Professional incident management with real-time tracking and technician assignment</p>
                        {isAdmin && (
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-full">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                                <span className="text-cyan-300 text-sm font-medium">Admin Access</span>
                            </div>
                        )}
                    </div>
                </header>
                {feedback && (
                    <div className="rounded-xl border border-cyan-700/60 bg-cyan-900/20 px-4 py-2 text-cyan-100 text-sm">
                        {feedback}
                    </div>
                )}

                {/* Statistics Cards */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(counts).map(([key, value]) => (
                        <div key={key} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm p-6 hover:border-cyan-500/30 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">{key.replace('_', ' ')}</p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mt-2">{value}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Ticket Creation Form */}
                    <div className="xl:col-span-1">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Create New Ticket</h2>
                                </div>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Issue Title</label>
                                        <input
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                            placeholder="Brief description of the issue"
                                            value={formData.title}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                                        <input
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                            placeholder="Where is the issue located?"
                                            value={formData.location}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                                            <select
                                                className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                                value={formData.category}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                                            >
                                                <option value="GENERAL">General</option>
                                                <option value="EQUIPMENT">Equipment</option>
                                                <option value="FACILITY">Facility</option>
                                                <option value="NETWORK">Network</option>
                                            </select>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                                            <select
                                                className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                                value={formData.priority}
                                                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="CRITICAL">Critical</option>
                                            </select>
                                        </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                                        <textarea
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                                            placeholder="Detailed description of the incident..."
                                            rows={4}
                                            value={formData.description}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    
                                    {/* Image Upload Section */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Attach Images (max 3 files, 5MB each)</label>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/jpeg,image/jpg,image/png,image/gif"
                                            onChange={handleFileSelect}
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-white hover:file:bg-cyan-400 transition-all"
                                        />
                                        
                                        {selectedFiles.length > 0 && (
                                            <div className="mt-3 space-y-2">
                                                <p className="text-xs text-slate-400">Selected files:</p>
                                                {selectedFiles.map((file, index) => (
                                                    <div key={index} className="flex items-center justify-between text-xs bg-slate-800/50 rounded-lg px-3 py-2">
                                                        <span className="text-slate-300">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                                            className="text-red-400 hover:text-red-300 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {uploading && (
                                            <div className="mt-2 text-xs text-cyan-400 flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                                Uploading images...
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        className="w-full mt-6 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-3 px-4 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                        disabled={uploading}
                                    >
                                        {uploading ? 'Creating Ticket...' : 'Submit Ticket'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                                onChange={handleFileSelect}
                                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400"
                            />
                            
                            {selectedFiles.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs text-slate-400">Selected files:</p>
                                    {selectedFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between text-xs bg-slate-800 rounded px-2 py-1">
                                            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {uploading && (
                                <div className="text-xs text-cyan-400">Uploading images...</div>
                            )}
                        </div>
                        
                        <button 
                            className="w-full rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2 disabled:opacity-50"
                            disabled={uploading}
                        >
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
                                            
                                            {/* Image Attachments Display */}
                                            {ticket.imageAttachments && ticket.imageAttachments.length > 0 && (
                                                <div className="mt-2">
                                                    <p className="text-xs text-slate-400 mb-1">Attached Images:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {ticket.imageAttachments.map((image, index) => (
                                                            <div key={index} className="relative group">
                                                                <img
                                                                    src={`/api/tickets/images/${image}`}
                                                                    alt={`Attachment ${index + 1}`}
                                                                    className="w-16 h-16 object-cover rounded border border-slate-700 cursor-pointer hover:border-cyan-400 transition-colors"
                                                                    onClick={() => window.open(`/api/tickets/images/${image}`, '_blank')}
                                                                />
                                                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                                                                    <span className="text-white text-xs">View</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
