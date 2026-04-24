package com.backend.backend.controllers;

import org.springframework.core.env.Environment;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    private final MongoTemplate mongoTemplate;
    private final Environment environment;

    public HealthController(MongoTemplate mongoTemplate, Environment environment) {
        this.mongoTemplate = mongoTemplate;
        this.environment = environment;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        boolean dbConnected = false;
        try {
            mongoTemplate.getDb().runCommand(new org.bson.Document("ping", 1));
            dbConnected = true;
        } catch (Exception ignored) {
        }
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "dbConnected", dbConnected,
            "mode", dbConnected ? "mongodb" : "connection-failed",
            "server", "spring-boot",
            "port", environment.getProperty("server.port", "5000"),
            "timestamp", Instant.now().toString()
        ));
    }
}
