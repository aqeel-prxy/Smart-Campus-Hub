package com.backend.backend.exceptions;

import io.github.resilience4j.ratelimiter.RequestNotPermitted;
import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    // General server errors
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleGeneralException(Exception ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "An unexpected error occurred: " + ex.getMessage());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "INTERNAL_SERVER_ERROR");

        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    // Validation errors
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Object> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("timestamp", LocalDateTime.now());
        responseBody.put("status", HttpStatus.BAD_REQUEST.value());
        responseBody.put("message", "Validation failed for one or more fields.");
        responseBody.put("error", "VALIDATION_ERROR");
        
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error -> 
            fieldErrors.put(error.getField(), error.getDefaultMessage())
        );
        
        responseBody.put("errors", fieldErrors);
        return new ResponseEntity<>(responseBody, HttpStatus.BAD_REQUEST);
    }

    // Constraint violations
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Object> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", "Constraint violation: " + ex.getMessage());
        body.put("error", "CONSTRAINT_VIOLATION");
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    // Missing request parameters
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Object> handleMissingParameter(MissingServletRequestParameterException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Missing required parameter: " + ex.getParameterName());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "MISSING_PARAMETER");
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    // Access denied
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Access denied: " + ex.getMessage());
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("error", "ACCESS_DENIED");
        
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    // Rate limiting
    @ExceptionHandler(RequestNotPermitted.class)
    public ResponseEntity<Object> handleRateLimit(RequestNotPermitted ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Rate limit exceeded. Please try again later.");
        body.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        body.put("error", "RATE_LIMIT_EXCEEDED");
        
        return new ResponseEntity<>(body, HttpStatus.TOO_MANY_REQUESTS);
    }

    // File upload errors
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Object> handleMaxUploadSize(MaxUploadSizeExceededException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "File size exceeds maximum allowed limit: " + ex.getMessage());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "FILE_TOO_LARGE");
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<Object> handleMultipartException(MultipartException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "File upload failed: " + ex.getMessage());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "UPLOAD_FAILED");
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    // Database errors
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Object> handleDataAccessException(DataAccessException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        body.put("message", "Database operation failed: " + ex.getMessage());
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "DATABASE_ERROR");
        
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Resource not found
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleRuntimeException(RuntimeException ex) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now());
        
        if (ex.getMessage() != null && ex.getMessage().contains("not found")) {
            body.put("message", "Resource not found: " + ex.getMessage());
            body.put("status", HttpStatus.NOT_FOUND.value());
            body.put("error", "NOT_FOUND");
            return new ResponseEntity<>(body, HttpStatus.NOT_FOUND);
        }
        
        // Handle other runtime exceptions
        body.put("message", "Request processing failed: " + ex.getMessage());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "BAD_REQUEST");
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }
}