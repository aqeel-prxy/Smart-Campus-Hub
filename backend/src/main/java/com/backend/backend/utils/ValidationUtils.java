package com.backend.backend.utils;

import org.springframework.web.multipart.MultipartFile;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

public class ValidationUtils {
    
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );
    
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "^[+]?[0-9]{10,15}$"
    );
    
    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
        "image/jpeg", "image/jpg", "image/png", "image/gif"
    );
    
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    
    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }
    
    public static boolean isValidPhone(String phone) {
        return phone != null && PHONE_PATTERN.matcher(phone).matches();
    }
    
    public static boolean sanitizeString(String input) {
        if (input == null) return false;
        
        // Check for XSS patterns
        String sanitized = input.toLowerCase();
        return !sanitized.contains("<script") &&
               !sanitized.contains("javascript:") &&
               !sanitized.contains("onload=") &&
               !sanitized.contains("onerror=") &&
               !sanitized.contains("onclick=") &&
               !sanitized.contains("onmouseover=") &&
               !sanitized.contains("onfocus=") &&
               !sanitized.contains("onblur=");
    }
    
    public static String sanitizeHtml(String input) {
        if (input == null) return null;
        
        // Basic HTML sanitization
        return input.replaceAll("<script[^>]*>.*?</script>", "")
                   .replaceAll("javascript:", "")
                   .replaceAll("on\\w+\\s*=", "")
                   .replaceAll("<[^>]*>", "");
    }
    
    public static boolean isValidImageFile(MultipartFile file) {
        if (file == null || file.isEmpty()) return false;
        
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            return false;
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            return false;
        }
        
        // Additional check for file extension
        String filename = file.getOriginalFilename();
        if (filename != null) {
            String extension = filename.toLowerCase().substring(filename.lastIndexOf('.') + 1);
            return Arrays.asList("jpg", "jpeg", "png", "gif").contains(extension);
        }
        
        return false;
    }
    
    public static boolean isValidDescription(String description) {
        if (description == null || description.trim().isEmpty()) return false;
        if (description.length() > 1000) return false;
        return sanitizeString(description);
    }
    
    public static boolean isValidPurpose(String purpose) {
        if (purpose == null || purpose.trim().isEmpty()) return false;
        if (purpose.length() > 200) return false;
        return sanitizeString(purpose);
    }
    
    public static boolean isValidLocation(String location) {
        if (location == null || location.trim().isEmpty()) return false;
        if (location.length() > 100) return false;
        return sanitizeString(location);
    }
}
