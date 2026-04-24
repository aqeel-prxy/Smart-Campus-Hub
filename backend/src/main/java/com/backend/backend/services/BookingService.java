package com.backend.backend.services;

import com.backend.backend.dto.BookingCreateRequest;
import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.models.Notification;
import com.backend.backend.models.Resource;
import com.backend.backend.models.User;
import com.backend.backend.repositories.BookingRepository;
import com.backend.backend.repositories.ResourceRepository;
import com.backend.backend.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public BookingService(
        BookingRepository bookingRepository,
        ResourceRepository resourceRepository,
        NotificationService notificationService,
        UserRepository userRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    public Booking createBooking(BookingCreateRequest request, Authentication authentication) {
        String requesterEmail = getCurrentUserEmail(authentication);
        validateTimeRange(request);

        Resource resource = resourceRepository.findById(request.getResourceId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Resource not found."));

        if ("OUT_OF_SERVICE".equalsIgnoreCase(resource.getStatus()) || "ARCHIVED".equalsIgnoreCase(resource.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resource is not available for booking.");
        }

        boolean hasConflict = !bookingRepository
            .findByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                resource.getId(),
                request.getBookingDate(),
                Set.of(BookingStatus.PENDING, BookingStatus.APPROVED),
                request.getEndTime(),
                request.getStartTime()
            )
            .isEmpty();

        if (hasConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Booking conflict detected for this resource and time window.");
        }

        Booking booking = new Booking();
        booking.setResourceId(resource.getId());
        booking.setResourceName(resource.getName());
        booking.setRequesterEmail(requesterEmail);
        booking.setBookingDate(request.getBookingDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose().trim());
        booking.setExpectedAttendees(request.getExpectedAttendees());
        booking.setStatus(BookingStatus.PENDING);
        booking.setCreatedAt(Instant.now());
        booking.setUpdatedAt(Instant.now());

        Booking saved = bookingRepository.save(booking);

        createNotification(
            requesterEmail,
            "BOOKING_SUBMITTED",
            "Your booking request for " + saved.getResourceName() + " on " + saved.getBookingDate() + " was submitted."
        );

        List<User> admins = userRepository.findByRolesContains("ROLE_ADMIN");
        for (User admin : admins) {
            if (admin.getEmail() != null && !admin.getEmail().isBlank()) {
                createNotification(
                    admin.getEmail(),
                    "BOOKING_REVIEW_REQUIRED",
                    "New booking request from " + requesterEmail + " for " + saved.getResourceName() + "."
                );
            }
        }

        return saved;
    }

    public List<Booking> getMyBookings(Authentication authentication) {
        String requesterEmail = getCurrentUserEmail(authentication);
        return bookingRepository.findByRequesterEmailOrderByBookingDateDescStartTimeDesc(requesterEmail);
    }

    public List<Booking> getAllBookings(LocalDate fromDate, LocalDate toDate, BookingStatus status, Authentication authentication) {
        requireAdmin(authentication);
        LocalDate from = fromDate != null ? fromDate : LocalDate.now().minusMonths(3);
        LocalDate to = toDate != null ? toDate : LocalDate.now().plusMonths(6);

        return bookingRepository.findByBookingDateBetweenOrderByBookingDateDescStartTimeDesc(from, to).stream()
            .filter(booking -> status == null || booking.getStatus() == status)
            .toList();
    }

    public Booking decideBooking(String bookingId, BookingStatus decision, String reason, Authentication authentication) {
        requireAdmin(authentication);

        if (decision != BookingStatus.APPROVED && decision != BookingStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision must be APPROVED or REJECTED.");
        }

        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found."));

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING bookings can be approved or rejected.");
        }

        if (decision == BookingStatus.APPROVED) {
            boolean hasConflict = !bookingRepository
                .findByResourceIdAndBookingDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                    booking.getResourceId(),
                    booking.getBookingDate(),
                    Set.of(BookingStatus.APPROVED),
                    booking.getEndTime(),
                    booking.getStartTime()
                )
                .stream()
                .filter(existing -> !existing.getId().equals(booking.getId()))
                .toList()
                .isEmpty();

            if (hasConflict) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot approve due to time conflict with an existing approved booking.");
            }
        }

        booking.setStatus(decision);
        booking.setDecisionReason(reason.trim());
        booking.setDecidedByEmail(getCurrentUserEmail(authentication));
        booking.setDecidedAt(Instant.now());
        booking.setUpdatedAt(Instant.now());

        Booking saved = bookingRepository.save(booking);
        createNotification(
            booking.getRequesterEmail(),
            "BOOKING_" + decision.name(),
            "Your booking for " + booking.getResourceName() + " on " + booking.getBookingDate() + " was " + decision.name().toLowerCase() + "."
        );
        return saved;
    }

    public Booking cancelBooking(String bookingId, Authentication authentication) {
        Booking booking = bookingRepository.findById(bookingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found."));

        String currentEmail = getCurrentUserEmail(authentication);
        boolean isAdmin = hasRole(authentication, "ROLE_ADMIN");

        if (!isAdmin && !booking.getRequesterEmail().equalsIgnoreCase(currentEmail)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to cancel this booking.");
        }

        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PENDING or APPROVED bookings can be cancelled.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setDecisionReason("Cancelled by " + currentEmail);
        booking.setDecidedByEmail(currentEmail);
        booking.setDecidedAt(Instant.now());
        booking.setUpdatedAt(Instant.now());

        Booking saved = bookingRepository.save(booking);
        if (!booking.getRequesterEmail().equalsIgnoreCase(currentEmail)) {
            createNotification(
                booking.getRequesterEmail(),
                "BOOKING_CANCELLED",
                "Your booking for " + booking.getResourceName() + " on " + booking.getBookingDate() + " was cancelled by admin."
            );
        }
        return saved;
    }

    private void createNotification(String userId, String type, String message) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setMessage(message);
        notificationService.create(notification);
    }

    private void validateTimeRange(BookingCreateRequest request) {
        if (!request.getStartTime().isBefore(request.getEndTime())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be before end time.");
        }
    }

    private void requireAdmin(Authentication authentication) {
        if (!hasRole(authentication, "ROLE_ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role required.");
        }
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch(role::equals);
    }

    private String getCurrentUserEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

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
            if (!"anonymousUser".equals(username)) {
                return username;
            }
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to identify current user.");
    }
}
