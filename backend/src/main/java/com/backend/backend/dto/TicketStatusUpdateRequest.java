package com.backend.backend.dto;

import com.backend.backend.models.TicketStatus;
import javax.validation.constraints.NotNull;

public class TicketStatusUpdateRequest {
    @NotNull(message = "Status is required.")
    private TicketStatus status;
    private String assignedToEmail = "";
    private String resolutionNotes = "";
    private String rejectionReason = "";

    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus status) { this.status = status; }
    public String getAssignedToEmail() { return assignedToEmail; }
    public void setAssignedToEmail(String assignedToEmail) { this.assignedToEmail = assignedToEmail; }
    public String getResolutionNotes() { return resolutionNotes; }
    public void setResolutionNotes(String resolutionNotes) { this.resolutionNotes = resolutionNotes; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
}
