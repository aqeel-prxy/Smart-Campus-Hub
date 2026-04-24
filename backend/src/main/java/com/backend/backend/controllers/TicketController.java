package com.backend.backend.controllers;

import com.backend.backend.annotation.RateLimitGeneral;
import com.backend.backend.dto.TicketCommentRequest;
import com.backend.backend.dto.TicketCreateRequest;
import com.backend.backend.dto.TicketStatusUpdateRequest;
import com.backend.backend.models.Ticket;
import com.backend.backend.services.TicketService;
import com.backend.backend.utils.ValidationUtils;
import javax.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    public ResponseEntity<Ticket> create(@Valid @RequestBody TicketCreateRequest request, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.createTicket(request, authentication));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Ticket>> my(Authentication authentication) {
        return ResponseEntity.ok(ticketService.getMyTickets(authentication));
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> all(Authentication authentication) {
        return ResponseEntity.ok(ticketService.getAllTickets(authentication));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Ticket> updateStatus(
        @PathVariable String id,
        @Valid @RequestBody TicketStatusUpdateRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.updateStatus(id, request, authentication));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Ticket> addComment(
        @PathVariable String id,
        @Valid @RequestBody TicketCommentRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.addComment(id, request, authentication));
    }

    @PatchMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Ticket> editComment(
        @PathVariable String id,
        @PathVariable String commentId,
        @Valid @RequestBody TicketCommentRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.editComment(id, commentId, request, authentication));
    }

    @DeleteMapping("/{id}/comments/{commentId}")
    public ResponseEntity<Ticket> deleteComment(
        @PathVariable String id,
        @PathVariable String commentId,
        Authentication authentication
    ) {
        return ResponseEntity.ok(ticketService.deleteComment(id, commentId, authentication));
    }

    @PostMapping("/upload")
    @RateLimitGeneral
    public ResponseEntity<Map<String, String>> uploadImages(
            @RequestParam("files") MultipartFile[] files,
            Authentication authentication
    ) {
        try {
            if (files == null || files.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "No files provided"));
            }

            if (files.length > 3) {
                return ResponseEntity.badRequest().body(Map.of("error", "Maximum 3 files allowed"));
            }

            Map<String, String> uploadedFiles = new HashMap<>();
            int validFiles = 0;

            for (MultipartFile file : files) {
                if (file != null && !file.isEmpty()) {
                    if (ValidationUtils.isValidImageFile(file)) {
                        String fileName = ticketService.saveImageFile(file, authentication);
                        uploadedFiles.put(file.getOriginalFilename(), fileName);
                        validFiles++;
                    } else {
                        return ResponseEntity.badRequest().body(Map.of("error", 
                            "Invalid file: " + file.getOriginalFilename() + 
                            ". Only JPG, PNG, GIF files up to 5MB are allowed"));
                    }
                }
            }

            if (validFiles == 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "No valid files provided"));
            }

            return ResponseEntity.ok(Map.of(
                "message", "Files uploaded successfully",
                "files", String.join(",", uploadedFiles.values())
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to upload files: " + e.getMessage()));
        }
    }

    @GetMapping("/images/{filename}")
    public ResponseEntity<byte[]> getImage(@PathVariable String filename) {
        try {
            byte[] imageBytes = ticketService.getImageFile(filename);
            String contentType = ticketService.getImageContentType(filename);
            
            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .header("Cache-Control", "public, max-age=31536000")
                    .body(imageBytes);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
