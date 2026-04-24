package com.backend.backend.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import com.backend.backend.models.Notification;
import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
}
