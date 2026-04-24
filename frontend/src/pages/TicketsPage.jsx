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
    const [isTechnician, setIsTechnician] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [assignForm, setAssignForm] = useState({
        status: 'IN_PROGRESS',
        assignedToEmail: '',
        resolutionNotes: ''
    });

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
        console.log('Loading tickets for user:', currentUser?.email);
        console.log('User roles:', currentUser?.roles);
        console.log('Is admin:', currentUser?.roles?.includes('ROLE_ADMIN'));
        
        const isAdmin = currentUser?.roles?.includes('ROLE_ADMIN');
        const data = isAdmin ? await getAllTickets() : await getMyTickets();
        console.log('Tickets loaded:', data);
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
                // Check if user is assigned to any ticket as technician
                const assignedTickets = await getAllTickets();
                const isAssignedTechnician = assignedTickets.some(ticket => ticket.assignedToEmail === userData.email);
                setIsTechnician(isAssignedTechnician);
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
        
        // For now, just return file names as strings
        // In production, you'd upload to a file storage service
        setUploading(true);
        try {
            // Simulate upload delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const fileNames = selectedFiles.map(file => file.name);
            return fileNames;
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
            
            if (selectedFiles.length > 0) {
                imageAttachments = await uploadImages();
                if (imageAttachments.length === 0) {
                    return;
                }
            }
            
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
        try {
            await updateTicketStatus(id, { status });
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Status update failed: ${error.message}`);
        }
    };

    const canUpdateTicket = (ticket) => {
        return isAdmin || ticket.assignedToEmail === user?.email;
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
                                
                                <form onSubmit={submitTicket} className="space-y-4">
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
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Preferred Contact Method</label>
                                        <select
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                            value={formData.preferredContact}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, preferredContact: e.target.value }))}
                                        >
                                            <option value="email">Email</option>
                                            <option value="phone">Phone</option>
                                            <option value="both">Both Email and Phone</option>
                                        </select>
                                    </div>
                                    
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
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Tickets List */}
                    <section className="xl:col-span-2">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 backdrop-blur-sm p-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <h2 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Live Ticket Queue</h2>
                                    </div>
                                    <button
                                        onClick={() => (window.location.href = '/dashboard')}
                                        className="rounded-lg border border-slate-600/50 px-4 py-2 text-sm hover:border-cyan-500/50 transition-all duration-300"
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {tickets.length === 0 && (
                                        <div className="rounded-lg border border-dashed border-slate-600/50 p-8 text-center text-slate-400">
                                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                </svg>
                                            </div>
                                            <p>No tickets yet. Create one from the form.</p>
                                        </div>
                                    )}
                                    
                                    {tickets.map((ticket) => (
                                        <div key={ticket.id} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-slate-700/50 p-6 hover:border-cyan-500/30 transition-all duration-300">
                                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
                                            <div className="relative z-10">
                                                <div className="flex flex-wrap justify-between gap-4 mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-lg font-semibold text-white">{ticket.title}</h3>
                                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                                ticket.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                                                                ticket.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                                                                ticket.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                                                'bg-green-500/20 text-green-300 border border-green-500/30'
                                                            }`}>
                                                                {ticket.priority}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                                {ticket.location}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                </svg>
                                                                {ticket.preferredContact || 'email'}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-300 mb-3">{ticket.description}</p>
                                                        
                                                        {ticket.assignedToEmail && (
                                                            <div className="flex items-center gap-2 text-sm text-cyan-300 mb-3">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                                </svg>
                                                                Assigned to: {ticket.assignedToEmail}
                                                            </div>
                                                        )}
                                                        
                                                        {ticket.imageAttachments && ticket.imageAttachments.length > 0 && (
                                                            <div className="mb-3">
                                                                <p className="text-xs text-slate-400 mb-2">Attached Images:</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {ticket.imageAttachments.map((image, index) => (
                                                                        <div key={index} className="relative group">
                                                                            <div className="w-16 h-16 rounded-lg border border-slate-600/50 cursor-pointer hover:border-cyan-400/50 transition-all bg-slate-700/50 flex items-center justify-center overflow-hidden">
                                                                                {image.includes('.') && (image.endsWith('.jpg') || image.endsWith('.jpeg') || image.endsWith('.png') || image.endsWith('.gif')) ? (
                                                                                    <img
                                                                                        src={`https://picsum.photos/seed/${image}/64/64.jpg`}
                                                                                        alt={`Attachment ${index + 1}`}
                                                                                        className="w-full h-full object-cover"
                                                                                        onError={(e) => {
                                                                                            e.target.style.display = 'none';
                                                                                            e.target.nextElementSibling.style.display = 'flex';
                                                                                        }}
                                                                                    />
                                                                                ) : null}
                                                                                <div className="absolute inset-0 bg-slate-700/50 flex items-center justify-center">
                                                                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                                    </svg>
                                                                                </div>
                                                                            </div>
                                                                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                                                                {image}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        <div>
                                                            <p className="text-xs text-slate-400 mb-1">Status</p>
                                                            <select
                                                                value={ticket.status}
                                                                onChange={(e) => updateStatus(ticket.id, e.target.value)}
                                                                className="rounded-lg bg-slate-800/50 border border-slate-600/50 px-3 py-2 text-sm focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                                                disabled={!canUpdateTicket(ticket)}
                                                            >
                                                                <option value="OPEN">OPEN</option>
                                                                <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                                <option value="RESOLVED">RESOLVED</option>
                                                                <option value="CLOSED">CLOSED</option>
                                                                <option value="REJECTED">REJECTED</option>
                                                            </select>
                                                        </div>
                                                        
                                                        {(isAdmin || canUpdateTicket(ticket)) && (
                                                            <button
                                                                onClick={() => openAssignModal(ticket)}
                                                                className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-4 py-2 text-sm font-medium text-white transition-all duration-300 transform hover:scale-[1.02]"
                                                            >
                                                                {isAdmin ? 'Assign Technician' : 'Update Ticket'}
                                                            </button>
                                                        )}
                                                        
                                                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                            ticket.status === 'OPEN' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                                            ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                                            ticket.status === 'RESOLVED' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                                                            ticket.status === 'CLOSED' ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30' :
                                                            'bg-red-500/20 text-red-300 border border-red-500/30'
                                                        }`}>
                                                            {ticket.status}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Comments Section */}
                                                <div className="border-t border-slate-700/50 pt-4">
                                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Comments</p>
                                                    {(ticket.comments || []).length === 0 ? (
                                                        <p className="text-xs text-slate-500 mb-3">No comments yet.</p>
                                                    ) : (
                                                        <div className="space-y-2 mb-3">
                                                            {(ticket.comments || []).map((comment) => (
                                                                <div key={comment.id} className="rounded-lg bg-slate-800/30 border border-slate-700/50 p-3">
                                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                                        <p className="text-xs text-slate-400">{comment.authorEmail}</p>
                                                                        {(isAdmin || user?.email === comment.authorEmail) && (
                                                                            <div className="flex gap-2 text-xs">
                                                                                <button onClick={() => handleEditComment(ticket.id, comment)} className="text-cyan-300 hover:text-cyan-200 transition-colors">Edit</button>
                                                                                <button onClick={() => handleDeleteComment(ticket.id, comment.id)} className="text-red-300 hover:text-red-200 transition-colors">Delete</button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-slate-200">{comment.text}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex gap-2">
                                                        <input
                                                            value={commentInputs[ticket.id] || ''}
                                                            onChange={(e) =>
                                                                setCommentInputs((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                                                            }
                                                            placeholder="Add comment..."
                                                            className="flex-1 rounded-lg bg-slate-800/50 border border-slate-600/50 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                                        />
                                                        <button
                                                            onClick={() => submitComment(ticket.id)}
                                                            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 px-3 py-2 text-xs font-semibold text-white transition-all duration-300"
                                                        >
                                                            Post
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Technician Assignment Modal */}
                {showAssignModal && selectedTicket && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-6 w-full max-w-md">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
                                    Assign Technician
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Ticket</label>
                                        <p className="text-slate-200">{selectedTicket.title}</p>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                                        <select
                                            value={assignForm.status}
                                            onChange={(e) => setAssignForm(prev => ({ ...prev, status: e.target.value }))}
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                        >
                                            <option value="OPEN">OPEN</option>
                                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                                            <option value="RESOLVED">RESOLVED</option>
                                            <option value="CLOSED">CLOSED</option>
                                            <option value="REJECTED">REJECTED</option>
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">Technician Email</label>
                                        <input
                                            type="email"
                                            value={assignForm.assignedToEmail}
                                            onChange={(e) => setAssignForm(prev => ({ ...prev, assignedToEmail: e.target.value }))}
                                            className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                                            placeholder="technician@campus.edu"
                                        />
                                    </div>
                                    
                                    {assignForm.status === 'REJECTED' ? (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Rejection Reason</label>
                                            <textarea
                                                value={assignForm.resolutionNotes}
                                                onChange={(e) => setAssignForm(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                                                className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                                                placeholder="Explain why this ticket is being rejected..."
                                                rows={3}
                                                required
                                            />
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Resolution Notes</label>
                                            <textarea
                                                value={assignForm.resolutionNotes}
                                                onChange={(e) => setAssignForm(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                                                className="w-full rounded-lg bg-slate-800/50 border border-slate-600/50 px-4 py-3 text-white placeholder-slate-400 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                                                placeholder="Add notes about the resolution..."
                                                rows={3}
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowAssignModal(false)}
                                        className="flex-1 rounded-lg border border-slate-600/50 px-4 py-2 text-sm hover:border-slate-500/50 transition-all duration-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAssignTicket}
                                        className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold py-2 px-4 transition-all duration-300"
                                    >
                                        Assign Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsPage;
