import axios from 'axios';

// Use Vite's environment variables for the base URL
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Axios instance for backend requests
const API = axios.create({ baseURL: BASE_URL, withCredentials: true });

// Exported functions
export const getNotifications = (userId) => API.get(`/notifications?userId=${userId}`);
export const markNotificationRead = (id) => API.patch(`/notifications/${id}/read`);
export const getMyTickets = () => fetchFromAPI('/tickets/my');
export const getAllTickets = () => fetchFromAPI('/tickets');
export const createTicket = (payload) =>
    fetchFromAPI('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
export const updateTicketStatus = (id, payload) =>
    fetchFromAPI(`/tickets/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
export const addTicketComment = (id, text) =>
    fetchFromAPI(`/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
    });
export const editTicketComment = (ticketId, commentId, text) =>
    fetchFromAPI(`/tickets/${ticketId}/comments/${commentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ text }),
    });
export const deleteTicketComment = (ticketId, commentId) =>
    fetchFromAPI(`/tickets/${ticketId}/comments/${commentId}`, {
        method: 'DELETE',
    });

export const createBooking = (payload) =>
    fetchFromAPI('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

export const getMyBookings = () => fetchFromAPI('/bookings/my');

export const getAllBookings = (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    const query = params.toString();
    return fetchFromAPI(`/bookings${query ? `?${query}` : ''}`);
};

export const decideBooking = (id, payload) =>
    fetchFromAPI(`/bookings/${id}/decision`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });

export const cancelBooking = (id) =>
    fetchFromAPI(`/bookings/${id}/cancel`, {
        method: 'PATCH',
    });

export const fetchFromAPI = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            credentials: 'include', // Include cookies for authentication
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(`API error: ${response.status} - ${errorMessage}`);
        }

        // If the server returns 204 No Content, return null
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        throw error;
    }
};