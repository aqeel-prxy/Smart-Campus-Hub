package com.backend.backend.controllers;

import com.backend.backend.annotation.RateLimitGeneral;
import com.backend.backend.services.QRCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/verify")
public class QRCodeController {

    @Autowired
    private QRCodeService qrCodeService;

    @PostMapping("/qrcode")
    @RateLimitGeneral
    public ResponseEntity<Map<String, Object>> verifyQRCode(@RequestBody Map<String, String> request) {
        try {
            String qrData = request.get("qrData");
            if (qrData == null || qrData.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "QR code data is required"
                ));
            }

            Map<String, Object> verificationResult = qrCodeService.verifyQRCode(qrData);
            return ResponseEntity.ok(verificationResult);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to verify QR code: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "QR Code Verification"
        ));
    }
}
