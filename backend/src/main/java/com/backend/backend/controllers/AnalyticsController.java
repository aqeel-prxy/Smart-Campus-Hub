package com.backend.backend.controllers;

import com.backend.backend.services.AnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard(Authentication authentication) {
        // Check if user has admin role
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403).body(Map.of(
                "error", "Admin access required"
            ));
        }

        Map<String, Object> dashboardData = analyticsService.getDashboardAnalytics();
        return ResponseEntity.ok(dashboardData);
    }

    @GetMapping("/bookings")
    public ResponseEntity<Map<String, Object>> getBookingAnalytics(Authentication authentication) {
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403).body(Map.of(
                "error", "Admin access required"
            ));
        }

        Map<String, Object> bookingData = analyticsService.getBookingAnalytics();
        return ResponseEntity.ok(bookingData);
    }

    @GetMapping("/tickets")
    public ResponseEntity<Map<String, Object>> getTicketAnalytics(Authentication authentication) {
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403).body(Map.of(
                "error", "Admin access required"
            ));
        }

        Map<String, Object> ticketData = analyticsService.getTicketAnalytics();
        return ResponseEntity.ok(ticketData);
    }

    @GetMapping("/resources")
    public ResponseEntity<Map<String, Object>> getResourceAnalytics(Authentication authentication) {
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403).body(Map.of(
                "error", "Admin access required"
            ));
        }

        Map<String, Object> resourceData = analyticsService.getResourceAnalytics();
        return ResponseEntity.ok(resourceData);
    }

    @GetMapping("/system-health")
    public ResponseEntity<Map<String, Object>> getSystemHealth(Authentication authentication) {
        if (!hasAdminRole(authentication)) {
            return ResponseEntity.status(403).body(Map.of(
                "error", "Admin access required"
            ));
        }

        Map<String, Object> healthData = analyticsService.getSystemHealth();
        return ResponseEntity.ok(healthData);
    }

    private boolean hasAdminRole(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_ADMIN"));
    }
}
