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
    uploadTicketImages,
    BASE_URL
} from '../services/api';

const UPLOADS_URL = BASE_URL.replace('/api', '') + '/uploads/';

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
    
    // UI States
    const [activeTab, setActiveTab] = useState('created');
    const [lightboxImage, setLightboxImage] = useState(null);
    
    // Modals
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [assignForm, setAssignForm] = useState({
        status: 'IN_PROGRESS',
        assignedToEmail: '',
        resolutionNotes: ''
    });
    const [resolveForm, setResolveForm] = useState({
        status: 'RESOLVED',
        resolutionNotes: ''
    });

    const loadTickets = async (currentUser) => {
        const adminStatus = currentUser?.roles?.includes('ROLE_ADMIN');
        const data = adminStatus ? await getAllTickets() : await getMyTickets();
        const loadedTickets = Array.isArray(data) ? data : [];
        setTickets(loadedTickets);
        
        const isAssignedTechnician = loadedTickets.some(ticket => ticket.assignedToEmail === currentUser?.email);
        setIsTechnician(isAssignedTechnician);

        // Set default tab based on role
        if (adminStatus) setActiveTab('all');
        else if (isAssignedTechnician) setActiveTab('assigned');
        else setActiveTab('created');
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

    const filteredTickets = useMemo(() => {
        if (activeTab === 'all') return tickets;
        if (activeTab === 'created') return tickets.filter(t => t.createdByEmail === user?.email);
        if (activeTab === 'assigned') return tickets.filter(t => t.assignedToEmail === user?.email);
        return tickets;
    }, [tickets, activeTab, user]);

    const counts = useMemo(() => {
        return filteredTickets.reduce(
            (acc, item) => {
                acc[item.status] = (acc[item.status] || 0) + 1;
                return acc;
            },
            { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 }
        );
    }, [filteredTickets]);

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
            const uploadData = new FormData();
            selectedFiles.forEach(file => uploadData.append('images', file));
            const result = await uploadTicketImages(uploadData);
            return result.fileNames || [];
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
                if (imageAttachments.length === 0) return;
            }
            
            const ticketData = { ...formData, imageAttachments };
            await createTicket(ticketData);
            setFormData(initialTicket);
            setSelectedFiles([]);
            setFeedback('Ticket created successfully.');
            await loadTickets(user);
            setActiveTab('created'); // Switch to created tab to see new ticket
        } catch (error) {
            setFeedback(`Ticket creation failed: ${error.message}`);
        }
    };

    const updateStatus = async (ticket, status) => {
        const tId = ticket.id || ticket._id;
        try {
            await updateTicketStatus(tId, { status });
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Status update failed: ${error.message}`);
        }
    };

    const canUpdateTicket = (ticket) => {
        return isAdmin || ticket.assignedToEmail === user?.email;
    };

    const openAssignModal = (ticket) => {
        const tId = ticket.id || ticket._id;
        setSelectedTicket({ ...ticket, id: tId });
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

    const openResolveModal = (ticket) => {
        const tId = ticket.id || ticket._id;
        setSelectedTicket({ ...ticket, id: tId });
        setResolveForm({
            status: 'RESOLVED',
            resolutionNotes: ticket.resolutionNotes || ''
        });
        setShowResolveModal(true);
    };

    const handleResolveTicket = async () => {
        if (!selectedTicket) return;
        try {
            await updateTicketStatus(selectedTicket.id, resolveForm);
            setShowResolveModal(false);
            setFeedback('Ticket marked as resolved!');
            await loadTickets(user);
        } catch (error) {
            setFeedback(`Resolution failed: ${error.message}`);
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

    const clearFeedback = () => setFeedback('');
    if (feedback) setTimeout(clearFeedback, 5000); // auto-clear

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-cyan-500/30 font-sans pb-12">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]"></div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8 relative z-10">
                {/* Header */}
                <header className="relative overflow-hidden rounded-3xl bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,211,238,0.6)]"></div>
                        <p className="text-sm font-semibold text-cyan-400 uppercase tracking-[0.2em]">Module C</p>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
                        Maintenance & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Ticketing</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl">Streamlined incident management for a smarter campus experience.</p>
                    
                    <div className="mt-6 flex gap-3">
                        {isAdmin && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 text-sm font-semibold shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                Admin Dashboard
                            </span>
                        )}
                        {isTechnician && !isAdmin && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm font-semibold shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                Technician Dashboard
                            </span>
                        )}
                    </div>
                </header>

                {/* Notifications */}
                <div className={`transition-all duration-500 overflow-hidden ${feedback ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 backdrop-blur-md px-6 py-4 flex items-center gap-3">
                        <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-cyan-100 font-medium">{feedback}</span>
                        <button onClick={clearFeedback} className="ml-auto text-cyan-400/50 hover:text-cyan-400"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>

                {/* Dashboard Tabs */}
                <div className="flex gap-2 p-1 bg-slate-900/50 border border-slate-800 rounded-2xl w-fit backdrop-blur-xl">
                    {isAdmin && (
                        <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'all' ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>All Tickets</button>
                    )}
                    {(isTechnician || isAdmin) && (
                        <button onClick={() => setActiveTab('assigned')} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'assigned' ? 'bg-slate-800 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.1)] border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
                            <div className="flex items-center gap-2">
                                Assigned To Me
                                {tickets.filter(t => t.assignedToEmail === user?.email && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length > 0 && (
                                    <span className="bg-cyan-500 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">
                                        {tickets.filter(t => t.assignedToEmail === user?.email && t.status !== 'CLOSED' && t.status !== 'RESOLVED').length}
                                    </span>
                                )}
                            </div>
                        </button>
                    )}
                    <button onClick={() => setActiveTab('created')} className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'created' ? 'bg-slate-800 text-white shadow-lg border border-slate-700' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>My Created Tickets</button>
                </div>

                {/* Statistics Cards */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(counts).map(([key, value]) => (
                        <div key={key} className="group relative overflow-hidden rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl p-6 hover:border-cyan-500/30 transition-all duration-500">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-2 h-2 rounded-full ${key === 'OPEN' ? 'bg-blue-400' : key === 'IN_PROGRESS' ? 'bg-yellow-400' : key === 'RESOLVED' ? 'bg-green-400' : 'bg-slate-500'}`}></div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{key.replace('_', ' ')}</p>
                                </div>
                                <p className="text-4xl font-light text-white">{value}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Ticket Creation Form */}
                    <div className="xl:col-span-1">
                        <div className="sticky top-6 rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl p-6 shadow-2xl">
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Create Ticket
                            </h2>
                            <form onSubmit={submitTicket} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Issue Title</label>
                                    <input
                                        className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                                        placeholder="e.g. Broken projector in Room 101"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Location</label>
                                    <input
                                        className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300"
                                        placeholder="e.g. Building A, 2nd Floor"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        required
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300 cursor-pointer"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            >
                                                <option value="GENERAL">General</option>
                                                <option value="EQUIPMENT">Equipment</option>
                                                <option value="FACILITY">Facility</option>
                                                <option value="NETWORK">Network</option>
                                            </select>
                                            <svg className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Priority</label>
                                        <div className="relative">
                                            <select
                                                className="w-full appearance-none rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300 cursor-pointer"
                                                value={formData.priority}
                                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                            >
                                                <option value="LOW">Low</option>
                                                <option value="MEDIUM">Medium</option>
                                                <option value="HIGH">High</option>
                                                <option value="CRITICAL">Critical</option>
                                            </select>
                                            <svg className="absolute right-4 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
                                    <textarea
                                        className="w-full rounded-xl bg-slate-950/50 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all duration-300 resize-none min-h-[120px]"
                                        placeholder="Detailed description of the incident..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attachments (Images)</label>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/jpeg,image/jpg,image/png,image/gif"
                                            onChange={handleFileSelect}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="border-2 border-dashed border-slate-700 rounded-xl px-4 py-6 text-center group-hover:border-cyan-500/50 group-hover:bg-cyan-500/5 transition-all duration-300">
                                            <svg className="w-6 h-6 text-slate-500 mx-auto mb-2 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span className="text-sm font-medium text-slate-300">Click or drag images here</span>
                                            <p className="text-xs text-slate-500 mt-1">Max 3 files, 5MB each</p>
                                        </div>
                                    </div>
                                    
                                    {selectedFiles.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {selectedFiles.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2">
                                                    <span className="text-xs text-slate-300 truncate mr-2">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <button 
                                    className="w-full mt-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-4 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2"
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Uploading...</>
                                    ) : (
                                        <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> Submit Ticket</>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Tickets List */}
                    <section className="xl:col-span-2 space-y-4">
                        {filteredTickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 rounded-3xl bg-slate-900/20 border border-dashed border-slate-800 text-slate-500">
                                <svg className="w-16 h-16 mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                <p className="text-lg">No tickets found in this view.</p>
                            </div>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <div key={ticket.id || ticket._id} className="group overflow-hidden rounded-3xl bg-slate-900/40 border border-slate-800 backdrop-blur-xl hover:border-cyan-500/20 hover:bg-slate-900/60 transition-all duration-300 shadow-xl">
                                    <div className="p-6">
                                        {/* Ticket Header */}
                                        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">{ticket.title}</h3>
                                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                                        ticket.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        ticket.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                        ticket.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                        'bg-green-500/10 text-green-400 border-green-500/20'
                                                    }`}>{ticket.priority}</span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-400">
                                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{ticket.location}</span>
                                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{new Date(ticket.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>{ticket.category}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide border ${
                                                    ticket.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]' :
                                                    ticket.status === 'IN_PROGRESS' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]' :
                                                    ticket.status === 'RESOLVED' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                                                    ticket.status === 'CLOSED' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>{ticket.status.replace('_', ' ')}</div>
                                                
                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-1">
                                                    {isAdmin && (
                                                        <button onClick={() => openAssignModal(ticket)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors">
                                                            {ticket.assignedToEmail ? 'Reassign' : 'Assign'}
                                                        </button>
                                                    )}
                                                    {canUpdateTicket(ticket) && ticket.assignedToEmail === user?.email && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                                                        <button onClick={() => openResolveModal(ticket)} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-semibold text-cyan-400 rounded-lg transition-colors shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                                                            Resolve
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-slate-300 text-sm leading-relaxed mb-4">{ticket.description}</p>
                                        
                                        {/* Status updates / Notes */}
                                        {(ticket.assignedToEmail || ticket.resolutionNotes) && (
                                            <div className="bg-slate-950/50 rounded-xl p-4 mb-4 border border-slate-800/50 flex flex-col gap-2">
                                                {ticket.assignedToEmail && (
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-slate-500">Assigned Tech:</span>
                                                        <span className="text-cyan-400 font-medium">{ticket.assignedToEmail}</span>
                                                    </div>
                                                )}
                                                {ticket.resolutionNotes && (
                                                    <div className="text-sm border-t border-slate-800/50 pt-2 mt-1">
                                                        <span className="text-slate-500 block mb-1">Resolution Notes:</span>
                                                        <span className="text-green-400/90 italic">{ticket.resolutionNotes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Image Attachments */}
                                        {ticket.imageAttachments?.length > 0 && (
                                            <div className="mb-4">
                                                <div className="flex gap-3 overflow-x-auto pb-2">
                                                    {ticket.imageAttachments.map((imgName, i) => (
                                                        <div key={i} onClick={() => setLightboxImage(`${UPLOADS_URL}${imgName}`)} className="cursor-zoom-in relative rounded-xl overflow-hidden h-20 w-32 border border-slate-700/50 hover:border-cyan-500/50 transition-all flex-shrink-0 group/img">
                                                            <div className="absolute inset-0 bg-slate-900/20 group-hover/img:bg-transparent transition-all z-10"></div>
                                                            <img src={`${UPLOADS_URL}${imgName}`} alt="Attachment" className="w-full h-full object-cover transform group-hover/img:scale-110 transition-transform duration-500" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Comments Footer */}
                                    <div className="bg-slate-900/80 border-t border-slate-800/80 p-4 px-6">
                                        <div className="space-y-3 mb-4">
                                            {(ticket.comments || []).map((comment) => (
                                                <div key={comment.id} className="flex gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xs font-bold text-slate-300">{comment.authorEmail[0].toUpperCase()}</span>
                                                    </div>
                                                    <div className="flex-1 bg-slate-950/40 rounded-2xl rounded-tl-none px-4 py-3 border border-slate-800/50">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-xs font-semibold text-slate-400">{comment.authorEmail}</span>
                                                            {(isAdmin || user?.email === comment.authorEmail) && (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleEditComment(ticket.id || ticket._id, comment)} className="text-[10px] text-slate-500 hover:text-cyan-400 uppercase font-bold tracking-wider">Edit</button>
                                                                    <button onClick={() => handleDeleteComment(ticket.id || ticket._id, comment.id)} className="text-[10px] text-slate-500 hover:text-red-400 uppercase font-bold tracking-wider">Del</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-slate-300">{comment.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="flex gap-2 items-center relative">
                                            <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-cyan-400">{user?.email[0].toUpperCase() || 'U'}</span>
                                            </div>
                                            <input
                                                value={commentInputs[ticket.id || ticket._id] || ''}
                                                onChange={(e) => setCommentInputs({ ...commentInputs, [ticket.id || ticket._id]: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && submitComment(ticket.id || ticket._id)}
                                                placeholder="Write a comment..."
                                                className="flex-1 rounded-full bg-slate-950 border border-slate-700 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                            />
                                            <button onClick={() => submitComment(ticket.id || ticket._id)} className="absolute right-2 p-1.5 bg-slate-800 hover:bg-cyan-500 text-slate-400 hover:text-white rounded-full transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </section>
                </div>

                {/* Modals */}
                {/* 1. Admin Assign Modal */}
                {showAssignModal && selectedTicket && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="rounded-3xl bg-slate-900 border border-slate-700 p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                            <h3 className="text-2xl font-bold text-white mb-6">Assign Ticket</h3>
                            <div className="space-y-5">
                                <div><label className="text-xs font-semibold text-slate-400 uppercase">Technician Email</label>
                                <input type="email" value={assignForm.assignedToEmail} onChange={e => setAssignForm({...assignForm, assignedToEmail: e.target.value})} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white focus:border-cyan-500" placeholder="tech@campus.edu" /></div>
                                <div><label className="text-xs font-semibold text-slate-400 uppercase">Status</label>
                                <select value={assignForm.status} onChange={e => setAssignForm({...assignForm, status: e.target.value})} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white focus:border-cyan-500">
                                    <option value="OPEN">OPEN</option><option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="RESOLVED">RESOLVED</option><option value="CLOSED">CLOSED</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select></div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowAssignModal(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-colors">Cancel</button>
                                    <button onClick={handleAssignTicket} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors">Confirm Assignment</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Technician Resolve Modal */}
                {showResolveModal && selectedTicket && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="rounded-3xl bg-slate-900 border border-cyan-500/30 p-8 w-full max-w-md shadow-[0_0_50px_rgba(34,211,238,0.1)] relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-cyan-500"></div>
                            <h3 className="text-2xl font-bold text-white mb-2">Resolve Ticket</h3>
                            <p className="text-sm text-slate-400 mb-6">Add notes about how this incident was resolved.</p>
                            <div className="space-y-5">
                                <div><label className="text-xs font-semibold text-slate-400 uppercase">Resolution Notes</label>
                                <textarea value={resolveForm.resolutionNotes} onChange={e => setResolveForm({...resolveForm, resolutionNotes: e.target.value})} className="mt-1 w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-sm text-white focus:border-cyan-500 min-h-[100px]" placeholder="Replaced the faulty bulb..." required /></div>
                                <div className="flex gap-3 pt-4">
                                    <button onClick={() => setShowResolveModal(false)} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-colors">Cancel</button>
                                    <button onClick={handleResolveTicket} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-green-500 hover:from-cyan-400 hover:to-green-400 text-white font-semibold shadow-lg transition-colors">Mark Resolved</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Image Lightbox Modal */}
                {lightboxImage && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={() => setLightboxImage(null)}>
                        <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2" onClick={() => setLightboxImage(null)}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <img src={lightboxImage} alt="Fullscreen Attachment" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketsPage;
