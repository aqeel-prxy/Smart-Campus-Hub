package com.backend.backend.services;

import com.backend.backend.models.NotificationPreferences;
import org.springframework.stereotype.Service;
import com.backend.backend.repositories.NotificationRepository;
import com.backend.backend.models.Notification;
import com.backend.backend.models.User;
import com.backend.backend.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {
    private final NotificationRepository repo;
    private final UserRepository userRepository;
    private final NotificationRealtimeService realtimeService;
    private final EmailNotificationService emailNotificationService;

    public NotificationService(
        NotificationRepository repo,
        UserRepository userRepository,
        NotificationRealtimeService realtimeService,
        EmailNotificationService emailNotificationService
    ) {
        this.repo = repo;
        this.userRepository = userRepository;
        this.realtimeService = realtimeService;
        this.emailNotificationService = emailNotificationService;
    }

    public List<Notification> getForUser(String userId) {
        return repo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Notification markRead(String id) {
        Notification n = repo.findById(id).orElseThrow();
        n.setRead(true);
        return repo.save(n);
    }

    public Notification markReadForUser(String id, String currentUserEmail, boolean isAdmin) {
        Notification n = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found."));
        if (!isAdmin && !n.getUserId().equalsIgnoreCase(currentUserEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to modify this notification.");
        }
        n.setRead(true);
        return repo.save(n);
    }

    public int markAllReadForUser(String currentUserEmail) {
        List<Notification> notifications = repo.findByUserIdOrderByCreatedAtDesc(currentUserEmail);
        int changed = 0;
        for (Notification notification : notifications) {
            if (!notification.isRead()) {
                notification.setRead(true);
                repo.save(notification);
                changed++;
            }
        }
        return changed;
    }

    public NotificationPreferences getPreferencesForUser(String email) {
        return userRepository.findByEmail(email)
            .map(User::getNotificationPreferences)
            .orElseGet(NotificationPreferences::new);
    }

    public NotificationPreferences updatePreferencesForUser(String email, NotificationPreferences preferences) {
        User user = userRepository.findByEmail(email).orElseGet(User::new);
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(email);
            user.setPassword("");
            user.setRoles(Set.of("ROLE_USER"));
        }
        user.setNotificationPreferences(preferences == null ? new NotificationPreferences() : preferences);
        return userRepository.save(user).getNotificationPreferences();
    }

    public Notification create(Notification n) {
        if (n.getUserId() == null || n.getUserId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "userId is required for notifications");
        }

        User user = userRepository.findByEmail(n.getUserId()).orElse(null);
        NotificationPreferences preferences = user != null ? user.getNotificationPreferences() : new NotificationPreferences();

        if (n.getCreatedAt() == null) {
            n.setCreatedAt(java.time.Instant.now());
        }

        Notification saved = repo.save(n);

        if (preferences.allowsType(saved.getType())) {
            if (preferences.isRealtimeEnabled()) {
                realtimeService.publish(saved);
            }
            if (preferences.isEmailEnabled()) {
                emailNotificationService.sendNotificationEmail(user, saved);
            }
        }

        return saved;
    }
}
