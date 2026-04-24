package com.backend.backend.controllers;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import java.util.List;
import com.backend.backend.models.Notification;
import com.backend.backend.services.NotificationService;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }

    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications(
        @RequestParam(required = false) String userId,
        Authentication authentication
    ) {
        String currentEmail = resolveEmail(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
        String effectiveUser = (userId == null || userId.isBlank()) ? currentEmail : userId;
        if (!isAdmin && !effectiveUser.equalsIgnoreCase(currentEmail)) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(service.getForUser(effectiveUser));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Notification> markRead(@PathVariable String id, Authentication authentication) {
        String currentEmail = resolveEmail(authentication);
        boolean isAdmin = authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
        return ResponseEntity.ok(service.markReadForUser(id, currentEmail, isAdmin));
    }

    @PostMapping("/test")
    public ResponseEntity<Notification> createTest(@RequestBody Notification n) {
        return ResponseEntity.ok(service.create(n));
    }

    private String resolveEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return "";
        Object principal = authentication.getPrincipal();
        if (principal instanceof OidcUser) {
            OidcUser oidcUser = (OidcUser) principal;
            return oidcUser.getEmail();
        }
        if (principal instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) principal;
            return userDetails.getUsername();
        }
        if (principal instanceof String) {
            String username = (String) principal;
            if (!"anonymousUser".equals(username)) return username;
        }
        return "";
    }
}
