package com.backend.backend.services;

import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.repositories.BookingRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class QRCodeService {

    @Autowired
    private BookingRepository bookingRepository;

    public byte[] generateQRCode(String bookingId, String userEmail) {
        try {
            // Get booking details
            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

            // Verify user can access this booking
            if (!booking.getRequesterEmail().equals(userEmail) && !userEmail.contains("admin")) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }

            // Verify booking is approved
            if (booking.getStatus() != BookingStatus.APPROVED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Booking must be approved to generate QR code");
            }

            // Create QR code data
            Map<String, Object> qrData = new HashMap<>();
            qrData.put("bookingId", booking.getId());
            qrData.put("resourceId", booking.getResourceId());
            qrData.put("bookingDate", booking.getBookingDate().toString());
            qrData.put("startTime", booking.getStartTime().toString());
            qrData.put("endTime", booking.getEndTime().toString());
            qrData.put("purpose", booking.getPurpose());
            qrData.put("requesterEmail", booking.getRequesterEmail());
            qrData.put("status", booking.getStatus().toString());
            qrData.put("generatedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            qrData.put("verified", false);

            // Convert to JSON string
            String jsonData = MapToJson(qrData);

            // Generate QR code
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(jsonData, BarcodeFormat.QR_CODE, 300, 300);

            // Convert to PNG
            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);

            return pngOutputStream.toByteArray();

        } catch (WriterException | IOException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate QR code", e);
        }
    }

    public Map<String, Object> verifyQRCode(String qrData) {
        try {
            // Parse QR code data
            Map<String, Object> bookingData = JsonToMap(qrData);

            String bookingId = (String) bookingData.get("bookingId");
            String requesterEmail = (String) bookingData.get("requesterEmail");

            // Get booking from database
            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));

            // Verify booking details match
            if (!booking.getRequesterEmail().equals(requesterEmail)) {
                return Map.of("valid", false, "message", "Invalid booking data");
            }

            if (booking.getStatus() != BookingStatus.APPROVED) {
                return Map.of("valid", false, "message", "Booking is not approved");
            }

            // Check if booking is for current date and time
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime bookingStart = LocalDateTime.of(
                    booking.getBookingDate(),
                    booking.getStartTime()
            );
            LocalDateTime bookingEnd = LocalDateTime.of(
                    booking.getBookingDate(),
                    booking.getEndTime()
            );

            if (now.isBefore(bookingStart.minusMinutes(30))) {
                return Map.of("valid", false, "message", "Too early to check in (30 minutes before start time)");
            }

            if (now.isAfter(bookingEnd)) {
                return Map.of("valid", false, "message", "Booking has expired");
            }

            // Return verified booking information
            Map<String, Object> result = new HashMap<>();
            result.put("valid", true);
            result.put("message", "QR code verified successfully");
            result.put("booking", Map.of(
                    "id", booking.getId(),
                    "resourceName", getResourceName(booking.getResourceId()),
                    "bookingDate", booking.getBookingDate().toString(),
                    "startTime", booking.getStartTime().toString(),
                    "endTime", booking.getEndTime().toString(),
                    "purpose", booking.getPurpose(),
                    "status", booking.getStatus().toString(),
                    "requesterEmail", booking.getRequesterEmail()
            ));
            result.put("verifiedAt", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

            return result;

        } catch (Exception e) {
            return Map.of("valid", false, "message", "Invalid QR code format");
        }
    }

    private String MapToJson(Map<String, Object> map) {
        StringBuilder json = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (!first) json.append(",");
            json.append("\"").append(entry.getKey()).append("\":");
            
            if (entry.getValue() instanceof String) {
                json.append("\"").append(entry.getValue().toString().replace("\"", "\\\"")).append("\"");
            } else {
                json.append(entry.getValue().toString());
            }
            first = false;
        }
        json.append("}");
        return json.toString();
    }

    private Map<String, Object> JsonToMap(String json) {
        // Simple JSON parser for QR code data
        Map<String, Object> map = new HashMap<>();
        json = json.trim();
        if (json.startsWith("{") && json.endsWith("}")) {
            json = json.substring(1, json.length() - 1);
            String[] pairs = json.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim().replace("\"", "");
                    String value = keyValue[1].trim();
                    if (value.startsWith("\"") && value.endsWith("\"")) {
                        value = value.substring(1, value.length() - 1).replace("\\\"", "\"");
                    }
                    map.put(key, value);
                }
            }
        }
        return map;
    }

    private String getResourceName(String resourceId) {
        // In a real implementation, this would query the Resource repository
        // For now, return a placeholder
        return "Resource " + resourceId;
    }
}
