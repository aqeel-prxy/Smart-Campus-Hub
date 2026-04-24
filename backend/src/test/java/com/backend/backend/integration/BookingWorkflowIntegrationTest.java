package com.backend.backend.integration;

import com.backend.backend.dto.BookingCreateRequest;
import com.backend.backend.dto.BookingDecisionRequest;
import com.backend.backend.models.Booking;
import com.backend.backend.models.BookingStatus;
import com.backend.backend.models.Resource;
import com.backend.backend.models.ResourceStatus;
import com.backend.backend.models.ResourceType;
import com.backend.backend.repositories.BookingRepository;
import com.backend.backend.repositories.ResourceRepository;
import com.backend.backend.repositories.UserRepository;
import com.backend.backend.models.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureWebMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureWebMvc
@ActiveProfiles("test")
public class BookingWorkflowIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private MockMvc mockMvc;

    private Resource testResource;
    private User regularUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        
        bookingRepository.deleteAll();
        resourceRepository.deleteAll();
        userRepository.deleteAll();

        // Create test resource
        testResource = new Resource();
        testResource.setName("Test Meeting Room");
        testResource.setType(ResourceType.MEETING_ROOM);
        testResource.setCapacity(10);
        testResource.setLocation("Building 1, Room 101");
        testResource.setStatus(ResourceStatus.ACTIVE);
        testResource.setAvailableFrom("08:00");
        testResource.setAvailableTo("18:00");
        testResource = resourceRepository.save(testResource);

        // Create regular user
        Set<String> userRoles = new HashSet<>();
        userRoles.add("ROLE_USER");
        regularUser = new User("user@test.com", passwordEncoder.encode("password"), userRoles);
        regularUser = userRepository.save(regularUser);

        // Create admin user
        Set<String> adminRoles = new HashSet<>();
        adminRoles.add("ROLE_USER");
        adminRoles.add("ROLE_ADMIN");
        adminUser = new User("admin@test.com", passwordEncoder.encode("password"), adminRoles);
        adminUser = userRepository.save(adminUser);
    }

    @Test
    void testCompleteBookingWorkflow() throws Exception {
        // Step 1: User creates a booking request
        BookingCreateRequest createRequest = new BookingCreateRequest();
        createRequest.setResourceId(testResource.getId());
        createRequest.setBookingDate(LocalDate.now().plusDays(1));
        createRequest.setStartTime(LocalTime.of(10, 0));
        createRequest.setEndTime(LocalTime.of(11, 0));
        createRequest.setPurpose("Team meeting");
        createRequest.setExpectedAttendees(5);

        String bookingResponse = mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requesterEmail").value("user@test.com"))
                .andReturn().getResponse().getContentAsString();

        Booking createdBooking = objectMapper.readValue(bookingResponse, Booking.class);
        String bookingId = createdBooking.getId();

        // Step 2: Admin approves the booking
        BookingDecisionRequest decisionRequest = new BookingDecisionRequest();
        decisionRequest.setDecision("APPROVED");
        decisionRequest.setReason("Approved for team meeting");

        mockMvc.perform(patch("/api/bookings/" + bookingId + "/decision")
                .with(user(adminUser.getEmail()).roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(decisionRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.adminReason").value("Approved for team meeting"));

        // Step 3: User can view their booking
        mockMvc.perform(get("/api/bookings/my")
                .with(user(regularUser.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + bookingId + "')].status").value("APPROVED"));

        // Step 4: User cancels the booking
        mockMvc.perform(patch("/api/bookings/" + bookingId + "/cancel")
                .with(user(regularUser.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void testBookingConflictPrevention() throws Exception {
        // Create first booking
        BookingCreateRequest firstBooking = new BookingCreateRequest();
        firstBooking.setResourceId(testResource.getId());
        firstBooking.setBookingDate(LocalDate.now().plusDays(1));
        firstBooking.setStartTime(LocalTime.of(10, 0));
        firstBooking.setEndTime(LocalTime.of(11, 0));
        firstBooking.setPurpose("First meeting");
        firstBooking.setExpectedAttendees(5);

        mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstBooking)))
                .andExpect(status().isCreated());

        // Try to create overlapping booking
        BookingCreateRequest overlappingBooking = new BookingCreateRequest();
        overlappingBooking.setResourceId(testResource.getId());
        overlappingBooking.setBookingDate(LocalDate.now().plusDays(1));
        overlappingBooking.setStartTime(LocalTime.of(10, 30));
        overlappingBooking.setEndTime(LocalTime.of(11, 30));
        overlappingBooking.setPurpose("Overlapping meeting");
        overlappingBooking.setExpectedAttendees(3);

        mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(overlappingBooking)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testAdminCanViewAllBookings() throws Exception {
        // Create bookings for different users
        BookingCreateRequest booking1 = new BookingCreateRequest();
        booking1.setResourceId(testResource.getId());
        booking1.setBookingDate(LocalDate.now().plusDays(1));
        booking1.setStartTime(LocalTime.of(9, 0));
        booking1.setEndTime(LocalTime.of(10, 0));
        booking1.setPurpose("Meeting 1");
        booking1.setExpectedAttendees(5);

        BookingCreateRequest booking2 = new BookingCreateRequest();
        booking2.setResourceId(testResource.getId());
        booking2.setBookingDate(LocalDate.now().plusDays(2));
        booking2.setStartTime(LocalTime.of(14, 0));
        booking2.setEndTime(LocalTime.of(15, 0));
        booking2.setPurpose("Meeting 2");
        booking2.setExpectedAttendees(3);

        mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(booking1)));

        mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(booking2)));

        // Admin can view all bookings
        mockMvc.perform(get("/api/bookings")
                .with(user(adminUser.getEmail()).roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void testUserCanOnlyViewOwnBookings() throws Exception {
        // Create booking for regular user
        BookingCreateRequest booking = new BookingCreateRequest();
        booking.setResourceId(testResource.getId());
        booking.setBookingDate(LocalDate.now().plusDays(1));
        booking.setStartTime(LocalTime.of(10, 0));
        booking.setEndTime(LocalTime.of(11, 0));
        booking.setPurpose("User meeting");
        booking.setExpectedAttendees(5);

        mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(booking)));

        // Create another user and try to view their bookings
        Set<String> otherUserRoles = new HashSet<>();
        otherUserRoles.add("ROLE_USER");
        User otherUser = new User("other@test.com", passwordEncoder.encode("password"), otherUserRoles);
        userRepository.save(otherUser);

        mockMvc.perform(get("/api/bookings/my")
                .with(user(otherUser.getEmail()).roles("USER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void testBookingRejection() throws Exception {
        // Create booking
        BookingCreateRequest createRequest = new BookingCreateRequest();
        createRequest.setResourceId(testResource.getId());
        createRequest.setBookingDate(LocalDate.now().plusDays(1));
        createRequest.setStartTime(LocalTime.of(10, 0));
        createRequest.setEndTime(LocalTime.of(11, 0));
        createRequest.setPurpose("Test meeting");
        createRequest.setExpectedAttendees(5);

        String bookingResponse = mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andReturn().getResponse().getContentAsString();

        Booking createdBooking = objectMapper.readValue(bookingResponse, Booking.class);
        String bookingId = createdBooking.getId();

        // Admin rejects the booking
        BookingDecisionRequest decisionRequest = new BookingDecisionRequest();
        decisionRequest.setDecision("REJECTED");
        decisionRequest.setReason("Resource unavailable at requested time");

        mockMvc.perform(patch("/api/bookings/" + bookingId + "/decision")
                .with(user(adminUser.getEmail()).roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(decisionRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.adminReason").value("Resource unavailable at requested time"));
    }

    @Test
    void testUnauthorizedBookingAccess() throws Exception {
        // Try to approve booking as regular user (should fail)
        BookingCreateRequest createRequest = new BookingCreateRequest();
        createRequest.setResourceId(testResource.getId());
        createRequest.setBookingDate(LocalDate.now().plusDays(1));
        createRequest.setStartTime(LocalTime.of(10, 0));
        createRequest.setEndTime(LocalTime.of(11, 0));
        createRequest.setPurpose("Test meeting");
        createRequest.setExpectedAttendees(5);

        String bookingResponse = mockMvc.perform(post("/api/bookings")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createRequest)))
                .andReturn().getResponse().getContentAsString();

        Booking createdBooking = objectMapper.readValue(bookingResponse, Booking.class);
        String bookingId = createdBooking.getId();

        BookingDecisionRequest decisionRequest = new BookingDecisionRequest();
        decisionRequest.setDecision("APPROVED");
        decisionRequest.setReason("Should not work");

        mockMvc.perform(patch("/api/bookings/" + bookingId + "/decision")
                .with(user(regularUser.getEmail()).roles("USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(decisionRequest)))
                .andExpect(status().isForbidden());
    }
}
