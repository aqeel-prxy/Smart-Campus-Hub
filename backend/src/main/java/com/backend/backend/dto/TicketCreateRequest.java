package com.backend.backend.dto;

import com.backend.backend.models.TicketPriority;
import com.backend.backend.utils.ValidationUtils;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

import java.util.ArrayList;
import java.util.List;

public class TicketCreateRequest {
    @NotBlank(message = "Title is required.")
    @Size(max = 100, message = "Title must not exceed 100 characters.")
    private String title;
    
    @NotBlank(message = "Location is required.")
    @Size(max = 100, message = "Location must not exceed 100 characters.")
    private String location;
    
    private String resourceId = "";
    private String category = "GENERAL";
    private TicketPriority priority = TicketPriority.MEDIUM;
    
    @NotBlank(message = "Description is required.")
    @Size(max = 1000, message = "Description must not exceed 1000 characters.")
    private String description;
    
    private String preferredContact = "";
    @Size(max = 3, message = "Up to 3 image attachments are allowed.")
    private List<String> imageAttachments = new ArrayList<>();

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title != null ? ValidationUtils.sanitizeHtml(title.trim()) : null; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location != null ? ValidationUtils.sanitizeHtml(location.trim()) : null; }
    
    public String getResourceId() { return resourceId; }
    public void setResourceId(String resourceId) { this.resourceId = resourceId; }
    
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    
    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description != null ? ValidationUtils.sanitizeHtml(description.trim()) : null; }
    
    public String getPreferredContact() { return preferredContact; }
    public void setPreferredContact(String preferredContact) { 
        this.preferredContact = preferredContact != null ? ValidationUtils.sanitizeHtml(preferredContact.trim()) : null; 
    }
    
    public List<String> getImageAttachments() { return imageAttachments; }
    public void setImageAttachments(List<String> imageAttachments) { this.imageAttachments = imageAttachments; }
}
