package com.backend.backend.repositories;

import com.backend.backend.models.Ticket;
import com.backend.backend.models.TicketPriority;
import com.backend.backend.models.TicketStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.data.mongo.DataMongoTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@DataMongoTest
@ActiveProfiles("test")
public class TicketRepositoryTest {

    @Autowired
    private TicketRepository ticketRepository;

    private Ticket testTicket1;
    private Ticket testTicket2;
    private Ticket testTicket3;

    @BeforeEach
    void setUp() {
        ticketRepository.deleteAll();
        
        // Create test tickets
        testTicket1 = new Ticket();
        testTicket1.setTitle("Broken Projector");
        testTicket1.setLocation("Room 101");
        testTicket1.setResourceId("resource1");
        testTicket1.setCategory("EQUIPMENT");
        testTicket1.setPriority(TicketPriority.HIGH);
        testTicket1.setDescription("Projector not working");
        testTicket1.setPreferredContact("user1@test.com");
        testTicket1.setCreatedByEmail("user1@test.com");
        testTicket1.setStatus(TicketStatus.OPEN);
        testTicket1.setCreatedAt(LocalDateTime.of(2024, 1, 15, 9, 0));

        testTicket2 = new Ticket();
        testTicket2.setTitle("AC Not Working");
        testTicket2.setLocation("Room 202");
        testTicket2.setResourceId("resource2");
        testTicket2.setCategory("FACILITY");
        testTicket2.setPriority(TicketPriority.MEDIUM);
        testTicket2.setDescription("Air conditioning not cooling");
        testTicket2.setPreferredContact("user2@test.com");
        testTicket2.setCreatedByEmail("user2@test.com");
        testTicket2.setStatus(TicketStatus.IN_PROGRESS);
        testTicket2.setCreatedAt(LocalDateTime.of(2024, 1, 16, 10, 30));

        testTicket3 = new Ticket();
        testTicket3.setTitle("Network Issue");
        testTicket3.setLocation("Lab 301");
        testTicket3.setResourceId("resource3");
        testTicket3.setCategory("NETWORK");
        testTicket3.setPriority(TicketPriority.LOW);
        testTicket3.setDescription("Internet connection unstable");
        testTicket3.setPreferredContact("user1@test.com");
        testTicket3.setCreatedByEmail("user1@test.com");
        testTicket3.setStatus(TicketStatus.RESOLVED);
        testTicket3.setCreatedAt(LocalDateTime.of(2024, 1, 17, 14, 15));
    }

    @Test
    void testSaveAndFindById() {
        Ticket saved = ticketRepository.save(testTicket1);
        
        assertNotNull(saved.getId());
        assertEquals(testTicket1.getTitle(), saved.getTitle());
        assertEquals(testTicket1.getCreatedByEmail(), saved.getCreatedByEmail());
        
        Optional<Ticket> found = ticketRepository.findById(saved.getId());
        assertTrue(found.isPresent());
        assertEquals(saved.getId(), found.get().getId());
    }

    @Test
    void testFindByCreatedByEmailOrderByCreatedAtDesc() {
        ticketRepository.save(testTicket1);
        ticketRepository.save(testTicket3);
        
        List<Ticket> userTickets = ticketRepository.findByCreatedByEmailOrderByCreatedAtDesc("user1@test.com");
        
        assertEquals(2, userTickets.size());
        // Should be ordered by created_at desc
        assertEquals(LocalDateTime.of(2024, 1, 17, 14, 15), userTickets.get(0).getCreatedAt());
        assertEquals(LocalDateTime.of(2024, 1, 15, 9, 0), userTickets.get(1).getCreatedAt());
    }

    @Test
    void testFindAll() {
        ticketRepository.save(testTicket1);
        ticketRepository.save(testTicket2);
        ticketRepository.save(testTicket3);
        
        List<Ticket> allTickets = ticketRepository.findAll();
        
        assertEquals(3, allTickets.size());
    }

    @Test
    void testDeleteById() {
        Ticket saved = ticketRepository.save(testTicket1);
        String ticketId = saved.getId();
        
        ticketRepository.deleteById(ticketId);
        
        Optional<Ticket> found = ticketRepository.findById(ticketId);
        assertFalse(found.isPresent());
    }

    @Test
    void testCount() {
        long initialCount = ticketRepository.count();
        assertEquals(0, initialCount);
        
        ticketRepository.save(testTicket1);
        ticketRepository.save(testTicket2);
        
        long finalCount = ticketRepository.count();
        assertEquals(2, finalCount);
    }

    @Test
    void testExistsById() {
        Ticket saved = ticketRepository.save(testTicket1);
        
        assertTrue(ticketRepository.existsById(saved.getId()));
        assertFalse(ticketRepository.existsById("nonexistent-id"));
    }

    @Test
    void testTicketStatusTransitions() {
        Ticket saved = ticketRepository.save(testTicket1);
        
        // Test status transitions
        saved.setStatus(TicketStatus.IN_PROGRESS);
        Ticket updated = ticketRepository.save(saved);
        assertEquals(TicketStatus.IN_PROGRESS, updated.getStatus());
        
        updated.setStatus(TicketStatus.RESOLVED);
        updated = ticketRepository.save(updated);
        assertEquals(TicketStatus.RESOLVED, updated.getStatus());
        
        updated.setStatus(TicketStatus.CLOSED);
        updated = ticketRepository.save(updated);
        assertEquals(TicketStatus.CLOSED, updated.getStatus());
    }

    @Test
    void testTicketPriorityLevels() {
        // Test all priority levels
        Ticket highPriority = new Ticket();
        highPriority.setTitle("High Priority");
        highPriority.setPriority(TicketPriority.HIGH);
        highPriority.setCreatedByEmail("test@test.com");
        highPriority.setStatus(TicketStatus.OPEN);
        
        Ticket mediumPriority = new Ticket();
        mediumPriority.setTitle("Medium Priority");
        mediumPriority.setPriority(TicketPriority.MEDIUM);
        mediumPriority.setCreatedByEmail("test@test.com");
        mediumPriority.setStatus(TicketStatus.OPEN);
        
        Ticket lowPriority = new Ticket();
        lowPriority.setTitle("Low Priority");
        lowPriority.setPriority(TicketPriority.LOW);
        lowPriority.setCreatedByEmail("test@test.com");
        lowPriority.setStatus(TicketStatus.OPEN);
        
        ticketRepository.save(highPriority);
        ticketRepository.save(mediumPriority);
        ticketRepository.save(lowPriority);
        
        List<Ticket> allTickets = ticketRepository.findAll();
        assertEquals(3, allTickets.size());
        
        // Verify priorities are correctly stored
        assertTrue(allTickets.stream().anyMatch(t -> t.getPriority() == TicketPriority.HIGH));
        assertTrue(allTickets.stream().anyMatch(t -> t.getPriority() == TicketPriority.MEDIUM));
        assertTrue(allTickets.stream().anyMatch(t -> t.getPriority() == TicketPriority.LOW));
    }
}
