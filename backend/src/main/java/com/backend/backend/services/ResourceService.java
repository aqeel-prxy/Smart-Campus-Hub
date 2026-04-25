package com.backend.backend.services;

import com.backend.backend.models.Resource;
import com.backend.backend.repositories.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.domain.PageImpl;

import java.util.List;
import java.util.Optional;

@Service
public class ResourceService {

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    // 1. CREATE (Will be used for POST)
    // Saves a brand new resource to the database
    public Resource createResource(Resource resource) {
        return resourceRepository.save(resource);
    }

    // 2. READ (Will be used for GET)
    // UPGRADE: Filter out the ARCHIVED resources
    public List<Resource> getAllResources() {
        return resourceRepository.findByStatusNot("ARCHIVED");
    }

    // READ (Will be used for GET by ID)
    // Fetches a specific resource, if it exists
    public Optional<Resource> getResourceById(String id) {
        return resourceRepository.findById(id);
    }

    // NEW METHOD for the Export feature: Fetches absolutely everything
    public List<Resource> getAllResourcesIncludingArchived() {
        return resourceRepository.findAll(); 
    }

    // 3. UPDATE (Will be used for PUT)
    // Finds an existing resource and updates its details
    public Resource updateResource(String id, Resource resourceDetails) {
        Optional<Resource> existingResource = resourceRepository.findById(id);
        
        if (existingResource.isPresent()) {
            Resource updatedResource = existingResource.get();
            updatedResource.setName(resourceDetails.getName());
            updatedResource.setType(resourceDetails.getType());
            updatedResource.setCapacity(resourceDetails.getCapacity());
            updatedResource.setLocation(resourceDetails.getLocation());
            updatedResource.setAvailabilityWindows(resourceDetails.getAvailabilityWindows());
            updatedResource.setStatus(resourceDetails.getStatus());
            updatedResource.setImageBase64(resourceDetails.getImageBase64());
            return resourceRepository.save(updatedResource);
        }
        return null; // In the next step, we will make the Controller handle this 'null' gracefully
    }

    // 4. DELETE (Will be used for DELETE)
    // NEW: Soft Deletion Logic
    public boolean softDeleteResource(String id) {
        Optional<Resource> resourceOpt = resourceRepository.findById(id);
        if (resourceOpt.isPresent()) {
            Resource resource = resourceOpt.get();
            resource.setStatus("ARCHIVED"); // Change status instead of deleting
            resourceRepository.save(resource);
            return true;
        }
        return false;
    }

    // NEW: True Server-Side Search, Filter, and Pagination
    public Page<Resource> searchAndFilterResources(
        String searchTerm,
        String type,
        String status,
        String location,
        Integer minCapacity,
        Integer maxCapacity,
        Pageable pageable
    ) {
        Query query = new Query();

        // 1. Apply Search Term (Checks if Name OR Location contains the text, ignoring case)
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            Criteria searchCriteria = new Criteria().orOperator(
                Criteria.where("name").regex(searchTerm, "i"),
                Criteria.where("location").regex(searchTerm, "i")
            );
            query.addCriteria(searchCriteria);
        }

        // 2. Apply Type Filter
        if (type != null && !type.equals("ALL")) {
            query.addCriteria(Criteria.where("type").is(type));
        }

        // 3. Apply Location Filter (exact field, case-insensitive partial match)
        if (location != null && !location.trim().isEmpty()) {
            query.addCriteria(Criteria.where("location").regex(location.trim(), "i"));
        }

        // 4. Apply Capacity Filters
        if (minCapacity != null) {
            query.addCriteria(Criteria.where("capacity").gte(minCapacity));
        }
        if (maxCapacity != null) {
            query.addCriteria(Criteria.where("capacity").lte(maxCapacity));
        }

        // 5. Apply Status Filter
        if (status != null && !status.equals("ALL")) {
            query.addCriteria(Criteria.where("status").is(status));
        } else {
            // Optional: Even if they select "ALL", we probably don't want to show ARCHIVED in the main table
            query.addCriteria(Criteria.where("status").ne("ARCHIVED")); 
        }

        // 6. Count the total matching records BEFORE we slice them into pages
        long totalCount = mongoTemplate.count(query, Resource.class);

        // 7. Apply the Pagination (e.g., "Skip the first 20, grab the next 10")
        query.with(pageable);

        // 8. Fetch just that tiny slice of data from the database
        List<Resource> paginatedResources = mongoTemplate.find(query, Resource.class);

        // 9. Package it up into a beautiful Page object for React
        return new PageImpl<>(paginatedResources, pageable, totalCount);
    }
}