import { useState, useEffect, useRef } from 'react';
import { fetchFromAPI } from '../services/api'; 

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const FacilitiesPage = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterLocation, setFilterLocation] = useState('');
    const [filterMinCapacity, setFilterMinCapacity] = useState('');
    const [filterMaxCapacity, setFilterMaxCapacity] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', type: 'LECTURE_HALL', capacity: '', location: '', availabilityWindows: '', status: 'ACTIVE', imageBase64: ''
    });
    const [fieldErrors, setFieldErrors] = useState({});

    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true); 
    const isAdmin = user?.roles?.includes('ROLE_ADMIN') || user?.email === 'janiduvirunkadev@gmail.com';
    
    // --- CSV Export/Import States ---
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const [adminSummary, setAdminSummary] = useState(null);

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(0); 
    const [pageSize, setPageSize] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userData = await fetchFromAPI('/auth/user');
                if (userData && userData.authenticated) {
                    setUser(userData);
                } else {
                    window.location.href = '/'; 
                }
            } catch (err) {
                console.error("Auth check failed", err);
                window.location.href = '/';
            } finally {
                setAuthLoading(false); 
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        const loadResources = async () => {
            try {
                // Build the query string including pagination parameters
                const queryParams = new URLSearchParams({
                    searchTerm: searchTerm,
                    type: filterType,
                    status: filterStatus,
                    location: filterLocation,
                    page: currentPage,
                    size: pageSize
                });
                if (filterMinCapacity !== '') {
                    queryParams.append('minCapacity', filterMinCapacity);
                }
                if (filterMaxCapacity !== '') {
                    queryParams.append('maxCapacity', filterMaxCapacity);
                }
                
                const data = await fetchFromAPI(`/resources?${queryParams.toString()}`);
                
                // Unpack the Spring Boot Page object
                setResources(data.content || []); 
                setTotalPages(data.totalPages || 0);
                setTotalElements(data.totalElements || 0);

                if (isAdmin) {
                    try {
                        const summary = await fetchFromAPI('/resources/admin/summary');
                        setAdminSummary(summary);
                    } catch (summaryErr) {
                        console.error('Failed to load admin summary', summaryErr);
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to load resources", err);
                setResources([]); 
                setLoading(false);
            }
        };

        const delayDebounceFn = setTimeout(() => {
            loadResources();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        
    }, [searchTerm, filterType, filterStatus, filterLocation, filterMinCapacity, filterMaxCapacity, currentPage, pageSize, isAdmin]); // Re-run when page changes

    // Reset to page 0 when user types a new search or changes a filter
    const handleSearchChange = (e) => { setSearchTerm(e.target.value); setCurrentPage(0); };
    const handleTypeChange = (e) => { setFilterType(e.target.value); setCurrentPage(0); };
    const handleStatusChange = (e) => { setFilterStatus(e.target.value); setCurrentPage(0); };
    const handleLocationChange = (e) => { setFilterLocation(e.target.value); setCurrentPage(0); };
    const handleMinCapacityChange = (e) => { setFilterMinCapacity(e.target.value); setCurrentPage(0); };
    const handleMaxCapacityChange = (e) => { setFilterMaxCapacity(e.target.value); setCurrentPage(0); };

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imageBase64: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setFieldErrors({}); 

        try {
            const url = editingId ? `${API_BASE_URL}/resources/${editingId}` : `${API_BASE_URL}/resources`;
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include' 
            });

            if (!response.ok) {
                if (response.status === 400) {
                    const errorData = await response.json();
                    if (errorData.errors) {
                        setFieldErrors(errorData.errors); 
                        return; 
                    }
                }
                throw new Error('Something went wrong on the server');
            }

            const savedResource = await response.json();

            if (editingId) {
                setResources(resources.map(r => r.id === editingId ? savedResource : r));
                setEditingId(null); 
            } else {
                setCurrentPage(0);
                setResources([...resources, savedResource]);
            }
            
            setFormData({ name: '', type: 'LECTURE_HALL', capacity: '', location: '', availabilityWindows: '', status: 'ACTIVE', imageBase64: '' });
            
        } catch (err) {
            console.error("Save error:", err);
            alert("An unexpected error occurred while saving.");
        }
    };

    const handleEditClick = (resource) => {
        setFormData(resource);
        setEditingId(resource.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this resource?")) return;
        try {
            await fetchFromAPI(`/resources/${id}`, { method: 'DELETE' });
            setResources(resources.filter(r => r.id !== id));
        } catch (err) {
            alert("Failed to delete.");
        }
    };

    const handleRestore = async (id) => {
        try {
            await fetchFromAPI(`/resources/${id}/restore`, { method: 'PATCH' });
            setResources(resources.map(r => r.id === id ? { ...r, status: 'ACTIVE' } : r));
        } catch (err) {
            console.error(err);
            alert("Failed to restore resource.");
        }
    };

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const exportUrl = new URL(`${API_BASE_URL}/resources/export`);
            exportUrl.searchParams.append('searchTerm', searchTerm);
            exportUrl.searchParams.append('type', filterType);
            exportUrl.searchParams.append('status', filterStatus);
            exportUrl.searchParams.append('location', filterLocation);
            if (filterMinCapacity !== '') {
                exportUrl.searchParams.append('minCapacity', filterMinCapacity);
            }
            if (filterMaxCapacity !== '') {
                exportUrl.searchParams.append('maxCapacity', filterMaxCapacity);
            }

            const response = await fetch(exportUrl.toString(), {
                method: 'GET',
                credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Export failed');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'filtered_campus_resources.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error(err);
            alert("Failed to export data.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsImporting(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const response = await fetch(`${API_BASE_URL}/resources/import`, {
                method: 'POST',
                body: uploadData,
                credentials: 'include',
            });
            
            if (!response.ok) throw new Error('Import failed');
            
            alert("Resources imported successfully!");
            setCurrentPage(0); 
            const refreshedData = await fetchFromAPI(`/resources?page=0&size=${pageSize}`);
            setResources(refreshedData.content || []);
            setTotalPages(refreshedData.totalPages || 0);
            setTotalElements(refreshedData.totalElements || 0);
        } catch (err) {
            console.error(err);
            alert("Failed to import data.");
        } finally {
            setIsImporting(false);
            e.target.value = null; 
        }
    };

    const displayResources = Array.isArray(resources) ? resources : [];

    const handleDownloadQR = async (resource) => {
        try {
            const response = await fetch(`${API_BASE_URL}/resources/${resource.id}/qrcode`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to generate QR code');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${resource.name.replace(/\s+/g, '_')}_QR.png`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (err) {
            console.error(err);
            alert("Failed to download QR Code.");
        }
    };

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                <h2 className="text-2xl font-bold text-slate-100">Loading facilities command desk...</h2>
                <p className="text-rose-300 font-medium mt-4">
                    If this takes too long, check backend availability.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-100">
            <div className="max-w-7xl mx-auto">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">Module A - Facilities & Assets</h2>
                        <p className="text-sm text-slate-400">Operational catalogue control panel</p>
                    </div>

                    {isAdmin && (
                        <div className="flex flex-wrap gap-3">
                            <button onClick={handleExportCSV} disabled={isExporting} 
                                className="inline-flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-70">
                                {isExporting ? '⏳ Exporting...' : '📥 Export CSV'}
                            </button>
                            
                            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportFileChange} />
                            
                            <button onClick={() => fileInputRef.current.click()} disabled={isImporting} 
                                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-70">
                                {isImporting ? '⏳ Importing...' : '📤 Import CSV'}
                            </button>
                        </div>
                    )}
                </div>

                {isAdmin && adminSummary && (
                    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
                        <p className="text-sm font-semibold text-cyan-300">Admin Summary</p>
                        <p className="text-sm text-slate-300 mt-1">
                            Total: {adminSummary.total || 0} | Active: {adminSummary.byStatus?.ACTIVE || 0} | Out of Service: {adminSummary.byStatus?.OUT_OF_SERVICE || 0} | Archived: {adminSummary.byStatus?.ARCHIVED || 0}
                        </p>
                    </div>
                )}

                {/* Form Section */}
                {isAdmin && (
                    <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-6 sm:p-8 mb-8">
                        <h3 className="text-xl font-bold text-slate-100 mb-6 flex items-center gap-2">
                            {editingId ? "✏️ Edit Resource" : "➕ Add New Resource"}
                        </h3>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            <div>
                                <input type="text" name="name" placeholder="Name (e.g., Mini Lab)" value={formData.name} onChange={handleInputChange} 
                                    className={`block w-full rounded-lg border py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${fieldErrors.name ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600'}`} />
                                {fieldErrors.name && <span className="text-red-500 dark:text-red-400 text-xs font-bold mt-1 block">{fieldErrors.name}</span>}
                            </div>

                            <div>
                                <select name="type" value={formData.type} onChange={handleInputChange} 
                                    className={`block w-full rounded-lg border py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${fieldErrors.type ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600'}`}>
                                    <option value="LECTURE_HALL">Lecture Hall</option>
                                    <option value="LAB">Laboratory</option>
                                    <option value="EQUIPMENT">Equipment</option>
                                    <option value="MEETING_ROOM">Meeting Room</option>
                                </select>
                                {fieldErrors.type && <span className="text-red-500 dark:text-red-400 text-xs font-bold mt-1 block">{fieldErrors.type}</span>}
                            </div>

                            <div>
                                <input type="number" name="capacity" placeholder="Capacity (0 for items)" value={formData.capacity} onChange={handleInputChange} 
                                    className={`block w-full rounded-lg border py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${fieldErrors.capacity ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600'}`} />
                                {fieldErrors.capacity && <span className="text-red-500 dark:text-red-400 text-xs font-bold mt-1 block">{fieldErrors.capacity}</span>}
                            </div>

                            <div>
                                <input type="text" name="location" placeholder="Location" value={formData.location} onChange={handleInputChange} 
                                    className={`block w-full rounded-lg border py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${fieldErrors.location ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600'}`} />
                                {fieldErrors.location && <span className="text-red-500 dark:text-red-400 text-xs font-bold mt-1 block">{fieldErrors.location}</span>}
                            </div>

                            <div>
                                <input type="text" name="availabilityWindows" placeholder="Hours (e.g., 08:00-17:00)" value={formData.availabilityWindows} onChange={handleInputChange} 
                                    className={`block w-full rounded-lg border py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${fieldErrors.availabilityWindows ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600'}`} />
                                {fieldErrors.availabilityWindows && <span className="text-red-500 dark:text-red-400 text-xs font-bold mt-1 block">{fieldErrors.availabilityWindows}</span>}
                            </div>

                            <div>
                                <select name="status" value={formData.status} onChange={handleInputChange} 
                                    className={`block w-full rounded-lg border py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${fieldErrors.status ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-600'}`}>
                                    <option value="ACTIVE">Active</option>
                                    <option value="OUT_OF_SERVICE">Out of Service</option>
                                </select>
                                {fieldErrors.status && <span className="text-red-500 dark:text-red-400 text-xs font-bold mt-1 block">{fieldErrors.status}</span>}
                            </div>

                            <div className="lg:col-span-3">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Facility Photo (Optional)</label>
                                <input type="file" accept="image/*" onChange={handleImageUpload} 
                                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 transition-colors" />
                                
                                {formData.imageBase64 && (
                                    <img src={formData.imageBase64} alt="Preview" className="mt-4 h-24 w-auto rounded-lg object-cover shadow-sm border border-slate-200 dark:border-slate-600" />
                                )}
                            </div>

                            <div className="lg:col-span-3 flex gap-4">
                                <button type="submit" 
                                    className={`flex-1 py-3 px-4 rounded-lg shadow-sm text-sm font-bold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${editingId ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}>
                                    {editingId ? "Update Resource" : "Save Resource"}
                                </button>
                                
                                {editingId && (
                                    <button type="button" onClick={() => {
                                        setEditingId(null); 
                                        setFieldErrors({}); 
                                        setFormData({name: '', type: 'LECTURE_HALL', capacity: '', location: '', availabilityWindows: '', status: 'ACTIVE', imageBase64: ''});
                                    }} 
                                    className="flex-1 py-3 px-4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-slate-500">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                )}

                {/* Data Table Section */}
                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
                    
                    {/* Search and Filter Bar */}
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 dark:text-slate-500">🔍</span>
                            <input type="text" placeholder="Search by name or location..." value={searchTerm} onChange={handleSearchChange} 
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors" />
                        </div>

                        <input
                            type="text"
                            value={filterLocation}
                            onChange={handleLocationChange}
                            placeholder="Filter location (e.g., Block A)"
                            className="block w-full md:w-56 py-2.5 px-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                        />
                        
                        <select value={filterType} onChange={handleTypeChange} 
                            className="block w-full md:w-48 py-2.5 px-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors">
                            <option value="ALL">All Types</option>
                            <option value="LECTURE_HALL">Lecture Halls</option>
                            <option value="LAB">Laboratories</option>
                            <option value="EQUIPMENT">Equipment</option>
                            <option value="MEETING_ROOM">Meeting Rooms</option>
                        </select>

                        <select value={filterStatus} onChange={handleStatusChange} 
                            className="block w-full md:w-48 py-2.5 px-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors">
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="OUT_OF_SERVICE">Out of Service</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>

                        <input
                            type="number"
                            min="0"
                            value={filterMinCapacity}
                            onChange={handleMinCapacityChange}
                            placeholder="Min capacity"
                            className="block w-full md:w-40 py-2.5 px-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                        />

                        <input
                            type="number"
                            min="0"
                            value={filterMaxCapacity}
                            onChange={handleMaxCapacityChange}
                            placeholder="Max capacity"
                            className="block w-full md:w-40 py-2.5 px-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                        />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Facility</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capacity</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Availability</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    {isAdmin && <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {displayResources.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    {r.imageBase64 ? (
                                                        <img className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-slate-600" src={r.imageBase64} alt="" />
                                                    ) : (
                                                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg border border-slate-200 dark:border-slate-600">🏢</div>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{r.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{r.type.replace('_', ' ')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{r.capacity === 0 ? '-' : r.capacity}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{r.location}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{r.availabilityWindows}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'}`}>
                                                {r.status === 'ACTIVE' ? '🟢 Active' : '🔴 Maintenance'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleDownloadQR(r)} className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 mx-1 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-md transition-colors">QR</button>
                                                <button onClick={() => handleEditClick(r)} className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 mx-1 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-md transition-colors">Edit</button>
                                                {r.status === 'ARCHIVED' ? (
                                                    <button onClick={() => handleRestore(r.id)} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 ml-1 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-md transition-colors">Restore</button>
                                                ) : (
                                                    <button onClick={() => handleDelete(r.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 ml-1 bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-md transition-colors">Archive</button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {displayResources.length === 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? "7" : "6"} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 text-sm">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="text-4xl mb-3 opacity-80">📭</span>
                                                <p>No resources match your search criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="bg-white dark:bg-slate-800 px-4 py-3 border-t border-slate-200 dark:border-slate-700 sm:px-6 flex items-center justify-between rounded-b-2xl transition-colors duration-300">
                        <div className="hidden sm:block">
                            <p className="text-sm text-slate-700 dark:text-slate-300">
                                Showing Page <span className="font-semibold">{Math.min(currentPage + 1, totalPages === 0 ? 1 : totalPages)}</span> of <span className="font-semibold">{Math.max(1, totalPages)}</span>
                                <span className="text-slate-500 dark:text-slate-400 ml-2">({totalElements} Total Facilities)</span>
                            </p>
                        </div>
                        <div className="flex-1 flex justify-between sm:justify-end gap-3">
                            <select 
                                value={pageSize} 
                                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
                                className="relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            >
                                <option value={5}>5 per page</option>
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                            </select>

                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                disabled={currentPage === 0}
                                className={`relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md transition-colors
                                    ${currentPage === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-transparent' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                disabled={currentPage >= totalPages - 1 || totalPages === 0}
                                className={`relative inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md transition-colors
                                    ${currentPage >= totalPages - 1 || totalPages === 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-transparent' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacilitiesPage;