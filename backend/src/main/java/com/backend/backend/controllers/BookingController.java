package com.backend.backend.controllers;

import com.backend.backend.dto.BookingCreateRequest;
import com.backend.backend.dto.BookingDecisionRequest;
import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.services.BookingService;
import com.backend.backend.services.QRCodeService;
import javax.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final QRCodeService qrCodeService;

    public BookingController(BookingService bookingService, QRCodeService qrCodeService) {
        this.bookingService = bookingService;
        this.qrCodeService = qrCodeService;
    }

    @PostMapping
    public ResponseEntity<Booking> createBooking(@Valid @RequestBody BookingCreateRequest request, Authentication authentication) {
        Booking saved = bookingService.createBooking(request, authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/my")
    public ResponseEntity<List<Booking>> getMyBookings(Authentication authentication) {
        return ResponseEntity.ok(bookingService.getMyBookings(authentication));
    }

    @GetMapping
    public ResponseEntity<List<Booking>> getAllBookings(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
        @RequestParam(required = false) BookingStatus status,
        Authentication authentication
    ) {
        return ResponseEntity.ok(bookingService.getAllBookings(fromDate, toDate, status, authentication));
    }

    @PatchMapping("/{id}/decision")
    public ResponseEntity<Booking> decideBooking(
        @PathVariable String id,
        @Valid @RequestBody BookingDecisionRequest request,
        Authentication authentication
    ) {
        BookingStatus decision = BookingStatus.valueOf(request.getDecision());
        return ResponseEntity.ok(bookingService.decideBooking(id, decision, request.getReason(), authentication));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable String id, Authentication authentication) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, authentication));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteBooking(@PathVariable String id, Authentication authentication) {
        bookingService.cancelBooking(id, authentication);
        return ResponseEntity.ok(Map.of("message", "Booking cancelled and retained for audit trail."));
    }

    @GetMapping("/{id}/qrcode")
    public ResponseEntity<byte[]> generateQRCode(@PathVariable String id, Authentication authentication) {
        try {
            String userEmail = getCurrentUserEmail(authentication);
            byte[] qrCodeImage = qrCodeService.generateQRCode(id, userEmail);
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.IMAGE_PNG_VALUE)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"qrcode.png\"")
                    .body(qrCodeImage);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String getCurrentUserEmail(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Authentication required");
        }
        
        Object principal = authentication.getPrincipal();
        if (principal instanceof org.springframework.security.oauth2.core.oidc.user.OidcUser) {
            org.springframework.security.oauth2.core.oidc.user.OidcUser oidcUser = 
                (org.springframework.security.oauth2.core.oidc.user.OidcUser) principal;
            return oidcUser.getEmail();
        } else if (principal instanceof org.springframework.security.core.userdetails.User) {
            org.springframework.security.core.userdetails.User userDetails = 
                (org.springframework.security.core.userdetails.User) principal;
            return userDetails.getUsername();
        }
        throw new RuntimeException("Unable to identify current user");
    }
}
