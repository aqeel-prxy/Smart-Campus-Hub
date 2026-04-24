package com.backend.backend.services;

import com.backend.backend.models.Notification;
import com.backend.backend.models.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationService.class);

    @Value("${app.notifications.email.enabled:false}")
    private boolean emailGloballyEnabled;

    @Value("${app.notifications.email.from:no-reply@campus.local}")
    private String fromAddress;

    private final JavaMailSender mailSender;

    public EmailNotificationService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    public void sendNotificationEmail(User user, Notification notification) {
        if (!emailGloballyEnabled || mailSender == null || user == null || notification == null) {
            return;
        }

        String email = user.getEmail();
        if (email == null || email.isBlank()) {
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(email);
            message.setSubject("Smart Campus Notification: " + safe(notification.getType()));
            message.setText(notification.getMessage());
            mailSender.send(message);
        } catch (Exception ex) {
            logger.warn("Failed to send notification email to {}: {}", email, ex.getMessage());
        }
    }

    private String safe(String value) {
        return value == null ? "UPDATE" : value;
    }
}
