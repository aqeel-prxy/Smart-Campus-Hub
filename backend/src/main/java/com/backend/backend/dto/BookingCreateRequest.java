package com.backend.backend.dto;

import com.backend.backend.utils.ValidationUtils;
import javax.validation.constraints.FutureOrPresent;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public class BookingCreateRequest {

    @NotBlank(message = "Resource ID is required.")
    private String resourceId;

    @NotNull(message = "Booking date is required.")
    @FutureOrPresent(message = "Booking date must be today or a future date.")
    private LocalDate bookingDate;

    @NotNull(message = "Start time is required.")
    private LocalTime startTime;

    @NotNull(message = "End time is required.")
    private LocalTime endTime;

    @NotBlank(message = "Purpose is required.")
    @Size(max = 200, message = "Purpose must not exceed 200 characters.")
    private String purpose;

    @NotNull(message = "Expected attendees is required.")
    @Min(value = 0, message = "Expected attendees cannot be negative.")
    private Integer expectedAttendees;

    public String getResourceId() {
        return resourceId;
    }

    public void setResourceId(String resourceId) {
        this.resourceId = resourceId;
    }

    public LocalDate getBookingDate() {
        return bookingDate;
    }

    public void setBookingDate(LocalDate bookingDate) {
        this.bookingDate = bookingDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getPurpose() {
        return purpose;
    }

    public void setPurpose(String purpose) {
        this.purpose = purpose != null ? ValidationUtils.sanitizeHtml(purpose.trim()) : null;
    }

    public Integer getExpectedAttendees() {
        return expectedAttendees;
    }

    public void setExpectedAttendees(Integer expectedAttendees) {
        this.expectedAttendees = expectedAttendees;
    }
}
