package com.backend.backend.repositories;

import com.backend.backend.models.Ticket;
import com.backend.backend.models.TicketStatus;
import com.backend.backend.models.TicketPriority;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface TicketRepository extends MongoRepository<Ticket, String> {
    
    // Find tickets by creator
    List<Ticket> findByCreatedByEmailOrderByCreatedAtDesc(String createdByEmail);
    
    // Find tickets by assigned technician
    List<Ticket> findByAssignedToEmailOrderByCreatedAtDesc(String assignedToEmail);
    
    // Find tickets by status
    List<Ticket> findByStatusOrderByCreatedAtDesc(TicketStatus status);
    
    // Find tickets by priority
    List<Ticket> findByPriorityOrderByCreatedAtDesc(TicketPriority priority);
    
    // Find tickets by category
    List<Ticket> findByCategoryOrderByCreatedAtDesc(String category);
    
    // Find open tickets by priority (for technician assignment)
    List<Ticket> findByStatusAndPriorityOrderByPriorityAscCreatedAtDesc(TicketStatus status, TicketPriority priority);
    
    // Find tickets by status and priority (for admin dashboard)
    List<Ticket> findByStatusAndPriorityOrderByCreatedAtDesc(TicketStatus status, TicketPriority priority);
    
    // Find tickets created in date range
    List<Ticket> findByCreatedAtBetweenOrderByCreatedAtDesc(Instant startDate, Instant endDate);
    
    // Find tickets by resource ID
    List<Ticket> findByResourceIdOrderByCreatedAtDesc(String resourceId);
    
    // Count tickets by status
    long countByStatus(TicketStatus status);
    
    // Count tickets by priority
    long countByPriority(TicketPriority priority);
    
    // Count tickets assigned to technician
    long countByAssignedToEmail(String assignedToEmail);
    
    // Find tickets needing attention (high priority open tickets)
    List<Ticket> findByStatusAndPriorityOrderByCreatedAtDesc(TicketStatus status, TicketPriority priority);
}
