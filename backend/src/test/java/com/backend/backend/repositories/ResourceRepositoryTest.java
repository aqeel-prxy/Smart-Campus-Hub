package com.backend.backend.repositories;

import com.backend.backend.models.Resource;
import com.backend.backend.models.ResourceStatus;
import com.backend.backend.models.ResourceType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataMongoTest
@ActiveProfiles("test")
public class ResourceRepositoryTest {

    @Autowired
    private ResourceRepository resourceRepository;

    private Resource testResource1;
    private Resource testResource2;
    private Resource testResource3;

    @BeforeEach
    void setUp() {
        resourceRepository.deleteAll();
        
        // Create test resources
        testResource1 = new Resource();
        testResource1.setName("Lecture Hall A");
        testResource1.setType(ResourceType.LECTURE_HALL);
        testResource1.setCapacity(100);
        testResource1.setLocation("Building 1, Floor 1");
        testResource1.setDescription("Large lecture hall with projector");
        testResource1.setStatus(ResourceStatus.ACTIVE);
        testResource1.setAvailableFrom("08:00");
        testResource1.setAvailableTo("22:00");

        testResource2 = new Resource();
        testResource2.setName("Computer Lab 101");
        testResource2.setType(ResourceType.LAB);
        testResource2.setCapacity(30);
        testResource2.setLocation("Building 2, Floor 1");
        testResource2.setDescription("Computer lab with 30 workstations");
        testResource2.setStatus(ResourceStatus.ACTIVE);
        testResource2.setAvailableFrom("09:00");
        testResource2.setAvailableTo("18:00");

        testResource3 = new Resource();
        testResource3.setName("Meeting Room B");
        testResource3.setType(ResourceType.MEETING_ROOM);
        testResource3.setCapacity(10);
        testResource3.setLocation("Building 1, Floor 2");
        testResource3.setDescription("Small meeting room");
        testResource3.setStatus(ResourceStatus.OUT_OF_SERVICE);
        testResource3.setAvailableFrom("08:00");
        testResource3.setAvailableTo("18:00");
    }

    @Test
    void testSaveAndFindById() {
        Resource saved = resourceRepository.save(testResource1);
        
        assertNotNull(saved.getId());
        assertEquals(testResource1.getName(), saved.getName());
        assertEquals(testResource1.getType(), saved.getType());
        assertEquals(testResource1.getStatus(), saved.getStatus());
        
        Optional<Resource> found = resourceRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
    }

    @Test
    void testFindAll() {
        resourceRepository.save(testResource1);
        resourceRepository.save(testResource2);
        resourceRepository.save(testResource3);
        
        List<Resource> allResources = resourceRepository.findAll();
        
        assertEquals(3, allResources.size());
        assertTrue(allResources.stream().anyMatch(r -> r.getName().equals("Lecture Hall A")));
        assertTrue(allResources.stream().anyMatch(r -> r.getName().equals("Computer Lab 101")));
        assertTrue(allResources.stream().anyMatch(r -> r.getName().equals("Meeting Room B")));
    }

    @Test
    void testDeleteById() {
        Resource saved = resourceRepository.save(testResource1);
        String resourceId = saved.getId();
        
        resourceRepository.deleteById(resourceId);
        
        Optional<Resource> found = resourceRepository.findById(resourceId);
        assertFalse(found.isPresent());
    }

    @Test
    void testCount() {
        long initialCount = resourceRepository.count();
        assertEquals(0, initialCount);
        
        resourceRepository.save(testResource1);
        resourceRepository.save(testResource2);
        
        long finalCount = resourceRepository.count();
        assertEquals(2, finalCount);
    }

    @Test
    void testExistsById() {
        Resource saved = resourceRepository.save(testResource1);
        
        assertTrue(resourceRepository.existsById(saved.getId()));
        assertFalse(resourceRepository.existsById("nonexistent-id"));
    }

    @Test
    void testResourceTypes() {
        resourceRepository.save(testResource1); // LECTURE_HALL
        resourceRepository.save(testResource2); // LAB
        resourceRepository.save(testResource3); // MEETING_ROOM
        
        List<Resource> allResources = resourceRepository.findAll();
        assertEquals(3, allResources.size());
        
        // Verify all resource types are correctly stored
        assertTrue(allResources.stream().anyMatch(r -> r.getType() == ResourceType.LECTURE_HALL));
        assertTrue(allResources.stream().anyMatch(r -> r.getType() == ResourceType.LAB));
        assertTrue(allResources.stream().anyMatch(r -> r.getType() == ResourceType.MEETING_ROOM));
    }

    @Test
    void testResourceStatuses() {
        resourceRepository.save(testResource1); // ACTIVE
        resourceRepository.save(testResource3); // OUT_OF_SERVICE
        
        List<Resource> allResources = resourceRepository.findAll();
        assertEquals(2, allResources.size());
        
        // Verify statuses are correctly stored
        assertTrue(allResources.stream().anyMatch(r -> r.getStatus() == ResourceStatus.ACTIVE));
        assertTrue(allResources.stream().anyMatch(r -> r.getStatus() == ResourceStatus.OUT_OF_SERVICE));
    }

    @Test
    void testCapacityValidation() {
        Resource smallResource = new Resource();
        smallResource.setName("Small Room");
        smallResource.setType(ResourceType.MEETING_ROOM);
        smallResource.setCapacity(5);
        smallResource.setLocation("Test Location");
        smallResource.setStatus(ResourceStatus.ACTIVE);
        
        Resource largeResource = new Resource();
        largeResource.setName("Large Hall");
        largeResource.setType(ResourceType.LECTURE_HALL);
        largeResource.setCapacity(500);
        largeResource.setLocation("Test Location");
        largeResource.setStatus(ResourceStatus.ACTIVE);
        
        resourceRepository.save(smallResource);
        resourceRepository.save(largeResource);
        
        List<Resource> allResources = resourceRepository.findAll();
        assertEquals(2, allResources.size());
        
        // Verify capacities are correctly stored
        assertTrue(allResources.stream().anyMatch(r -> r.getCapacity() == 5));
        assertTrue(allResources.stream().anyMatch(r -> r.getCapacity() == 500));
    }

    @Test
    void testAvailableTimeSlots() {
        Resource resource = new Resource();
        resource.setName("Test Resource");
        resource.setType(ResourceType.MEETING_ROOM);
        resource.setCapacity(10);
        resource.setLocation("Test Location");
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setAvailableFrom("09:00");
        resource.setAvailableTo("17:00");
        
        Resource saved = resourceRepository.save(resource);
        
        assertEquals("09:00", saved.getAvailableFrom());
        assertEquals("17:00", saved.getAvailableTo());
        
        Optional<Resource> found = resourceRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals("09:00", found.get().getAvailableFrom());
        assertEquals("17:00", found.get().getAvailableTo());
    }
}
