package com.backend.backend.repositories;

import com.backend.backend.models.Resource;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ResourceRepository extends MongoRepository<Resource, String> {
    // Spring Data MongoDB provides standard methods like save(), findAll(), and findById() automatically.
    // We can add custom search methods here later if needed (e.g., finding a resource by its type).
    List<Resource> findByStatusNot(String status);
}