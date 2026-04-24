package com.backend.backend.models;

public class NotificationPreferences {
    private boolean realtimeEnabled = true;
    private boolean emailEnabled = false;
    private boolean bookingUpdates = true;
    private boolean ticketUpdates = true;
    private boolean systemAnnouncements = true;

    public NotificationPreferences() {
    }

    public boolean isRealtimeEnabled() {
        return realtimeEnabled;
    }

    public void setRealtimeEnabled(boolean realtimeEnabled) {
        this.realtimeEnabled = realtimeEnabled;
    }

    public boolean isEmailEnabled() {
        return emailEnabled;
    }

    public void setEmailEnabled(boolean emailEnabled) {
        this.emailEnabled = emailEnabled;
    }

    public boolean isBookingUpdates() {
        return bookingUpdates;
    }

    public void setBookingUpdates(boolean bookingUpdates) {
        this.bookingUpdates = bookingUpdates;
    }

    public boolean isTicketUpdates() {
        return ticketUpdates;
    }

    public void setTicketUpdates(boolean ticketUpdates) {
        this.ticketUpdates = ticketUpdates;
    }

    public boolean isSystemAnnouncements() {
        return systemAnnouncements;
    }

    public void setSystemAnnouncements(boolean systemAnnouncements) {
        this.systemAnnouncements = systemAnnouncements;
    }

    public boolean allowsType(String type) {
        if (type == null || type.isBlank()) {
            return systemAnnouncements;
        }
        if (type.startsWith("BOOKING_")) {
            return bookingUpdates;
        }
        if (type.startsWith("TICKET_")) {
            return ticketUpdates;
        }
        return systemAnnouncements;
    }
}
