package com.backend.backend.services;

import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.models.Ticket;
import com.backend.backend.models.TicketStatus;
import com.backend.backend.repositories.BookingRepository;
import com.backend.backend.repositories.ResourceRepository;
import com.backend.backend.repositories.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    public Map<String, Object> getDashboardAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        
        // Booking Analytics
        analytics.putAll(getBookingAnalytics());
        
        // Ticket Analytics
        analytics.putAll(getTicketAnalytics());
        
        // Resource Analytics
        analytics.putAll(getResourceAnalytics());
        
        // Time-based Analytics
        analytics.putAll(getTimeBasedAnalytics());
        
        return analytics;
    }

    public Map<String, Object> getBookingAnalytics() {
        Map<String, Object> bookingStats = new HashMap<>();
        
        List<Booking> allBookings = bookingRepository.findAll();
        
        // Total bookings
        bookingStats.put("totalBookings", allBookings.size());
        
        // Active bookings (approved and not cancelled)
        long activeBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .filter(b -> b.getBookingDate().isEqual(LocalDate.now()) || b.getBookingDate().isAfter(LocalDate.now()))
                .count();
        bookingStats.put("activeBookings", activeBookings);
        
        // Pending bookings
        long pendingBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING)
                .count();
        bookingStats.put("pendingBookings", pendingBookings);
        
        // Cancelled bookings
        long cancelledBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CANCELLED)
                .count();
        bookingStats.put("cancelledBookings", cancelledBookings);
        
        // Rejected bookings
        long rejectedBookings = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.REJECTED)
                .count();
        bookingStats.put("rejectedBookings", rejectedBookings);
        
        // Approval rate
        long totalProcessed = allBookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.REJECTED)
                .count();
        double approvalRate = totalProcessed > 0 ? 
                (double) allBookings.stream().filter(b -> b.getStatus() == BookingStatus.APPROVED).count() / totalProcessed * 100 : 0;
        bookingStats.put("approvalRate", Math.round(approvalRate * 100.0) / 100.0);
        
        return bookingStats;
    }

    public Map<String, Object> getTicketAnalytics() {
        Map<String, Object> ticketStats = new HashMap<>();
        
        List<Ticket> allTickets = ticketRepository.findAll();
        
        // Total tickets
        ticketStats.put("totalTickets", allTickets.size());
        
        // Open tickets
        long openTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.OPEN)
                .count();
        ticketStats.put("openTickets", openTickets);
        
        // In progress tickets
        long inProgressTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS)
                .count();
        ticketStats.put("inProgressTickets", inProgressTickets);
        
        // Resolved tickets
        long resolvedTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED)
                .count();
        ticketStats.put("resolvedTickets", resolvedTickets);
        
        // Closed tickets
        long closedTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.CLOSED)
                .count();
        ticketStats.put("closedTickets", closedTickets);
        
        // Rejected tickets
        long rejectedTickets = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.REJECTED)
                .count();
        ticketStats.put("rejectedTickets", rejectedTickets);
        
        // Resolution rate
        long totalProcessed = allTickets.stream()
                .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED || t.getStatus() == TicketStatus.REJECTED)
                .count();
        double resolutionRate = totalProcessed > 0 ? 
                (double) (resolvedTickets + closedTickets) / totalProcessed * 100 : 0;
        ticketStats.put("resolutionRate", Math.round(resolutionRate * 100.0) / 100.0);
        
        return ticketStats;
    }

    public Map<String, Object> getResourceAnalytics() {
        Map<String, Object> resourceStats = new HashMap<>();
        
        List<Booking> allBookings = bookingRepository.findAll();
        
        // Top resources by booking count
        Map<String, Long> resourceBookingCounts = allBookings.stream()
                .collect(Collectors.groupingBy(Booking::getResourceId, Collectors.counting()));
        
        List<Map<String, Object>> topResources = resourceBookingCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(entry -> {
                    Map<String, Object> resourceData = new HashMap<>();
                    resourceData.put("resourceId", entry.getKey());
                    resourceData.put("bookingCount", entry.getValue());
                    // In a real implementation, you'd fetch the resource name
                    resourceData.put("resourceName", "Resource " + entry.getKey());
                    return resourceData;
                })
                .collect(Collectors.toList());
        
        resourceStats.put("topResources", topResources);
        
        // Resource utilization
        Map<String, Double> resourceUtilization = new HashMap<>();
        resourceBookingCounts.forEach((resourceId, bookingCount) -> {
            // Calculate utilization percentage (simplified calculation)
            double utilization = Math.min(100.0, (bookingCount / 30.0) * 100); // Assuming 30 days in a month
            resourceUtilization.put(resourceId, Math.round(utilization * 100.0) / 100.0);
        });
        
        resourceStats.put("resourceUtilization", resourceUtilization);
        
        return resourceStats;
    }

    private Map<String, Object> getTimeBasedAnalytics() {
        Map<String, Object> timeStats = new HashMap<>();
        
        List<Booking> allBookings = bookingRepository.findAll();
        
        // Peak booking hours
        Map<Integer, Long> hourlyBookingCounts = new HashMap<>();
        for (int hour = 8; hour <= 22; hour++) {
            hourlyBookingCounts.put(hour, 0L);
        }
        
        allBookings.forEach(booking -> {
            int startHour = booking.getStartTime().getHour();
            int endHour = booking.getEndTime().getHour();
            
            for (int hour = startHour; hour < endHour; hour++) {
                hourlyBookingCounts.merge(hour, 1L, Long::sum);
            }
        });
        
        List<Map<String, Object>> peakBookingHours = hourlyBookingCounts.entrySet().stream()
                .sorted(Map.Entry.<Integer, Long>comparingByValue().reversed())
                .limit(5)
                .map(entry -> {
                    Map<String, Object> hourData = new HashMap<>();
                    hourData.put("hour", entry.getKey());
                    hourData.put("count", entry.getValue());
                    return hourData;
                })
                .collect(Collectors.toList());
        
        timeStats.put("peakBookingHours", peakBookingHours);
        
        // Daily booking trends (last 30 days)
        List<Map<String, Object>> dailyTrends = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        for (int i = 29; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            long bookingsOnDate = allBookings.stream()
                    .filter(b -> b.getBookingDate().equals(date))
                    .count();
            
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("date", date.toString());
            dayData.put("count", bookingsOnDate);
            dailyTrends.add(dayData);
        }
        
        timeStats.put("dailyTrends", dailyTrends);
        
        // Monthly trends (last 12 months)
        List<Map<String, Object>> monthlyTrends = new ArrayList<>();
        int currentMonth = today.getMonthValue();
        int currentYear = today.getYear();
        
        for (int i = 11; i >= 0; i--) {
            int month = (currentMonth - i + 12) % 12;
            int year = currentMonth - i >= 0 ? currentYear : currentYear - 1;
            
            long bookingsInMonth = allBookings.stream()
                    .filter(b -> b.getBookingDate().getMonthValue() == month + 1)
                    .filter(b -> b.getBookingDate().getYear() == year)
                    .count();
            
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", year + "-" + String.format("%02d", month + 1));
            monthData.put("count", bookingsInMonth);
            monthlyTrends.add(monthData);
        }
        
        timeStats.put("monthlyTrends", monthlyTrends);
        
        return timeStats;
    }

    public Map<String, Object> getSystemHealth() {
        Map<String, Object> health = new HashMap<>();
        
        // Total resources
        long totalResources = resourceRepository.count();
        health.put("totalResources", totalResources);
        
        // Active resources
        long activeResources = resourceRepository.findAll().stream()
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .count();
        health.put("activeResources", activeResources);
        
        // System uptime (placeholder - would be calculated from actual monitoring)
        health.put("systemUptime", 99.9);
        
        // Average response time (placeholder)
        health.put("avgResponseTime", 150);
        
        // Last updated
        health.put("lastUpdated", LocalDateTime.now().toString());
        
        return health;
    }
}
