package com.backend.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class TicketCommentRequest {
    @NotBlank(message = "Comment text is required.")
    private String text;

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }
}
