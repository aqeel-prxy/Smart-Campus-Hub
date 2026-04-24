package com.backend.backend.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

@Document(collection = "resources")
public class Resource {

    @Id
    private String id;

    @NotBlank(message = "Resource name is required and cannot be blank.")
    private String name; // e.g., "Main Auditorium" or "Epson Projector"

    @NotBlank(message = "Type is required (e.g., LECTURE_HALL, LAB).")
    private String type; // e.g., "LECTURE_HALL", "LAB", "EQUIPMENT"

    @Min(value = 0, message = "Capacity cannot be a negative number. Use 0 for items.")
    private int capacity; // e.g., 150 (use 0 for equipment)

    @NotBlank(message = "Location must be specified.")
    private String location; // e.g., "Building A, 1st Floor"

    @NotBlank(message = "Availability windows are required.")
    private String availabilityWindows; // e.g., "08:00-17:00"

    @NotBlank(message = "Status must be defined (e.g., ACTIVE, OUT_OF_SERVICE).")
    private String status; // e.g., "ACTIVE", "OUT_OF_SERVICE"

    private String imageBase64;

    // Default Constructor
    public Resource() {}

    // All-Args Constructor
    public Resource(String name, String type, int capacity, String location, String availabilityWindows, String status) {
        this.name = name;
        this.type = type;
        this.capacity = capacity;
        this.location = location;
        this.availabilityWindows = availabilityWindows;
        this.status = status;
    }

    // --- Getters and Setters ---
    
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public int getCapacity() { return capacity; }
    public void setCapacity(int capacity) { this.capacity = capacity; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getAvailabilityWindows() { return availabilityWindows; }
    public void setAvailabilityWindows(String availabilityWindows) { this.availabilityWindows = availabilityWindows; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getImageBase64() { return imageBase64; }
    public void setImageBase64(String imageBase64) { this.imageBase64 = imageBase64; }
}