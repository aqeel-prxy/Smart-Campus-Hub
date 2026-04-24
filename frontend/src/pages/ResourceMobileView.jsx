import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchFromAPI } from '../services/api'; 

const ResourceMobileView = () => {
    const { id } = useParams(); 
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadResource = async () => {
            try {
                const data = await fetchFromAPI(`/resources/${id}`);
                setResource(data);
            } catch (err) {
                console.error("Failed to load resource", err);
            } finally {
                setLoading(false);
            }
        };
        loadResource();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mb-4"></div>
            Loading Facility Data...
        </div>
    );

    if (!resource) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100 font-bold text-xl">
            Facility Not Found.
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 p-4 sm:p-6 font-sans">
            <div className="max-w-lg mx-auto bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-6 text-center">
                
                {resource.imageBase64 ? (
                    <img src={resource.imageBase64} alt={resource.name} className="w-full h-52 object-cover rounded-xl mb-6 shadow-sm" />
                ) : (
                    <div className="w-full h-40 bg-slate-100 dark:bg-slate-700 rounded-xl mb-6 flex items-center justify-center text-slate-400 dark:text-slate-500 text-lg border border-slate-200 dark:border-slate-600">
                        📸 No Image Available
                    </div>
                )}
                
                <h1 className="text-2xl font-bold text-white mb-1">{resource.name}</h1>
                <p className="text-lg text-slate-400 mb-6">{resource.type.replace('_', ' ')}</p>
                
                <hr className="border-t border-slate-700 mb-6" />

                <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <strong className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Location</strong>
                        <span className="text-base font-bold text-slate-100">{resource.location}</span>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <strong className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Capacity</strong>
                        <span className="text-base font-bold text-slate-100">{resource.capacity > 0 ? `${resource.capacity} People` : 'N/A'}</span>
                    </div>
                    <div className="col-span-2 bg-slate-800 p-3 rounded-lg border border-slate-700">
                        <strong className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Available Hours</strong>
                        <span className="text-base font-bold text-slate-100">{resource.availabilityWindows}</span>
                    </div>
                </div>

                <div className="mt-8 mb-6">
                    <span className={`px-5 py-2 rounded-full font-bold text-sm shadow-sm ${resource.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'}`}>
                        {resource.status === 'ACTIVE' ? '🟢 Ready for Use' : '🔴 Out of Service'}
                    </span>
                </div>

                <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl font-bold text-lg shadow-sm transition-colors">
                    Report an Issue
                </button>
            </div>
        </div>
    );
};

export default ResourceMobileView;