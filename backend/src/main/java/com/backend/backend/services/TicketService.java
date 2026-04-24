package com.backend.backend.services;

import com.backend.backend.dto.TicketCommentRequest;
import com.backend.backend.dto.TicketCreateRequest;
import com.backend.backend.dto.TicketStatusUpdateRequest;
import com.backend.backend.models.Notification;
import com.backend.backend.models.Ticket;
import com.backend.backend.models.TicketComment;
import com.backend.backend.repositories.TicketRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class TicketService {
    private final TicketRepository ticketRepository;
    private final NotificationService notificationService;
    
    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    public TicketService(TicketRepository ticketRepository, NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.notificationService = notificationService;
        createUploadDirectoryIfNotExists();
    }
    
    private void createUploadDirectoryIfNotExists() {
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
        } catch (IOException e) {
            throw new RuntimeException("Failed to create upload directory", e);
        }
    }

    public Ticket createTicket(TicketCreateRequest request, Authentication authentication) {
        String email = getCurrentUserEmail(authentication);
        Ticket ticket = new Ticket();
        ticket.setTitle(request.getTitle().trim());
        ticket.setLocation(request.getLocation().trim());
        ticket.setResourceId(request.getResourceId());
        ticket.setCategory(request.getCategory());
        ticket.setPriority(request.getPriority());
        ticket.setDescription(request.getDescription().trim());
        ticket.setPreferredContact(request.getPreferredContact());
        ticket.setImageAttachments(request.getImageAttachments());
        ticket.setCreatedByEmail(email);
        ticket.setCreatedAt(Instant.now());
        ticket.setUpdatedAt(Instant.now());
        Ticket saved = ticketRepository.save(ticket);
        createNotification(email, "TICKET_OPENED", "Ticket \"" + saved.getTitle() + "\" has been created.");
        return saved;
    }

    public List<Ticket> getMyTickets(Authentication authentication) {
        String email = getCurrentUserEmail(authentication);
        List<Ticket> created = ticketRepository.findByCreatedByEmailOrderByCreatedAtDesc(email);
        List<Ticket> assigned = ticketRepository.findByAssignedToEmailOrderByCreatedAtDesc(email);
        java.util.Set<Ticket> all = new java.util.HashSet<>(created);
        all.addAll(assigned);
        return all.stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .collect(java.util.stream.Collectors.toList());
    }

    public List<Ticket> getAllTickets(Authentication authentication) {
        requireAdmin(authentication);
        return ticketRepository.findAll().stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .toList();
    }

    public Ticket updateStatus(String ticketId, TicketStatusUpdateRequest request, Authentication authentication) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found."));

        String email = getCurrentUserEmail(authentication);
        boolean isAdmin = hasRole(authentication, "ROLE_ADMIN");
        boolean isTechnician = email.equalsIgnoreCase(ticket.getAssignedToEmail());

        if (!isAdmin && !isTechnician) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only admin or assigned technician can update status.");
        }

        ticket.setStatus(request.getStatus());
        if (isAdmin) {
            ticket.setAssignedToEmail(request.getAssignedToEmail());
        }
        ticket.setResolutionNotes(request.getResolutionNotes());
        ticket.setRejectionReason(request.getRejectionReason());
        ticket.setUpdatedAt(Instant.now());
        Ticket saved = ticketRepository.save(ticket);
        createNotification(saved.getCreatedByEmail(), "TICKET_STATUS", "Ticket \"" + saved.getTitle() + "\" status changed to " + saved.getStatus() + ".");
        return saved;
    }

    public Ticket addComment(String ticketId, TicketCommentRequest request, Authentication authentication) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found."));
        TicketComment comment = new TicketComment();
        comment.setId(UUID.randomUUID().toString());
        comment.setAuthorEmail(getCurrentUserEmail(authentication));
        comment.setText(request.getText().trim());
        comment.setCreatedAt(Instant.now());
        comment.setUpdatedAt(Instant.now());
        ticket.getComments().add(comment);
        ticket.setUpdatedAt(Instant.now());
        Ticket saved = ticketRepository.save(ticket);
        createNotification(saved.getCreatedByEmail(), "TICKET_COMMENT", "New comment added on ticket \"" + saved.getTitle() + "\".");
        return saved;
    }

    public Ticket editComment(String ticketId, String commentId, TicketCommentRequest request, Authentication authentication) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found."));
        String email = getCurrentUserEmail(authentication);
        boolean isAdmin = hasRole(authentication, "ROLE_ADMIN");
        TicketComment comment = ticket.getComments().stream()
            .filter(c -> c.getId().equals(commentId))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));
        if (!isAdmin && !comment.getAuthorEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to edit this comment.");
        }
        comment.setText(request.getText().trim());
        comment.setUpdatedAt(Instant.now());
        ticket.setUpdatedAt(Instant.now());
        return ticketRepository.save(ticket);
    }

    public Ticket deleteComment(String ticketId, String commentId, Authentication authentication) {
        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found."));
        String email = getCurrentUserEmail(authentication);
        boolean isAdmin = hasRole(authentication, "ROLE_ADMIN");
        TicketComment comment = ticket.getComments().stream()
            .filter(c -> c.getId().equals(commentId))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));
        if (!isAdmin && !comment.getAuthorEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed to delete this comment.");
        }
        ticket.getComments().removeIf(c -> c.getId().equals(commentId));
        ticket.setUpdatedAt(Instant.now());
        return ticketRepository.save(ticket);
    }

    private void createNotification(String userId, String type, String message) {
        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setType(type);
        notification.setMessage(message);
        notificationService.create(notification);
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
            if (!"anonymousUser".equals(username)) return username;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to identify current user.");
    }

    public String saveImageFile(MultipartFile file, Authentication authentication) {
        try {
            String originalFilename = file.getOriginalFilename();
            if (originalFilename == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filename");
            }

            String fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            String newFilename = UUID.randomUUID().toString() + fileExtension;
            
            Path filePath = Paths.get(uploadDir, newFilename);
            Files.copy(file.getInputStream(), filePath);
            
            return newFilename;
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to save file", e);
        }
    }

    public byte[] getImageFile(String filename) throws IOException {
        Path filePath = Paths.get(uploadDir, filename);
        if (!Files.exists(filePath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
        }
        return Files.readAllBytes(filePath);
    }

    public String getImageContentType(String filename) {
        String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        switch (extension) {
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "png":
                return "image/png";
            case "gif":
                return "image/gif";
            default:
                return "application/octet-stream";
        }
    }
}
